/**
 * Window Info Component
 * Displays specific dates and labels for the current application cycle.
 * Features:
 * - Shows "Deadline", "Opens", or "Closed" dates based on the mode provided by the child <Timer>.
 * - Adapts text to show the relevant academic years (e.g., 2023 - 2024).
 * - tone="onDark" forces light text/border for use on hero imagery (any theme mode).
 */

import { useState } from 'react';
import { Box, Typography } from '@mui/material';

// Context
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';

// Components
import Timer from './Timer';

interface WindowInfoProps {
	bg?: string;
	tone?: 'default' | 'onDark';
}

export default function WindowInfo({ bg = 'transparent', tone = 'default' }: WindowInfoProps) {
	const config = useConfig();
	const { darkMode, boxShadow } = useTheme();
	const [mode, setMode] = useState('loading');

	const deadline = new Date(config.APPLICATION_DEADLINE as string);
	const nextOpen = config.NEXT_APPLICATION_OPEN_DATE ? new Date(config.NEXT_APPLICATION_OPEN_DATE as string) : null;

	const windowYear = deadline.getFullYear();
	const nextOpenYear = nextOpen?.getFullYear?.() || windowYear;

	let labelText = '';
	let subLabelText = '';

	// Determine labels based on the Timer's current mode
	if (mode === 'deadline') {
		labelText = `Application Window: ${windowYear} - ${windowYear + 1}`;
		subLabelText = `Deadline: ${deadline.toLocaleString()}`;
	} else if (mode === 'nextOpen') {
		labelText = `Upcoming Window: ${nextOpenYear} - ${nextOpenYear + 1}`;
		subLabelText = `Opens: ${nextOpen ? nextOpen.toLocaleString() : 'TBD'}`;
	} else if (mode === 'closed') {
		labelText = `Most Recent Window: ${windowYear} - ${windowYear + 1}`;
		subLabelText = `Closed: ${deadline.toLocaleString()}`;
	}

	const onDark = tone === 'onDark';

	return (
		<Box
			sx={{
				width: 'min(100%, 450px)',
				maxWidth: '100%',
				boxSizing: 'border-box',
				p: 2,
				border: 1,
				borderRadius: 2,
				borderColor: onDark ? 'rgba(255,255,255,0.35)' : 'divider',
				boxShadow,
				display: 'flex',
				alignItems: 'center',
				flexDirection: 'column',
				color: onDark ? 'common.white' : darkMode ? 'custom.white' : 'custom.black',
				bgcolor: bg,
			}}>
			<Typography
				gutterBottom
				variant='body1'
				sx={{
					fontWeight: 'bold',
					textAlign: 'center',
					width: '100%',
					overflowWrap: 'anywhere',
				}}>
				{labelText}
			</Typography>

			<Typography
				variant='body1'
				gutterBottom
				sx={{
					fontWeight: 'bold',
					textAlign: 'center',
					width: '100%',
					overflowWrap: 'anywhere',
				}}>
				{subLabelText}
			</Typography>

			<Box sx={{ color: 'inherit' }}>
				<Timer onModeChange={setMode} />
			</Box>
		</Box>
	);
}
