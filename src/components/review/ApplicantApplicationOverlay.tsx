import { useEffect, useState } from 'react';
import { Box, Button, Chip, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import Loader from '../loader/Loader';
import { StatusCapsule } from '../list/StatusCapsule';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { getApplication, getCollectionData } from '../../config/data/firebase';
import { collections } from '../../config/data/collections';
import type { ApplicationTypeValue } from '../../config/data/collections';
import { attachmentFields } from '../../config/Constants';
import {
	homeApplicantSectionTitleSx,
	homeCardBorder,
	homeReviewDetailRowsSx,
	homeReviewStatusStackSx,
} from '../home/homePageStyles';
import { useTheme } from '../../context/ThemeContext';
import {
	ReviewContributionsSection,
	ReviewEducationSection,
	ReviewExpensesSection,
	ReviewExperienceSection,
	ReviewFamilySection,
	ReviewIncomesSection,
	ReviewMobileAttachmentCard,
	ReviewProfileMobile,
	ReviewProjectionsSection,
} from './ReviewMobileDetails';

type AttachmentData = {
	displayName?: string;
	home?: string;
	requestID?: string;
};

type StoredApplicationRefs = {
	completedBy: string;
	type: string;
	status: string;
	submittedOn?: string;
	profile: string;
	family: string;
	education: string;
	experience: string;
	expenses: string;
	incomes: string;
	contributions: string;
	projections: string;
	attachments: string;
};

type ApplicationData = {
	profile: Record<string, unknown> | null;
	family: Record<string, unknown> | null;
	education: Record<string, unknown> | null;
	experience: Record<string, unknown> | null;
	expenses: Record<string, unknown> | null;
	incomes: Record<string, unknown> | null;
	contributions: Record<string, unknown> | null;
	projections: Record<string, unknown> | null;
	attachments: Record<string, AttachmentData> & { attachmentsID?: string };
	type: string;
	status: string;
	submittedOn?: string;
	completedBy: string;
};

type ApplicantApplicationOverlayProps = {
	open: boolean;
	onClose: () => void;
	applicationId?: string | null;
};

function ReadOnlyAttachmentStatus({ attachment }: { attachment?: AttachmentData }) {
	if (attachment?.displayName) {
		if (attachment.home) {
			return <Chip clickable component='a' href={attachment.home} target='_blank' rel='noopener noreferrer' label={attachment.displayName} />;
		}
		return <Chip label={attachment.displayName} />;
	}
	if (attachment?.requestID) {
		return <Chip label='Request Sent' />;
	}
	return (
		<Typography variant='body2' color='text.secondary'>
			Not uploaded
		</Typography>
	);
}

export default function ApplicantApplicationOverlay({ open, onClose, applicationId }: ApplicantApplicationOverlayProps) {
	const { user } = useAuth();
	const { handleError } = useAlert();
	const { darkMode } = useTheme();

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [application, setApplication] = useState<ApplicationData | null>(null);

	useEffect(() => {
		if (!open || !applicationId || !user?.uid) {
			return;
		}

		let cancelled = false;
		const fetchApplication = async () => {
			setLoading(true);
			setError(null);
			try {
				const appData = (await getApplication(user.uid, applicationId)) as StoredApplicationRefs | null;
				if (!appData) {
					if (!cancelled) {
						setApplication(null);
						setError('Application not found.');
					}
					return;
				}

				const [profile, family, education, experience, expenses, incomes, contributions, projections, attachments] = await Promise.all([
					getCollectionData(appData.completedBy, collections.profiles, appData.profile),
					getCollectionData(appData.completedBy, collections.families, appData.family),
					getCollectionData(appData.completedBy, collections.education, appData.education),
					getCollectionData(appData.completedBy, collections.experience, appData.experience),
					getCollectionData(appData.completedBy, collections.expenses, appData.expenses),
					getCollectionData(appData.completedBy, collections.incomes, appData.incomes),
					getCollectionData(appData.completedBy, collections.contributions, appData.contributions),
					getCollectionData(appData.completedBy, collections.projections, appData.projections),
					getCollectionData(appData.completedBy, collections.attachments, appData.attachments),
				]);

				if (!cancelled) {
					setApplication({
						completedBy: appData.completedBy,
						type: appData.type,
						status: appData.status,
						submittedOn: appData.submittedOn,
						profile: (profile as Record<string, unknown>) || null,
						family: (family as Record<string, unknown>) || null,
						education: (education as Record<string, unknown>) || null,
						experience: (experience as Record<string, unknown>) || null,
						expenses: (expenses as Record<string, unknown>) || null,
						incomes: (incomes as Record<string, unknown>) || null,
						contributions: (contributions as Record<string, unknown>) || null,
						projections: (projections as Record<string, unknown>) || null,
						attachments: (attachments || {}) as ApplicationData['attachments'],
					});
				}
			} catch (err) {
				handleError(err, 'waitingRoomApplicationOverlay');
				if (!cancelled) {
					setError('Could not load your application.');
					setApplication(null);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		fetchApplication();
		return () => {
			cancelled = true;
		};
	}, [open, applicationId, user?.uid, handleError]);

	const applicationType = (application?.type || '') as ApplicationTypeValue | '';
	const requiredAttachments = attachmentFields.filter((field) =>
		applicationType ? field.requiredBy.includes(applicationType) : false
	);

	return (
		<Dialog
			open={open}
			onClose={onClose}
			fullWidth
			maxWidth='md'
			scroll='paper'
			aria-labelledby='applicant-application-overlay-title'
			sx={{
				'& .MuiDialog-paper': {
					m: { xs: 1, sm: 2 },
					width: { xs: 'calc(100% - 16px)', sm: '100%' },
					maxHeight: { xs: 'calc(100% - 16px)', sm: '90vh' },
					borderRadius: 3,
					border: '1px solid',
					borderColor: homeCardBorder(darkMode),
					bgcolor: 'background.paper',
				},
			}}>
			<DialogTitle
				id='applicant-application-overlay-title'
				sx={{
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					gap: 1,
					pr: 1.5,
					borderBottom: 1,
					borderColor: 'divider',
				}}>
				<Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, minWidth: 0 }}>
					<Box
						sx={{
							width: 40,
							height: 40,
							borderRadius: '50%',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							bgcolor: 'primary.main',
							color: 'common.white',
							flexShrink: 0,
							mt: 0.25,
						}}>
						<HistoryEduIcon fontSize='small' />
					</Box>
					<Box sx={{ minWidth: 0 }}>
						<Typography variant='overline' sx={{ letterSpacing: '0.12em', color: 'text.secondary', lineHeight: 1.2 }}>
							Your Application
						</Typography>
						<Typography variant='h6' sx={{ fontWeight: 600, lineHeight: 1.3 }}>
							{application?.type ? `${application.type} Application` : 'Application review'}
						</Typography>
						<Typography variant='body2' color='text.secondary' sx={{ mt: 0.25 }}>
							You stay in the waiting room while viewing this. Close whenever you are ready.
						</Typography>
					</Box>
				</Box>
				<IconButton onClick={onClose} aria-label='Close application overlay' edge='end'>
					<CloseIcon />
				</IconButton>
			</DialogTitle>

			<DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
				{loading && (
					<Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
						<Loader />
					</Box>
				)}

				{!loading && error && (
					<Stack spacing={2} sx={{ alignItems: 'flex-start', py: 3 }}>
						<Typography color='error'>{error}</Typography>
						<Button variant='outlined' onClick={onClose}>
							Close
						</Button>
					</Stack>
				)}

				{!loading && !error && application && (
					<Stack spacing={3} sx={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
						<Stack spacing={1} sx={homeReviewStatusStackSx}>
							<StatusCapsule status={application.status} />
							{application.submittedOn && (
								<Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center' }}>
									Submitted {application.submittedOn}
								</Typography>
							)}
						</Stack>

						{application.profile && (
							<Box>
								<Typography component='h3' sx={homeApplicantSectionTitleSx}>
									Profile
								</Typography>
								<ReviewProfileMobile data={application.profile} />
							</Box>
						)}
						{application.family && (
							<Box>
								<Typography component='h3' sx={homeApplicantSectionTitleSx}>
									Family
								</Typography>
								<ReviewFamilySection data={application.family} />
							</Box>
						)}
						{application.education && (
							<Box>
								<Typography component='h3' sx={homeApplicantSectionTitleSx}>
									Education
								</Typography>
								<ReviewEducationSection data={application.education} />
							</Box>
						)}
						{application.experience && (
							<Box>
								<Typography component='h3' sx={homeApplicantSectionTitleSx}>
									Experience
								</Typography>
								<ReviewExperienceSection data={application.experience} />
							</Box>
						)}
						{application.expenses && (
							<Box>
								<Typography component='h3' sx={homeApplicantSectionTitleSx}>
									Expenses
								</Typography>
								<ReviewExpensesSection data={application.expenses} />
							</Box>
						)}
						{application.incomes && (
							<Box>
								<Typography component='h3' sx={homeApplicantSectionTitleSx}>
									Incomes
								</Typography>
								<ReviewIncomesSection data={application.incomes} />
							</Box>
						)}
						{application.contributions && (
							<Box>
								<Typography component='h3' sx={homeApplicantSectionTitleSx}>
									Contributions
								</Typography>
								<ReviewContributionsSection data={application.contributions} />
							</Box>
						)}
						{application.projections && (
							<Box>
								<Typography component='h3' sx={homeApplicantSectionTitleSx}>
									Projections
								</Typography>
								<ReviewProjectionsSection data={application.projections} />
							</Box>
						)}
						{application.attachments && (
							<Box>
								<Typography component='h3' sx={homeApplicantSectionTitleSx}>
									Attachments
								</Typography>
								<Box
									sx={{
										...homeReviewDetailRowsSx,
										gridTemplateColumns: {
											xs: '1fr',
											sm: 'repeat(2, minmax(0, 1fr))',
										},
									}}>
									{requiredAttachments.map((field) => (
										<ReviewMobileAttachmentCard key={field.key} label={field.label}>
											<ReadOnlyAttachmentStatus attachment={application.attachments[field.key]} />
										</ReviewMobileAttachmentCard>
									))}
								</Box>
							</Box>
						)}
					</Stack>
				)}
			</DialogContent>
		</Dialog>
	);
}
