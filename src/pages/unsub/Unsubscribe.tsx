import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Stack, Typography } from '@mui/material';
import { HistoryEdu as HistoryEduIcon } from '@mui/icons-material';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import Loader from '../../components/loader/Loader';
import PublicStatusPage from '../../components/home/PublicStatusPage';
import { homeAuthSubmitButtonSx } from '../../components/home/homePageStyles';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { validateLink } from '../../config/Constants';
import { updateApplicantData } from '../../config/data/firebase';

export default function Unsubscribe() {
	const navigate = useNavigate();
	const { encID } = useParams<{ encID: string }>();
	const { primaryColor } = useTheme();
	const [loading, setLoading] = useState<boolean>(true);
	const [unsubscribeSuccess, setUnsubscribeSuccess] = useState<boolean>(false);
	const [unsubscribeError, setUnsubscribeError] = useState<string | null>(null);

	useTitle({ title: 'Unsubscribe', appear: false });

	useEffect(() => {
		const handleUnsubscribe = async () => {
			try {
				const isValid = await validateLink(encID!);

				if (isValid.result) {
					await updateApplicantData(isValid.id as string, { 'notifications.email': false });
					setUnsubscribeSuccess(true);
				} else {
					setUnsubscribeError(`Invalid unsubscribe link. Please use a more recent email or sign in and update your preferences. Error: ${isValid.error}`);
				}
			} catch (error) {
				setUnsubscribeError((error as Error).message || 'An error occurred while trying to unsubscribe.');
			} finally {
				setLoading(false);
			}
		};

		handleUnsubscribe();
	}, [encID]);

	if (loading) {
		return <Loader />;
	}

	if (unsubscribeSuccess) {
		return (
			<PublicStatusPage
				eyebrow='Email Preferences'
				title='Unsubscribe Successful'
				icon={<HistoryEduIcon />}
				subtitle='You have successfully unsubscribed from our email notifications.'
				fitViewport>
				<Stack spacing={2}>
					<Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.7 }}>
						If you change your mind, you can re-enable notifications in your account settings or by reaching out to us.
					</Typography>
					<Button variant='contained' fullWidth onClick={() => navigate(generatePath(paths.root))} sx={homeAuthSubmitButtonSx(primaryColor)}>
						Go to Homepage
					</Button>
				</Stack>
			</PublicStatusPage>
		);
	}

	return (
		<PublicStatusPage
			eyebrow='Email Preferences'
			title='Unsubscribe Error'
			icon={<ErrorOutlineOutlinedIcon />}
			subtitle={unsubscribeError || 'An error occurred while trying to unsubscribe. Please try again later.'}
			fitViewport>
			<Button variant='contained' fullWidth onClick={() => navigate(generatePath(paths.root))} sx={homeAuthSubmitButtonSx(primaryColor)}>
				Go to Homepage
			</Button>
		</PublicStatusPage>
	);
}
