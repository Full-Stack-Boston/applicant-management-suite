import { formatDateTimeLocal, formatPlaceAddress } from './displayFormat';

describe('displayFormat', () => {
	it('formats valid dates and preserves invalid values', () => {
		expect(formatDateTimeLocal(undefined)).toBe('');
		expect(formatDateTimeLocal(null)).toBe('');
		expect(formatDateTimeLocal('')).toBe('');
		expect(formatDateTimeLocal('2026-02-15T17:00:00.000Z')).toMatch(/Feb 15, 2026/);
		expect(formatDateTimeLocal(new Date('invalid'))).toBe('Invalid Date');
	});

	it('formats strings and Google Places values without country suffixes', () => {
		expect(formatPlaceAddress()).toBe('');
		expect(formatPlaceAddress(null)).toBe('');
		expect(formatPlaceAddress('42 Main St, Boston, USA')).toBe('42 Main St, Boston');
		expect(formatPlaceAddress('42 Main St, Boston, United States')).toBe('42 Main St, Boston');
		expect(formatPlaceAddress({ structured_formatting: { main_text: '42 Main St', secondary_text: 'Boston, USA' } })).toBe('42 Main St, Boston');
		expect(formatPlaceAddress({ structured_formatting: { main_text: '42 Main St' } })).toBe('42 Main St');
		expect(formatPlaceAddress({ description: 'Boston, United States' })).toBe('Boston');
		expect(formatPlaceAddress({})).toBe('');
	});
});
