import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@mui/material';
import VideocamOffOutlinedIcon from '@mui/icons-material/VideocamOffOutlined';
import PublicStatusPage from '../home/PublicStatusPage';
import { homeAuthSubmitButtonSx } from '../home/homePageStyles';
import { useTheme } from '../../context/ThemeContext';

interface VideoRoomUnavailableProps {
	title: string;
	message: string;
	onLeave: () => void;
	leaveLabel?: string;
}

/**
 * Shared unavailable state for deliberation / interview join failures.
 * Matches WaitingRoom / AccessDenied status-card pattern (no toast duplicate).
 */
const VideoRoomUnavailable = ({ title, message, onLeave, leaveLabel = 'Go Back' }: VideoRoomUnavailableProps) => {
	const { primaryColor } = useTheme();

	return (
		<PublicStatusPage eyebrow='Video' title={title} icon={<VideocamOffOutlinedIcon />} subtitle={message} cardSize='wide' fitViewport>
			<Button fullWidth variant='contained' onClick={onLeave} sx={homeAuthSubmitButtonSx(primaryColor)}>
				{leaveLabel}
			</Button>
		</PublicStatusPage>
	);
};

VideoRoomUnavailable.propTypes = {
	title: PropTypes.string.isRequired,
	message: PropTypes.string.isRequired,
	onLeave: PropTypes.func.isRequired,
	leaveLabel: PropTypes.string,
};

export default VideoRoomUnavailable;
