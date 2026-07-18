import { describe, test, expect } from 'vitest';
import {
	VIDEO_BUDGET_MODES,
	DEFAULT_VIDEO_BUDGET,
	normalizeVideoBudget,
	allowedVideoMinutes,
	percentVideoUsed,
	ensureVideoBudgetDefaults,
} from './videoBudget';

describe('videoBudget client helpers', () => {
	test('exposes Off / 10 / 50 / 100 modes', () => {
		expect(VIDEO_BUDGET_MODES.map((m) => m.value)).toEqual(['off', '10', '50', '100']);
	});

	test('allowedVideoMinutes matches Daily free-tier fractions', () => {
		expect(allowedVideoMinutes({ mode: 'off' })).toBe(0);
		expect(allowedVideoMinutes({ mode: '10', monthlyBaseMinutes: 10000 })).toBe(1000);
		expect(allowedVideoMinutes({ mode: '50' })).toBe(5000);
		expect(allowedVideoMinutes({ mode: '100' })).toBe(10000);
	});

	test('ensureVideoBudgetDefaults fills missing budget', () => {
		const next = ensureVideoBudgetDefaults({ CONFIG_ID: 'x' });
		expect(next.videoBudget).toEqual(DEFAULT_VIDEO_BUDGET);
	});

	test('normalize and percent helpers', () => {
		expect(normalizeVideoBudget({ mode: '50' }).mode).toBe('50');
		expect(percentVideoUsed(500, 1000)).toBe(50);
	});
});
