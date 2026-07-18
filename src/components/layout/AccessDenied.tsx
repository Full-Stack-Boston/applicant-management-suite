import { Box, Button, Typography } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import GppBadOutlinedIcon from '@mui/icons-material/GppBadOutlined';
import Lottie from '../../utils/lottie';
import { generatePath, isAdminPath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { useAuth } from '../../context/AuthContext';
import { Assets } from '../../config/Constants';
import PublicStatusPage from '../home/PublicStatusPage';
import { homeAuthSubmitButtonSx, homeStatusPageLottieSquareSx } from '../home/homePageStyles';
import { useTheme } from '../../context/ThemeContext';

interface AccessDeniedProps {
	message?: string;
	homePath?: string;
	dashboardPath?: string;
}

const AccessDenied = ({ message, homePath = generatePath(paths.home), dashboardPath = generatePath(paths.redirect) }: AccessDeniedProps) => {
	const location = useLocation();
	const isAdminRoute = isAdminPath(location.pathname);
	const { user, role } = useAuth();
	const { primaryColor } = useTheme();
	const blockedPath = location.state?.from?.pathname || location.pathname;
	const destination = user && role ? dashboardPath : homePath;

	return (
		<PublicStatusPage
			embedded={isAdminRoute}
			eyebrow='403'
			title='Access Denied'
			icon={<GppBadOutlinedIcon />}
			subtitle={`You do not have permission to view "${blockedPath}". Contact your administrator if you believe this is an error.`}>
			<Box sx={homeStatusPageLottieSquareSx}>
				<Lottie animationData={Assets.accessDeniedLottie} loop autoplay />
			</Box>
			{message && message !== '' && (
				<Typography variant='body2' color='text.secondary' sx={{ mb: 2, lineHeight: 1.6, textAlign: 'center' }}>
					{message}
				</Typography>
			)}
			<Button variant='contained' fullWidth component={Link} replace to={destination} sx={homeAuthSubmitButtonSx(primaryColor)}>
				{user && role ? 'Go to Dashboard' : 'Go Home'}
			</Button>
		</PublicStatusPage>
	);
};

export default AccessDenied;
