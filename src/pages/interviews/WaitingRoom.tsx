/**
 * INTERVIEW WAITING ROOM (Pre-Flight Lobby)
 * ---------------------------------------------------------------------------
 * This page is the "Green Room" where applicants wait before their interview.
 *
 * * OBJECTIVES:
 * 1. Tech Check: Force the user to grant Camera/Mic permissions and verify devices work.
 * 2. Identity Verification: Displays who the interview is for and when it is scheduled.
 * 3. Auto-Admission: Listens to Firestore. When status -> 'inProgress', redirects to the call.
 *
 * * CRITICAL LOGIC:
 * - 'requestMediaAccess': Tries to get Video+Audio. If that fails, tries them individually
 * to provide better error messages (e.g., "Your Mic works, but Camera is blocked").
 */

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

// Firebase & Data
import { doc, getDoc } from 'firebase/firestore';
import { db, getRealTimeDocument } from '../../config/data/firebase';
import { collections, InterviewStatus } from '../../config/data/collections';

// UI Components
import { Box, Typography, Paper, CircularProgress, Button, ButtonGroup, Alert, AlertTitle, keyframes, Select, MenuItem, FormControl, InputLabel, Stack, Grid } from '@mui/material';
import { HelpOutlined, Videocam, VideocamOff, Mic, MicOff, CheckCircleOutlined, VideoCallOutlined, AssignmentOutlined, DashboardOutlined } from '@mui/icons-material';

// Contexts & Assets
import PublicPageLayout from '../../components/home/PublicPageLayout';
import PublicStatusPage from '../../components/home/PublicStatusPage';
import AuthFormCard from '../../components/auth/AuthFormCard';
import { StatusCapsule } from '../../components/list/StatusCapsule';
import ApplicantApplicationOverlay from '../../components/review/ApplicantApplicationOverlay';
import Loader from '../../components/loader/Loader';
import { useTheme } from '../../context/ThemeContext';
import { brand } from '../../config/Constants';
import { useMeeting } from '../../context/MeetingContext';
import { useTitle } from '../../context/HelmetContext';
import { useAuth } from '../../context/AuthContext';
import {
	formatApplicantDisplayName,
	getInterviewAccessMessage,
	getInterviewReturnLabel,
	getInterviewReturnPath,
	isTerminalInterviewStatus,
} from '../../utils/interviewUtils';
import { useApplicantPresence } from '../../hooks/useApplicantPresence';
import {
	homeApplicantApplicationCardSx,
	homeApplicantSectionTitleSx,
	homeAuthActionRowSx,
	homeAuthSecondaryButtonSx,
	homeAuthSubmitButtonSx,
	homeDashboardIntroBodySx,
	homeDashboardIntroLabelSx,
	homeDashboardIntroListSx,
	displayFont,
} from '../../components/home/homePageStyles';

dayjs.extend(duration);

// --- Animation ---
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

const interviewPrepTips = [
	'Be ready to discuss your goals, aspirations, and relevant experience.',
	'Reflect on how you collaborate, lead, and follow through on commitments.',
	'Dress professionally for a video interview; business casual is fine.',
];

const interviewExpectations = [
	'A 15-minute conversation with our review committee.',
	'The interview takes place here; no other software is needed.',
	'Find a quiet, well-lit space for the best experience.',
];

type DeviceStatus = 'idle' | 'requesting' | 'granted' | 'error';

interface WaitingRoomInterviewInfo {
	status?: string;
	fullName?: string;
	scheduledTime?: Date | null;
	applicationId?: string;
	applicantId?: string;
	[key: string]: unknown;
}

// =============================================================================
//  HELPER: Media Request Logic
// =============================================================================

/**
 * Robustly requests media permissions.
 * Tries getting both streams. If that fails, tries them individually to diagnose the issue.
 */
interface MediaStreams {
	mainStream?: MediaStream | null;
	videoStream?: MediaStream | null;
	audioStream?: MediaStream | null;
}

const requestMediaAccess = async (): Promise<MediaStreams> => {
	let mainStream: MediaStream | null = null,
		videoStream: MediaStream | null = null,
		audioStream: MediaStream | null = null;

	try {
		// Try to get BOTH devices at once (Best Case)
		mainStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
	} catch (err) {
		const errName = (err as DOMException).name;
		console.warn('Initial video/audio request failed:', errName);

		// Fallback: Try Video Only
		if (errName === 'NotFoundError' || errName === 'OverconstrainedError') {
			try {
				videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
			} catch (e) {
				console.warn('Video-only fallback failed:', (e as DOMException).name);
			}

			// Fallback: Try Audio Only
			try {
				audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
			} catch (e) {
				console.warn('Audio-only fallback failed:', (e as DOMException).name);
			}
		} else if (errName === 'NotAllowedError') {
			throw new Error('You blocked camera and/or microphone access. Please allow it in your browser settings.');
		} else {
			throw err;
		}
	}
	return { mainStream, videoStream, audioStream };
};

const getDeviceErrorMessage = (err: unknown) => {
	const { name, message } = err as { name?: string; message?: string };
	if (message === 'No camera found.') return 'No camera found. Please connect your camera and try again.';
	if (message === 'No microphone found.') return 'No microphone found. Please connect your microphone and try again.';
	if (message?.includes('blocked')) return message;
	if (name === 'NotAllowedError') return 'Could not get permissions. Please allow camera and microphone access in your browser settings.';
	if (name === 'NotReadableError') return 'Your camera or mic is already in use by another application. Please close it and try again.';
	return message || 'An unknown error occurred while trying to access your devices.';
};

interface MicLevelMeterProps {
	stream: MediaStream | null;
	isMicOn: boolean;
}

const MicLevelMeter = ({ stream, isMicOn }: MicLevelMeterProps) => {
	const [level, setLevel] = useState(0);

	useEffect(() => {
		if (!stream || !isMicOn) {
			setLevel(0);
			return;
		}

		const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!AudioContextCtor) return;

		const audioContext = new AudioContextCtor();
		const source = audioContext.createMediaStreamSource(stream);
		const analyser = audioContext.createAnalyser();
		analyser.fftSize = 256;
		source.connect(analyser);

		const data = new Uint8Array(analyser.frequencyBinCount);
		let frameId = 0;

		const tick = () => {
			analyser.getByteFrequencyData(data);
			const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
			setLevel(Math.min(1, avg / 80));
			frameId = requestAnimationFrame(tick);
		};
		tick();

		return () => {
			cancelAnimationFrame(frameId);
			source.disconnect();
			void audioContext.close();
		};
	}, [stream, isMicOn]);

	const bars = 12;
	return (
		<Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 36, mt: 1 }} aria-label='Microphone level meter'>
			{Array.from({ length: bars }).map((_, index) => {
				const threshold = (index + 1) / bars;
				const active = level >= threshold * 0.35;
				return (
					<Box
						key={index}
						sx={{
							flex: 1,
							height: `${20 + index * 6}%`,
							borderRadius: 0.5,
							bgcolor: active ? (index > 9 ? 'error.main' : index > 6 ? 'warning.main' : 'success.main') : 'action.disabledBackground',
							opacity: isMicOn ? 1 : 0.35,
							transition: 'background-color 80ms linear',
						}}
					/>
				);
			})}
		</Box>
	);
};

// =============================================================================
//  SUB-COMPONENT: Device Preview
// =============================================================================

interface DevicePreviewProps {
	setDeviceStatus: (status: DeviceStatus) => void;
}

const DevicePreview = ({ setDeviceStatus }: DevicePreviewProps) => {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const { videoDeviceId, setVideoDeviceId, audioDeviceId, setAudioDeviceId } = useMeeting();
	const { primaryColor } = useTheme();

	const [error, setError] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [permissionsGranted, setPermissionsGranted] = useState(false);
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
	const [audioInDevices, setAudioInDevices] = useState<MediaDeviceInfo[]>([]);
	const [isCamOn, setIsCamOn] = useState(true);
	const [isMicOn, setIsMicOn] = useState(true);
	const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

	const getPermissionsAndDevices = async () => {
		setIsProcessing(true);
		setDeviceStatus('requesting');
		setError(null);
		let granted = false;
		let streams: MediaStreams = {};

		try {
			if (!navigator.mediaDevices?.getUserMedia) {
				throw new Error('Your browser does not support media device access.');
			}

			// 1. Request Permissions
			streams = await requestMediaAccess();

			// 2. Enumerate Devices
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoInputs = devices.filter((d) => d.kind === 'videoinput' && d.deviceId);
			const audioInputs = devices.filter((d) => d.kind === 'audioinput' && d.deviceId);

			if (videoInputs.length === 0) throw new Error('No camera found.');
			if (audioInputs.length === 0) throw new Error('No microphone found.');

			setVideoDevices(videoInputs);
			setAudioInDevices(audioInputs);

			// 3. Set Defaults
			if (videoInputs.length > 0 && !videoDeviceId) setVideoDeviceId(videoInputs[0].deviceId);
			if (audioInputs.length > 0 && !audioDeviceId) setAudioDeviceId(audioInputs[0].deviceId);

			setPermissionsGranted(true);
			granted = true;
		} catch (err) {
			const { name, message } = err as { name?: string; message?: string };
			console.error('Error getting device permissions:', name, message);
			setError(getDeviceErrorMessage(err));
			setDeviceStatus('error');
		} finally {
			setIsProcessing(false);
			if (granted) setDeviceStatus('granted');

			// Stop streams after enumeration to release the device lock
			const { mainStream, videoStream, audioStream } = streams;
			[mainStream, videoStream, audioStream].forEach((stream) => {
				stream?.getTracks().forEach((track) => track.stop());
			});
		}
	};

	// Start the actual preview stream once permissions are granted and devices selected
	useEffect(() => {
		const startPreview = async () => {
			setIsProcessing(true);
			setError(null);

			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => track.stop());
			}

			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined },
					audio: { deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined },
				});

				if (videoRef.current) {
					videoRef.current.srcObject = stream;
				}
				streamRef.current = stream;
				setPreviewStream(stream);
				stream.getVideoTracks().forEach((track) => {
					track.enabled = isCamOn;
				});
				stream.getAudioTracks().forEach((track) => {
					track.enabled = isMicOn;
				});
				setDeviceStatus('granted');
			} catch (err) {
				console.error('Device preview error:', err);
				setError('Could not start devices. Please check that they are not in use by another application.');
				setDeviceStatus('error');
				setPreviewStream(null);
			} finally {
				setIsProcessing(false);
			}
		};

		if (permissionsGranted && videoDeviceId && audioDeviceId) {
			startPreview();
		}
		// isCamOn/isMicOn intentionally omitted so toggles only flip track.enabled
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [permissionsGranted, videoDeviceId, audioDeviceId, setDeviceStatus]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => track.stop());
			}
		};
	}, []);

	const toggleVideo = () => {
		if (streamRef.current) {
			const next = !isCamOn;
			streamRef.current.getVideoTracks().forEach((track) => {
				track.enabled = next;
			});
			setIsCamOn(next);
		}
	};

	const toggleAudio = () => {
		if (streamRef.current) {
			const next = !isMicOn;
			streamRef.current.getAudioTracks().forEach((track) => {
				track.enabled = next;
			});
			setIsMicOn(next);
		}
	};

	if (!permissionsGranted) {
		return (
			<Box>
				<Typography variant='body2' color='text.secondary' sx={homeDashboardIntroBodySx}>
					Let's make sure your camera and microphone are working before the committee joins.
				</Typography>
				{error && (
					<Alert severity='error' sx={{ mt: 2, mb: 2 }}>
						<AlertTitle>Device error</AlertTitle>
						{error}
					</Alert>
				)}
				<Button fullWidth variant='contained' disabled={isProcessing} onClick={getPermissionsAndDevices} sx={{ ...homeAuthSubmitButtonSx(primaryColor), mt: { xs: 2.5, sm: 2 } }}>
					{isProcessing ? 'Requesting...' : 'Set up camera & mic'}
				</Button>
			</Box>
		);
	}

	return (
		<Stack spacing={2} sx={{ width: '100%' }}>
			<Stack direction='row' spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
				<CheckCircleOutlined sx={{ color: 'success.main', fontSize: 20 }} />
				<Typography variant='body2' sx={{ fontWeight: 600 }}>
					Devices connected. We'll use these settings for the interview.
				</Typography>
			</Stack>
			{error && (
				<Alert severity='error'>
					<AlertTitle>Device error</AlertTitle>
					{error}
				</Alert>
			)}
			<Box
				sx={{
					position: 'relative',
					width: '100%',
					borderRadius: 2,
					overflow: 'hidden',
					bgcolor: 'common.black',
					aspectRatio: '16 / 9',
					maxHeight: { xs: 200, sm: 220 },
				}}>
				<Box
					component='video'
					ref={videoRef}
					autoPlay
					muted
					playsInline
					sx={{
						width: '100%',
						height: '100%',
						objectFit: 'cover',
						transform: 'scaleX(-1)',
						display: 'block',
					}}
				/>
			</Box>
			<Box>
				<Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600 }}>
					Microphone level {isMicOn ? '(speak to test)' : '(muted)'}
				</Typography>
				<MicLevelMeter stream={previewStream} isMicOn={isMicOn} />
			</Box>
			<Grid container spacing={1.5}>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormControl fullWidth size='small'>
						<InputLabel>Camera</InputLabel>
						<Select value={videoDeviceId || ''} label='Camera' onChange={(e) => setVideoDeviceId(e.target.value)}>
							{videoDevices.map((d) => (
								<MenuItem key={d.deviceId} value={d.deviceId}>
									{d.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormControl fullWidth size='small'>
						<InputLabel>Microphone</InputLabel>
						<Select value={audioDeviceId || ''} label='Microphone' onChange={(e) => setAudioDeviceId(e.target.value)}>
							{audioInDevices.map((d) => (
								<MenuItem key={d.deviceId} value={d.deviceId}>
									{d.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Grid>
				<Grid size={12}>
					<ButtonGroup variant='contained' fullWidth size='small'>
						<Button onClick={toggleAudio} color={isMicOn ? 'primary' : 'error'} aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}>
							{isMicOn ? <Mic /> : <MicOff />}
						</Button>
						<Button onClick={toggleVideo} color={isCamOn ? 'primary' : 'error'} aria-label={isCamOn ? 'Turn off camera' : 'Turn on camera'}>
							{isCamOn ? <Videocam /> : <VideocamOff />}
						</Button>
					</ButtonGroup>
				</Grid>
			</Grid>
		</Stack>
	);
};

interface WaitingRoomGateProps {
	title: string;
	message: string;
	onLeave: () => void;
	leaveLabel: string;
}

const WaitingRoomGate = ({ title, message, onLeave, leaveLabel }: WaitingRoomGateProps) => (
	<PublicStatusPage title={title} eyebrow='Interview' subtitle={message} cardSize='wide'>
		<Button fullWidth variant='contained' onClick={onLeave} sx={homeAuthSubmitButtonSx('green')}>
			{leaveLabel}
		</Button>
	</PublicStatusPage>
);

// =============================================================================
//  MAIN COMPONENT: WaitingRoom
// =============================================================================

export default function WaitingRoom() {
	useTitle({ title: 'Waiting Room', appear: false });
	const { interviewId } = useParams();
	const navigate = useNavigate();
	const { darkMode, primaryColor } = useTheme();
	const { applicant, member, user } = useAuth();

	useApplicantPresence(interviewId, Boolean(applicant && interviewId));

	const [interviewInfo, setInterviewInfo] = useState<WaitingRoomInterviewInfo | null>(null);
	const [applicationOverlayOpen, setApplicationOverlayOpen] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [redirectCountdown, setRedirectCountdown] = useState(10);
	const [countdown, setCountdown] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [accessDenied, setAccessDenied] = useState<string | null>(null);
	const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>('idle');
	const scheduledTimeMs = interviewInfo?.scheduledTime ? interviewInfo.scheduledTime.getTime() : null;

	const leavePath = getInterviewReturnPath(member, applicant);
	const leaveLabel = getInterviewReturnLabel(member, applicant);

	// --- Effect 1: Load Initial Data ---
	useEffect(() => {
		const controller = new AbortController();
		const signal = controller.signal;

		const fetchInitialInfo = async () => {
			if (!interviewId) {
				if (!signal.aborted) {
					setError('No interview ID was provided in the URL.');
					setIsLoading(false);
				}
				return;
			}

			setIsLoading(true);

			try {
				const interviewRef = doc(db, collections.interviews, interviewId);
				const interviewSnap = await getDoc(interviewRef);

				if (signal.aborted) return;

				if (!interviewSnap.exists()) {
					setError('This interview could not be found. It may have been canceled, or the link may be incorrect. If you believe this is your interview, make sure you are signed in with the account that received the invitation.');
					return;
				}

				const interviewData = interviewSnap.data();

				if (applicant && user?.uid && interviewData.applicantId !== user.uid && !member) {
					setError('This interview is assigned to a different account. Please sign in with the account that received the invitation, or contact support if you need help.');
					return;
				}

				const status = interviewData.status;
				if (isTerminalInterviewStatus(status)) {
					setAccessDenied(getInterviewAccessMessage(status, 'waiting'));
					setInterviewInfo({ status, ...interviewData });
					return;
				}

				if (status !== InterviewStatus.confirmed && status !== InterviewStatus.inProgress) {
					setAccessDenied(getInterviewAccessMessage(status, 'waiting'));
					setInterviewInfo({ status, ...interviewData });
					return;
				}

				const applicantRef = doc(db, collections.applicants, interviewData.applicantId);
				const applicantSnap = await getDoc(applicantRef);

				if (signal.aborted) return;

				const applicantData = applicantSnap.exists() ? applicantSnap.data() : {};

				setInterviewInfo({
					fullName: formatApplicantDisplayName(applicantData),
					scheduledTime: interviewData.startTime?.toDate?.() || null,
					...interviewData,
				});
			} catch (err) {
				if (!signal.aborted) {
					console.error('Error loading interview info:', err);
					setError('We could not load this interview. It may not belong to your account, or the link may be incorrect. Please sign in with the invited account and try again.');
				}
			} finally {
				if (!signal.aborted) {
					setIsLoading(false);
				}
			}
		};
		fetchInitialInfo();

		return () => controller.abort();
	}, [interviewId, applicant, member, user?.uid]);

	// --- Effect 2: Listen for "Start Interview" ---
	// Watches for status -> 'inProgress'
	useEffect(() => {
		if (!interviewId || error || accessDenied) return;
		const unsubscribe = getRealTimeDocument(collections.interviews, interviewId, (interviewData) => {
			if (!interviewData) {
				setError('This interview could not be found. It may have been canceled, or the link may be incorrect.');
				return;
			}

			const status = interviewData.status;
			setInterviewInfo((prevInfo) => ({ ...prevInfo, ...interviewData }));

			if (isTerminalInterviewStatus(status)) {
				setIsConnecting(false);
				setAccessDenied(getInterviewAccessMessage(status, 'waiting'));
				return;
			}

			if (status === InterviewStatus.inProgress && !isConnecting) {
				setAccessDenied(null);
				setIsConnecting(true);
			}
		});
		return () => unsubscribe?.();
	}, [interviewId, error, accessDenied, isConnecting]);

	// --- Effect 3: Auto-Redirect Timer ---
	useEffect(() => {
		if (isConnecting) {
			if (redirectCountdown > 0) {
				const timer = setTimeout(() => setRedirectCountdown((prev) => prev - 1), 1000);
				return () => clearTimeout(timer);
			} else {
				navigate(`/interviews/interview-room/${interviewId}`);
			}
		}
	}, [isConnecting, redirectCountdown, navigate, interviewId]);

	// --- Effect 4: Countdown to Scheduled Time ---
	useEffect(() => {
		if (!scheduledTimeMs) return;
		const countdownInterval = setInterval(() => {
			const now = dayjs();
			const scheduled = dayjs(scheduledTimeMs);
			if (now.isAfter(scheduled)) {
				setCountdown('Your interview should begin shortly.');
			} else {
				const diff = dayjs.duration(scheduled.diff(now));
				setCountdown(`Interview begins in: ${diff.hours()}h ${diff.minutes()}m ${diff.seconds()}s`);
			}
		}, 1000);
		return () => clearInterval(countdownInterval);
	}, [scheduledTimeMs]);

	// --- Effect 5: Redirect away from error states ---
	useEffect(() => {
		if (error || accessDenied) {
			const timer = setTimeout(() => {
				navigate(leavePath);
			}, 7000);
			return () => clearTimeout(timer);
		}
	}, [error, accessDenied, navigate, leavePath]);

	// --- Render States ---

	const getStatusMessage = () => {
		if (interviewInfo?.status === InterviewStatus.inProgress) {
			return 'Connecting...';
		}
		if (deviceStatus === 'idle') return 'Use the device check panel to test your camera and microphone.';
		if (deviceStatus === 'requesting') return 'Please grant permission to access your camera and mic.';
		if (deviceStatus === 'granted') return 'All set! The committee will start the interview soon. Please standby.';
		if (deviceStatus === 'error') return 'There seems to be an issue with your devices. Please check the device check panel.';
		return 'The committee will start the interview soon. Please standby.';
	};

	if (isLoading) {
		return (
			<PublicPageLayout maxWidth='lg' compact tightMobile applicantNav>
				<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', width: '100%' }}>
					<Loader />
				</Box>
			</PublicPageLayout>
		);
	}

	if (error) {
		return (
			<PublicStatusPage eyebrow='Interview' title='Unable to Open Waiting Room' subtitle={`${error} You will be redirected shortly.`} cardSize='wide' fitViewport>
				<Button fullWidth variant='contained' onClick={() => navigate(leavePath)} sx={homeAuthSubmitButtonSx(primaryColor)}>
					{leaveLabel}
				</Button>
			</PublicStatusPage>
		);
	}

	if (accessDenied) {
		return <WaitingRoomGate title='Waiting Room Unavailable' message={`${accessDenied} You will be redirected shortly.`} onLeave={() => navigate(leavePath)} leaveLabel={leaveLabel} />;
	}

	const scheduledLabel = interviewInfo?.scheduledTime?.toLocaleString() || 'N/A';
	const applicationId = interviewInfo?.applicationId;

	const rightColumnCardSx = {
		...homeApplicantApplicationCardSx(darkMode),
		p: { xs: 2, sm: 2.5 },
		width: '100%',
		minWidth: 0,
		maxWidth: { md: 480 },
		boxSizing: 'border-box',
	};

	const standbyStatus = isConnecting ? (
		<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' }}>
			<Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
				Interview starting
			</Typography>
			<Typography
				data-testid='redirect-countdown'
				sx={{
					fontFamily: displayFont,
					fontSize: { xs: '2.5rem', sm: '3rem' },
					fontWeight: 400,
					lineHeight: 1.1,
					my: 1,
					color: 'primary.main',
					animation: `${pulse} 1s ease-in-out infinite`,
				}}>
				{redirectCountdown}
			</Typography>
			<Typography variant='body2' color='text.secondary'>
				You will be redirected to the interview room automatically.
			</Typography>
		</Box>
	) : (
		<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' }}>
			{deviceStatus === 'granted' ? <CheckCircleOutlined sx={{ fontSize: 32, mb: 1, color: 'success.main' }} /> : <CircularProgress size={32} thickness={4} sx={{ mb: 1, color: 'primary.main' }} />}
			<Typography variant='body2' sx={{ fontWeight: 600, lineHeight: 1.45 }}>
				{getStatusMessage()}
			</Typography>
		</Box>
	);

	return (
		<PublicPageLayout maxWidth='lg' compact tightMobile applicantNav>
			<AuthFormCard
				layout='split'
				size='dashboard'
				tightMobile
				title='Interview Waiting Room'
				icon={<VideoCallOutlined />}
				eyebrow='Interview'
				subtitle='Get your camera and microphone ready before the committee joins.'
				intro={
					<Stack spacing={2.5} sx={{ width: '100%', flex: 1 }}>
						<Box>
							<Typography component='span' sx={homeDashboardIntroLabelSx}>
								Applicant
							</Typography>
							<Typography variant='body2' color='text.secondary' sx={homeDashboardIntroBodySx}>
								{interviewInfo?.fullName || 'Loading...'}
							</Typography>
						</Box>
						<Box>
							<Typography component='span' sx={homeDashboardIntroLabelSx}>
								Scheduled for
							</Typography>
							<Typography variant='body2' color='text.secondary' sx={homeDashboardIntroBodySx}>
								{scheduledLabel}
							</Typography>
						</Box>
						{countdown && !isConnecting && (
							<Typography variant='body2' color='text.secondary' sx={homeDashboardIntroBodySx}>
								{countdown}
							</Typography>
						)}
						{interviewInfo?.status && (
							<Box>
								<StatusCapsule status={interviewInfo.status} />
							</Box>
						)}
						<Box>
							<Typography component='h2' sx={{ ...homeApplicantSectionTitleSx, fontSize: { xs: '1.05rem', sm: '1.15rem' }, mb: 1 }}>
								How to prepare
							</Typography>
							<Box component='ul' sx={homeDashboardIntroListSx}>
								{interviewPrepTips.map((tip) => (
									<Typography key={tip} component='li' variant='body2' color='text.secondary'>
										{tip}
									</Typography>
								))}
							</Box>
						</Box>
						<Box>
							<Typography component='h2' sx={{ ...homeApplicantSectionTitleSx, fontSize: { xs: '1.05rem', sm: '1.15rem' }, mb: 1 }}>
								What to expect
							</Typography>
							<Box component='ul' sx={homeDashboardIntroListSx}>
								{interviewExpectations.map((item) => (
									<Typography key={item} component='li' variant='body2' color='text.secondary'>
										{item}
									</Typography>
								))}
							</Box>
						</Box>
					</Stack>
				}>
				<Stack
					spacing={{ xs: 2.5, md: 2.5 }}
					sx={{
						flex: 1,
						width: '100%',
						minWidth: 0,
						maxWidth: '100%',
						boxSizing: 'border-box',
						minHeight: { md: '100%' },
						justifyContent: 'flex-start',
						pt: { xs: 1, md: 0 },
						pb: { xs: 1, md: 0 },
					}}>
					<Box sx={{ width: '100%', maxWidth: { md: 480 } }}>
						<Box sx={{ ...homeAuthActionRowSx, gap: { xs: 2.5, sm: 1.5 } }}>
							{applicationId && (
								<Button variant='outlined' startIcon={<AssignmentOutlined />} onClick={() => setApplicationOverlayOpen(true)} sx={homeAuthSecondaryButtonSx}>
									View your application
								</Button>
							)}
							<Button component={Link} to={leavePath} variant='outlined' startIcon={<DashboardOutlined />} sx={homeAuthSecondaryButtonSx}>
								{leaveLabel}
							</Button>
						</Box>
					</Box>

					<Paper variant='outlined' sx={rightColumnCardSx}>
						{standbyStatus}
					</Paper>
					<Paper variant='outlined' sx={rightColumnCardSx}>
						<Typography component='h2' sx={{ ...homeApplicantSectionTitleSx, mb: { xs: 1.75, md: 1.5 } }}>
							Device & permission check
						</Typography>
						<DevicePreview setDeviceStatus={setDeviceStatus} />
					</Paper>

					<Box sx={{ width: '100%', maxWidth: { md: 480 }, pt: { xs: 0.5, md: 0.25 } }}>
						<Button fullWidth startIcon={<HelpOutlined />} href={`mailto:${brand.helpEmail}`} size='small' color='inherit'>
							Having trouble? Contact support
						</Button>
					</Box>
				</Stack>
			</AuthFormCard>
			<ApplicantApplicationOverlay open={applicationOverlayOpen} onClose={() => setApplicationOverlayOpen(false)} applicationId={applicationId} />
		</PublicPageLayout>
	);
}
