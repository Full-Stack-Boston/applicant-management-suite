import { IconButton } from '@mui/material';
import { SettingsOutlined as SettingsIcon } from '@mui/icons-material';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserType } from '../../config/data/collections';
import { saveApplicantData } from '../../config/data/firebase';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { useDialog } from '../../context/DialogContext';
import { useAuth } from '../../context/AuthContext';

interface Applicant {
	id: string;
	notifications?: { email: boolean; sms: boolean };
	callMe?: string;
	[key: string]: unknown;
}

export function useApplicantSettingsDialog(applicantProp?: Applicant | null) {
	const { applicant: authApplicant } = useAuth();
	const applicant = applicantProp ?? (authApplicant as Applicant | null);
	const { showDialog } = useDialog();
	const navigate = useNavigate();

	return useCallback(() => {
		if (!applicant?.id) return;

		showDialog({
			id: 'notificationsUpdate',
			data: {
				userType: UserType.applicant,
				email: applicant.notifications?.email || false,
				sms: applicant.notifications?.sms || false,
				nickname: applicant.callMe || '',
			},
			callback: async (value: unknown) => {
				const formData = value as Record<string, unknown> | null;
				if (!formData) return;

				const updatedData = {
					...applicant,
					notifications: { email: formData.email, sms: formData.sms },
					callMe: formData.nickname,
				};
				await saveApplicantData(applicant.id, updatedData);
				navigate(generatePath(paths.apply));
			},
		});
	}, [applicant, navigate, showDialog]);
}

interface ApplicantSettingsButtonProps {
	applicant?: Applicant | null;
	iconColor?: string;
}

export default function ApplicantSettingsButton({ applicant, iconColor = 'inherit' }: ApplicantSettingsButtonProps) {
	const openSettings = useApplicantSettingsDialog(applicant);
	const { applicant: authApplicant } = useAuth();
	const resolvedApplicant = applicant ?? authApplicant;

	if (!resolvedApplicant) return null;

	return (
		<IconButton aria-label='Account settings' onClick={openSettings} color='inherit' sx={{ color: iconColor }}>
			<SettingsIcon />
		</IconButton>
	);
}
