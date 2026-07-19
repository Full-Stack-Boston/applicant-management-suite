/**
 * Coerce Firestore Timestamps, Date, ISO strings, and epoch values to Date.
 * Keeps demo window rotation (Timestamp writes) compatible with UI and app reads.
 */

export type DateLike =
	| Date
	| string
	| number
	| { toDate: () => Date }
	| { seconds: number; nanoseconds?: number }
	| { _seconds: number; _nanoseconds?: number };

export const SITE_CONFIG_DATE_KEYS = [
	'APPLICATION_DEADLINE',
	'NEXT_APPLICATION_OPEN_DATE',
	'DEMO_WINDOW_LAST_ROTATED_AT',
] as const;

export const toJsDate = (value: unknown): Date | null => {
	if (value == null || value === '') return null;

	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value;
	}

	if (typeof value === 'object') {
		const candidate = value as {
			toDate?: () => Date;
			seconds?: number;
			nanoseconds?: number;
			_seconds?: number;
			_nanoseconds?: number;
		};

		if (typeof candidate.toDate === 'function') {
			try {
				const dated = candidate.toDate();
				return dated instanceof Date && !Number.isNaN(dated.getTime()) ? dated : null;
			} catch {
				return null;
			}
		}

		const seconds =
			typeof candidate.seconds === 'number'
				? candidate.seconds
				: typeof candidate._seconds === 'number'
					? candidate._seconds
					: null;

		if (seconds != null) {
			const millis =
				seconds * 1000 +
				Math.floor((candidate.nanoseconds ?? candidate._nanoseconds ?? 0) / 1e6);
			const dated = new Date(millis);
			return Number.isNaN(dated.getTime()) ? null : dated;
		}
	}

	if (typeof value === 'string' || typeof value === 'number') {
		const dated = new Date(value);
		return Number.isNaN(dated.getTime()) ? null : dated;
	}

	return null;
};

export const isFirestoreDateLike = (value: unknown): boolean => {
	if (value instanceof Date) return true;
	if (!value || typeof value !== 'object') return false;
	const candidate = value as { toDate?: unknown; seconds?: unknown; _seconds?: unknown };
	return (
		typeof candidate.toDate === 'function' ||
		typeof candidate.seconds === 'number' ||
		typeof candidate._seconds === 'number'
	);
};

export const normalizeSiteConfigDates = <T extends Record<string, unknown>>(config: T): T => {
	const next = { ...config };
	for (const key of SITE_CONFIG_DATE_KEYS) {
		if (!(key in next)) continue;
		const dated = toJsDate(next[key]);
		if (dated) {
			(next as Record<string, unknown>)[key] = dated;
		}
	}
	return next;
};
