import { Box, Button } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import Lottie from '../../utils/lottie';
import { Assets } from '../../config/Constants';
import { useAuth } from '../../context/AuthContext';
import { generatePath, isAdminPath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import PublicStatusPage from '../home/PublicStatusPage';
import { homeAuthSubmitButtonSx, homeStatusPageLottieSx } from '../home/homePageStyles';
import { useTheme } from '../../context/ThemeContext';

const NotFound = () => {
	const location = useLocation();
	const isAdminRoute = isAdminPath(location.pathname);
	const { user, role } = useAuth();
	const { primaryColor } = useTheme();
	const destination = generatePath(user && role ? paths.redirect : paths.home);

	return (
		<PublicStatusPage
			embedded={isAdminRoute}
			eyebrow='404'
			title='Page Not Found'
			icon={<SearchOffOutlinedIcon />}
			subtitle={`The page "${location.pathname}" does not exist or was moved.`}>
			<Box sx={homeStatusPageLottieSx}>
				<Lottie animationData={Assets.notFoundLottie} loop autoplay />
			</Box>
			<Button variant='contained' fullWidth component={Link} replace to={destination} sx={homeAuthSubmitButtonSx(primaryColor)}>
				{user && role ? 'Go to Dashboard' : 'Go Home'}
			</Button>
		</PublicStatusPage>
	);
};

export default NotFound;
