/**
 * Email Body Component
 * Renders the actual content of an email message.
 * Features:
 * - Uses 'useProcessedEmailContent' to handle inline attachments/CIDs.
 * - Displays a loading state while parsing content.
 * - Sandboxes HTML styles to prevent email formatting from breaking the app layout.
 */

import { Box, CircularProgress, Typography, type SxProps, type Theme } from '@mui/material';

// Hooks
import { useProcessedEmailContent, type ProcessableEmail } from '../../hooks/useProcessedEmailContent';
import { sanitizeHtmlConfig } from '../../utils/sanitizeHtml';
import DOMPurify from 'dompurify';

interface EmailBodyProps {
	email: ProcessableEmail;
	darkMode: boolean;
	cardStyles: Record<string, unknown>;
	cardContentStyles: Record<string, unknown>;
}

const EmailBody = ({ email, cardStyles, cardContentStyles }: EmailBodyProps) => {
	// Custom hook to handle HTML sanitization and inline image processing
	const { processedContent, contentLoading } = useProcessedEmailContent(email);

	// HTML emails assume a light reading surface; keep contrast stable across themes.
	const bodyStyles: SxProps<Theme> = {
		mt: 0,
		p: { xs: 2, md: 2.5 },
		fontFamily: 'sans-serif',
		fontSize: '14px',
		lineHeight: 1.6,
		borderRadius: 0,
		width: '100%',
		boxSizing: 'border-box',
		bgcolor: '#ffffff',
		color: '#1a1a1a',
		wordBreak: 'break-word',
		overflowX: 'auto',
		'& img': { maxWidth: '100%', height: 'auto', display: 'block' },
		'& table': { borderCollapse: 'collapse', width: '100%', maxWidth: '100%' },
		'& th, & td': { border: '1px solid #ddd', p: 1 },
		'& a': { color: '#0b57d0' },
	};

	const outerSx = [
		{ width: '100%', m: 0 },
		...(Array.isArray(cardStyles.sx) ? cardStyles.sx : cardStyles.sx ? [cardStyles.sx] : []),
	] as SxProps<Theme>;

	return (
		<Box {...(cardStyles as Record<string, unknown>)} sx={outerSx}>
			<Box {...(cardContentStyles as Record<string, unknown>)}>
				{contentLoading ? (
					<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
						<CircularProgress size={24} />
						<Typography sx={{ ml: 2, color: 'text.secondary' }}>Loading email content...</Typography>
					</Box>
				) : (
					<Box dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processedContent, sanitizeHtmlConfig) }} sx={bodyStyles} />
				)}
			</Box>
		</Box>
	);
};

export default EmailBody;
