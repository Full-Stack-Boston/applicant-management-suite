const { computeDemoWindowSchedule, GAP_DAYS } = require('../../../functions/src/demoWindowSchedule');

describe('computeDemoWindowSchedule', () => {
	it('uses a one-month open window and five-day gap from the January 15 anchor', () => {
		const midOpen = computeDemoWindowSchedule(new Date(2026, 0, 20, 12, 0, 0)); // Jan 20
		expect(midOpen.isOpen).toBe(true);
		expect(midOpen.openStart.getFullYear()).toBe(2026);
		expect(midOpen.openStart.getMonth()).toBe(0);
		expect(midOpen.openStart.getDate()).toBe(15);
		expect(midOpen.APPLICATION_DEADLINE.getMonth()).toBe(1); // February
		expect(midOpen.APPLICATION_DEADLINE.getDate()).toBe(15);
		expect(midOpen.NEXT_APPLICATION_OPEN_DATE.getMonth()).toBe(1);
		expect(midOpen.NEXT_APPLICATION_OPEN_DATE.getDate()).toBe(15 + GAP_DAYS);
		expect(midOpen.CYCLE_YEAR).toBe(2026);
	});

	it('shows the closed gap after deadline before next open', () => {
		const inGap = computeDemoWindowSchedule(new Date(2026, 1, 17, 12, 0, 0)); // Feb 17
		expect(inGap.isOpen).toBe(false);
		expect(inGap.APPLICATION_DEADLINE.getMonth()).toBe(1);
		expect(inGap.APPLICATION_DEADLINE.getDate()).toBe(15);
		expect(inGap.NEXT_APPLICATION_OPEN_DATE.getMonth()).toBe(1);
		expect(inGap.NEXT_APPLICATION_OPEN_DATE.getDate()).toBe(20);
	});

	it('reopens on the next cycle start (day drifts by the gap)', () => {
		const reopened = computeDemoWindowSchedule(new Date(2026, 1, 20, 9, 0, 0)); // Feb 20
		expect(reopened.isOpen).toBe(true);
		expect(reopened.openStart.getMonth()).toBe(1);
		expect(reopened.openStart.getDate()).toBe(20);
		expect(reopened.APPLICATION_DEADLINE.getMonth()).toBe(2); // March
		expect(reopened.APPLICATION_DEADLINE.getDate()).toBe(20);
	});
});
