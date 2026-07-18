import { describe, expect, it } from 'vitest';
import { accentColorOptions, getAccentColorOption, normalizeAccentColorKey } from './accentColors';

describe('accentColors', () => {
	it('uses institutional AMS accent color names', () => {
		expect(accentColorOptions).toHaveLength(5);
		expect(getAccentColorOption('green')?.brandName).toBe('Forest Green');
		expect(getAccentColorOption('blue')?.brandName).toBe('Ocean Blue');
		expect(getAccentColorOption('teal')?.brandName).toBe('Deep Teal');
		expect(getAccentColorOption('brown')?.brandName).toBe('Slate');
		expect(getAccentColorOption('yellow2')?.brandName).toBe('Amber');
		expect(getAccentColorOption('red')).toBeUndefined();
	});

	it('uses the same concise label for menus and tooltips', () => {
		for (const option of accentColorOptions) {
			expect(option.menuLabel).toBe(option.brandName);
			expect(option.tooltip).toBe(option.brandName);
		}
	});

	it('normalizes legacy accent keys', () => {
		expect(normalizeAccentColorKey('red')).toBe('teal');
		expect(normalizeAccentColorKey('yellow')).toBe('yellow2');
		expect(normalizeAccentColorKey('blue')).toBe('blue');
		expect(normalizeAccentColorKey('nope')).toBe('green');
		expect(normalizeAccentColorKey(null)).toBe('green');
	});
});
