/**
 * Participant Row
 * Represents a single user in the Admin Drawer's participant list.
 * Features:
 * - Displays user name and status.
 * - Admin Controls: Mute Audio, Stop Video, Eject Participant.
 * - Local User Indicator ("You").
 */

import React from 'react';
import { useParticipantProperty, useLocalSessionId, useDaily } from '@daily-co/daily-react';
import { Box, Typography, IconButton, Tooltip, Chip } from '@mui/material';
import { Mic, MicOff, Videocam, VideocamOff, Eject } from '@mui/icons-material';

// Context
import { useAlert } from '../../context/AlertContext';

interface ParticipantRowProps {
	id: string;
	isAdmin?: boolean;
}

const ParticipantRow = ({ id, isAdmin }: ParticipantRowProps) => {
	const callObject = useDaily();
	const { showAlert } = useAlert();
	const localSessionId = useLocalSessionId();

	const userName = useParticipantProperty(id, 'user_name');
	const isAudioOff = useParticipantProperty(id, 'tracks.audio.state') === 'off';
	const isVideoOff = useParticipantProperty(id, 'tracks.video.state') === 'off';

	const isLocal = id === localSessionId;

	const toggleAudio = () => {
		callObject?.updateParticipant(id, { setAudio: isAudioOff });
		showAlert({ message: `${userName}'s microphone has been ${isAudioOff ? 'unmuted' : 'muted'}.`, type: 'info' });
	};

	const toggleVideo = () => {
		callObject?.updateParticipant(id, { setVideo: isVideoOff });
		showAlert({ message: `${userName}'s camera has been ${isVideoOff ? 'enabled' : 'disabled'}.`, type: 'info' });
	};

	const ejectParticipant = () => {
		showAlert({ message: `Removing ${userName} from the call.`, type: 'warning' });
		callObject?.updateParticipant(id, { eject: true });
	};

	return (
		<Box
			sx={{
				display: 'flex',
				alignItems: 'center',
				gap: 1,
				px: 0.5,
				py: 0.75,
				borderBottom: '1px solid',
				borderColor: 'divider',
				minHeight: 40,
			}}>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1 }}>
				<Typography variant='body2' noWrap sx={{ minWidth: 0 }}>
					{userName || 'Guest'}
				</Typography>
				{isLocal && <Chip label='You' size='small' color='primary' variant='outlined' sx={{ height: 22, flexShrink: 0 }} />}
			</Box>

			<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
				{isAdmin && !isLocal ? (
					<>
						<Tooltip title={isAudioOff ? 'Ask to Unmute' : 'Mute Audio'}>
							<IconButton onClick={toggleAudio} size='small' aria-label={isAudioOff ? 'Ask to Unmute' : 'Mute Audio'}>
								{isAudioOff ? <MicOff fontSize='small' /> : <Mic fontSize='small' />}
							</IconButton>
						</Tooltip>

						<Tooltip title={isVideoOff ? 'Ask to Start Video' : 'Stop Video'}>
							<IconButton onClick={toggleVideo} size='small' aria-label={isVideoOff ? 'Ask to Start Video' : 'Stop Video'}>
								{isVideoOff ? <VideocamOff fontSize='small' /> : <Videocam fontSize='small' />}
							</IconButton>
						</Tooltip>

						<Tooltip title='Eject from Call'>
							<IconButton onClick={ejectParticipant} color='error' size='small' aria-label='Eject from Call'>
								<Eject fontSize='small' />
							</IconButton>
						</Tooltip>
					</>
				) : (
					<>
						{isAudioOff ? <MicOff fontSize='small' color='action' /> : <Mic fontSize='small' color='action' />}
						{isVideoOff ? <VideocamOff fontSize='small' color='action' /> : <Videocam fontSize='small' color='action' />}
					</>
				)}
			</Box>
		</Box>
	);
};

export default ParticipantRow;
