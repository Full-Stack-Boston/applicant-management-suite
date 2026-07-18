/**
 * Daily.co video budget controls (AMS-owned spending cap).
 *
 * siteConfiguration.videoBudget:
 *   { mode: 'off'|'10'|'50'|'100', monthlyBaseMinutes: 10000 }
 *
 * Allowed minutes = base * (mode/100). mode 'off' blocks all video.
 *
 * Usage / remote status (future fullstackboston.com dash):
 *   videoUsage/{YYYY-MM}  — monthly counters + alert flags
 *   videoBudget/status    — latest snapshot for remote monitors
 */

const admin = require('firebase-admin');
const { HttpsError } = require('firebase-functions/v2/https');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const { brand, collections } = require('./config');
const { getConfigFromDb } = require('./utils');
const {
	DEFAULT_BASE_MINUTES,
	VALID_MODES,
	THRESHOLD_PERCENTS,
	normalizeMode,
	normalizeBaseMinutes,
	normalizeVideoBudget,
	allowedMinutes,
	percentUsed,
	thresholdsCrossed,
	modeLabel,
} = require('./videoBudgetLogic');

const VIDEO_USAGE = 'videoUsage';
const VIDEO_BUDGET = 'videoBudget';
const STATUS_DOC = 'status';
const SAMPLE_MINUTES = 5;
const SUMMARY_COOLDOWN_MS = 60 * 60 * 1000;

const VIDEO_OFF_MESSAGE =
	'Live video is turned off in Site Settings. Enable Video / Daily (10%, 50%, or 100%) to open rooms.';
const VIDEO_BUDGET_EXCEEDED_MESSAGE =
	'Live video is paused: this month’s AMS video budget has been reached. Raise the allowance in Site Settings or wait for next month.';

const usagePeriodId = (date = new Date()) => dayjs(date).tz('America/New_York').format('YYYY-MM');

const stripMailto = (value) => String(value || '').replace(/^mailto:/i, '').trim();

const parseLeadCc = (value) => {
	if (!value) return [];
	if (Array.isArray(value)) return value.map(stripMailto).filter(Boolean);
	return String(value)
		.split(',')
		.map((part) => stripMailto(part))
		.filter(Boolean);
};

/**
 * Always queues a REAL owner email (no demo simulation).
 * Same delivery posture as public contact leads.
 */
const queueOwnerAlertEmail = async ({ subject, html, text, tags = [] }) => {
	const configData = await getConfigFromDb();
	const destination = stripMailto(configData.OWNER_LEAD_EMAIL) || brand.systemEmail;
	if (!destination) {
		console.warn('queueOwnerAlertEmail: OWNER_LEAD_EMAIL missing; skipping.');
		return false;
	}

	const leadCc = parseLeadCc(configData.OWNER_LEAD_CC);
	await admin.firestore().collection(collections.emails).add({
		to: destination,
		from: configData.SYSTEM_EMAIL,
		replyTo: configData.SYSTEM_REPLY_TO || configData.SYSTEM_EMAIL,
		...(leadCc.length > 0 ? { cc: leadCc } : {}),
		message: {
			subject,
			html,
			text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
		},
		tags: ['video-budget', ...tags],
		createdAt: admin.firestore.FieldValue.serverTimestamp(),
	});
	return true;
};

const usageRef = (period = usagePeriodId()) => admin.firestore().collection(VIDEO_USAGE).doc(period);

const statusRef = () => admin.firestore().collection(VIDEO_BUDGET).doc(STATUS_DOC);

const getUsageDoc = async (period = usagePeriodId()) => {
	const snap = await usageRef(period).get();
	if (!snap.exists) {
		return {
			period,
			usedParticipantMinutes: 0,
			joinCount: 0,
			alertsSent: {},
			lastSampleAt: null,
			lastSummaryEmailAt: null,
			lastSummaryUsed: 0,
		};
	}
	const data = snap.data() || {};
	return {
		period,
		usedParticipantMinutes: Number(data.usedParticipantMinutes) || 0,
		joinCount: Number(data.joinCount) || 0,
		alertsSent: data.alertsSent || {},
		lastSampleAt: data.lastSampleAt || null,
		lastSummaryEmailAt: data.lastSummaryEmailAt || null,
		lastSummaryUsed: Number(data.lastSummaryUsed) || 0,
	};
};

const buildStatusPayload = ({ budget, usage, blocked = false }) => {
	const normalized = normalizeVideoBudget(budget);
	const allowed = allowedMinutes(normalized);
	const used = Number(usage?.usedParticipantMinutes) || 0;
	const mode = normalized.mode;
	const isBlocked = blocked || mode === 'off' || (allowed > 0 && used >= allowed);
	return {
		mode,
		monthlyBaseMinutes: normalized.monthlyBaseMinutes,
		allowed,
		used,
		percentUsed: percentUsed(used, allowed),
		blocked: isBlocked,
		period: usage?.period || usagePeriodId(),
		joinCount: Number(usage?.joinCount) || 0,
		updatedAt: admin.firestore.FieldValue.serverTimestamp(),
	};
};

const writeVideoBudgetStatus = async ({ budget, usage, blocked }) => {
	const payload = buildStatusPayload({ budget, usage, blocked });
	await statusRef().set(payload, { merge: true });
	return payload;
};

/**
 * Hard gate for create/join. Throws HttpsError when video is off or over budget.
 * Returns { budget, usage, allowed, used } when allowed.
 */
const assertVideoBudgetAllows = async () => {
	const configData = await getConfigFromDb();
	const budget = normalizeVideoBudget(configData.videoBudget);
	const usage = await getUsageDoc();
	const allowed = allowedMinutes(budget);
	const used = usage.usedParticipantMinutes;

	if (budget.mode === 'off') {
		await writeVideoBudgetStatus({ budget, usage, blocked: true });
		throw new HttpsError('failed-precondition', VIDEO_OFF_MESSAGE);
	}

	if (used >= allowed) {
		await writeVideoBudgetStatus({ budget, usage, blocked: true });
		throw new HttpsError('resource-exhausted', VIDEO_BUDGET_EXCEEDED_MESSAGE);
	}

	return { budget, usage, allowed, used };
};

const recordVideoJoin = async () => {
	const period = usagePeriodId();
	await usageRef(period).set(
		{
			period,
			joinCount: admin.firestore.FieldValue.increment(1),
			updatedAt: admin.firestore.FieldValue.serverTimestamp(),
		},
		{ merge: true }
	);
};

module.exports = {
	VIDEO_USAGE,
	VIDEO_BUDGET,
	STATUS_DOC,
	DEFAULT_BASE_MINUTES,
	VALID_MODES,
	THRESHOLD_PERCENTS,
	SAMPLE_MINUTES,
	SUMMARY_COOLDOWN_MS,
	VIDEO_OFF_MESSAGE,
	VIDEO_BUDGET_EXCEEDED_MESSAGE,
	normalizeMode,
	normalizeBaseMinutes,
	normalizeVideoBudget,
	allowedMinutes,
	usagePeriodId,
	percentUsed,
	modeLabel,
	queueOwnerAlertEmail,
	getUsageDoc,
	usageRef,
	statusRef,
	buildStatusPayload,
	writeVideoBudgetStatus,
	assertVideoBudgetAllows,
	recordVideoJoin,
	thresholdsCrossed,
};
