/**
 * Application Timer
 * Displays a countdown to important dates (Application Deadline or Next Opening).
 * Features:
 * - Automatically switches modes:
 * - 'deadline': Counting down to current window close.
 * - 'nextOpen': Counting down to next window open.
 * - 'closed': Application period is over.
 * - Real-time updates (1s interval).
 */

import { useState, useEffect } from 'react';
import { Typography, Box } from '@mui/material';

// Context
import { useConfig } from '../../context/ConfigContext';

// --- Helpers ---

type TimerMode = 'loading' | 'deadline' | 'nextOpen' | 'closed';

interface TimerProps {
	onModeChange?: (mode: TimerMode) => void;
}

const pluralize = (count: number, singular: string, plural: string) => (count === 1 ? singular : plural);

const formatTime = (time: number | null): string => {
	if (time === null || time < 0) return '';

	const days = Math.floor(time / (60 * 60 * 24));
	const hours = Math.floor((time % (60 * 60 * 24)) / 3600);
	const minutes = Math.floor((time % 3600) / 60);
	const seconds = time % 60;

	return `${days} ${pluralize(days, 'Day', 'Days')}, ${hours} ${pluralize(hours, 'Hour', 'Hours')}, ${minutes} ${pluralize(minutes, 'Minute', 'Minutes')}, ${seconds} ${pluralize(seconds, 'Second', 'Seconds')}`;
};

// --- Main Component ---

const Timer = ({ onModeChange }: TimerProps) => {
	const [displayMode, setDisplayMode] = useState<TimerMode>('loading');
	const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
	const config = useConfig();

	useEffect(() => {
		const interval = setInterval(() => {
			const now = new Date();
			const deadline = new Date(config.APPLICATION_DEADLINE as string);
			const nextOpen = config.NEXT_APPLICATION_OPEN_DATE ? new Date(config.NEXT_APPLICATION_OPEN_DATE as string) : null;

			let mode: TimerMode = 'closed';
			let newTimeRemaining: number | null = null;

			if (deadline > now) {
				// If currently before the deadline
				if (nextOpen && nextOpen > now && nextOpen < deadline) {
					// Unusual case: Next open is sooner than the deadline?
					// (Implies "Opening Soon" state before current deadline logic applies)
					mode = 'nextOpen';
					newTimeRemaining = Math.floor((nextOpen.getTime() - now.getTime()) / 1000);
				} else {
					// Standard active window
					mode = 'deadline';
					newTimeRemaining = Math.floor((deadline.getTime() - now.getTime()) / 1000);
				}
			} else if (nextOpen && nextOpen > now) {
				// Deadline passed, check proximity to next open date
				const distToDeadline = Math.abs(now.getTime() - deadline.getTime());
				const distToNextOpen = Math.abs(nextOpen.getTime() - now.getTime());

				// Switch to "Next Open" mode if we are closer to opening than the previous close,
				// or simply if we want to show countdown when closed.
				if (distToNextOpen <= distToDeadline) {
					mode = 'nextOpen';
					newTimeRemaining = Math.floor((nextOpen.getTime() - now.getTime()) / 1000);
				}
			}

			setTimeRemaining(newTimeRemaining);

			if (mode !== displayMode) {
				setDisplayMode(mode);
				if (onModeChange) {
					onModeChange(mode);
				}
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [config, displayMode, onModeChange]);

	return (
		<Box sx={{ textAlign: 'center', color: 'inherit' }}>
			{displayMode === 'deadline' && (
				<Typography variant='body1' sx={{ fontWeight: 'bold' }} gutterBottom>
					Time Remaining: {formatTime(timeRemaining)}
				</Typography>
			)}

			{displayMode === 'closed' && (
				<Typography variant='body1' sx={{ fontWeight: 'bold' }} gutterBottom>
					🚫 The application period is closed. 🚫
				</Typography>
			)}

			{displayMode === 'nextOpen' && (
				<Typography variant='body1' sx={{ fontWeight: 'bold' }} gutterBottom>
					Next Window: {formatTime(timeRemaining)}
				</Typography>
			)}
		</Box>
	);
};

export default Timer;