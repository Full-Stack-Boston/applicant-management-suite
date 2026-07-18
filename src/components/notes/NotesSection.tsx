/**
 * Notes Section Widget
 * A reusable component to display and manage comments on any entity (Application, Applicant, etc.).
 * Features:
 * - Real-time list of notes fetched via Firestore listener.
 * - Privacy toggles (Private vs. Committee-wide).
 * - Inline editing and "Redaction" (soft delete) capabilities.
 */

import { useState, useEffect, type ChangeEvent } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Box, Typography, TextField, Button, Switch, FormControlLabel, Card, CardContent, CardActions, IconButton, Chip, Grid } from '@mui/material';
import { Edit, Delete, Lock, Group, Block as BlockIcon } from '@mui/icons-material';

// Context
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';

// Backend
import { getRealTimeNotes, addNote, updateNote, redactNote } from '../../config/data/firebase';

// Init DayJS
dayjs.extend(relativeTime);

interface NotesSectionProps {
	targetId: string;
	targetCollection: string;
}

interface Note {
	id: string;
	text: string;
	authorName: string;
	authorId: string;
	visibility: 'private' | 'committee';
	redacted?: boolean;
	redactedOn?: { toDate?: () => Date };
	createdAt?: { toDate?: () => Date };
	[key: string]: unknown;
}

interface EditingNote {
	id: string;
	text: string;
}

const NotesSection = ({ targetId, targetCollection }: NotesSectionProps) => {
	const [notes, setNotes] = useState<Note[]>([]);
	const [newNote, setNewNote] = useState('');
	const [isPrivate, setIsPrivate] = useState(false);
	const [editingNote, setEditingNote] = useState<EditingNote | null>(null);

	const { member } = useAuth();
	const { showAlert, handleError } = useAlert();
	const { darkMode } = useTheme();

	// Subscribe to notes in real-time
	useEffect(() => {
		if (!targetId || !targetCollection) return;
		const unsubscribe = getRealTimeNotes(targetCollection, targetId, (data) => setNotes((data as Note[]) || []));
		return () => unsubscribe();
	}, [targetId, targetCollection]);

	const handleAddNote = async () => {
		if (!newNote.trim()) return;

		try {
			await addNote(targetCollection, targetId, {
				text: newNote,
				visibility: isPrivate ? 'private' : 'committee',
				authorId: member?.id,
				authorName: `${member?.firstName} ${member?.lastName}`,
			});
			setNewNote('');
			setIsPrivate(false);
			showAlert({ message: 'Note added successfully!', type: 'success' });
		} catch (error) {
			handleError(error, 'add-note');
		}
	};

	const handleUpdateNote = async () => {
		if (!editingNote?.text?.trim()) return;

		try {
			await updateNote(targetCollection, targetId, editingNote.id, editingNote.text);
			setEditingNote(null);
			showAlert({ message: 'Note updated!', type: 'success' });
		} catch (error) {
			handleError(error, 'update-note');
		}
	};

	const handleRedactNote = async (noteId: string) => {
		// Native confirm is acceptable for critical destructive actions like redaction
		if (globalThis.confirm('Are you sure you want to redact this note? This cannot be undone.')) {
			try {
				await redactNote(targetCollection, targetId, noteId);
				showAlert({ message: 'Note redacted.', type: 'success' });
			} catch (error) {
				handleError(error, 'redact-note');
			}
		}
	};

	return (
		<Box>
			<Typography variant='h6' gutterBottom component='div'>
				Notes
			</Typography>

			<Grid container spacing={2}>
				{/* Input Area */}
				<Grid size={{ xs: 12, md: notes.length > 0 ? 5 : 12 }}>
					<Card variant='outlined' sx={{ mb: 2 }}>
						<CardContent>
							<TextField label='Add a new note...' multiline rows={4} fullWidth value={newNote} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setNewNote(e.target.value)} />
						</CardContent>
						<CardActions sx={{ justifyContent: 'space-between', p: 2, pt: 0 }}>
							<FormControlLabel control={<Switch checked={isPrivate} onChange={(e: ChangeEvent<HTMLInputElement>) => setIsPrivate(e.target.checked)} />} label={isPrivate ? 'Private (Only Me)' : 'Committee Wide'} />
							<Button sx={{ bgcolor: 'background.passive' }} variant={darkMode ? 'outlined' : 'contained'} onClick={handleAddNote}>
								Add Note
							</Button>
						</CardActions>
					</Card>
				</Grid>

				{/* List Area */}
				{notes.length > 0 && (
					<Grid
						size={{ xs: 12, md: 7 }}
						sx={{
							maxHeight: '300px',
							overflowY: 'auto',
						}}>
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pr: 1 }}>
							{notes.map((note) => (
								<Card
									key={note.id}
									variant='outlined'
									sx={{
										bgcolor: note.redacted ? 'action.disabledBackground' : 'transparent',
										transition: '0.2s',
										'&:hover': { boxShadow: 1 },
									}}>
									<CardContent>
										{note.redacted ? (
											<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.disabled' }}>
												<BlockIcon />
												<Typography variant='body2' sx={{ fontStyle: 'italic' }}>
													Note redacted on {note.redactedOn?.toDate ? dayjs(note.redactedOn.toDate()).format('MM/DD/YYYY') : 'Unknown Date'}
												</Typography>
											</Box>
										) : (
											<>
												{/* Note Header */}
												<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
													<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
														<Typography variant='subtitle2' sx={{ fontWeight: 'bold' }}>
															{note.authorName}
														</Typography>
														<Typography variant='caption' sx={{ color: 'text.secondary' }}>
															{note.createdAt?.toDate ? dayjs(note.createdAt.toDate()).fromNow() : 'Just now'}
														</Typography>
														{note.visibility === 'private' ? <Chip icon={<Lock />} label='Private' size='small' variant='outlined' color='secondary' /> : <Chip icon={<Group />} label='Committee' size='small' variant='outlined' color='primary' />}
													</Box>

													{note.authorId === member?.id && (
														<Box>
															<IconButton size='small' onClick={() => setEditingNote({ id: note.id, text: note.text })}>
																<Edit fontSize='inherit' />
															</IconButton>
															<IconButton size='small' onClick={() => handleRedactNote(note.id)}>
																<Delete fontSize='inherit' />
															</IconButton>
														</Box>
													)}
												</Box>

												{/* Note Body (View vs Edit Mode) */}
												{editingNote?.id === note.id ? (
													<Box>
														<TextField multiline rows={3} fullWidth value={editingNote.text} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditingNote((prev) => (prev ? { ...prev, text: e.target.value } : prev))} />
														<Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
															<Button size='small' variant='contained' onClick={handleUpdateNote}>
																Save
															</Button>
															<Button size='small' variant='outlined' onClick={() => setEditingNote(null)}>
																Cancel
															</Button>
														</Box>
													</Box>
												) : (
													<Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>
														{note.text}
													</Typography>
												)}
											</>
										)}
									</CardContent>
								</Card>
							))}
						</Box>
					</Grid>
				)}
			</Grid>
		</Box>
	);
};

export default NotesSection;
