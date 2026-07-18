/**
 * Global Loader
 * A full-screen spinner used during data fetching or authentication checks.
 * Centers a CircularProgress indicator in the viewport.
 */

import { Box, CircularProgress, Typography } from '@mui/material';

const Loader = () => (
	<Box
		sx={{
			bgcolor: 'transparent',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
			height: '100vh',
			width: '100%',
		}}>
		<CircularProgress color='primary' />
		<Typography sx={{ ml: 2 }}>Loading...</Typography>
	</Box>
);



export default Loader;