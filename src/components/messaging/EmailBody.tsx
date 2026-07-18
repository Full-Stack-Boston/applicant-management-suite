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

interface EmailBodyProps {
	email: ProcessableEmail;
	darkMode: boolean;
	cardStyles: Record<string, unknown>;
	cardContentStyles: Record<string, unknown>;
}

const EmailBody = ({ email, darkMode, cardStyles, cardContentStyles }: EmailBodyProps) => {
	// Custom hook to handle HTML sanitization and inline image processing
	const { processedContent, contentLoading } = useProcessedEmailContent(email);

	// Styles to ensure external HTML email content renders decently within the app
	const bodyStyles: SxProps<Theme> = {
		mt: 1,
		p: 2,
		fontFamily: 'sans-serif',
		fontSize: '14px',
		lineHeight: 1.6,
		borderRadius: '8px',
		// Ensure contrast matches the theme
		bgcolor: darkMode ? 'background.default' : 'background.paper',
		color: 'text.primary',
		wordBreak: 'break-word',
		overflowX: 'auto', // Handle wide tables/images
		'& img': { maxWidth: '100%', height: 'auto', display: 'block' },
		'& table': { borderCollapse: 'collapse', width: '100%', maxWidth: '100%' },
		'& th, & td': { border: '1px solid', borderColor: 'divider', p: 1 },
		'& a': { color: 'primary.main' },
	};

	return (
		<Box sx={{ ...cardStyles }}>
			<Box sx={{ ...cardContentStyles }}>
				{contentLoading ? (
					<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
						<CircularProgress size={24} />
						<Typography sx={{ ml: 2, color: 'text.secondary' }}>Loading email content...</Typography>
					</Box>
				) : (
					<Box dangerouslySetInnerHTML={{ __html: processedContent }} sx={bodyStyles} />
				)}
			</Box>
		</Box>
	);
};

export default EmailBody;