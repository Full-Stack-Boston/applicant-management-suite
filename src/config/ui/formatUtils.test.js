import {
	formatRelativeTime,
	isListValuePresent,
	listDisplayValue,
	formatApplicantEnrollmentLines,
	LIST_MISSING_LABEL,
} from './formatUtils';

describe('formatUtils', () => {
	beforeEach(() => {
		jest.useFakeTimers().setSystemTime(new Date('2026-07-16T12:00:00Z'));
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('formatRelativeTime', () => {
		it('returns just now for future and sub-minute diffs', () => {
			expect(formatRelativeTime(new Date('2026-07-16T12:00:30Z'))).toBe('just now');
			expect(formatRelativeTime(new Date('2026-07-16T11:59:30Z'))).toBe('just now');
		});

		it('formats minutes, hours, days, weeks, and months', () => {
			expect(formatRelativeTime(new Date('2026-07-16T11:45:00Z'))).toBe('15 min ago');
			expect(formatRelativeTime(new Date('2026-07-16T10:00:00Z'))).toBe('2 hrs ago');
			expect(formatRelativeTime(new Date('2026-07-16T11:00:00Z'))).toBe('1 hr ago');
			expect(formatRelativeTime(new Date('2026-07-14T12:00:00Z'))).toBe('2 days ago');
			expect(formatRelativeTime(new Date('2026-07-15T12:00:00Z'))).toBe('1 day ago');
			expect(formatRelativeTime(new Date('2026-07-08T12:00:00Z'))).toBe('1 week ago');
			expect(formatRelativeTime(new Date('2026-06-25T12:00:00Z'))).toBe('3 weeks ago');
			expect(formatRelativeTime(new Date('2026-06-01T12:00:00Z'))).toBe('1 month ago');
			expect(formatRelativeTime(new Date('2026-04-01T12:00:00Z'))).toBe('3 months ago');
		});
	});

	describe('isListValuePresent / listDisplayValue', () => {
		it('treats empty and sentinel strings as missing', () => {
			expect(isListValuePresent(null)).toBe(false);
			expect(isListValuePresent(undefined)).toBe(false);
			expect(isListValuePresent('')).toBe(false);
			expect(isListValuePresent('  ')).toBe(false);
			expect(isListValuePresent('undefined')).toBe(false);
			expect(isListValuePresent('null')).toBe(false);
			expect(isListValuePresent('NaN')).toBe(false);
			expect(isListValuePresent('Boston U')).toBe(true);
		});

		it('returns fallback when missing', () => {
			expect(listDisplayValue(null)).toBe(LIST_MISSING_LABEL);
			expect(listDisplayValue('  CS  ')).toBe('CS');
			expect(listDisplayValue('', 'N/A')).toBe('N/A');
		});
	});

	describe('formatApplicantEnrollmentLines', () => {
		it('returns missing school when nothing present', () => {
			expect(formatApplicantEnrollmentLines(null, null, null)).toEqual({
				schoolLine: LIST_MISSING_LABEL,
				detailLine: null,
			});
		});

		it('returns school only with missing detail when no major/year', () => {
			expect(formatApplicantEnrollmentLines('MIT', null, null)).toEqual({
				schoolLine: 'MIT',
				detailLine: LIST_MISSING_LABEL,
			});
		});

		it('combines major and year when present', () => {
			expect(formatApplicantEnrollmentLines('MIT', 'CS', 2027)).toEqual({
				schoolLine: 'MIT',
				detailLine: 'CS (2027)',
			});
			expect(formatApplicantEnrollmentLines(null, 'CS', null)).toEqual({
				schoolLine: LIST_MISSING_LABEL,
				detailLine: `CS (${LIST_MISSING_LABEL})`,
			});
		});
	});
});
