import { describe, test, expect } from 'vitest';
import { InterviewStatus } from '../config/data/collections';
import { paths } from '../config/navigation/paths';
import {
	buildInterviewRsvpUpdate,
	canAccessInterviewRoom,
	canAccessWaitingRoom,
	formatApplicantDisplayName,
	formatDailyJoinError,
	getInterviewAccessMessage,
	getInterviewReturnLabel,
	getInterviewReturnPath,
	isTerminalInterviewStatus,
} from './interviewUtils';

describe('interviewUtils', () => {
	test('getInterviewReturnPath routes members to dashboard', () => {
		expect(getInterviewReturnPath({ id: 'm1' }, null)).toBe(paths.interviewDash);
	});

	test('getInterviewReturnPath routes applicants to apply', () => {
		expect(getInterviewReturnPath(null, { id: 'a1' })).toBe(paths.apply);
	});

	test('getInterviewReturnPath falls back to redirect', () => {
		expect(getInterviewReturnPath(null, null)).toBe(paths.redirect);
	});

	test('getInterviewReturnLabel uses role-appropriate copy', () => {
		expect(getInterviewReturnLabel({ id: 'm1' }, null)).toBe('Return to Dashboard');
		expect(getInterviewReturnLabel(null, { id: 'a1' })).toBe('Return to Application');
		expect(getInterviewReturnLabel(null, null)).toBe('Continue');
	});

	test('formatApplicantDisplayName prefers callMe', () => {
		expect(formatApplicantDisplayName({ callMe: 'Alex', firstName: 'Alexander', lastName: 'Rivera' })).toBe('Alex Rivera');
		expect(formatApplicantDisplayName({ firstName: 'Jordan', lastName: 'Lee' })).toBe('Jordan Lee');
	});

	test('waiting room access is Confirmed or In Progress only', () => {
		expect(canAccessWaitingRoom(InterviewStatus.confirmed)).toBe(true);
		expect(canAccessWaitingRoom(InterviewStatus.inProgress)).toBe(true);
		expect(canAccessWaitingRoom(InterviewStatus.invited)).toBe(false);
		expect(canAccessWaitingRoom(InterviewStatus.scheduled)).toBe(false);
		expect(canAccessWaitingRoom(InterviewStatus.completed)).toBe(false);
	});

	test('interview room access is In Progress only', () => {
		expect(canAccessInterviewRoom(InterviewStatus.inProgress)).toBe(true);
		expect(canAccessInterviewRoom(InterviewStatus.confirmed)).toBe(false);
		expect(canAccessInterviewRoom(InterviewStatus.invited)).toBe(false);
	});

	test('terminal status helpers', () => {
		expect(isTerminalInterviewStatus(InterviewStatus.completed)).toBe(true);
		expect(isTerminalInterviewStatus(InterviewStatus.cancelled)).toBe(true);
		expect(isTerminalInterviewStatus(InterviewStatus.missed)).toBe(true);
		expect(isTerminalInterviewStatus(InterviewStatus.confirmed)).toBe(false);
	});

	test('access messages guide invited applicants to RSVP', () => {
		expect(getInterviewAccessMessage(InterviewStatus.invited, 'waiting')).toMatch(/confirm your attendance/i);
		expect(getInterviewAccessMessage(InterviewStatus.confirmed, 'interview')).toMatch(/waiting room/i);
		expect(getInterviewAccessMessage(InterviewStatus.completed, 'waiting')).toMatch(/concluded/i);
	});

	test('buildInterviewRsvpUpdate confirms attendance', () => {
		const update = buildInterviewRsvpUpdate('yes');
		expect(update.rsvpStatus).toBe('yes');
		expect(update.status).toBe(InterviewStatus.confirmed);
		expect(update.rsvpTimestamp).toBeInstanceOf(Date);
	});

	test('buildInterviewRsvpUpdate marks unavailable', () => {
		const update = buildInterviewRsvpUpdate('no');
		expect(update.rsvpStatus).toBe('no');
		expect(update.status).toBe(InterviewStatus.invited);
	});

	test('buildInterviewRsvpUpdate resets unknown without status change', () => {
		const update = buildInterviewRsvpUpdate('unknown');
		expect(update.rsvpStatus).toBe('unknown');
		expect(update.status).toBeUndefined();
	});

	test('formatDailyJoinError maps Daily billing code to demo copy', () => {
		expect(formatDailyJoinError({ errorMsg: 'account-missing-payment-method' })).toMatch(/temporarily unavailable/i);
		expect(formatDailyJoinError({ errorMsg: 'account-missing-payment-method' })).not.toMatch(/account-missing-payment-method/);
		expect(formatDailyJoinError({ errorMsg: 'account-missing-payment-method' })).not.toMatch(/payment method/i);
	});

	test('formatDailyJoinError keeps readable messages and softens slug codes', () => {
		expect(formatDailyJoinError(new Error('Network timeout'))).toBe('Network timeout');
		expect(formatDailyJoinError({ message: 'some-provider-code' }, 'deliberation room')).toMatch(/deliberation room/i);
	});
});
