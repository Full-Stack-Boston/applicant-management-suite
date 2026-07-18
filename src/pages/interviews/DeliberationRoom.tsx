/**
 * DELIBERATION ROOM (Admin "War Room")
 * ---------------------------------------------------------------------------
 * This is a persistent video call room for Committee Members to discuss
 * candidates between scheduled interviews.
 *
 * * FEATURES:
 * 1. Persistent Call: Uses a specific 'deliberation' room token.
 * 2. Schedule Monitoring: Watches Firestore for the next "In Progress" interview.
 * 3. Auto-Redirect: If an interview starts, it counts down and moves everyone
 * from this room to the active Interview Room.
 * 4. Application Viewer: Allows viewing candidate PDFs side-by-side with the video.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DailyProvider } from '@daily-co/daily-react';
import { doc, getDoc } from 'firebase/firestore';

// UI Components
import { Button, Dialog, DialogContent, DialogTitle, DialogContentText, Box, Typography, useTheme } from '@mui/material';
import Loader from '../../components/loader/Loader';
import AdminDrawer from '../../components/interviews/AdminDrawer';
import ApplicationViewer from '../../components/interviews/ApplicationViewer';
import CallUI from '../../components/interviews/CallInterface';
import VideoRoomUnavailable from '../../components/interviews/VideoRoomUnavailable';

// Contexts
import { useAlert } from '../../context/AlertContext';
import { useMeeting } from '../../context/MeetingContext';
import { useTitle } from '../../context/HelmetContext';
import { useAuth } from '../../context/AuthContext';

// Backend & Config
import { generateJoinToken, updateInterviewStatus, getRealTimeMeetings, db } from '../../config/data/firebase';
import { InterviewStatus, collections } from '../../config/data/collections';
import { formatDailyJoinError } from '../../utils/interviewUtils';
import { paths } from '../../config/navigation/paths';
import { useDailyJoin } from '../../hooks/useDailyJoin';

// Layout Constants
const adminDrawerWidth = 320;
const appViewerDrawerWidth = 1100;

// Local shapes for Daily participants and meeting docs (context/hooks are untyped)
interface DailyParticipantLike {
	local?: boolean;
	session_id: string;
	user_id?: string;
	owner?: boolean;
}

interface ParticipantDetailEntry {
	pictureUrl?: string;
	[key: string]: unknown;
}

interface DeliberationMeeting {
	id: string;
	deliberation?: boolean;
	status?: string;
	displayName?: string;
	applicationId?: string;
	applicantPresent?: boolean;
	startTime?: { toDate: () => Date };
	endTime?: { toDate: () => Date };
}

export default function DeliberationRoom() {
	useTitle({ title: 'Deliberation Room', appear: false });
	const navigate = useNavigate();
	const theme = useTheme();

	// Global State
	const { user } = useAuth();
	const { showAlert, handleError } = useAlert();
	const { callObject, videoDeviceId, audioDeviceId, setParticipantDetails } = useMeeting();

	// Local State
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Layout State
	const [isAppDrawerOpen, setIsAppDrawerOpen] = useState(false);
	const [isAdminDrawerOpen, setIsAdminDrawerOpen] = useState(false);
	const [appsToShow, setAppsToShow] = useState<string[]>([]); // List of Application IDs to display in the viewer
	const [isOwner, setIsOwner] = useState(false); // If true, user has "Meeting Owner" privileges
	const [hasJoined, setHasJoined] = useState(false);

	// Schedule State
	const [inProgressInterview, setInProgressInterview] = useState<DeliberationMeeting | null>(null);
	const [previousInterview, setPreviousInterview] = useState<DeliberationMeeting | null>(null);
	const [nextInterview, setNextInterview] = useState<DeliberationMeeting | null>(null);
	const [isStartingNext, setIsStartingNext] = useState(false);

	// Navigation/Redirect State
	const [isNavigating, setIsNavigating] = useState(false);
	const [abortedNavigations, setAbortedNavigations] = useState<string[]>([]); // List of interview IDs the user chose NOT to auto-join
	const [redirectCountdown, setRedirectCountdown] = useState(5);
	const prevInProgressRef = useRef<DeliberationMeeting | null>(null);

	// --- Helper: Fetch Participant Metadata ---
	// Daily.co only gives us a user_id. We need to fetch their profile picture from Firestore.
	const fetchAndSetMemberPicture = useCallback(
		async (participant: DailyParticipantLike | null | undefined) => {
			if (!participant?.user_id) return;

			try {
				const memberRef = doc(db, collections.members, participant.user_id);
				const memberSnap = await getDoc(memberRef);

				if (memberSnap.exists()) {
					const pictureUrl = memberSnap.data().picture?.home || null;
					if (pictureUrl) {
						setParticipantDetails((prev) => ({
							...prev,
							[participant.session_id]: {
								...(prev[participant.session_id] as ParticipantDetailEntry | undefined),
								pictureUrl,
							},
						}));
					}
				}
			} catch (err) {
				console.error(`Failed to fetch member data for participant ${participant.user_id}:`, err);
			}
		},
		[setParticipantDetails]
	);

	// --- Effect 1: Schedule Monitor ---
	// Listens to real-time interview data to determine Previous, Current, and Next slots.
	useEffect(() => {
		if (!user) return;

		const unsubscribe = getRealTimeMeetings(user.uid, true, (allMeetings) => {
			try {
				// Filter out the deliberation room itself (if it appears in the list)
				const interviews = (allMeetings as DeliberationMeeting[]).filter((m) => !m.deliberation);

				const inProgress = interviews.find((m) => m.status === InterviewStatus.inProgress);

				const finished = interviews.filter((m) => m.status === InterviewStatus.completed || m.status === InterviewStatus.missed).sort((a, b) => (b.endTime?.toDate().getTime() ?? 0) - (a.endTime?.toDate().getTime() ?? 0));

				const upcoming = interviews.filter((m) => m.status === InterviewStatus.confirmed).sort((a, b) => (a.startTime?.toDate().getTime() ?? 0) - (b.startTime?.toDate().getTime() ?? 0));

				setInProgressInterview(inProgress || null);
				setPreviousInterview(finished.length > 0 ? finished[0] : null);
				setNextInterview(upcoming.length > 0 ? upcoming[0] : null);
			} catch (err) {
				handleError(err, 'deliberation-process-meetings');
				setError('Could not process the interview schedule.');
			}
		});

		return () => unsubscribe();
	}, [user, handleError]);

	// --- Effect 2: Auto-Redirect Trigger ---
	// Detects when an interview status changes to "In Progress".
	useEffect(() => {
		const currentInterview = inProgressInterview;
		const previousInterview = prevInProgressRef.current;

		// If a NEW interview has started (and we haven't already aborted joining it)
		if (currentInterview && currentInterview.id !== previousInterview?.id) {
			if (!abortedNavigations.includes(currentInterview.id)) {
				setIsNavigating(true); // Triggers the countdown dialog
			}
		}

		prevInProgressRef.current = inProgressInterview;
	}, [inProgressInterview, abortedNavigations]);

	// --- Effect 3: Video Call Setup ---
	// Joins Daily via useDailyJoin so toast/callback identity changes cannot leave+rejoin.
	const fetchToken = useCallback(async () => {
		const result = await generateJoinToken({ deliberation: true });
		const { token, roomUrl } = (result.data || {}) as { token?: string; roomUrl?: string };
		if (!token || !roomUrl) {
			throw new Error('Invalid token or room URL received from the server.');
		}
		return { token, roomUrl };
	}, []);

	const handleJoined = useCallback(() => {
		const localParticipant = callObject.participants().local;
		fetchAndSetMemberPicture(localParticipant);
		if (localParticipant?.owner) setIsOwner(true);
		setHasJoined(true);
		setLoading(false);
	}, [callObject, fetchAndSetMemberPicture]);

	const handleJoinError = useCallback(
		(err: unknown) => {
			const detail = formatDailyJoinError(err, 'deliberation room');
			handleError(Object.assign(err instanceof Error ? err : new Error(detail), { message: detail }), 'deliberation-join-call', false);
			setError(detail);
			setLoading(false);
		},
		[handleError]
	);

	useDailyJoin({
		callObject,
		enabled: Boolean(callObject && user),
		fetchToken,
		videoDeviceId,
		audioDeviceId,
		onJoined: handleJoined,
		onError: handleJoinError,
	});

	useEffect(() => {
		setHasJoined(false);
		setLoading(true);
	}, [videoDeviceId, audioDeviceId]);

	useEffect(() => {
		if (!callObject) return;
		const handleLeftMeeting = () => setHasJoined(false);
		callObject.on('left-meeting', handleLeftMeeting);
		return () => {
			callObject.off('left-meeting', handleLeftMeeting);
		};
	}, [callObject]);

	// --- Effect 4: Participant Tracking ---
	useEffect(() => {
		if (!callObject) return;

		const handleParticipantJoined = (event: { participant: DailyParticipantLike }) => {
			if (event.participant.local) return;
			fetchAndSetMemberPicture(event.participant);
		};

		const handleParticipantLeft = (event: { participant: DailyParticipantLike }) => {
			setParticipantDetails((prev) => {
				const newDetails = { ...prev };
				delete newDetails[event.participant.session_id];
				return newDetails;
			});
		};

		callObject.on('participant-joined', handleParticipantJoined);
		callObject.on('participant-left', handleParticipantLeft);

		return () => {
			callObject.off('participant-joined', handleParticipantJoined);
			callObject.off('participant-left', handleParticipantLeft);
		};
	}, [callObject, setParticipantDetails, fetchAndSetMemberPicture]);

	// --- Effect 5: Countdown Timer ---
	useEffect(() => {
		if (isNavigating && inProgressInterview) {
			if (redirectCountdown > 0) {
				const timer = setTimeout(() => setRedirectCountdown((prev) => prev - 1), 1000);
				return () => clearTimeout(timer);
			} else {
				// Timer hit zero: Go to the interview room
				navigate(`/interviews/interview-room/${inProgressInterview.id}`);
			}
		}
	}, [isNavigating, redirectCountdown, navigate, inProgressInterview]);

	// --- Actions ---

	const handleAbortNavigation = () => {
		setIsNavigating(false);
		setRedirectCountdown(5);
		if (inProgressInterview) {
			setAbortedNavigations((prev) => [...prev, inProgressInterview.id]);
		}
	};

	const handleStartNextInterview = async (nextInterviewId: string) => {
		if (!nextInterviewId) return;
		setIsStartingNext(true);
		try {
			// Must go through updateInterviewStatus so Daily room is created (status flip alone is not enough).
			await updateInterviewStatus({ interviewId: nextInterviewId, newStatus: InterviewStatus.inProgress });
			showAlert({ message: 'Next interview starting! Redirecting...', type: 'success' });
			setIsNavigating(true);
		} catch (err) {
			handleError(err, 'deliberation-start-interview');
			setIsStartingNext(false);
		}
	};

	const handleJoinInterview = (interviewId: string) => {
		if (!interviewId) return;
		navigate(`/interviews/interview-room/${interviewId}`);
	};

	const handleRelevantAppsChange = useCallback((appIds: string[]) => {
		setAppsToShow(appIds);
	}, []);

	if (error) {
		return (
			<VideoRoomUnavailable
				title='Deliberation Room Unavailable'
				message={error}
				onLeave={() => navigate(paths.interviewDash)}
				leaveLabel='Back to Interviews'
			/>
		);
	}

	if (loading || !hasJoined) return <Loader />;

	return (
		<DailyProvider callObject={callObject}>
			{/* Auto-Redirect Modal */}
			<Dialog open={isNavigating}>
				<DialogTitle>Interview in Progress!</DialogTitle>
				<DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
					<DialogContentText>
						The interview with <strong>{inProgressInterview?.displayName}</strong> has started. Navigating you to the room automatically.
					</DialogContentText>
					<Typography variant='h1' align='center' color='primary' sx={{ my: 2 }}>
						{redirectCountdown}
					</Typography>
					<Button onClick={handleAbortNavigation} color='secondary' sx={{ my: 2 }}>
						Stay in Deliberation Room
					</Button>
				</DialogContent>
			</Dialog>

			<Box sx={{ display: 'flex' }}>
				{/* LEFT: Schedule & Controls */}
				<AdminDrawer open={isAdminDrawerOpen} onClose={() => setIsAdminDrawerOpen(false)} isAdmin={isOwner} isDeliberation={true} onStartNextInterview={handleStartNextInterview} onRelevantAppsChange={handleRelevantAppsChange} isStartingNext={isStartingNext} isNavigating={isNavigating} redirectCountdown={redirectCountdown} inProgressInterview={inProgressInterview} previousInterview={previousInterview} nextInterview={nextInterview} onJoinInterview={handleJoinInterview} />

				{/* CENTER: Video Call */}
				<Box
					component='main'
					sx={{
						flexGrow: 1,
						transition: theme.transitions.create('margin', {
							easing: theme.transitions.easing.sharp,
							duration: theme.transitions.duration.leavingScreen,
						}),
						marginLeft: `-${adminDrawerWidth}px`,
						...(isAdminDrawerOpen && {
							transition: theme.transitions.create('margin', {
								easing: theme.transitions.easing.easeOut,
								duration: theme.transitions.duration.enteringScreen,
							}),
							marginLeft: 0,
						}),
						marginRight: `-${appViewerDrawerWidth}px`,
						...(isAppDrawerOpen && {
							transition: theme.transitions.create('margin', {
								easing: theme.transitions.easing.easeOut,
								duration: theme.transitions.duration.enteringScreen,
							}),
							marginRight: 0,
						}),
					}}>
					<CallUI isAdmin={isOwner} onOpenDrawer={() => setIsAppDrawerOpen((prev) => !prev)} onOpenAdminDrawer={() => setIsAdminDrawerOpen((prev) => !prev)} />
				</Box>

				{/* RIGHT: Candidate Application PDF */}
				<ApplicationViewer open={isAppDrawerOpen} onClose={() => setIsAppDrawerOpen(false)} applications={appsToShow} />
			</Box>
		</DailyProvider>
	);
}