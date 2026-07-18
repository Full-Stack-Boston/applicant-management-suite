/**
 * Admin Drawer (Interview Room)
 * The control panel for Interview Hosts/Admins during a video call.
 * Features:
 * - Participant management (list view).
 * - Interview lifecycle controls (End, Mark Missed, Wrap-up Notice).
 * - "Deliberation" mode logic (viewing previous/next interview details).
 * - Site Config toggles (Auto-Deliberate).
 */

import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { useParticipantIds, useDaily } from '@daily-co/daily-react';
import { Drawer, Box, Typography, IconButton, Divider, Button, CircularProgress, Switch, FormControlLabel, Card, CardContent, Chip } from '@mui/material';
import { Close, CallEnd, Send, CheckCircleOutlined } from '@mui/icons-material';

// Firebase & Config
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, markInterviewAsMissed, endInterview } from '../../config/data/firebase';
import { collections } from '../../config/data/collections';

// Context
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';

// Components
import ParticipantRow from './ParticipantRow';

// Extend dayjs with duration plugin
dayjs.extend(duration);

const drawerWidth = 320;

interface FirestoreTimestampLike {
	toDate: () => Date;
}

type DurationInput = FirestoreTimestampLike | Date | string | number | null | undefined;

interface AdminDrawerInterviewInfo {
	id?: string;
	applicationId?: string;
	displayName?: string;
	status?: string;
	startTime?: FirestoreTimestampLike;
	endTime?: FirestoreTimestampLike;
	applicantPresent?: boolean;
}

interface AdminDrawerProps {
	open: boolean;
	onClose: () => void;
	interviewId?: string;
	isAdmin?: boolean;
	isDeliberation?: boolean;
	onRelevantAppsChange?: (appIds: string[]) => void;
	onStartNextInterview?: (id: string) => void;
	isStartingNext?: boolean;
	isNavigating?: boolean;
	redirectCountdown?: number;
	previousInterview?: AdminDrawerInterviewInfo | null;
	nextInterview?: AdminDrawerInterviewInfo | null;
	inProgressInterview?: AdminDrawerInterviewInfo | null;
	onJoinInterview?: (id: string) => void;
}

export default function AdminDrawer({ open, onClose, interviewId, isAdmin, isDeliberation = false, onRelevantAppsChange, onStartNextInterview, isStartingNext, isNavigating, redirectCountdown, previousInterview, nextInterview, inProgressInterview, onJoinInterview }: AdminDrawerProps) {
	const { showAlert, handleError } = useAlert();
	const config = useConfig();
	const { member } = useAuth();
	const callObject = useDaily();
	const allParticipantIds = useParticipantIds();

	const [isEnding, setIsEnding] = useState(false);
	const [isNotifying, setIsNotifying] = useState(false);
	const [isMarkingMissed, setIsMarkingMissed] = useState(false);
	const [deliberateNext, setDeliberateNext] = useState(false);

	// Sync relevant application IDs for the host view
	useEffect(() => {
		if (onRelevantAppsChange) {
			const appIds: string[] = [];
			if (previousInterview?.applicationId) appIds.push(previousInterview.applicationId);
			if (nextInterview?.applicationId) appIds.push(nextInterview.applicationId);
			if (appIds.length > 0) onRelevantAppsChange(appIds);
		}
	}, [previousInterview, nextInterview, onRelevantAppsChange]);

	// Real-time listener for Auto-Deliberate config
	useEffect(() => {
		if (!config.CONFIG_ID) return;
		const configDocRef = doc(db, collections.siteConfig, config.CONFIG_ID as string);
		const unsubscribe = onSnapshot(configDocRef, (snapshot) => {
			if (snapshot.exists()) {
				setDeliberateNext(snapshot.data().AUTO_DELIBERATE === true);
			}
		});
		return () => unsubscribe();
	}, [config.CONFIG_ID]);

	const handleMarkAsMissed = async () => {
		setIsMarkingMissed(true);
		try {
			await markInterviewAsMissed({ interviewId });
			showAlert({ message: 'Interview marked as missed.', type: 'success' });
		} catch (error) {
			handleError(error, 'mark-interview-missed');
		} finally {
			setIsMarkingMissed(false);
		}
	};

	const handleEndForAll = async () => {
		setIsEnding(true);
		try {
			await endInterview({ interviewId });
			showAlert({ message: 'Interview ended for all participants.', type: 'success' });
		} catch (error) {
			handleError(error, 'end-interview-admin-panel');
		} finally {
			setIsEnding(false);
		}
	};

	const handleDeliberateSwitch = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const newAction = event.target.checked;
		try {
			const configDocRef = doc(db, collections.siteConfig, config.CONFIG_ID as string);
			await updateDoc(configDocRef, { AUTO_DELIBERATE: newAction });
		} catch (error) {
			handleError(error, 'update-post-interview-action');
		}
	};

	const handleSendWrapUpNotice = async () => {
		if (!callObject) return;
		setIsNotifying(true);
		callObject.sendAppMessage(
			{
				event: 'notify',
				message: 'Interview is approaching scheduled duration..',
			},
			'*'
		);

		showAlert({ message: 'Wrap-up notice sent to participants.', type: 'info' });
		setIsNotifying(false);
	};

	const getDuration = (start: DurationInput, end: DurationInput) => {
		if (!start || !end) return 'N/A';
		// Ensure inputs are dayjs objects or valid dates
		const toDateValue = (value: FirestoreTimestampLike | Date | string | number) => (typeof value === 'object' && 'toDate' in value ? value.toDate() : value);
		const diff = dayjs(toDateValue(end)).diff(dayjs(toDateValue(start)));
		const dur = dayjs.duration(diff);
		return `${dur.minutes()}m ${dur.seconds()}s`;
	};

	return (
		<Drawer
			variant='persistent'
			anchor='left'
			open={open}
			sx={{
				width: drawerWidth,
				flexShrink: 0,
				'& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
			}}>
			<Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<Typography variant='h6'>Admin Controls</Typography>
					<IconButton onClick={onClose} aria-label='Close admin controls'>
						<Close />
					</IconButton>
				</Box>
				<Divider sx={{ my: 1 }} />

				{/* Active Interview Controls */}
				{interviewId && !isDeliberation && (
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, my: 1 }}>
						<Button variant='contained' color='secondary' startIcon={isNotifying ? <CircularProgress size={20} color='inherit' /> : <Send />} onClick={handleSendWrapUpNotice} disabled={isNotifying} fullWidth>
							Send Wrap-Up Notice
						</Button>
					</Box>
				)}

				{/* Deliberation Mode (Between Interviews) */}
				{isDeliberation && (
					<>
						{inProgressInterview ? (
							<Card sx={{ mb: 1.5, border: '1px solid', borderColor: 'success.main' }}>
								<CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
									<Typography variant='subtitle2' sx={{ color: 'text.secondary' }}>
										Interview In Progress
									</Typography>
									<Typography variant='h6' sx={{ mt: 0.5 }}>
										{inProgressInterview.displayName}
									</Typography>
									<Button fullWidth variant='contained' color='success' sx={{ mt: 1.5 }} onClick={() => inProgressInterview.id && onJoinInterview?.(inProgressInterview.id)}>
										Join Now
									</Button>
								</CardContent>
							</Card>
						) : (
							<Card sx={{ mb: 1.5 }}>
								<CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
									<Typography variant='subtitle2' sx={{ color: 'text.secondary' }}>
										Just Finished
									</Typography>
									{previousInterview ? (
										<>
											<Typography variant='h6' sx={{ mt: 0.5 }}>
												{previousInterview.displayName}
											</Typography>
											<Typography variant='body2' sx={{ color: 'text.secondary' }}>
												Status: {previousInterview.status}
											</Typography>
											<Typography variant='body2' sx={{ color: 'text.secondary' }}>
												Duration: {getDuration(previousInterview.startTime, previousInterview.endTime)}
											</Typography>
										</>
									) : (
										<Typography variant='body2' sx={{ mt: 0.5, fontStyle: 'italic', color: 'text.secondary' }}>
											No recent interviews.
										</Typography>
									)}
								</CardContent>
							</Card>
						)}
						<Card sx={{ mb: 1.5 }}>
							<CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
								<Typography variant='subtitle2' sx={{ color: 'text.secondary' }}>
									Up Next
								</Typography>
								{nextInterview ? (
									<>
										<Typography variant='h6' sx={{ mt: 0.5 }}>
											{nextInterview.displayName}
										</Typography>
										<Typography variant='body2' sx={{ color: 'text.secondary' }}>
											Scheduled: {nextInterview.startTime ? dayjs(nextInterview.startTime.toDate()).format('ddd, MM/DD @ h:mm A') : 'N/A'}
										</Typography>
										{nextInterview.applicantPresent && <Chip icon={<CheckCircleOutlined />} label='Applicant is waiting' color='success' variant='outlined' size='small' sx={{ mt: 1 }} />}
										{isNavigating ? (
											<Box sx={{ mt: 1.5, textAlign: 'center' }}>
												<Typography variant='body2'>Navigating in:</Typography>
												<Typography variant='h4' color='primary'>
													{redirectCountdown}
												</Typography>
											</Box>
										) : (
											<Button fullWidth variant='contained' sx={{ mt: 1.5 }} onClick={() => nextInterview.id && onStartNextInterview?.(nextInterview.id)} disabled={isStartingNext}>
												{isStartingNext ? <CircularProgress size={24} color='inherit' /> : 'Start Next Interview'}
											</Button>
										)}
									</>
								) : (
									<Typography variant='body2' sx={{ mt: 0.5, fontStyle: 'italic', color: 'text.secondary' }}>
										No upcoming interviews.
									</Typography>
								)}
							</CardContent>
						</Card>
						<Divider sx={{ my: 1 }} />
					</>
				)}

				{/* Participant List */}
				<Typography variant='subtitle2' sx={{ mt: 0.5, mb: 0.5, color: 'text.secondary' }}>
					Live Participants ({allParticipantIds.length})
				</Typography>
				<Box sx={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
					{allParticipantIds.map((id) => (
						<ParticipantRow key={id} id={id} isAdmin={isAdmin} />
					))}
				</Box>

				{/* Bottom Controls (Host Only) */}
				{(member?.permissions?.site || member?.permissions?.interviews?.canHost) && (
					<>
						<Divider sx={{ my: 1 }} />
						<FormControlLabel control={<Switch checked={deliberateNext} onChange={handleDeliberateSwitch} />} label='Deliberate after interviews' sx={{ mb: 1 }} />

						{interviewId && (
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
								<Button variant='contained' color='error' startIcon={isEnding ? <CircularProgress size={20} color='inherit' /> : <CallEnd />} onClick={handleEndForAll} disabled={isEnding || isMarkingMissed} fullWidth>
									End and Complete
								</Button>

								<Button variant='outlined' color='warning' onClick={handleMarkAsMissed} disabled={isEnding || isMarkingMissed} fullWidth>
									{isMarkingMissed ? <CircularProgress size={24} /> : 'Mark Missed'}
								</Button>
							</Box>
						)}
					</>
				)}
			</Box>
		</Drawer>
	);
}
