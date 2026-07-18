import { Box, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { adminMobileCardSx } from '../../config/ui/adminPageStyles';

interface MobileListEmptyStateProps {
	message?: string;
	boxShadow?: string;
}

const MobileListEmptyState = ({ message = 'No items to display', boxShadow }: MobileListEmptyStateProps) => (
	<Box
		sx={{
			...adminMobileCardSx(boxShadow ?? ''),
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			py: 4,
			px: 2,
			gap: 1,
		}}>
		<InboxOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.7 }} />
		<Typography variant='body1' sx={{ color: 'text.secondary', textAlign: 'center' }}>
			{message}
		</Typography>
	</Box>
);

export default MobileListEmptyState;
