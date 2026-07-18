/**
 * Breadcrumbs Navigation Component
 * Displays the current page hierarchy and provides global actions (Theme toggle, Settings, Logout).
 * Integrates with the Dialog context to handle user preference updates.
 */

import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Breadcrumbs, Box, Button, IconButton, Menu, MenuItem } from '@mui/material';
import { LightModeOutlined as LightModeIcon, DarkModeOutlined as DarkModeIcon, NavigateNextOutlined as NavigateNext, SettingsOutlined as SettingsIcon, PaletteOutlined as ColorIcon } from '@mui/icons-material';

import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { UserType } from '../../config/data/collections';
import { logoutUser, saveApplicantData } from '../../config/data/firebase';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../context/DialogContext';
import { useAuth } from '../../context/AuthContext';
import type { Applicant } from '../../types/domain';

// --- Sub-components ---

const SettingsIconButton = ({ onClick }: { onClick: () => void }) => (
	<IconButton sx={{ width: '40px', height: '40px', borderWidth: '1px', borderStyle: 'solid', borderColor: 'secondary.main' }} onClick={onClick}>
		<SettingsIcon color='secondary' />
	</IconButton>
);

interface NotificationPreferences {
	email?: boolean;
	sms?: boolean;
}

interface NotificationsFormData {
	email?: boolean;
	sms?: boolean;
	nickname?: string;
}

export const SettingsButton = ({ applicant }: { applicant?: Applicant | null }) => {
	const { showDialog } = useDialog();
	const navigate = useNavigate();

	const handleUpdatePreferences = () => {
		if (!applicant?.id) return;

		const notifications = applicant.notifications as NotificationPreferences | undefined;

		showDialog({
			id: 'notificationsUpdate',
			data: {
				userType: UserType.applicant,
				email: notifications?.email || false,
				sms: notifications?.sms || false,
				nickname: applicant.callMe || '',
			},
			callback: async (formData: unknown) => {
				if (formData) {
					const { email, sms, nickname } = formData as NotificationsFormData;
					const updatedData = {
						...applicant,
						notifications: { email, sms },
						callMe: nickname,
					};
					await saveApplicantData(applicant.id, updatedData);
					navigate(generatePath(paths.apply));
				}
			},
		});
	};

	if (!applicant) return null;
	return <SettingsIconButton onClick={handleUpdatePreferences} />;
};

// --- Main Component ---

interface CrumbsProps {
	title?: string;
	logout?: boolean;
}

export default function Crumbs({ title, logout: showLogout = false }: CrumbsProps) {
	const navigate = useNavigate();
	const { darkMode, dispatch, primaryColor } = useTheme();
	const { applicant } = useAuth();

	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const colorMenuOpen = Boolean(anchorEl);

	const themeColors = [
		{ key: 'green', label: 'Forest Green' },
		{ key: 'blue', label: 'Ocean Blue' },
		{ key: 'teal', label: 'Deep Teal' },
		{ key: 'brown', label: 'Slate' },
		{ key: 'yellow2', label: 'Amber' },
	];

	const handleColorSelect = (color: string) => {
		dispatch({ type: 'SET_COLOR', payload: color });
		setAnchorEl(null);
	};

	const logout = () => {
		logoutUser();
		navigate(generatePath(paths.home));
	};

	return (
		<Box sx={{ px: 2, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background', color: 'secondary' }}>
			{/* Breadcrumb Links */}
			<Breadcrumbs aria-label='breadcrumb' separator={<NavigateNext fontSize='small' />}>
				<Button variant='text' onClick={() => navigate(generatePath(paths.root))}>
					Home
				</Button>
				{title ? (
					<Button variant='text' onClick={() => navigate(generatePath(paths.apply))}>
						Applications
					</Button>
				) : (
					<Typography>APPLICATIONS</Typography>
				)}
				{title && <Typography color='primary'>{title.toUpperCase()}</Typography>}
			</Breadcrumbs>

			{/* Action Buttons */}
			<Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, py: 1 }}>
				<SettingsButton applicant={applicant} />

				<IconButton
					sx={{
						width: '40px',
						height: '40px',
						borderWidth: '1px',
						borderStyle: 'solid',
						borderColor: 'secondary.main',
						bgcolor: darkMode ? 'primary.main' : 'background.main',
						'&:hover': { bgcolor: `${primaryColor}.dark` },
					}}
					onClick={(e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}>
					<ColorIcon sx={{ color: darkMode ? 'custom.black' : 'primary.main' }} />
				</IconButton>

				<IconButton sx={{ width: '40px', height: '40px', borderWidth: '1px', borderStyle: 'solid', borderColor: 'secondary.main' }} onClick={() => dispatch({ type: 'TOGGLE' })}>
					{darkMode ? <LightModeIcon color='secondary' /> : <DarkModeIcon color='secondary' />}
				</IconButton>

				{showLogout && (
					<Button variant='outlined' onClick={logout}>
						Logout
					</Button>
				)}
			</Box>

			{/* Theme Color Menu */}
			<Menu sx={{ mt: 1 }} anchorEl={anchorEl} open={colorMenuOpen} onClose={() => setAnchorEl(null)}>
				{themeColors.map((color) => (
					<MenuItem sx={{ bgcolor: darkMode ? 'custom.black' : 'background.paper' }} key={color.key} onClick={() => handleColorSelect(color.key)} selected={color.key === primaryColor}>
						{color.label}
					</MenuItem>
				))}
			</Menu>
		</Box>
	);
}
