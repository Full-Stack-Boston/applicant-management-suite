import React, { useState } from 'react';
import {
	Box,
	Button,
	Grid,
	MenuItem,
	Paper,
	TextField,
	Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { submitPublicContact } from '../../config/data/firebase';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';
import { homeContainedPrimaryButtonSx } from './homePageStyles';

const topicOptions = [
	{ value: 'application', label: 'Application question' },
	{ value: 'general', label: 'General inquiry' },
	{ value: 'technical', label: 'Technical support' },
];

const initialForm = {
	name: '',
	email: '',
	topic: 'application',
	message: '',
	website: '',
};

interface HomeContactFormProps {
	fillHeight?: boolean;
}

export default function HomeContactForm({ fillHeight = false }: HomeContactFormProps) {
	const { showAlert, handleError } = useAlert();
	const { primaryColor } = useTheme();
	const [form, setForm] = useState(initialForm);
	const [submitting, setSubmitting] = useState(false);

	const updateField = (field: keyof typeof initialForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		setForm((current) => ({ ...current, [field]: event.target.value }));
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setSubmitting(true);
		try {
			await submitPublicContact({
				name: form.name,
				email: form.email,
				topic: form.topic,
				message: form.message,
				website: form.website,
			});
			setForm(initialForm);
			showAlert({
				message: 'Thank you. Your message has been sent. We will reply by email.',
				type: 'success',
			});
		} catch (error) {
			handleError(error, 'Unable to send your message. Please try again or email us directly.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Paper
			variant='outlined'
			sx={{
				p: { xs: 3, md: 3.5 },
				borderRadius: 3,
				width: '100%',
				minWidth: 0,
				maxWidth: '100%',
				boxSizing: 'border-box',
				overflow: 'hidden',
				height: fillHeight ? { md: '100%' } : undefined,
				display: fillHeight ? { md: 'flex' } : undefined,
				flexDirection: fillHeight ? { md: 'column' } : undefined,
			}}>
			<Typography variant='h6' component='h3' sx={{ mb: 0.75 }}>
				Send Us a Message
			</Typography>
			<Typography variant='body2' color='text.secondary' sx={{ mb: 3, lineHeight: 1.7 }}>
				Prefer email? Use the addresses listed alongside this form. Otherwise, send a note here and we will get back to you.
			</Typography>

			<Box
				component='form'
				onSubmit={handleSubmit}
				noValidate
				sx={fillHeight ? { flex: { md: 1 }, display: { md: 'flex' }, flexDirection: { md: 'column' }, minHeight: { md: 0 }, minWidth: 0 } : { minWidth: 0 }}>
				<Grid container spacing={2} sx={fillHeight ? { flex: { md: 1 }, minHeight: { md: 0 }, minWidth: 0, width: '100%' } : { minWidth: 0, width: '100%' }}>
					<Grid size={{ xs: 12, sm: 6 }}>
						<TextField
							label='Your name'
							value={form.name}
							onChange={updateField('name')}
							required
							fullWidth
							autoComplete='name'
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<TextField
							label='Your email'
							type='email'
							value={form.email}
							onChange={updateField('email')}
							required
							fullWidth
							autoComplete='email'
						/>
					</Grid>
					<Grid size={{ xs: 12 }}>
						<TextField
							select
							label='Topic'
							value={form.topic}
							onChange={updateField('topic')}
							fullWidth>
							{topicOptions.map((option) => (
								<MenuItem key={option.value} value={option.value}>
									{option.label}
								</MenuItem>
							))}
						</TextField>
					</Grid>
					<Grid size={{ xs: 12 }} sx={fillHeight ? { flex: { md: 1 }, display: { md: 'flex' }, minHeight: { md: 0 } } : undefined}>
						<TextField
							label='Message'
							value={form.message}
							onChange={updateField('message')}
							required
							fullWidth
							multiline
							minRows={4}
							sx={
								fillHeight
									? {
											flex: { md: 1 },
											'& .MuiInputBase-root': { height: { md: '100%' }, alignItems: 'flex-start' },
											'& textarea': { height: { md: '100% !important' }, overflow: { md: 'auto !important' } },
										}
									: undefined
							}
						/>
					</Grid>
					<Grid size={{ xs: 12 }} sx={{ display: 'none' }} aria-hidden='true'>
						<TextField
							label='Website'
							value={form.website}
							onChange={updateField('website')}
							tabIndex={-1}
							autoComplete='off'
						/>
					</Grid>
					<Grid size={{ xs: 12 }}>
						<Button
							type='submit'
							variant='contained'
							size='large'
							disabled={submitting}
							startIcon={<SendIcon />}
							sx={homeContainedPrimaryButtonSx(primaryColor)}>
							{submitting ? 'Sending…' : 'Send Message'}
						</Button>
					</Grid>
				</Grid>
			</Box>
		</Paper>
	);
}
