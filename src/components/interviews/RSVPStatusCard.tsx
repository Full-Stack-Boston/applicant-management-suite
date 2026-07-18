import { doc, updateDoc, type DocumentData, type UpdateData } from 'firebase/firestore';
import { db, generateICSDownloadURL, getRealTimeMeetings } from '../../config/data/firebase';
import { Box, Typography, Button, Menu, MenuItem, Paper, Stack } from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { InterviewStatus } from '../../config/data/collections';
import dayjs from 'dayjs';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { useNavigate } from 'react-router-dom';
import { buildInterviewRsvpUpdate } from '../../utils/interviewUtils';
import { getRsvpCapsuleSx } from '../../config/ui/statusCapsuleStyles';
import { StatusCapsule } from '../list/StatusCapsule';
import {
	homeApplicantCardSx,
	homeApplicantCardListSx,
	homeApplicantSectionTitleSx,
	homeAuthSecondaryButtonSx,
	homeAuthSubmitButtonSx,
} from '../home/homePageStyles';
import InterviewHistoryRow from './InterviewHistoryRow';
import { splitApplicantInterviews, type DashboardInterview } from './interviewDashboardUtils';

interface InterviewItem extends DashboardInterview {
	rsvpStatus: 'yes' | 'no' | 'unknown';
}

const headerMessages: Record<string, string> = {
	unknown: 'Your interview is scheduled. Please confirm your attendance.',
	yes: 'Your interview is scheduled and confirmed.',
	no: 'Interviews are required. Accept the time if you can; contact us only if rescheduling is essential and we will do our best.',
};

const interviewTimeNotes = ['Start time is approximate.', 'Typical duration is about 15 minutes.'] as const;

const rsvpLabels: Record<string, string> = {
	yes: 'RSVP: Confirmed',
	no: 'RSVP: Unavailable',
};

const detailIconSx = {
	fontSize: 20,
	mt: 0.15,
	flexShrink: 0,
	color: (theme: { palette: { contentAccent?: { main: string }; primary: { main: string } } }) =>
		theme.palette.contentAccent?.main ?? theme.palette.primary.main,
} as const;

const detailRowSx = {
	display: 'flex',
	alignItems: 'flex-start',
	gap: 1.25,
	minWidth: 0,
} as const;

const detailLabelSx = {
	display: 'block',
	letterSpacing: '0.08em',
	fontWeight: 700,
	fontSize: '0.62rem',
	textTransform: 'uppercase',
	color: 'text.secondary',
	mb: 0.35,
} as const;

interface DetailRowProps {
	icon: ReactNode;
	label: string;
	children: ReactNode;
}

const DetailRow = ({ icon, label, children }: DetailRowProps) => (
	<Box sx={detailRowSx}>
		{icon}
		<Box sx={{ minWidth: 0, flex: 1 }}>
			<Typography component='span' sx={detailLabelSx}>
				{label}
			</Typography>
			{children}
		</Box>
	</Box>
);

const cardRowSx = {
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'flex-start',
	gap: 2,
	width: '100%',
} as const;

const InterviewScheduleNotes = () => (
	<Box sx={{ textAlign: { xs: 'left', sm: 'right' }, maxWidth: { xs: '100%', sm: 220 }, flexShrink: 0 }}>
		<Typography component='span' sx={{ ...detailLabelSx, display: 'block' }}>
			Notes
		</Typography>
		<Box component='span' sx={{ color: 'text.secondary', lineHeight: 1.45 }}>
			{interviewTimeNotes.map((note) => (
				<Typography key={note} variant='caption' component='span' sx={{ display: 'block' }}>
					{note}
				</Typography>
			))}
		</Box>
	</Box>
);

const RSVPStatusCard = () => {
	const [interviews, setInterviews] = useState<InterviewItem[]>([]);
	const [loading, setLoading] = useState(true);
	const { user } = useAuth();
	const { darkMode, primaryColor } = useTheme();
	const { showAlert, handleError } = useAlert();
	const [anchorEls, setAnchorEls] = useState<Record<string, HTMLElement | null>>({});
	const navigate = useNavigate();

	useEffect(() => {
		if (!user) return;
		setLoading(true);
		const unsubscribe = getRealTimeMeetings(user.uid, false, (updatedInterviews: unknown) => {
			const next = updatedInterviews as InterviewItem[];
			setInterviews(next);
			setLoading(false);
		});

		return () => unsubscribe();
	}, [user]);

	const handleRSVP = async (interviewId: string, response: 'yes' | 'no') => {
		try {
			const interviewRef = doc(db, 'interviews', interviewId);
			const dataToUpdate = buildInterviewRsvpUpdate(response);

			await updateDoc(interviewRef, dataToUpdate as UpdateData<DocumentData>);

			setInterviews((prev) => prev.map((iv) => (iv.id === interviewId ? { ...iv, ...dataToUpdate } : iv)));
			handleMenuClose(interviewId);
			showAlert({ message: 'RSVP updated successfully.', type: 'success' });
		} catch (error) {
			handleError(error, 'RSVP update failed');
		}
	};

	const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, id: string) => setAnchorEls((prev) => ({ ...prev, [id]: event.currentTarget }));
	const handleMenuClose = (id: string) => setAnchorEls((prev) => ({ ...prev, [id]: null }));

	if (loading) return null;

	const { active: activeInterviews, history: historyInterviews } = splitApplicantInterviews(interviews);

	if (activeInterviews.length === 0 && historyInterviews.length === 0) return null;

	return (
		<Box sx={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
			<Typography component='h2' sx={homeApplicantSectionTitleSx}>
				Interview Invites
			</Typography>
			<Box sx={homeApplicantCardListSx}>
				{activeInterviews.map((interview) => {
					const { rsvpStatus, status, startTime } = interview;
					const headerText = headerMessages[rsvpStatus] || 'Your interview is scheduled.';
					const anchorEl = anchorEls[interview.id] || null;
					const isInProgress = status === InterviewStatus.inProgress;
					const hasRsvpResponse = rsvpStatus === 'yes' || rsvpStatus === 'no';

					return (
						<Paper key={interview.id} variant='outlined' sx={homeApplicantCardSx(darkMode)}>
							<Stack spacing={2.5} sx={{ width: '100%' }}>
								<Typography variant='subtitle2' sx={{ fontWeight: 600, textAlign: 'center' }}>
									{headerText}
								</Typography>

								<Box sx={cardRowSx}>
									<DetailRow icon={<EventAvailableOutlinedIcon sx={detailIconSx} />} label='Interview status'>
										<StatusCapsule status={status} />
									</DetailRow>

									{!isInProgress && (
										<Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
											{hasRsvpResponse && (
												<>
													<Typography component='span' sx={{ ...detailLabelSx, display: 'block' }}>
														Your RSVP
													</Typography>
													<Typography
														variant='body2'
														component='span'
														onClick={(event) => handleMenuOpen(event, interview.id)}
														sx={{
															...getRsvpCapsuleSx(rsvpStatus),
															cursor: 'pointer',
															fontSize: '0.85rem',
															px: 2,
															textAlign: 'center',
														}}>
														{rsvpLabels[rsvpStatus]}
													</Typography>
												</>
											)}
											{rsvpStatus === 'unknown' && (
												<Stack spacing={1} sx={{ minWidth: { sm: 132 } }}>
													<Typography component='span' sx={detailLabelSx}>
														Your RSVP
													</Typography>
													<Button
														size='small'
														variant='contained'
														onClick={() => handleRSVP(interview.id, 'yes')}
														sx={homeAuthSubmitButtonSx(primaryColor)}>
														Confirm
													</Button>
													<Button
														size='small'
														variant='outlined'
														onClick={() => handleRSVP(interview.id, 'no')}
														sx={homeAuthSecondaryButtonSx}>
														Unavailable
													</Button>
												</Stack>
											)}
											<Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => handleMenuClose(interview.id)}>
												{rsvpStatus === 'yes' && <MenuItem onClick={() => handleRSVP(interview.id, 'no')}>Change to Unavailable</MenuItem>}
												{rsvpStatus === 'no' && <MenuItem onClick={() => handleRSVP(interview.id, 'yes')}>Change to Confirmed</MenuItem>}
											</Menu>
										</Box>
									)}
								</Box>

								{startTime?.toDate && (
									<Box sx={{ ...cardRowSx, alignItems: 'center' }}>
										<Stack spacing={1.25}>
											<DetailRow icon={<CalendarTodayOutlinedIcon sx={detailIconSx} />} label='Date'>
												<Typography variant='body2' color='text.primary' sx={{ fontWeight: 500 }}>
													{dayjs(startTime.toDate()).format('dddd, MMMM D, YYYY')}
												</Typography>
											</DetailRow>
											<DetailRow icon={<ScheduleOutlinedIcon sx={detailIconSx} />} label='Time'>
												<Typography variant='body2' color='text.primary' sx={{ fontWeight: 500 }}>
													{dayjs(startTime.toDate()).format('h:mm A')}
												</Typography>
											</DetailRow>
										</Stack>
										<InterviewScheduleNotes />
									</Box>
								)}

								<Stack spacing={1.5} sx={{ pt: 0.5 }}>
									{status === InterviewStatus.confirmed && (
										<Button
											fullWidth
											variant='contained'
											onClick={() => navigate(`/interviews/waiting-room/${interview.id}`)}
											sx={homeAuthSubmitButtonSx(primaryColor)}>
											Go to Waiting Room
										</Button>
									)}
									{status === InterviewStatus.inProgress && (
										<Button
											fullWidth
											variant='contained'
											onClick={() => navigate(`/interviews/interview-room/${interview.id}`)}
											sx={homeAuthSubmitButtonSx(primaryColor)}>
											Join Interview Now
										</Button>
									)}
									{([InterviewStatus.scheduled, InterviewStatus.invited, InterviewStatus.confirmed] as string[]).includes(status) && (
										<Button
											fullWidth
											variant='outlined'
											sx={homeAuthSecondaryButtonSx}
											onClick={async () => {
												try {
													const url = await generateICSDownloadURL(interview);
													window.open(url, '_blank');
												} catch (error) {
													showAlert({ message: 'Could not fetch calendar invite. Try again later.', type: 'error' });
													console.error('ICS fetch error', error);
												}
											}}>
											Add to Calendar (Apple, Google, Outlook)
										</Button>
									)}
								</Stack>
							</Stack>
						</Paper>
					);
				})}
				{historyInterviews.map((interview) => (
					<InterviewHistoryRow key={interview.id} interview={interview} darkMode={darkMode} />
				))}
			</Box>
		</Box>
	);
};

export default RSVPStatusCard;
