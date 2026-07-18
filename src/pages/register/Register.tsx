import { Button, TextField, Box, Stack, Avatar, Grid } from '@mui/material';
import { registerUser, saveApplicantData, saveFile, getDownloadLinkForFile, findApplicantAccountsByEmail } from '../../config/data/firebase';
import { serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useTheme } from '../../context/ThemeContext';
import Loader from '../../components/loader/Loader';
import { useTitle } from '../../context/HelmetContext';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { pushNotice } from '../../config/content/push';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { UploadType } from '../../config/data/collections';
import { Camera } from '@mui/icons-material';
import { VisuallyHiddenInput } from '../../components/visuallyHiddenInput/VisuallyHiddenInput';
import { applicantRegistrationContent as registerConfig, homePageContent } from '../../config/content';
import PublicPageLayout from '../../components/home/PublicPageLayout';
import AuthFormCard from '../../components/auth/AuthFormCard';
import { authFieldGridSize } from '../../components/auth/authFieldLayout';
import { homeAuthActionRowSx, homeAuthProfileUploadRowSx, homeAuthSecondaryButtonSx, homeAuthSubmitButtonSx } from '../../components/home/homePageStyles';

interface RegisterField {
	component: string;
	name: string;
	[key: string]: unknown;
}

interface RegisterButton {
	id: string;
	type?: string;
	variant?: string;
	label: string;
	navigationPath?: string;
}

interface RegisterLink {
	id: string;
	label: string;
	navigationPath: string;
}

interface RegisterConfig {
	fields: RegisterField[];
	buttons: RegisterButton[];
	links: RegisterLink[];
	icon: React.ReactNode;
	title: React.ReactNode;
}

export default function Register() {
	const navigate = useNavigate();
	const { loading } = useAuth();
	const config = useConfig();
	const { primaryColor } = useTheme();
	const [picture, setPicture] = useState<Record<string, unknown>>({});
	const [uploading, setUploading] = useState<boolean>(false);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	useTitle({ title: 'Sign Up', appear: true });
	const { showAlert, handleError } = useAlert();

	const typedConfig = registerConfig as unknown as RegisterConfig;
	const registerLinks = [
		...typedConfig.links,
		...(config.MEMBER_ONBOARDING_PAGE_ENABLED
			? [
					{
						id: 'boardRegister',
						label: homePageContent.demoBoardAccess.registerLinkLabel,
						navigationPath: homePageContent.demoBoardAccess.path || paths.registerMember,
					},
				]
			: []),
	];

	const initialFormState = typedConfig.fields.reduce<Record<string, string>>((acc, field) => {
		if (field.component !== 'ProfilePictureUpload') {
			acc[field.name] = '';
		}
		return acc;
	}, {});
	const [formData, setFormData] = useState<Record<string, string>>(initialFormState);

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = event.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsSubmitting(true);

		if (formData.password !== formData.confirmPassword) {
			showAlert('register', 'notmatching');
			setIsSubmitting(false);
			return;
		}
		if (!formData.firstName || !formData.lastName || !formData.callMe) {
			showAlert({ message: 'No first, last, or nickname indicated!', type: 'warning' });
			setIsSubmitting(false);
			return;
		}

		try {
			const existingApplicants = await findApplicantAccountsByEmail(formData.email, undefined);
			if (existingApplicants.length > 0) {
				showAlert({
					message: 'An account with this email already exists. Sign in instead, or contact an administrator if you need help.',
					type: 'error',
				});
				setIsSubmitting(false);
				return;
			}

			const result = await registerUser(formData.email, formData.password);
			const user = result.user;

			const applicantData = {
				id: user.uid,
				firstName: formData.firstName,
				lastName: formData.lastName,
				name: `${formData.firstName} ${formData.lastName}`,
				callMe: formData.callMe,
				email: formData.email,
				auth: user.uid,
				picture,
				notifications: { email: true, sms: false },
				accountCreated: serverTimestamp(),
			};

			if (!user) {
				showAlert('register', 'error');
				setIsSubmitting(false);
				return;
			}

			const isApplicantSaved = await saveApplicantData(user.uid, applicantData);
			if (!isApplicantSaved) {
				showAlert('register', 'error');
				setIsSubmitting(false);
				return;
			}

			await pushNotice('welcome', applicantData, {});

			showAlert('register', 'success');
			navigate(generatePath(paths.redirect), { replace: true });
		} catch (error) {
			handleError(error, 'register-handleSubmit', true);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		event.preventDefault();
		const name = event.target.name;
		const file = event.target.files?.[0];

		if (!file?.type.match('image/.*')) {
			showAlert({ message: 'Please select a valid image file.', type: 'error' });
			return;
		}

		const maxSizeInBytes = 25 * 1024 * 1024;
		if (file.size > maxSizeInBytes) {
			showAlert({ message: 'File size exceeds the 25MB limit.', type: 'error' });
			return;
		}

		setUploading(true);
		try {
			const uploadID = uuid();
			const savedFileRef = await saveFile(UploadType.memberAvatar, uploadID, name, file);
			const downloadLink = await getDownloadLinkForFile(savedFileRef);
			if (downloadLink) {
				setPicture({ displayName: file.name, home: downloadLink, refLoc: savedFileRef });
				showAlert({ message: 'Profile picture uploaded!', type: 'success' });
			} else {
				throw new Error('Failed to get the download link for the uploaded file.');
			}
		} catch (error) {
			showAlert({ message: (error as Error).message, type: 'error' });
		} finally {
			setUploading(false);
		}
	};

	if (loading || isSubmitting || uploading) {
		return <Loader />;
	}

	return (
		<PublicPageLayout maxWidth='lg' compact tightMobile>
			<AuthFormCard
				layout='split'
				tightMobile
				title={typedConfig.title}
				icon={typedConfig.icon}
				eyebrow='Get Started'
				subtitle='Create an applicant account to submit materials and track your application.'>
				<Box component='form' onSubmit={handleSubmit} noValidate>
					<Grid container spacing={1.5}>
						{typedConfig.fields.map(({ component, name, ...rest }) => {
							if (component === 'TextField') {
								return (
									<Grid key={name} size={authFieldGridSize(name)}>
										<TextField
											margin='dense'
											fullWidth
											variant='outlined'
											name={name}
											value={formData[name]}
											onChange={handleInputChange}
											{...rest}
										/>
									</Grid>
								);
							}
							if (component === 'ProfilePictureUpload') {
								return (
									<Grid key={name} size={{ xs: 12 }}>
										<Box sx={homeAuthProfileUploadRowSx}>
											<Avatar sx={{ width: 56, height: 56 }} alt={(picture?.displayName as string) || ''} src={picture?.home as string} />
											<Button size='small' component={'label' as any} variant='outlined' startIcon={<Camera />} sx={homeAuthSecondaryButtonSx}>
												Upload Profile Picture
												<VisuallyHiddenInput name={name} onChange={handleUpload} type='file' />
											</Button>
										</Box>
									</Grid>
								);
							}
							return null;
						})}

						<Grid size={{ xs: 12 }}>
							<Box sx={homeAuthActionRowSx}>
								{typedConfig.buttons.map((button) => (
									<Button
										key={button.id}
										type={(button.type || 'button') as 'button' | 'submit' | 'reset'}
										variant={button.type === 'submit' ? 'contained' : (button.variant as 'text' | 'outlined' | 'contained')}
										onClick={button.navigationPath ? () => navigate(generatePath(button.navigationPath!)) : undefined}
										disabled={isSubmitting}
										sx={button.type === 'submit' ? homeAuthSubmitButtonSx(primaryColor) : homeAuthSecondaryButtonSx}>
										{button.label}
									</Button>
								))}
							</Box>
						</Grid>

						<Grid size={{ xs: 12 }}>
							<Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5} sx={{ justifyContent: 'center' }}>
								{registerLinks.map((link) => (
									<Button key={link.id} variant='text' size='small' onClick={() => navigate(generatePath(link.navigationPath))} disabled={isSubmitting}>
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
