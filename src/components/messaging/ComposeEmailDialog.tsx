/**
 * Compose Email Dialog
 * A modal form for writing and sending emails via the Zoho integration.
 * Features:
 * - Supports New Email, Reply, and Reply All modes.
 * - Dynamic "From" address selection based on user permissions.
 * - Signature injection.
 * - Branding toggle (Header/Footer).
 * - "Quoted text" preview for replies.
 */

import { useState } from 'react';
import { DialogTitle, DialogContent, DialogActions, Button, TextField, Select, MenuItem, FormControlLabel, Switch, Box, InputLabel, FormControl, CircularProgress, Typography, Divider } from '@mui/material';

// Context & Hooks
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useAlert } from '../../context/AlertContext';
import { useMailbox } from '../../context/MailboxContext';
import { useComposeEmailOptions } from '../../hooks/useComposeEmailOptions';

// Backend
import { sendZohoEmail } from '../../config/data/firebase';

// Helper: Convert comma-separated string to array
const parseRecipients = (recipientString: unknown): string[] => {
	if (!recipientString || typeof recipientString !== 'string') return [];
	return recipientString
		.split(',')
		.map((email) => email.trim())
		.filter((email) => email.length > 0);
};

interface ComposeEmailDialogProps {
	onSuccess: () => void;
	onClose: () => void;
	title?: string;
	to?: string | string[];
	subject?: string;
	htmlPreview?: string;
	originalMessageId?: string;
	fromAddress?: string;
}

interface ComposeFormData {
	fromAddress: string;
	to: string;
	cc: string;
	bcc: string;
	subject: string;
	body: string;
	signature: string;
	useBranding: boolean;
	[key: string]: unknown;
}

const ComposeEmailDialog = ({ onSuccess, onClose, title, to, subject, htmlPreview, originalMessageId, fromAddress }: ComposeEmailDialogProps) => {
	const { member } = useAuth();
	const config = useConfig();
	const { showAlert, handleError } = useAlert();
	const { refreshMailbox } = useMailbox();

	const [loading, setLoading] = useState(false);

	// Auto-show CC field if this is a "Reply All" action
	const [showCc, setShowCc] = useState(!!(htmlPreview && title?.includes('Reply to All')));
	const [showBcc, setShowBcc] = useState(false);

	// Fetch available 'From' aliases and signatures
	const { fromOptions, signatureOptions, defaultFrom } = useComposeEmailOptions({
		member,
		config,
		fromAddress,
	});

	const [formData, setFormData] = useState<ComposeFormData>({
		fromAddress: defaultFrom,
		to: Array.isArray(to) ? to.join(', ') : to || '',
		cc: '',
		bcc: '',
		subject: subject || '',
		body: '',
		signature: 'none',
		useBranding: false,
	});

	const handleInputChange = (event: { target: { name: string; value: unknown; type?: string; checked?: boolean } }) => {
		const { name, value, type, checked } = event.target;
		setFormData((prev) => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value,
		}));
	};

	const handleSubmit = async () => {
		if (!formData.to) {
			showAlert({ message: 'Please specify at least one recipient.', type: 'warning' });
			return;
		}

		setLoading(true);
		try {
			// Append signature if selected
			const signatureHtml = formData.signature && formData.signature !== 'none' ? `<br><br>${formData.signature}` : '';

			const bodyWithSignature = (formData.body || '') + signatureHtml;
			const fullBody = bodyWithSignature + (htmlPreview || '');

			showAlert({ message: 'Sending email...', type: 'info' });

			const result = await sendZohoEmail({
				...formData,
				body: fullBody,
				to: parseRecipients(formData.to),
				cc: parseRecipients(formData.cc),
				bcc: parseRecipients(formData.bcc),
				originalMessageId: originalMessageId || null,
			});

			const resultData = result.data as { message?: string } | undefined;
			showAlert({ message: resultData?.message || 'Email sent!', type: 'success' });
			onSuccess();
			refreshMailbox();
		} catch (error) {
			handleError(error, 'send-zoho-email');
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<DialogTitle>{title || 'Compose New Email'}</DialogTitle>
			<DialogContent>
				<FormControl fullWidth margin='dense'>
					<InputLabel id='from-address-label'>From</InputLabel>
					<Select labelId='from-address-label' name='fromAddress' value={formData.fromAddress} label='From' onChange={handleInputChange}>
						{fromOptions.map((option) => (
							<MenuItem key={option.value} value={option.value}>
								{option.label}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				<TextField name='to' label='To (comma-separated)' value={formData.to} onChange={handleInputChange} fullWidth margin='dense' variant='outlined' required />

				{showCc && <TextField name='cc' label='Cc (comma-separated)' value={formData.cc} onChange={handleInputChange} fullWidth margin='dense' variant='outlined' />}

				{showBcc && <TextField name='bcc' label='Bcc (comma-separated)' value={formData.bcc} onChange={handleInputChange} fullWidth margin='dense' variant='outlined' />}

				<Box sx={{ textAlign: 'right', mt: -1, mb: 1 }}>
					{!showCc && (
						<Button size='small' onClick={() => setShowCc(true)}>
							Add Cc
						</Button>
					)}
					{!showBcc && (
						<Button size='small' onClick={() => setShowBcc(true)}>
							Add Bcc
						</Button>
					)}
				</Box>

				<TextField name='subject' label='Subject' value={formData.subject} onChange={handleInputChange} fullWidth margin='dense' variant='outlined' required />

				<TextField name='body' label='Your Message' value={formData.body} onChange={handleInputChange} fullWidth margin='dense' variant='outlined' multiline rows={6} required autoFocus />

				<FormControl fullWidth margin='dense'>
					<InputLabel id='include-signature-label'>Include Signature</InputLabel>
					<Select labelId='include-signature-label' name='signature' value={formData.signature} label='Include Signature' onChange={handleInputChange}>
						{signatureOptions.map((option) => (
							<MenuItem key={option.value} value={option.value}>
								{option.label}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				<FormControlLabel control={<Switch name='useBranding' checked={formData.useBranding} onChange={handleInputChange} />} label='Include Branded Email Header & Footer' />

				{htmlPreview && (
					<Box sx={{ mt: 2 }}>
						<Divider sx={{ mb: 1 }} />
						<Typography variant='caption' sx={{ color: 'text.secondary' }}>
							Quoted Text:
						</Typography>
						<Box sx={{ px: 2, py: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover', maxHeight: 200, overflowY: 'auto' }}>
							<div dangerouslySetInnerHTML={{ __html: htmlPreview }} />
						</Box>
					</Box>
				)}
			</DialogContent>

			<DialogActions sx={{ p: '0 24px 24px' }}>
				<Button onClick={onClose} disabled={loading}>
					Cancel
				</Button>
				<Button onClick={handleSubmit} variant='contained' disabled={loading}>
					{loading ? <CircularProgress size={24} /> : 'Send Email'}
				</Button>
			</DialogActions>
		</>
	);
};

export default ComposeEmailDialog;
