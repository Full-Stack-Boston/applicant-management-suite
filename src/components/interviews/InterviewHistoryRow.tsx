import { Box, Paper, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { StatusCapsule } from '../list/StatusCapsule';
import { homeApplicantApplicationListRowSx } from '../home/homePageStyles';
import type { DashboardInterview } from './interviewDashboardUtils';

interface InterviewHistoryRowProps {
	interview: DashboardInterview;
	darkMode: boolean;
}

export default function InterviewHistoryRow({ interview, darkMode }: InterviewHistoryRowProps) {
	const startTime = interview.startTime?.toDate?.();
	const dateLabel = startTime ? dayjs(startTime).format('dddd, MMMM D, YYYY') : 'Date unavailable';
	const timeLabel = startTime ? dayjs(startTime).format('h:mm A') : 'Time unavailable';

	return (
		<Paper variant='outlined' sx={homeApplicantApplicationListRowSx(darkMode)}>
			<Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, minWidth: 0 }}>
				<Box sx={{ minWidth: 0 }}>
					<Typography variant='body2' color='text.primary' sx={{ fontWeight: 700 }}>
						{dateLabel}
					</Typography>
					<Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.35 }}>
						{timeLabel}
					</Typography>
				</Box>
				<StatusCapsule status={interview.status} />
			</Box>
		</Paper>
	);
}
