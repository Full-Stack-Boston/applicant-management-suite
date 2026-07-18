/**
 * Construction Component
 * A placeholder for pages or sections currently in development.
 * Features:
 * - Displays a "Under Construction" Lottie animation.
 * - Accepts an optional message prop.
 */

import { Box, Typography } from '@mui/material';
import Lottie from '../../utils/lottie';

// Config
import { Assets } from '../../config/Constants';

const Construction = ({ message = 'Under Construction' }: { message?: string }) => {
	return (
		<Box
			sx={{
				width: '100%',
				height: '100%',
				bgcolor: 'background.main',
				minHeight: 280,
				padding: 4,
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				alignItems: 'center',
				textAlign: 'center',
			}}>
			<Box
				sx={{
					width: '100%',
					maxWidth: '350px',
					height: 'auto',
					mb: 2,
				}}>
				<Lottie animationData={Assets.underConstructionLottie} loop autoplay style={{ width: '100%', height: '100%' }} />
			</Box>

			<Typography variant='h5' color='text.secondary'>
				{message}
			</Typography>
		</Box>
	);
};

export default Construction;