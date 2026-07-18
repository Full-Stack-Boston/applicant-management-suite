/** Relative time labels for presence / last-login cells (PF parity). */
export function formatRelativeTime(date: Date): string {
	const diff = Date.now() - date.getTime();
	if (diff < 0) return 'just now';

	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes} min ago`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;

	const days = Math.floor(hours / 24);
	if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
	if (days < 14) return '1 week ago';
	if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
	if (days < 60) return '1 month ago';

	return `${Math.floor(days / 30)} months ago`;
}

export const LIST_MISSING_LABEL = 'None';

export const isListValuePresent = (value: unknown): boolean => {
	if (value === null || value === undefined) return false;
	const str = String(value).trim();
	return Boolean(str && str !== 'undefined' && str !== 'null' && str !== 'NaN');
};

/** Cosmetic list placeholder for missing applicant/profile fields. */
export const listDisplayValue = (value: unknown, fallback = LIST_MISSING_LABEL): string => {
	if (!isListValuePresent(value)) return fallback;
	return String(value).trim();
};

export const formatApplicantEnrollmentLines = (
	school: unknown,
	major: unknown,
	gradYear: unknown,
): { schoolLine: string; detailLine: string | null } => {
	const hasSchool = isListValuePresent(school);
	const hasMajor = isListValuePresent(major);
	const hasYear = isListValuePresent(gradYear);

	if (!hasSchool && !hasMajor && !hasYear) {
		return { schoolLine: LIST_MISSING_LABEL, detailLine: null };
	}

	const schoolLine = hasSchool ? listDisplayValue(school) : LIST_MISSING_LABEL;
	if (!hasMajor && !hasYear) {
		return { schoolLine, detailLine: LIST_MISSING_LABEL };
	}

	const majorLabel = hasMajor ? listDisplayValue(major) : LIST_MISSING_LABEL;
	const yearLabel = hasYear ? listDisplayValue(gradYear) : LIST_MISSING_LABEL;
	return { schoolLine, detailLine: `${majorLabel} (${yearLabel})` };
};

