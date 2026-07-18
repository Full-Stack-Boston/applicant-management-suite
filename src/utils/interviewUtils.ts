import { InterviewStatus } from '../config/data/collections';
import { paths } from '../config/navigation/paths';

export type RsvpResponse = 'yes' | 'no' | 'unknown';

export const TERMINAL_INTERVIEW_STATUSES: string[] = [InterviewStatus.completed, InterviewStatus.cancelled, InterviewStatus.missed];

export const getInterviewReturnPath = (member: Record<string, unknown> | null, applicant: Record<string, unknown> | null): string => {
	if (member) return paths.interviewDash;
	if (applicant) return paths.apply;
	return paths.redirect;
};

export const getInterviewReturnLabel = (member: Record<string, unknown> | null, applicant: Record<string, unknown> | null): string => {
	if (member) return 'Return to Dashboard';
	if (applicant) return 'Return to Application';
	return 'Continue';
};

export const formatApplicantDisplayName = (applicant: { callMe?: string; firstName?: string; lastName?: string } | null | undefined): string => {
	if (!applicant) return '';
	const given = (applicant.callMe || applicant.firstName || '').trim();
	const last = (applicant.lastName || '').trim();
	return `${given} ${last}`.trim();
};

/** Waiting room is for Confirmed applicants standing by; In Progress should hop straight to the interview. */
export const canAccessWaitingRoom = (status: string | null | undefined): boolean => status === InterviewStatus.confirmed || status === InterviewStatus.inProgress;

/** Live interview call only when status is In Progress. */
export const canAccessInterviewRoom = (status: string | null | undefined): boolean => status === InterviewStatus.inProgress;

export const isTerminalInterviewStatus = (status: string | null | undefined): boolean => TERMINAL_INTERVIEW_STATUSES.includes(status as string);

type DailyLikeError = {
	message?: string;
	errorMsg?: string;
	details?: string;
	error?: { msg?: string; type?: string };
};

const DAILY_JOIN_ERROR_MESSAGES: Record<string, string> = {
	'account-missing-payment-method':
		'Live video is temporarily unavailable. Please try again later, or contact the site administrator if you need to join a call.',
	'no-room': 'This video room is not available right now. Ask a host to open it, then try again.',
	'nbf-room': 'This video room is not open yet. Please try again closer to the scheduled time.',
	'exp-room': 'This video room has expired. Ask a host to open a new room.',
	'ejected': 'You were removed from this video room.',
};

const extractDailyErrorText = (err: unknown): string => {
	const e = (err || {}) as DailyLikeError;
	return String(e.message || e.errorMsg || e.error?.msg || e.details || e.error?.type || '').trim();
};

/**
 * Map Daily / join failures to demo-friendly copy.
 * Keeps raw provider codes out of the UI while preserving a useful fallback.
 */
export const formatDailyJoinError = (err: unknown, roomLabel = 'video room'): string => {
	const raw = extractDailyErrorText(err);
	if (!raw) return `Could not join the ${roomLabel}.`;

	const normalized = raw.toLowerCase();
	for (const [code, message] of Object.entries(DAILY_JOIN_ERROR_MESSAGES)) {
		if (normalized.includes(code)) return message;
	}

	// Hide other provider slug codes (kebab-case) behind a generic line.
	if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(normalized)) {
		return `Could not join the ${roomLabel}. Please try again in a moment.`;
	}

	return raw;
};

/** Human-readable access denial for waiting / interview rooms. */
export const getInterviewAccessMessage = (status: string | null | undefined, room: 'waiting' | 'interview'): string => {
	if (!status) return 'This interview could not be loaded.';
	if (isTerminalInterviewStatus(status)) {
		if (status === InterviewStatus.completed) return 'This interview has already concluded.';
		if (status === InterviewStatus.cancelled) return 'This interview was cancelled.';
		if (status === InterviewStatus.missed) return 'This interview was marked as missed.';
	}
	if (status === InterviewStatus.invited) {
		return room === 'waiting'
			? 'Please confirm your attendance first. Use the Confirm Attendance link in your invitation email, then return here.'
			: 'This interview has not been confirmed yet. Please confirm attendance from your invitation email.';
	}
	if (status === InterviewStatus.scheduled) {
		return 'This interview has been scheduled but invitations have not been sent yet. Please check back after you receive your invite.';
	}
	if (room === 'interview' && status === InterviewStatus.confirmed) {
		return 'The interview has not started yet. Please use the waiting room until the committee is ready.';
	}
	return `This interview is not available right now (status: ${status}).`;
};

/** RSVP field updates shared by applicants, admins, and the email RSVP page. */
export const buildInterviewRsvpUpdate = (rsvpStatus: RsvpResponse): Record<string, unknown> => {
	const update: Record<string, unknown> = {
		rsvpStatus,
		rsvpTimestamp: new Date(),
	};

	if (rsvpStatus === 'yes') {
		update.status = InterviewStatus.confirmed;
	} else if (rsvpStatus === 'no') {
		update.status = InterviewStatus.invited;
	}

	return update;
};
