import { InterviewStatus } from '../../config/data/collections';

export interface DashboardInterview {
	id: string;
	status: string;
	startTime?: { toDate: () => Date };
	[key: string]: unknown;
}

const ACTIVE_INTERVIEW_STATUSES = new Set<string>([
	InterviewStatus.scheduled,
	InterviewStatus.invited,
	InterviewStatus.confirmed,
	InterviewStatus.inProgress,
]);

const HISTORY_INTERVIEW_STATUSES = new Set<string>([
	InterviewStatus.completed,
	InterviewStatus.missed,
	InterviewStatus.cancelled,
]);

export const isActiveInterview = (status: string) => ACTIVE_INTERVIEW_STATUSES.has(status);

export const isHistoryInterview = (status: string) => HISTORY_INTERVIEW_STATUSES.has(status);

const interviewStartMs = (interview: DashboardInterview) => {
	const startTime = interview.startTime?.toDate?.();
	return startTime && !Number.isNaN(startTime.getTime()) ? startTime.getTime() : 0;
};

export const splitApplicantInterviews = <T extends DashboardInterview>(interviews: T[]) => {
	const active = interviews.filter((interview) => isActiveInterview(interview.status));
	const history = interviews
		.filter((interview) => isHistoryInterview(interview.status))
		.sort((a, b) => interviewStartMs(b) - interviewStartMs(a));

	return { active, history };
};
