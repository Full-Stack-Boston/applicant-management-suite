/**
 * Call Interface
 * The main Video Call UI orchestration component.
 * * Components:
 * - CallUI: Main grid layout manager.
 * - CallControls: Bottom bar with Mic/Cam/Screen/Effect toggles.
 * - ParticipantTile: Renders individual video/audio streams.
 * - ScreenShareTile: Renders shared screen streams.
 * - ParticipantMenu: Admin controls for specific participants.
 * - CallAlerter: Toast notification listener for call events.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDaily, useDailyEvent, useParticipantProperty, useLocalSessionId, useScreenShare, useParticipantIds } from '@daily-co/daily-react';
import { Avatar, Box, Typography, IconButton, Menu, MenuItem, Button, Tooltip, Divider, ListItemIcon, ButtonGroup } from '@mui/material';
import { MoreVert, Mic, MicOff, Videocam, VideocamOff, Eject, ScreenShare, StopScreenShare, Fullscreen, AdminPanelSettings, BlurOn, BlurOff, NoiseAware, NoiseControlOff } from '@mui/icons-material';

// Context & Config
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useMeeting } from '../../context/MeetingContext';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';

// --- Sub-Components ---

interface ParticipantMenuProps {
	id: string;
}

const ParticipantMenu = ({ id }: ParticipantMenuProps) => {
	const callObject = useDaily();
	const { showAlert } = useAlert();
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const open = Boolean(anchorEl);

	const isVideoOff = useParticipantProperty(id, 'tracks.video.state') === 'off';
	const isAudioOff = useParticipantProperty(id, 'tracks.audio.state') === 'off';
	const userName = useParticipantProperty(id, 'user_name');

	const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
	const handleClose = () => setAnchorEl(null);

	const toggleAudio = () => {
		callObject?.updateParticipant(id, { setAudio: isAudioOff });
		showAlert({ message: `${userName}'s microphone has been ${isAudioOff ? 'unmuted' : 'muted'}.`, type: 'info' });
		handleClose();
	};

	const toggleVideo = () => {
		callObject?.updateParticipant(id, { setVideo: isVideoOff });
		showAlert({ message: `${userName}'s camera has been ${isVideoOff ? 'enabled' : 'disabled'}.`, type: 'info' });
		handleClose();
	};

	const ejectParticipant = () => {
		showAlert({ message: `Removing ${userName} from the call.`, type: 'warning' });
		callObject?.updateParticipant(id, { eject: true });
		handleClose();
	};

	return (
		<>
			<IconButton onClick={handleMenuClick} sx={{ position: 'absolute', top: 8, right: 8, color: 'white', backgroundColor: 'rgba(0,0,0,0.3)' }}>
				<MoreVert />
			</IconButton>
			<Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
				<MenuItem onClick={toggleAudio}>
					<ListItemIcon>
						<MicOff fontSize='small' />
					</ListItemIcon>
					{isAudioOff ? 'Ask to Unmute' : 'Mute Audio'}
				</MenuItem>
				<MenuItem onClick={toggleVideo}>
					<ListItemIcon>
						<VideocamOff fontSize='small' />
					</ListItemIcon>
					{isVideoOff ? 'Ask to Start Video' : 'Stop Video'}
				</MenuItem>
				<Divider />
				<MenuItem onClick={ejectParticipant} sx={{ color: 'error.main' }}>
					<ListItemIcon>
						<Eject fontSize='small' color='error' />
					</ListItemIcon>
					Eject Participant
				</MenuItem>
			</Menu>
		</>
	);
};

interface ParticipantTileProps {
	id: string;
	isAdmin: boolean;
	isActive: boolean;
}

const ParticipantTile = ({ id, isAdmin, isActive }: ParticipantTileProps) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const { participantDetails } = useMeeting();

	const userName = useParticipantProperty(id, 'user_name');
	const isLocal = useParticipantProperty(id, 'local');
	const isAudioOff = useParticipantProperty(id, 'tracks.audio.state') === 'off';
	const isVideoOff = useParticipantProperty(id, 'tracks.video.state') === 'off';

	const videoTrack = useParticipantProperty(id, 'videoTrack');
	const audioTrack = useParticipantProperty(id, 'audioTrack');

	const details = participantDetails[id] as { pictureUrl?: string } | undefined;
	const pictureUrl = details?.pictureUrl;

	useEffect(() => {
		const videoElement = videoRef.current;
		if (videoElement) {
			const tracks: MediaStreamTrack[] = [];
			if (videoTrack) tracks.push(videoTrack);
			if (audioTrack) tracks.push(audioTrack);

			if (tracks.length > 0) {
				videoElement.srcObject = new MediaStream(tracks);
			} else {
				videoElement.srcObject = null;
			}
		}
	}, [videoTrack, audioTrack]);

	return (
		<Box
			sx={{
				position: 'relative',
				width: '100%',
				height: '100%',
				maxWidth: '100%',
				maxHeight: '100%',
				overflow: 'hidden',
				borderRadius: 2,
				backgroundColor: '#222',
				border: isActive ? '4px solid #FFCC00' : '4px solid transparent',
			}}>
			<video
				ref={videoRef}
				autoPlay
				muted={isLocal}
				playsInline
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					objectFit: 'cover',
					display: isVideoOff ? 'none' : 'block',
				}}>
				<track kind='captions' />
			</video>

			{isVideoOff && (
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#333' }}>
					{pictureUrl ? <Avatar src={pictureUrl} alt={userName} sx={{ width: 120, height: 120, border: '4px solid rgba(255,255,255,0.2)' }} /> : <Avatar sx={{ width: 120, height: 120, bgcolor: 'secondary.main' }}>{userName?.charAt(0)}</Avatar>}
					<Box sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
						<Typography variant='h6'>{userName}</Typography>
						<Typography variant='caption'>(Camera is off{isAudioOff && ', mic is muted'})</Typography>
					</Box>
				</Box>
			)}

			<Box sx={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', alignItems: 'center', gap: 1, p: '2px 6px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 1, zIndex: 10 }}>
				{isAudioOff && <MicOff fontSize='small' sx={{ color: 'white' }} />}
				<Typography variant='caption' sx={{ color: 'white' }}>
					{userName || 'Guest'}
				</Typography>
			</Box>

			{isAdmin && !isLocal && <ParticipantMenu id={id} />}
		</Box>
	);
};

interface ScreenShareTileProps {
	id: string;
}

const ScreenShareTile = ({ id }: ScreenShareTileProps) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const screenVideoTrack = useParticipantProperty(id, 'screenVideoTrack');
	const screenVideoState = useParticipantProperty(id, 'tracks.screenVideo.state');
	const screenAudioTrack = useParticipantProperty(id, 'tracks.screenAudioTrack');

	const playableTrack = screenVideoState === 'playable' ? screenVideoTrack : null;

	useEffect(() => {
		const videoElement = videoRef.current;
		if (videoElement) {
			const tracks: MediaStreamTrack[] = [];
			if (playableTrack) tracks.push(playableTrack);
			if (screenAudioTrack) tracks.push(screenAudioTrack as unknown as MediaStreamTrack);

			if (tracks.length > 0) {
				videoElement.srcObject = new MediaStream(tracks);
			} else {
				videoElement.srcObject = null;
			}
		}
	}, [playableTrack, screenAudioTrack]);

	const handleFullscreen = () => {
		if (videoRef.current?.requestFullscreen) {
			videoRef.current.requestFullscreen();
		}
	};

	return (
		<Box
			sx={{
				width: '100%',
				height: '100%',
				backgroundColor: 'black',
				position: 'relative',
				borderRadius: 2,
				overflow: 'hidden',
			}}>
			<video ref={videoRef} autoPlay playsInline onDoubleClick={handleFullscreen} style={{ width: '100%', height: '100%', objectFit: 'contain' }}>
				<track kind='captions' />
			</video>
			<Tooltip title='Fullscreen'>
				<IconButton onClick={handleFullscreen} sx={{ position: 'absolute', bottom: 8, right: 8, color: 'white', backgroundColor: 'rgba(0,0,0,0.3)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.5)' } }}>
					<Fullscreen />
				</IconButton>
			</Tooltip>
		</Box>
	);
};

const CallAlerter = () => {
	const { member } = useAuth();
	const { showAlert } = useAlert();
	const callObject = useDaily();

	useDailyEvent('participant-joined', (event) => {
		if (event.participant.local) return;
		const participant = event.participant;

		setTimeout(() => {
			const updatedParticipant = callObject?.participants()[participant.session_id];
			const name = updatedParticipant?.user_name || 'Guest';
			showAlert({ message: `${name} has joined the call.`, type: 'info' });
		}, 1500);
	});

	useDailyEvent('app-message', (event) => {
		const { data } = event;
		if (data.event === 'notify' && member) {
			showAlert({ message: data.message, type: 'info' });
		}
	});

	useDailyEvent('participant-left', (event) => {
		if (event.participant.local) return;
		showAlert({ message: `${event.participant.user_name || 'Guest'} has left the call.`, type: 'info' });
	});

	useDailyEvent('left-meeting', (event) => {
		if ((event as unknown as Record<string, unknown>).reason === 'ejected') {
			showAlert({ message: 'You have been removed from the meeting by an admin.', type: 'error' });
		}
	});

	return null;
};

interface CallControlsProps {
	isAdmin: boolean;
	onOpenDrawer?: () => void;
	onOpenAdminDrawer?: () => void;
	isInterview?: boolean;
}

const CallControls = ({ isAdmin, onOpenDrawer, onOpenAdminDrawer }: CallControlsProps) => {
	const { member } = useAuth();
	const callObject = useDaily();
	const localSessionId = useLocalSessionId();

	const isMicOn = useParticipantProperty(localSessionId, 'audio');
	const isCamOn = useParticipantProperty(localSessionId, 'video');
	const isSharingScreen = useParticipantProperty(localSessionId, 'screen');

	const navigate = useNavigate();
	const [activeVideoProcessor, setActiveVideoProcessor] = useState<'none' | 'blur'>('none');
	// Fixed: Initialize to false so first click enables it
	const [isCancellingOn, setIsCancellingOn] = useState(false);

	const toggleMic = () => callObject?.setLocalAudio(!isMicOn);
	const toggleCam = () => callObject?.setLocalVideo(!isCamOn);

	const leaveCall = () => {
		callObject?.leave();
		if (member) {
			navigate(paths.interviewDash);
		} else {
			navigate(generatePath(paths.apply));
		}
	};

	const toggleBackgroundBlur = async () => {
		if (activeVideoProcessor === 'blur') {
			await callObject?.updateInputSettings({ video: { processor: { type: 'none' } } });
			setActiveVideoProcessor('none');
		} else {
			await callObject?.updateInputSettings({
				video: { processor: { type: 'background-blur', config: { strength: 0.7 } } },
			});
			setActiveVideoProcessor('blur');
		}
	};

	const toggleNoiseCancellation = async () => {
		if (isCancellingOn) {
			await callObject?.updateInputSettings({ audio: { processor: { type: 'none' } } });
			setIsCancellingOn(false);
		} else {
			await callObject?.updateInputSettings({
				audio: { processor: { type: 'noise-cancellation' } },
			});
			setIsCancellingOn(true);
		}
	};

	const toggleScreenShare = () => {
		if (isSharingScreen) {
			callObject?.stopScreenShare();
		} else {
			callObject?.startScreenShare({
				displayMediaOptions: {
					audio: true,
					video: true,
					selfBrowserSurface: 'exclude',
					surfaceSwitching: 'include',
					systemAudio: 'include',
				},
				screenVideoSendSettings: 'motion-and-detail-balanced',
			});
		}
	};

	return (
		<Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, backgroundColor: 'rgba(0,0,0,0.3)' }}>
			{isAdmin && (
				<Tooltip title='Admin Controls'>
					<IconButton sx={{ color: 'white' }} onClick={onOpenAdminDrawer}>
						<AdminPanelSettings />
					</IconButton>
				</Tooltip>
			)}
			<ButtonGroup variant='contained'>
				<Button onClick={toggleMic} color={isMicOn ? 'primary' : 'error'} aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}>
					{isMicOn ? <Mic /> : <MicOff />}
				</Button>
				<Button onClick={toggleCam} color={isCamOn ? 'primary' : 'error'} aria-label={isCamOn ? 'Stop camera' : 'Start camera'}>
					{isCamOn ? <Videocam /> : <VideocamOff />}
				</Button>
				<Button onClick={toggleBackgroundBlur} color={activeVideoProcessor === 'blur' ? 'success' : 'primary'}>
					<Tooltip title='Toggle Background Blur'>{activeVideoProcessor === 'blur' ? <BlurOn /> : <BlurOff />}</Tooltip>
				</Button>
				<Button onClick={toggleNoiseCancellation} color={isCancellingOn ? 'success' : 'primary'}>
					<Tooltip title='Toggle Noise Cancellation'>{isCancellingOn ? <NoiseAware /> : <NoiseControlOff />}</Tooltip>
				</Button>
				<Button onClick={toggleScreenShare} color={isSharingScreen ? 'success' : 'primary'}>
					{isSharingScreen ? <StopScreenShare /> : <ScreenShare />}
				</Button>
			</ButtonGroup>
			{member && (
				<Button variant='outlined' sx={{ borderColor: 'white', color: 'white' }} onClick={onOpenDrawer}>
					Apps
				</Button>
			)}
			<Button variant='contained' sx={{ bgcolor: 'custom.red', color: 'white' }} onClick={leaveCall}>
				Exit
			</Button>
		</Box>
	);
};

// --- Main Component ---

const CONTROLS_HEIGHT = 72;

interface CallUIProps {
	isAdmin: boolean;
	isInterview?: boolean;
	onOpenDrawer?: () => void;
	onOpenAdminDrawer?: () => void;
}

export default function CallUI({ isAdmin, onOpenDrawer, onOpenAdminDrawer, isInterview = false }: CallUIProps) {
	const callObject = useDaily();
	const { screens } = useScreenShare();
	const participantIds = useParticipantIds();
	const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

	useEffect(() => {
		if (callObject) {
			const handleActiveSpeakerChange = (event: unknown) => setActiveSpeakerId((event as { activeSpeaker: { peerId: string } }).activeSpeaker.peerId);
			callObject.on('active-speaker-change', handleActiveSpeakerChange as Parameters<typeof callObject.on>[1]);
			return () => {
				callObject.off('active-speaker-change', handleActiveSpeakerChange as Parameters<typeof callObject.off>[1]);
			};
		}
	}, [callObject]);

	const tileCount = participantIds.length + screens.length;
	const cols = tileCount > 0 ? Math.min(Math.ceil(Math.sqrt(tileCount)), 4) : 1;
	const gridTemplateColumns = `repeat(${cols}, 1fr)`;

	return (
		<Box sx={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#121212' }}>
			<Box
				sx={{
					height: `calc(100vh - ${CONTROLS_HEIGHT}px)`,
					p: 1,
					boxSizing: 'border-box',
					overflowY: 'auto',
					display: 'grid',
					gap: '8px',
					gridTemplateColumns: gridTemplateColumns,
					gridTemplateRows: `repeat(${Math.ceil(tileCount / cols)}, 1fr)`,
					alignItems: 'center',
					justifyContent: 'center',
				}}>
				{screens.map((screen) => (
					<ScreenShareTile key={screen.session_id} id={screen.session_id} />
				))}
				{participantIds.map((id) => (
					<ParticipantTile key={id} id={id} isAdmin={isAdmin} isActive={activeSpeakerId === id} />
				))}
			</Box>
			<Box sx={{ height: `${CONTROLS_HEIGHT}px`, width: '100%', flexShrink: 0 }}>
				<CallControls isAdmin={isAdmin} onOpenDrawer={onOpenDrawer} onOpenAdminDrawer={onOpenAdminDrawer} isInterview={isInterview} />
			</Box>
			<CallAlerter />
		</Box>
	);
}
