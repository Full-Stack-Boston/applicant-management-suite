import { Button, TextField, FormControlLabel, Checkbox, Box, Grid, Stack } from '@mui/material';
import { loginUser, auth, getUserProfiles, logoutUser } from '../../config/data/firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import Loader from '../../components/loader/Loader';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { loginContent as loginConfig, homePageContent } from '../../config/content';
import PublicPageLayout from '../../components/home/PublicPageLayout';
import AuthFormCard from '../../components/auth/AuthFormCard';
import { homeAuthSecondaryButtonSx, homeAuthSubmitButtonSx } from '../../components/home/homePageStyles';

const firebaseLoginErrorMessages: Record<string, string> = {
	'auth/invalid-credential': 'Invalid credentials. Please try again.',
	'auth/user-not-found': 'No account found with this email.',
	'auth/wrong-password': 'Incorrect password. Please try again.',
	'auth/invalid-email': 'Invalid email address format.',
	'auth/user-disabled': 'This account has been disabled.',
	'auth/too-many-requests': 'Too many attempts. Please try again later.',
	'auth/network-request-failed': 'Network error. Check your connection and try again.',
};

const firebaseResetErrorMessages: Record<string, string> = {
	'auth/invalid-email': 'Invalid email address format.',
	'auth/user-not-found': 'No account found with this email.',
};

export default function Login() {
	const navigate = useNavigate();
	const location = useLocation();
	const config = useConfig();
	const { primaryColor } = useTheme();
	const { loading } = useAuth();
	const { showAlert, handleError } = useAlert();
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	useTitle({ title: 'Login', appear: true });

	const initialFormState = (loginConfig.fields as any[]).reduce((acc: Record<string, string | boolean>, field: any) => {
		acc[field.name as string] = field.component === 'Checkbox' ? false : '';
		return acc;
	}, {});
	const [formData, setFormData] = useState<Record<string, string | boolean>>(initialFormState);

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value, type, checked } = event.target;
		setFormData((prev) => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value,
		}));
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsSubmitting(true);

		if (config.DOWN_FOR_MAINTENANCE) {
			showAlert({ message: (config.MAINTENANCE_MESSAGE as string) || 'The site is currently down for maintenance.', type: 'info' });
			setIsSubmitting(false);
			return;
		}

		let succeeded = false;
		try {
			const loginResult = await loginUser((formData.email as string).trim(), formData.password as string);
			const user = loginResult.user;

			const profiles = await getUserProfiles(user.uid) as Record<string, unknown>;
			const isMember = !!profiles.member;
			const isApplicant = !!profiles.applicant;

			if ((isMember && !config.MEMBER_ACCESS) || (isApplicant && !isMember && !config.APPLICANT_ACCESS)) {
				const message = isMember ? 'Access for members is currently disabled.' : 'Access for applicants is currently disabled.';
				showAlert({ message: `${message} Please try again later.`, type: 'error' });
				await logoutUser();
			} else {
				const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
				const destination =
					from ||
					(isMember && isApplicant
						? generatePath(paths.redirect)
						: isMember
							? generatePath(paths.memberDash)
							: isApplicant
								? generatePath(paths.apply)
								: generatePath(paths.redirect));

				showAlert({ message: 'Login successful!', type: 'success' });
				succeeded = true;
				navigate(destination, { replace: true });
			}
		} catch (error) {
			const firebaseError = error as { code?: string; message?: string };
			const userFriendlyMessage = firebaseLoginErrorMessages[firebaseError.code || ''] || 'An unexpected error occurred.';
			showAlert({ message: userFriendlyMessage, type: 'error' });
			handleError(error, 'login-handleSubmit', false);
		} finally {
			// Keep the submitting loader up through a successful navigate so the
			// form never flashes empty between auth settle and route change.
			if (!succeeded) setIsSubmitting(false);
		}
	};

	const handlePasswordReset = () => {
		const email = prompt('Please enter your email address');
		if (email) {
			sendPasswordResetEmail(auth, email.trim())
				.then(() => {
					showAlert({ message: 'Password reset email sent. Check your inbox.', type: 'success' });
				})
				.catch((error) => {
					const firebaseError = error as { code?: string };
					const message = firebaseResetErrorMessages[firebaseError.code || ''] || 'Failed to send reset email.';
					showAlert({ message, type: 'error' });
					handleError(error, 'login-passwordReset', false);
				});
		}
	};

	const actionMap: Record<string, () => void> = { handlePasswordReset: handlePasswordReset };

	const loginLinks = [
		...loginConfig.links,
		...(config.MEMBER_ONBOARDING_PAGE_ENABLED
			? [
					{
						id: 'boardRegister',
						label: homePageContent.demoBoardAccess.loginLinkLabel,
						navigationPath: homePageContent.demoBoardAccess.path || paths.registerMember,
					},
				]
			: []),
	];

	if (loading || isSubmitting) return <Loader />;

	return (
		<PublicPageLayout maxWidth='lg' compact tightMobile>
			<AuthFormCard
				layout='split'
				tightMobile
				title={loginConfig.title}
				icon={loginConfig.icon}
				eyebrow='Welcome Back'
				subtitle='Sign in to manage your application, upload documents, or access your committee account.'>
				<Box component='form' onSubmit={handleSubmit} noValidate>
					<Grid container spacing={1.5}>
						{(loginConfig.fields as any[]).map(({ component, name, label, ...rest }: { component: string; name: string; label: string; [key: string]: unknown }) => {
							const commonProps = { name, onChange: handleInputChange, ...rest };
							if (component === 'TextField') {
								return (
									<Grid key={name} size={{ xs: 12 }}>
										<TextField
											margin='dense'
											fullWidth
											variant='outlined'
											label={label}
											value={formData[name]}
											{...commonProps}
										/>
									</Grid>
								);
							}
							if (component === 'Checkbox') {
								return (
									<Grid key={name} size={{ xs: 12 }}>
										<FormControlLabel
											sx={{ ml: 0 }}
											control={<Checkbox color='primary' checked={formData[name] as boolean} {...commonProps} />}
											label={label}
										/>
									</Grid>
								);
							}
							return null;
						})}

						<Grid size={{ xs: 12 }}>
							<Stack spacing={1.25} sx={{ pt: 0.5 }}>
								{loginConfig.buttons.map((button: { id: string; type?: string; variant?: string; fullWidth?: boolean; navigationPath?: string; label: string }) => (
									<Button
										key={button.id}
										fullWidth
										type={(button.type || 'button') as 'button' | 'submit' | 'reset'}
										variant={button.type === 'submit' ? 'contained' : (button.variant as 'text' | 'outlined' | 'contained')}
										onClick={button.navigationPath ? () => navigate(generatePath(button.navigationPath as string)) : undefined}
										disabled={isSubmitting}
										sx={button.type === 'submit' ? homeAuthSubmitButtonSx(primaryColor) : homeAuthSecondaryButtonSx}>
										{button.label}
									</Button>
								))}
							</Stack>
						</Grid>

						<Grid size={{ xs: 12 }}>
							<Stack spacing={0.25} sx={{ pt: 0.5 }}>
								{loginLinks.map((link: { id: string; action?: string; navigationPath?: string; label: string }) => (
									<Button
										key={link.id}
										variant='text'
										size='small'
										disabled={isSubmitting}
										sx={{ alignSelf: 'flex-start', px: 0, minWidth: 0 }}
										onClick={link.action ? actionMap[link.action] : () => navigate(generatePath(link.navigationPath as string))}>
										{link.label}
									</Button>
								))}
							</Stack>
						</Grid>
					</Grid>
				</Box>
			</AuthFormCard>
		</PublicPageLayout>
	);
}
