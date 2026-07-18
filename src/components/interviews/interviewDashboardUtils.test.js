import { InterviewStatus } from '../../config/data/collections';
import { isActiveInterview, isHistoryInterview, splitApplicantInterviews } from './interviewDashboardUtils';

describe('interviewDashboardUtils', () => {
	it('splits active invites from past interviews', () => {
		const interviews = [
			{ id: '1', status: InterviewStatus.confirmed, startTime: { toDate: () => new Date('2026-07-07T21:15:00Z') } },
			{ id: '2', status: InterviewStatus.completed, startTime: { toDate: () => new Date('2025-07-07T21:15:00Z') } },
			{ id: '3', status: InterviewStatus.missed, startTime: { toDate: () => new Date('2024-07-07T21:15:00Z') } },
		];

		const { active, history } = splitApplicantInterviews(interviews);

		expect(active).toHaveLength(1);
		expect(history).toHaveLength(2);
		expect(isActiveInterview(InterviewStatus.invited)).toBe(true);
		expect(isHistoryInterview(InterviewStatus.completed)).toBe(true);
		expect(history[0].id).toBe('2');
	});
});
