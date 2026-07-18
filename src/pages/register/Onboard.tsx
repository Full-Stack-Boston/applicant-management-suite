/**
 * MEMBER ONBOARDING PAGE
 * ---------------------------------------------------------------------------
 * This page registers new Committee Members (Staff).
 *
 * * WORKFLOW:
 * 1. Form Collection: Gathers name, position, and contact info.
 * 2. Identity Resolution:
 * - If email exists (e.g. former applicant), logs them in.
 * - If email is new, registers a new Firebase Auth account.
 * 3. Profile Creation: Creates a document in 'members' collection.
 * 4. Demo Init: Opens product walkthrough surfaces (apps, finances, mail, interviews)
 *    while keeping admin / site / member-management privileges locked.
 *
 * * NOTE:
 * This page is distinct from 'Register.jsx', which is for Scholarship Applicants.
 */

import { Button, TextField, Box, Stack, Avatar, Grid } from '@mui/material';
import { registerUser, saveCollectionData, saveFile, getDownloadLinkForFile, getAuthUserByEmail, loginUser } from '../../config/data/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Loader from '../../components/loader/Loader';
import { useTitle } from '../../context/HelmetContext';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { UploadType, collections } from '../../config/data/collections';
import { Camera } from '@mui/icons-material';
import { VisuallyHiddenInput } from '../../components/visuallyHiddenInput/VisuallyHiddenInput';
import { v4 as uuid } from 'uuid';
import { useAlert } from '../../context/AlertContext';
import { memberRegistrationContent as onboardConfig } from '../../config/admin';
import PublicPageLayout from '../../components/home/PublicPageLayout';
import AuthFormCard from '../../components/auth/AuthFormCard';
import { authFieldGridSize } from '../../components/auth/authFieldLayout';
import { homeAuthActionRowSx, homeAuthProfileUploadRowSx, homeAuthSecondaryButtonSx, homeAuthSubmitButtonSx } from '../../components/home/homePageStyles';

interface OnboardField {
	component: string;
	name: string;
	[key: string]: unknown;
}

interface OnboardButton {
	id: string;
	type?: string;
	variant?: string;
	label: string;
	navigationPath?: string;
}

interface OnboardLink {
	id: string;
	label: string;
	navigationPath: string;
}

interface OnboardConfig {
	fields: OnboardField[];
	buttons: OnboardButton[];
	links: OnboardLink[];
	icon: React.ReactNode;
	title: React.ReactNode;
}

// Demo self-onboarding: unlock product surfaces evaluators need to tour
// (dashboard, applications, finances, mailbox, push, interview viewing/scheduling).
// Keep governance levers off until an existing admin promotes them.
const defaultPermissions = {
	admin: false,
	site: false,
	members: false,
	audit: false,
	login: true,
	applications: true,
	finances: true,
	archives: true,
	email: true,
	push: true,
	message: true,
	interviews: {
		canAccess: true,
		canSchedule: true,
		canHost: false,
		canDeliberate: false,
	},
	emails: {
		folders: {
			inbox: true,
			sent: true,
			spam: true,
			trash: true,
			outbox: true,
			archive: true,
			applications: true,
		},
		aliases: {
			test: true,
			hello: true,
			admin: false,
			webmaster: false,
			chairman: false,
			applications: false,
			committee: false,
			noreply: false,
			inquiries: false,
			help: false,
		},
	},
};

export default function Onboard() {
	const navigate = useNavigate();
	const { loading } = useAuth();
	const { primaryColor } = useTheme();
	const { showAlert } = useAlert();
	const [picture, setPicture] = useState<Record<string, unknown>>({});
	const [uploading, setUploading] = useState<boolean>(false);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	useTitle({ title: 'Onboard Member', appear: false });

	const typedConfig = onboardConfig as OnboardConfig;

	const initialFormState = typedConfig.fields.reduce<Record<string, string>>((acc, field) => {
		if (field.component !== 'ProfilePictureUpload') {
			acc[field.name] = '';
		}
		return acc;
	}, {});
	const [formData, setFormData] = useState<Record<string, string>>(initialFormState);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prevState) => ({ ...prevState, [name]: value }));
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsSubmitting(true);
		if (formData.password !== formData.confirmPassword) {
			showAlert({ message: 'Passwords do not match!', type: 'error' });
			setIsSubmitting(false);
			return;
		}
		if (formData.firstName === '' || formData.lastName === '' || formData.position === '' || formData.since === '') {
			showAlert({ message: 'Please fill out all required fields.', type: 'error' });
			setIsSubmitting(false);
			return;
		}

		let user: { uid: string } | null = null;

		try {
			user = (await getAuthUserByEmail(formData.email)) as { uid: string } | null;
			if (user) {
				const result = await loginUser(formData.email, formData.password);
				user = result.user;
			} else {
				const result = await registerUser(formData.email, formData.password);
				user = result.user;
			}

			if (user) {
				const memberData = {
					id: user.uid,
					auth: user.uid,
					firstName: formData.firstName,
					lastName: formData.lastName,
					position: formData.position,
					since: formData.since,
					email: formData.email,
					cell: formData.cell,
					picture,
					permissions: defaultPermissions,
					notifications: {
						email: true,
						sms: false,
					},
				};
				await saveCollectionData(collections.members, user.uid, memberData);
				showAlert({ message: 'Member successfully onboarded!', type: 'success' });
				navigate(generatePath(paths.redirect));
			} else {
				throw new Error('Error creating or authenticating user.');
			}
		} catch (error) {
			showAlert({ message: (error as Error).message, type: 'error' });
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
				title={typedConfig.title}
				icon={typedConfig.icon}
				layout='split'
				tightMobile
				eyebrow='Committee Demo'
				subtitle='Create a board account to tour the admin console, inbox, and interview tools. Elevated governance permissions stay locked until an existing admin promotes you.'>
				<Box component='form' onSubmit={handleSubmit} noValidate>
					<Grid container spacing={1.5}>
						{typedConfig.fields.map(({ component, name, ...rest }) => {
							if (component === 'TextField') {
								return (
									<Grid key={name} size={authFieldGridSize(name)}>
										<TextField key={name} margin='dense' fullWidth variant='outlined' name={name} value={formData[name]} onChange={handleChange} {...rest} />
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
										sx={button.type === 'submit' ? homeAuthSubmitButtonSx(primaryColor) : homeAuthSecondaryButtonSx}>
										{button.label}
									</Button>
								))}
							</Box>
						</Grid>

						<Grid size={{ xs: 12 }}>
							<Stack direction='row' spacing={0.5} sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
								{typedConfig.links.map((link) => (
									<Button key={link.id} variant='text' size='small' onClick={() => navigate(generatePath(link.navigationPath))}>
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
