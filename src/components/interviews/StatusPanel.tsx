import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Divider, CircularProgress, Chip, keyframes } from '@mui/material';
import { getRealTimeMeetings } from '../../config/data/firebase';
import { InterviewStatus } from '../../config/data/collections';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';
import { useTheme } from '../../context/ThemeContext';
import { dashboardModuleSurfaceSx, dashboardSectionTitleSx } from '../../config/ui/adminPageStyles';

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const interviewSlotSx = {
	mb: 1.25,
	width: '100%',
	border: '1px solid',
	borderColor: 'divider',
	borderRadius: '10px',
	bgcolor: 'transparent',
	px: 1.5,
	py: 1.25,
} as const;

interface SummaryData {
	scheduled: number;
	remaining: number;
	completed: number;
	missed: number;
	scheduleDays: string[];
}

interface InterviewSummaryProps {
	summary: SummaryData | null;
}

const InterviewSummary = ({ summary }: InterviewSummaryProps) => {
	if (!summary) return null;

	return (
		<Box sx={{ mb: 1.25 }}>
			<Box
				sx={{
					display: 'flex',
					flexWrap: 'wrap',
					gap: 0.75,
				}}>
				<Chip size='small' label={`Scheduled: ${summary.scheduled}`} color='primary' variant='outlined' />
				<Chip size='small' label={`Remaining: ${summary.remaining}`} color='info' variant='outlined' />
				<Chip size='small' label={`Completed: ${summary.completed}`} color='success' variant='outlined' />
				<Chip size='small' label={`Missed: ${summary.missed}`} color='error' variant='outlined' />
			</Box>
			{summary.scheduleDays.length > 0 && (
				<Typography
					variant='caption'
					sx={{
						color: 'text.active',
						display: 'block',
						mt: 0.75,
					}}>
					Schedule covers: {summary.scheduleDays.join(', ')}
				</Typography>
			)}
		</Box>
	);
};

export interface MeetingItem {
	id: string;
	displayName?: string;
	status: string;
	startTime: { toDate: () => Date };
	endTime?: { toDate: () => Date };
	deliberation?: boolean;
	[key: string]: unknown;
}

export type InterviewSlotKind = 'completed' | 'inProgress' | 'upcoming' | 'empty';

export interface InterviewSlot {
	kind: InterviewSlotKind;
	label: string;
	interview: MeetingItem | null;
	emptyMessage: string;
}

const isPastStatus = (status: string) => status === InterviewStatus.completed || status === InterviewStatus.missed;
const isUpcomingStatus = (status: string) => status === InterviewStatus.confirmed || status === InterviewStatus.scheduled;

const byStartAsc = (a: MeetingItem, b: MeetingItem) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime();
const byStartDesc = (a: MeetingItem, b: MeetingItem) => b.startTime.toDate().getTime() - a.startTime.toDate().getTime();

const NO_FUTURE_MESSAGE = 'No interviews remain in the future.';

/**
 * Always return three dashboard slots:
 * - With live interview: Just Finished | In Progress | On Deck
 * - With future interviews: Just Finished / Up Next / On Deck (or three upcoming if no past)
 * - With no future interviews: keep Up Next / On Deck as placeholders (never backfill with past)
 */
export const buildInterviewSlots = (interviews: MeetingItem[], now: Date = new Date()): InterviewSlot[] => {
	const nowMs = now.getTime();
	const past = interviews.filter((m) => isPastStatus(m.status)).sort(byStartDesc);
	const upcoming = interviews
		.filter((m) => isUpcomingStatus(m.status) && m.startTime.toDate().getTime() >= nowMs)
		.sort(byStartAsc);
	const inProgress = interviews.find((m) => m.status === InterviewStatus.inProgress) ?? null;

	const used = new Set<string>();
	const take = (pool: MeetingItem[]) => {
		const next = pool.find((m) => !used.has(m.id));
		if (next) used.add(next.id);
		return next ?? null;
	};

	const slot = (kind: InterviewSlotKind, label: string, interview: MeetingItem | null, emptyMessage: string): InterviewSlot => ({
		kind,
		label,
		interview,
		emptyMessage,
	});

	if (inProgress) {
		used.add(inProgress.id);
		return [
			slot('completed', 'Just Finished', take(past), 'No recent interviews.'),
			slot('inProgress', 'In Progress', inProgress, 'None in progress.'),
			slot('upcoming', 'On Deck', take(upcoming), NO_FUTURE_MESSAGE),
		];
	}

	if (past.length === 0 && upcoming.length > 0) {
		return [
			slot('upcoming', 'Up Next', take(upcoming), NO_FUTURE_MESSAGE),
			slot('upcoming', 'On Deck', take(upcoming), NO_FUTURE_MESSAGE),
			slot('upcoming', 'Following', take(upcoming), NO_FUTURE_MESSAGE),
		];
	}

	return [
		slot('completed', 'Just Finished', take(past), 'No recent interviews.'),
		slot('upcoming', 'Up Next', take(upcoming), NO_FUTURE_MESSAGE),
		slot('upcoming', 'On Deck', take(upcoming), NO_FUTURE_MESSAGE),
	];
};

interface InterviewSlotCardProps {
	slot: InterviewSlot;
	onJoin?: (interviewId: string) => void;
}

const InterviewSlotCard = ({ slot, onJoin }: InterviewSlotCardProps) => {
	const isLive = slot.kind === 'inProgress' && Boolean(slot.interview);

	return (
		<Box sx={{ ...interviewSlotSx, ...(isLive ? { borderColor: 'success.main' } : {}) }}>
			<Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
				{slot.label}
			</Typography>
			{slot.interview ? (
				<>
					<Typography variant='body2' sx={{ fontWeight: 600, mt: 0.35 }}>
						{slot.interview.displayName || 'Interview'}
					</Typography>
					{slot.kind === 'inProgress' ? (
						<Button fullWidth size='small' variant='contained' color='success' sx={{ mt: 1 }} onClick={() => onJoin?.(slot.interview!.id)}>
							Join Now
						</Button>
					) : slot.kind === 'upcoming' ? (
						<Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.25 }}>
							Scheduled: {dayjs(slot.interview.startTime.toDate()).format('ddd, MM/DD @ h:mm A')}
						</Typography>
					) : (
						<Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.25 }}>
							Status: {slot.interview.status}
							{slot.interview.startTime ? ` · ${dayjs(slot.interview.startTime.toDate()).format('ddd, MM/DD @ h:mm A')}` : ''}
						</Typography>
					)}
				</>
			) : (
				<Typography variant='body2' color='text.secondary' sx={{ mt: 0.35 }}>
					{slot.emptyMessage}
				</Typography>
			)}
		</Box>
	);
};

interface InterviewStatusPanelProps {
	variant?: 'default' | 'dashboard';
}

export default function InterviewStatusPanel({ variant = 'default' }: InterviewStatusPanelProps) {
	const { boxShadow } = useTheme();
	const { user } = useAuth();
	const navigate = useNavigate();

	const [interviews, setInterviews] = useState<MeetingItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

	useEffect(() => {
		if (!user) return;
		setLoading(true);

		const unsubscribe = getRealTimeMeetings(user.uid, true, (raw: unknown) => {
			const updatedMeetings = raw as MeetingItem[];
			const nextInterviews = updatedMeetings.filter((m) => m.deliberation !== true);
			const scheduled = nextInterviews.filter((m) => m.status === InterviewStatus.scheduled || m.status === InterviewStatus.confirmed).length;
			const completed = nextInterviews.filter((m) => m.status === InterviewStatus.completed).length;
			const missed = nextInterviews.filter((m) => m.status === InterviewStatus.missed).length;

			const scheduleDays = [
				...new Set(
					nextInterviews
						.filter((m) => m.status === InterviewStatus.scheduled || m.status === InterviewStatus.confirmed)
						.map((m) => dayjs(m.startTime.toDate()).format('ddd, MMM D'))
				),
			];

			setSummaryData({
				scheduled,
				completed,
				missed,
				remaining: scheduled,
				scheduleDays,
			});
			setInterviews(nextInterviews);
			setLoading(false);
		});

		return () => unsubscribe();
	}, [user]);

	const slots = useMemo(() => buildInterviewSlots(interviews), [interviews]);
	const inProgressInterview = slots.find((slot) => slot.kind === 'inProgress')?.interview ?? null;

	const handleJoinInterview = (interviewId: string) => {
		if (!interviewId) return;
		navigate(`/interviews/interview-room/${interviewId}`);
	};

	const handleJoinDeliberation = () => {
		navigate('/interviews/deliberation-room');
	};

	if (loading) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
				<CircularProgress />
			</Box>
		);
	}

	return (
		<Box
			sx={{
				...(variant === 'dashboard' ? dashboardModuleSurfaceSx : { px: 2, py: 1.5, boxShadow, borderRadius: '12px' }),
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'flex-start',
				alignItems: 'stretch',
				width: '100%',
				height: variant === 'dashboard' ? '100%' : 'auto',
				minHeight: variant === 'dashboard' ? 0 : undefined,
				overflow: variant === 'dashboard' ? 'auto' : 'visible',
				bgcolor: 'background.paper',
			}}>
			<Typography sx={{ ...dashboardSectionTitleSx, alignSelf: 'start' }}>LIVE INTERVIEW STATUS</Typography>
			<InterviewSummary summary={summaryData} />
			<Divider sx={{ mb: 1.25, width: '100%' }} />
			{slots.map((slot, index) => (
				<InterviewSlotCard key={`${slot.label}-${slot.interview?.id ?? index}`} slot={slot} onJoin={handleJoinInterview} />
			))}
			<Button fullWidth size='small' variant='contained' onClick={handleJoinDeliberation} sx={{ animation: `${pulse} 2s ease-in-out infinite`, mt: 0.5 }}>
				{inProgressInterview ? 'Wait in Deliberation Room' : 'Join Deliberation Room'}
			</Button>
		</Box>
	);
}
