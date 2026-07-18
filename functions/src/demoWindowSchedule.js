/**
 * Pure demo application-window schedule.
 * Open ~1 calendar month, then a 5-day closed gap, then reopen.
 * Example: 7/15–8/15 open, 8/20–9/20 open, 9/25–10/25 open, …
 */

const GAP_DAYS = 5;

const addMonths = (date, months) => {
	const next = new Date(date.getTime());
	next.setMonth(next.getMonth() + months);
	return next;
};

const addDays = (date, days) => {
	const next = new Date(date.getTime());
	next.setDate(next.getDate() + days);
	return next;
};

const startOfDay = (date) => {
	const next = new Date(date.getTime());
	next.setHours(0, 0, 0, 0);
	return next;
};

const endOfDay = (date) => {
	const next = new Date(date.getTime());
	next.setHours(23, 59, 59, 999);
	return next;
};

/**
 * @param {Date} [now]
 * @returns {{
 *   APPLICATION_DEADLINE: Date,
 *   NEXT_APPLICATION_OPEN_DATE: Date,
 *   CYCLE_YEAR: number,
 *   openStart: Date,
 *   isOpen: boolean,
 * }}
 */
const computeDemoWindowSchedule = (now = new Date()) => {
	const reference = new Date(now.getTime());
	let openStart = startOfDay(new Date(reference.getFullYear(), 0, 15));

	// If still inside a cycle that began the prior December stretch, rewind once.
	if (reference < openStart) {
		openStart = startOfDay(new Date(reference.getFullYear() - 1, 0, 15));
	}

	for (let guard = 0; guard < 36; guard += 1) {
		const deadline = endOfDay(addMonths(openStart, 1));
		const nextOpen = startOfDay(addDays(deadline, GAP_DAYS));

		if (reference < nextOpen) {
			return {
				APPLICATION_DEADLINE: deadline,
				NEXT_APPLICATION_OPEN_DATE: nextOpen,
				CYCLE_YEAR: deadline.getFullYear(),
				openStart,
				isOpen: reference < deadline,
			};
		}

		openStart = nextOpen;
	}

	const fallbackDeadline = endOfDay(addMonths(startOfDay(reference), 1));
	return {
		APPLICATION_DEADLINE: fallbackDeadline,
		NEXT_APPLICATION_OPEN_DATE: startOfDay(addDays(fallbackDeadline, GAP_DAYS)),
		CYCLE_YEAR: fallbackDeadline.getFullYear(),
		openStart: startOfDay(reference),
		isOpen: true,
	};
};

module.exports = {
	GAP_DAYS,
	computeDemoWindowSchedule,
};
