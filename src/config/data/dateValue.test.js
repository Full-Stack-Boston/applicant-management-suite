import { toJsDate, isFirestoreDateLike, normalizeSiteConfigDates } from './dateValue';

describe('dateValue', () => {
	it('coerces Date, ISO string, and epoch ms', () => {
		const fromDate = new Date('2026-02-15T17:00:00.000Z');
		expect(toJsDate(fromDate)?.toISOString()).toBe(fromDate.toISOString());
		expect(toJsDate('2026-02-15T17:00:00.000Z')?.toISOString()).toBe(fromDate.toISOString());
		expect(toJsDate(fromDate.getTime())?.toISOString()).toBe(fromDate.toISOString());
	});

	it('coerces Firestore Timestamp-like values with toDate()', () => {
		const expected = new Date('2026-02-15T17:00:00.000Z');
		const stamp = { toDate: () => expected, seconds: 1771174800, nanoseconds: 0 };
		expect(isFirestoreDateLike(stamp)).toBe(true);
		expect(toJsDate(stamp)?.toISOString()).toBe(expected.toISOString());
	});

	it('coerces plain seconds / _seconds objects', () => {
		const expected = new Date('2026-02-15T17:00:00.000Z');
		const seconds = Math.floor(expected.getTime() / 1000);
		expect(toJsDate({ seconds, nanoseconds: 0 })?.getTime()).toBe(expected.getTime());
		expect(toJsDate({ _seconds: seconds, _nanoseconds: 0 })?.getTime()).toBe(expected.getTime());
	});

	it('returns null for invalid or empty values', () => {
		expect(toJsDate(null)).toBeNull();
		expect(toJsDate('')).toBeNull();
		expect(toJsDate('not-a-date')).toBeNull();
		expect(toJsDate({})).toBeNull();
		expect(isFirestoreDateLike({})).toBe(false);
	});

	it('normalizes known site config date keys to Date instances', () => {
		const deadline = new Date('2026-02-15T17:00:00.000Z');
		const nextOpen = new Date('2026-02-20T14:00:00.000Z');
		const rotatedAt = new Date('2026-02-16T10:00:00.000Z');
		const normalized = normalizeSiteConfigDates({
			APPLICATION_DEADLINE: { toDate: () => deadline },
			NEXT_APPLICATION_OPEN_DATE: { seconds: Math.floor(nextOpen.getTime() / 1000), nanoseconds: 0 },
			DEMO_WINDOW_LAST_ROTATED_AT: rotatedAt.toISOString(),
			CYCLE_YEAR: 2026,
			emailDeliveryMode: 'demo',
		});

		expect(normalized.APPLICATION_DEADLINE).toBeInstanceOf(Date);
		expect(normalized.APPLICATION_DEADLINE.toISOString()).toBe(deadline.toISOString());
		expect(normalized.NEXT_APPLICATION_OPEN_DATE).toBeInstanceOf(Date);
		expect(normalized.NEXT_APPLICATION_OPEN_DATE.toISOString()).toBe(nextOpen.toISOString());
		expect(normalized.DEMO_WINDOW_LAST_ROTATED_AT).toBeInstanceOf(Date);
		expect(normalized.CYCLE_YEAR).toBe(2026);
		expect(normalized.emailDeliveryMode).toBe('demo');
	});
});
