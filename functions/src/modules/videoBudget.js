/**
 * Video budget Cloud Functions:
 * - reconcileVideoUsage: sample Daily presence every 5 minutes
 * - onVideoBudgetConfigWrite: email owner when mode/base changes
 */

const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const { brand, collections, configKeys } = require('../config');
const { getConfigFromDb } = require('../utils');
const {
	normalizeVideoBudget,
	allowedMinutes,
	usagePeriodId,
	percentUsed,
	modeLabel,
	queueOwnerAlertEmail,
	getUsageDoc,
	usageRef,
	writeVideoBudgetStatus,
	thresholdsCrossed,
	SAMPLE_MINUTES,
	SUMMARY_COOLDOWN_MS,
} = require('../videoBudget');

const dailyApi = async (method, endpoint) => {
	const API_KEY = process.env.DAILY_KEY;
	if (!API_KEY) throw new Error('Daily API Key is missing in environment variables.');
	return axios({
		method,
		url: `https://api.daily.co/v1${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${API_KEY}`,
		},
	});
};

const roomExists = async (roomName) => {
	try {
		await dailyApi('GET', `/rooms/${roomName}`);
		return true;
	} catch (error) {
		if (error.response?.status === 404) return false;
		throw error;
	}
};

const getPresenceCount = async (roomName) => {
	try {
		const resp = await dailyApi('GET', `/rooms/${roomName}/presence`);
		return Number(resp.data?.total_count) || 0;
	} catch (error) {
		if (error.response?.status === 404) return 0;
		console.warn(`Presence fetch failed for ${roomName}:`, error.response?.data || error.message);
		return 0;
	}
};

const listOpenRoomNames = async () => {
	const db = admin.firestore();
	const rooms = new Set();

	if (await roomExists('deliberation-room')) {
		rooms.add('deliberation-room');
	}

	const today = dayjs().tz('America/New_York');
	const startOfToday = today.startOf('day').toDate();
	const endOfToday = today.endOf('day').toDate();

	const [todaySnap, inProgressSnap] = await Promise.all([
		db
			.collection(collections.interviews)
			.where('startTime', '>=', startOfToday)
			.where('startTime', '<=', endOfToday)
			.get(),
		db.collection(collections.interviews).where('status', '==', 'In Progress').get(),
	]);

	for (const snap of [todaySnap, inProgressSnap]) {
		snap.docs.forEach((doc) => {
			const roomId = doc.data()?.roomId;
			if (roomId) rooms.add(roomId);
		});
	}

	return Array.from(rooms);
};

/**
 * Sample Daily presence and accumulate participant-minutes.
 * Schedule: every 5 minutes.
 */
exports.reconcileVideoUsage = onSchedule(
	{
		schedule: 'every 5 minutes',
		timeZone: 'America/New_York',
	},
	async () => {
		const configData = await getConfigFromDb();
		const budget = normalizeVideoBudget(configData.videoBudget);
		const period = usagePeriodId();
		const usageBefore = await getUsageDoc(period);
		const allowed = allowedMinutes(budget);

		let participantMinutesDelta = 0;
		let activeParticipants = 0;

		if (budget.mode !== 'off' && process.env.DAILY_KEY) {
			try {
				const rooms = await listOpenRoomNames();
				for (const roomName of rooms) {
					const count = await getPresenceCount(roomName);
					activeParticipants += count;
					participantMinutesDelta += count * SAMPLE_MINUTES;
				}
			} catch (error) {
				console.error('reconcileVideoUsage sampling failed:', error.message || error);
			}
		}

		const usedAfter = usageBefore.usedParticipantMinutes + participantMinutesDelta;
		const alertsSent = { ...(usageBefore.alertsSent || {}) };

		await usageRef(period).set(
			{
				period,
				usedParticipantMinutes: usedAfter,
				joinCount: usageBefore.joinCount,
				alertsSent,
				lastSampleAt: admin.firestore.FieldValue.serverTimestamp(),
				lastSummaryEmailAt: usageBefore.lastSummaryEmailAt || null,
				lastSummaryUsed: usageBefore.lastSummaryUsed || 0,
				activeParticipants,
				updatedAt: admin.firestore.FieldValue.serverTimestamp(),
			},
			{ merge: true }
		);

		const usageAfter = {
			...usageBefore,
			usedParticipantMinutes: usedAfter,
			period,
		};

		await writeVideoBudgetStatus({
			budget,
			usage: usageAfter,
			blocked: budget.mode === 'off' || (allowed > 0 && usedAfter >= allowed),
		});

		if (budget.mode === 'off' || allowed <= 0) {
			return;
		}

		const crossed = thresholdsCrossed(usageBefore.usedParticipantMinutes, usedAfter, allowed);
		for (const pct of crossed) {
			const key = String(pct);
			if (alertsSent[key]) continue;
			alertsSent[key] = true;
			const subject = `[AMS Video] ${pct}% of video budget used (${period})`;
			const html = [
				`<p>AMS video usage reached <strong>${pct}%</strong> of the configured allowance.</p>`,
				`<p><strong>Period:</strong> ${period}</p>`,
				`<p><strong>Mode:</strong> ${modeLabel(budget.mode)}</p>`,
				`<p><strong>Used:</strong> ${usedAfter} / ${allowed} participant-minutes (${percentUsed(usedAfter, allowed)}%)</p>`,
				`<p>Joins this month: ${usageBefore.joinCount}. Active participants at last sample: ${activeParticipants}.</p>`,
				`<p>Raise or lower the allowance under Site Settings → Video / Daily. At 100%, new joins and room creates are blocked.</p>`,
			].join('');
			await queueOwnerAlertEmail({ subject, html, tags: [`threshold-${pct}`, `period-${period}`] });
		}

		const lastSummaryAt = usageBefore.lastSummaryEmailAt?.toDate
			? usageBefore.lastSummaryEmailAt.toDate()
			: usageBefore.lastSummaryEmailAt
				? new Date(usageBefore.lastSummaryEmailAt)
				: null;
		const summaryDue =
			participantMinutesDelta > 0 &&
			usedAfter > (usageBefore.lastSummaryUsed || 0) &&
			(!lastSummaryAt || Date.now() - lastSummaryAt.getTime() >= SUMMARY_COOLDOWN_MS);

		if (summaryDue) {
			const subject = `[AMS Video] Usage update (${period})`;
			const html = [
				`<p>AMS video usage increased since the last status email.</p>`,
				`<p><strong>Period:</strong> ${period}</p>`,
				`<p><strong>Mode:</strong> ${modeLabel(budget.mode)}</p>`,
				`<p><strong>Used:</strong> ${usedAfter} / ${allowed} participant-minutes (${percentUsed(usedAfter, allowed)}%)</p>`,
				`<p>Delta this sample: +${participantMinutesDelta} participant-minutes across ${activeParticipants} active participant(s).</p>`,
			].join('');
			await queueOwnerAlertEmail({ subject, html, tags: ['usage-summary', `period-${period}`] });
			alertsSent._summary = true;
		}

		await usageRef(period).set(
			{
				alertsSent,
				...(summaryDue
					? {
							lastSummaryEmailAt: admin.firestore.FieldValue.serverTimestamp(),
							lastSummaryUsed: usedAfter,
						}
					: {}),
				updatedAt: admin.firestore.FieldValue.serverTimestamp(),
			},
			{ merge: true }
		);
	}
);

/**
 * Email owner when videoBudget.mode or monthlyBaseMinutes changes in site config.
 */
exports.onVideoBudgetConfigWrite = onDocumentUpdated(
	`${collections.siteConfig}/${configKeys.configVersionId}`,
	async (event) => {
		const before = event.data?.before?.data()?.videoBudget;
		const after = event.data?.after?.data()?.videoBudget;
		const prev = normalizeVideoBudget(before);
		const next = normalizeVideoBudget(after);

		if (prev.mode === next.mode && prev.monthlyBaseMinutes === next.monthlyBaseMinutes) {
			return;
		}

		const allowed = allowedMinutes(next);
		const usage = await getUsageDoc();
		await writeVideoBudgetStatus({
			budget: next,
			usage,
			blocked: next.mode === 'off' || (allowed > 0 && usage.usedParticipantMinutes >= allowed),
		});

		const subject = `[AMS Video] Budget ${next.mode === 'off' ? 'turned Off' : `set to ${next.mode}%`}`;
		const html = [
			`<p>The AMS Video / Daily budget setting was changed.</p>`,
			`<p><strong>Previous:</strong> ${modeLabel(prev.mode)} (base ${prev.monthlyBaseMinutes} minutes)</p>`,
			`<p><strong>New:</strong> ${modeLabel(next.mode)} (base ${next.monthlyBaseMinutes} minutes)</p>`,
			`<p><strong>Allowed this month:</strong> ${allowed} participant-minutes</p>`,
			`<p><strong>Used so far (${usage.period}):</strong> ${usage.usedParticipantMinutes} participant-minutes</p>`,
			`<p>Site: ${brand.url}</p>`,
		].join('');

		await queueOwnerAlertEmail({
			subject,
			html,
			tags: ['config-change', `mode-${next.mode}`],
		});
	}
);
