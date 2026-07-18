/**
 * Pure video-budget math (no Firebase). Shared by videoBudget.js and unit tests.
 */

const DEFAULT_BASE_MINUTES = 10000;
const VALID_MODES = new Set(['off', '10', '50', '100']);
const THRESHOLD_PERCENTS = [50, 80, 100];

const normalizeMode = (mode) => {
	const value = String(mode ?? 'off').trim().toLowerCase();
	return VALID_MODES.has(value) ? value : 'off';
};

const normalizeBaseMinutes = (base) => {
	const n = Number(base);
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_BASE_MINUTES;
};

const normalizeVideoBudget = (raw) => ({
	mode: normalizeMode(raw?.mode),
	monthlyBaseMinutes: normalizeBaseMinutes(raw?.monthlyBaseMinutes),
});

const allowedMinutes = (budget) => {
	const { mode, monthlyBaseMinutes } = normalizeVideoBudget(budget);
	if (mode === 'off') return 0;
	return Math.floor((monthlyBaseMinutes * Number(mode)) / 100);
};

const percentUsed = (used, allowed) => {
	if (!allowed || allowed <= 0) return used > 0 ? 100 : 0;
	return Math.min(100, Math.round((used / allowed) * 1000) / 10);
};

const thresholdsCrossed = (prevUsed, nextUsed, allowed) => {
	if (!allowed || allowed <= 0) return [];
	return THRESHOLD_PERCENTS.filter((pct) => {
		const cut = (allowed * pct) / 100;
		return prevUsed < cut && nextUsed >= cut;
	});
};

const modeLabel = (mode) => {
	const m = normalizeMode(mode);
	if (m === 'off') return 'Off';
	return `${m}% of free monthly minutes`;
};

module.exports = {
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
};
