/**
 * Message Options Components
 * Sub-components used within the ContactDialog to present messaging choices.
 * * 1. TemplatedOptions:
 * - Iterates through 'templates' config.
 * - triggers 'send' function for automated system emails.
 * * 2. CustomMessageTrigger:
 * - Opens a dialog for custom subject/body.
 * - Writes directly to Firestore 'mail'/'sms' collections to trigger backend sending.
 */

import { Box, Button, Typography, Grid } from '@mui/material';

// Firebase
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../../config/data/firebase';
import { collections } from '../../config/data/collections';

// Context
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';

// Config
import { templates, send } from '../../config/content/push';
import { emailHeader, staticEmailFooter, senders } from '../../config/Constants';
import { isDemoEmailMode, withSimulatedDelivery } from '../../config/content/emailDelivery';

export interface MessageRecipient {
	name?: string;
	email?: string;
	cell?: string;
	[key: string]: unknown;
}

interface MessageOptionsProps {
	darkMode: boolean;
	recipients: MessageRecipient[];
	onClose: () => void;
}

interface TemplateOption {
	name: string;
	label: string;
	requiredFields?: { name: string; label: string; type: string }[];
	[key: string]: unknown;
}

// --- Component 1: Templated Options ---

export const TemplatedOptions = ({ darkMode, recipients, onClose }: MessageOptionsProps) => {
	const { showDialog } = useDialog();
	const { boxShadow } = useTheme();
	const { showAlert, handleError } = useAlert();

	const handleSend = async (templateKey: string, data: Record<string, unknown> = {}) => {
		const sender = senders[0]; // Default sender
		const emailRecipients = recipients.filter((r) => r.email);
		const smsRecipients = recipients.filter((r) => r.cell);

		if (!emailRecipients.length && !smsRecipients.length) {
			showAlert({ message: 'No valid recipients were provided.', type: 'warning' });
			return;
		}

		try {
			const result = await send(templateKey, emailRecipients, sender, [], smsRecipients, data);

			if (result.success) {
				showAlert({ message: 'Message queued for sending!', type: 'success' });
				onClose();
			} else {
				throw result.error;
			}
		} catch (error) {
			handleError(error, 'templated-options-send');
		}
	};

	const handleOpenDialog = (template: TemplateOption) => {
		// If template requires inputs (e.g. date/time), open dialog first
		if (template.requiredFields && template.requiredFields.length > 0) {
			showDialog({
				id: 'templatedMessage',
				data: {
					title: `Enter Required Data for ${template.label}`,
					inputs: template.requiredFields,
				},
				callback: (formData: unknown) => {
					if (formData) {
						handleSend(template.name, formData as Record<string, unknown>);
					}
				},
			});
		} else {
			// Otherwise send immediately
			handleSend(template.name, {});
		}
	};

	return (
		<>
			{templates.map((template) => (
				<Grid size={{ xs: 12, sm: 6, md: template.title === 'Application Status' ? 8 : 4 }} key={template.title} sx={{ display: 'flex' }}>
					<Box
						sx={{
							display: 'flex',
							flexDirection: 'column',
							gap: '10px',
							bgcolor: darkMode ? 'background.main' : 'white',
							color: darkMode ? 'white' : 'secondary.main',
							padding: '20px',
							borderRadius: '12px',
							boxShadow: boxShadow,
							minHeight: 310,
							height: 'auto',
							width: '100%',
							minWidth: 0,
							overflow: 'visible',
							boxSizing: 'border-box',
						}}>
						<Typography component='h2' variant='subtitle1' sx={{ flexShrink: 0 }}>
							{template.title}
						</Typography>

						<Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0, width: '100%' }}>
							{template.options.map((option) => (
								<Button
									key={option.name}
									variant='contained'
									fullWidth
									sx={{
										backgroundColor: darkMode ? 'primary.main' : 'highlight.main',
										whiteSpace: 'normal',
										lineHeight: 1.3,
										py: 1,
										px: 1.5,
										textAlign: 'center',
										flexShrink: 0,
										maxWidth: '100%',
									}}
									onClick={() => handleOpenDialog(option)}>
									{option.label}
								</Button>
							))}
						</Box>
					</Box>
				</Grid>
			))}
		</>
	);
};

// --- Component 2: Custom Message Trigger ---

export const CustomMessageTrigger = ({ darkMode, recipients, onClose }: MessageOptionsProps) => {
	const { boxShadow } = useTheme();
	const { showDialog } = useDialog();
	const { showAlert, handleError } = useAlert();
	const config = useConfig();

	const handleCustomMessageSend = async (formData: unknown) => {
		if (!formData) return;

		const { subject = '', emailBody = '', smsBody = '' } = formData as { subject?: string; emailBody?: string; smsBody?: string };
		const sender = senders[0]; // Default sender

		const emailRecipients = recipients.filter((r) => r.email);
		const smsRecipients = recipients.filter((r) => r.cell);

		if (!emailRecipients.length && !smsRecipients.length) {
			showAlert({ message: 'No valid recipients were provided.', type: 'warning' });
			return;
		}

		try {
			// Process Email Recipients
			if (emailRecipients.length > 0) {
				for (const recipient of emailRecipients) {
					// Parse HTML to get plain text preview
					const parser = new DOMParser();
					const parsedHtml = parser.parseFromString(emailBody, 'text/html');
					const text = parsedHtml.body.textContent || '';

					const emailPayload = {
						to: `${recipient.name} <${recipient.email}>`,
						from: `${sender.name} <${sender.email}>`,
						replyTo: config.SYSTEM_REPLY_TO,
						message: {
							subject,
							text,
							html: emailHeader + emailBody + staticEmailFooter,
						},
					};
					const email = isDemoEmailMode(config) ? withSimulatedDelivery(emailPayload) : emailPayload;

					// Trigger backend email extension via Firestore (or simulated in demo mode)
					await setDoc(doc(collection(db, collections.emails)), email);
				}
			}

			// Process SMS Recipients
			if (smsRecipients.length > 0) {
				for (const recipient of smsRecipients) {
					const sms = {
						to: `+1${recipient.cell}`,
						body: smsBody || subject,
					};
					// Trigger backend SMS extension via Firestore
					await setDoc(doc(collection(db, collections.sms)), sms);
				}
			}

			showAlert({ message: 'Custom message queued!', type: 'success' });
			onClose();
		} catch (error) {
			handleError(error, 'custom-message-trigger-send');
		}
	};

	return (
		<Grid size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					gap: '20px',
					bgcolor: darkMode ? 'background.main' : 'white',
					color: darkMode ? 'white' : 'secondary.main',
					padding: '20px',
					borderRadius: '12px',
					boxShadow: boxShadow,
					minHeight: 310,
					height: 'auto',
					width: '100%',
					minWidth: 0,
					overflow: 'visible',
					boxSizing: 'border-box',
				}}>
				<Typography component='h2' variant='subtitle1'>
					Send a Custom Message
				</Typography>

				<Button
					variant='contained'
					sx={{ backgroundColor: darkMode ? 'primary.main' : 'highlight.main' }}
					onClick={() =>
						showDialog({
							id: 'customMessage',
							callback: handleCustomMessageSend,
						})
					}>
					Compose Message
				</Button>
			</Box>
		</Grid>
	);
};
