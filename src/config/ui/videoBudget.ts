/**
 * Client-side Daily video budget helpers (mirrors functions/src/videoBudget.js).
 * Used by Site Settings for display; server remains the hard gate.
 */

export type VideoBudgetMode = 'off' | '10' | '50' | '100';

export interface VideoBudget {
	mode: VideoBudgetMode;
	monthlyBaseMinutes: number;
}

export const VIDEO_BUDGET_MODES = [
	{ value: 'off', label: 'Off — block all live video' },
	{ value: '10', label: '10% of free monthly minutes (1,000)' },
	{ value: '50', label: '50% of free monthly minutes (5,000)' },
	{ value: '100', label: '100% of free monthly minutes (10,000)' },
];

export const DEFAULT_VIDEO_BUDGET: VideoBudget = {
	mode: 'off',
	monthlyBaseMinutes: 10000,
};

export const normalizeVideoBudget = (raw: Partial<VideoBudget> | null | undefined): VideoBudget => {
	const mode = String(raw?.mode ?? 'off').trim().toLowerCase();
	const valid: VideoBudgetMode = mode === 'off' || mode === '10' || mode === '50' || mode === '100' ? mode : 'off';
	const base = Number(raw?.monthlyBaseMinutes);
	return {
		mode: valid,
		monthlyBaseMinutes: Number.isFinite(base) && base > 0 ? Math.floor(base) : 10000,
	};
};

export const allowedVideoMinutes = (budget: Partial<VideoBudget> | null | undefined): number => {
	const { mode, monthlyBaseMinutes } = normalizeVideoBudget(budget);
	if (mode === 'off') return 0;
	return Math.floor((monthlyBaseMinutes * Number(mode)) / 100);
};

export const percentVideoUsed = (used: number, allowed: number): number => {
	if (!allowed || allowed <= 0) return used > 0 ? 100 : 0;
	return Math.min(100, Math.round((used / allowed) * 1000) / 10);
};

export const ensureVideoBudgetDefaults = <T extends Record<string, unknown> | null | undefined>(settings: T): T => {
	if (!settings || typeof settings !== 'object') return settings;
	return {
		...settings,
		videoBudget: normalizeVideoBudget((settings as { videoBudget?: Partial<VideoBudget> }).videoBudget || DEFAULT_VIDEO_BUDGET),
	};
};
