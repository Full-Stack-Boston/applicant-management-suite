/**
 * POST-LOGIN TRAFFIC CONTROLLER
 * ---------------------------------------------------------------------------
 * Routes authenticated users by role. If auth succeeds but no Member/Applicant
 * profile exists (or profiles are unreadable), show a recoverable UI instead of
 * spinning forever on <Loader />.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Stack, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

import Loader from '../../components/loader/Loader';
import PublicPageLayout from '../../components/home/PublicPageLayout';
import AuthFormCard from '../../components/auth/AuthFormCard';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { UserType } from '../../config/data/collections';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { homeAuthSecondaryButtonSx, homeAuthSubmitButtonSx } from '../../components/home/homePageStyles';

const Redirect = () => {
	const navigate = useNavigate();
	const { user, role, loading, logout } = useAuth();
	const { primaryColor } = useTheme();
	const [selectedRole, setSelectedRole] = useState<string | null>(null);

	useTitle({ title: 'Redirecting...', appear: false });

	useEffect(() => {
		if (!loading && role) {
			if (role === UserType.applicant) {
				navigate(generatePath(paths.apply), { replace: true });
			} else if (role === UserType.member) {
				navigate(generatePath(paths.memberDash), { replace: true });
			} else if (role === UserType.both && selectedRole) {
				const destination = selectedRole === UserType.applicant ? paths.apply : paths.memberDash;
				navigate(generatePath(destination), { replace: true });
			}
		}
	}, [loading, role, selectedRole, navigate]);

	const handleRoleSelection = (nextRole: string) => {
		setSelectedRole(nextRole);
	};

	const handleLogout = () => {
		logout?.();
		navigate(generatePath(paths.logout));
	};

	if (loading) {
		return <Loader />;
	}

	// Logged in but no profiles in Firestore (or reads denied)
	if (user && !role) {
		return (
			<PublicPageLayout compact>
				<AuthFormCard
					title='No profile found'
					icon={<LockOutlinedIcon />}
					eyebrow='Account Access'
					subtitle='You are signed in, but there is no Member or Applicant profile linked to this account in this project. Ask an admin to provision your access, or log out and register as an applicant.'>
					<Stack spacing={1.5}>
						<Button variant='contained' fullWidth onClick={handleLogout} sx={homeAuthSubmitButtonSx(primaryColor)}>
							Logout
						</Button>
						<Button variant='outlined' fullWidth onClick={() => navigate(generatePath(paths.home))} sx={homeAuthSecondaryButtonSx}>
							Go Home
						</Button>
					</Stack>
				</AuthFormCard>
			</PublicPageLayout>
		);
	}

	if (!role) {
		return <Loader />;
	}

	if (role === UserType.both && !selectedRole) {
		return (
			<PublicPageLayout compact>
				<AuthFormCard
					title='Which account?'
					icon={<LockOutlinedIcon />}
					eyebrow='Choose Profile'
					subtitle='You have applicant and member access. Pick one to continue. You can return here later to switch.'>
					<Stack spacing={1.5}>
						<Button variant='contained' fullWidth onClick={() => handleRoleSelection(UserType.applicant)} sx={homeAuthSubmitButtonSx(primaryColor)}>
							Applicant
						</Button>
						<Button variant='outlined' fullWidth onClick={() => handleRoleSelection(UserType.member)} sx={homeAuthSecondaryButtonSx}>
							Member
						</Button>
						<Button variant='text' fullWidth onClick={handleLogout}>
							Logout
						</Button>
					</Stack>
					<Typography variant='body2' color='text.secondary' sx={{ mt: 3, lineHeight: 1.7, textAlign: 'center' }}>
						While logged in, you can only use one account type at a time. Revisit this page anytime you need to switch.
					</Typography>
				</AuthFormCard>
			</PublicPageLayout>
		);
	}

	return <Loader />;
};

export default Redirect;
