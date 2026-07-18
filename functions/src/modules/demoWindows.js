const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { Timestamp } = require('firebase-admin/firestore');

const { configKeys, collections } = require('../config');
const { computeDemoWindowSchedule } = require('../demoWindowSchedule');

const datesEqual = (a, b) => {
	if (!a || !b) return false;
	const left = a.toDate ? a.toDate() : new Date(a);
	const right = b.toDate ? b.toDate() : new Date(b);
	return left.getTime() === right.getTime();
};

/**
 * Daily demo window rotator.
 * Updates APPLICATION_DEADLINE, NEXT_APPLICATION_OPEN_DATE, and CYCLE_YEAR only
 * when email delivery is in demo mode (not connected). Does not rewrite apps.
 */
exports.rotateDemoApplicationWindow = onSchedule(
	{
		schedule: '15 5 * * *',
		timeZone: 'America/New_York',
	},
	async () => {
		const db = admin.firestore();
		const configRef = db.collection(collections.siteConfig).doc(configKeys.configVersionId);
		const configSnap = await configRef.get();

		if (!configSnap.exists) {
			console.error('Site configuration not found. Skipping demo window rotation.');
			return null;
		}

		const configData = configSnap.data() || {};
		if ((configData.emailDeliveryMode || 'demo') === 'connected') {
			console.log('Connected email delivery mode — skipping demo window rotation.');
			return null;
		}

		if (configData.DEMO_WINDOW_ROTATION_ENABLED === false) {
			console.log('DEMO_WINDOW_ROTATION_ENABLED is false — skipping.');
			return null;
		}

		const schedule = computeDemoWindowSchedule(new Date());
		const nextDeadline = Timestamp.fromDate(schedule.APPLICATION_DEADLINE);
		const nextOpen = Timestamp.fromDate(schedule.NEXT_APPLICATION_OPEN_DATE);

		const unchanged =
			datesEqual(configData.APPLICATION_DEADLINE, nextDeadline) &&
			datesEqual(configData.NEXT_APPLICATION_OPEN_DATE, nextOpen) &&
			Number(configData.CYCLE_YEAR) === schedule.CYCLE_YEAR;

		if (unchanged) {
			console.log('Demo application window already current.', {
				cycleYear: schedule.CYCLE_YEAR,
				isOpen: schedule.isOpen,
			});
			return null;
		}

		await configRef.update({
			APPLICATION_DEADLINE: nextDeadline,
			NEXT_APPLICATION_OPEN_DATE: nextOpen,
			CYCLE_YEAR: schedule.CYCLE_YEAR,
			DEMO_WINDOW_LAST_ROTATED_AT: Timestamp.now(),
		});

		console.log('Rotated demo application window.', {
			APPLICATION_DEADLINE: schedule.APPLICATION_DEADLINE.toISOString(),
			NEXT_APPLICATION_OPEN_DATE: schedule.NEXT_APPLICATION_OPEN_DATE.toISOString(),
			CYCLE_YEAR: schedule.CYCLE_YEAR,
			isOpen: schedule.isOpen,
		});

		return null;
	}
);
