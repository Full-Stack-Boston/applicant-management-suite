import { Typography, Box, Stack, Paper } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { deleteApplication, getRealTimeApplicationsByIDs, removeApplicationFromApplicant } from '../../config/data/firebase';
import Loader from '../../components/loader/Loader';
import { ApplicationStatus } from '../../config/data/collections';
import { HistoryEdu as HistoryEduIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { useAlert } from '../../context/AlertContext';
import { useDialog } from '../../context/DialogContext';
import RSVPStatusCard from '../../components/interviews/RSVPStatusCard';
import WindowInfo from '../../components/timer/WindowInfo';
import { applicationConfigurations } from '../../config/ui/applicationConfig';
import { getApplyContent, type ApplyContent } from '../../config/content';
import DOMPurify from 'dompurify';
import { sanitizeHtmlConfig } from '../../utils/sanitizeHtml';
import PublicPageLayout from '../../components/home/PublicPageLayout';
import AuthFormCard from '../../components/auth/AuthFormCard';
import ApplicantApplicationCard from '../../components/home/ApplicantApplicationCard';
import { isApplicationEditable } from '../../components/home/applicationCardUtils';
import { useApplicationAttachmentProgress } from '../../components/home/useApplicationAttachmentProgress';
import { applicationCardLayout } from '../../config/ui/applicationCardLayout';
import {
	homeApplicantAvailableAppsSx,
	homeApplicantAvailableAppTileSx,
	homeApplicantCardGridSx,
	homeApplicantCardListSx,
	homeApplicantDashboardSectionStackSx,
	homeApplicantDetailLabelSx,
	homeApplicantSectionTitleSx,
	homeDashboardIntroBodySx,
	homeDashboardIntroLabelSx,
	homeDashboardIntroListSx,
} from '../../components/home/homePageStyles';

interface ApplyApplication {
	id: string;
	type: string;
	status: string;
	submittedOn: string;
	completedBy?: string;
	attachments?: string;
	[key: string]: unknown;
}

export default function Apply() {
	const navigate = useNavigate();
	useTitle({ title: 'Dashboard', appear: true });
	const config = useConfig();
	const [applications, setApplications] = useState<ApplyApplication[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [announcement, setAnnouncement] = useState<React.ReactNode | null>(null);
	const { user, applicant } = useAuth();
	const { darkMode, primaryColor } = useTheme();
	const { showAlert, showAnnouncement } = useAlert();
	const { showDialog } = useDialog();

	const content: ApplyContent = getApplyContent(config as Record<string, unknown>);
	const attachmentProgressById = useApplicationAttachmentProgress(applications);
	const applicationCardsContainerSx = applicationCardLayout === 'list' ? homeApplicantCardListSx : homeApplicantCardGridSx;

	useEffect(() => {
		if (config.APPLICANT_MESSAGE && config.APPLICANT_MESSAGE !== '') {
			setAnnouncement(showAnnouncement({ message: config.APPLICANT_MESSAGE as string }));
		}
	}, [config.APPLICANT_MESSAGE, setAnnouncement, showAnnouncement]);

	useEffect(() => {
		let unsubscribe: (() => void) | undefined;

		const fetchApplications = () => {
			if (user && applicant) {
				if (applicant.applications?.length > 0) {
					unsubscribe = getRealTimeApplicationsByIDs(applicant.applications, setApplications as any);
				}
				setLoading(false);
			}
		};

		fetchApplications();

		return () => {
			if (unsubscribe) {
				unsubscribe();
			}
		};
	}, [user, applicant]);

	const handleDelete = (application: ApplyApplication, event: React.MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();

		showDialog({
			id: 'confirmAction',
			messageOverride: `Delete your ${application.type} application? This cannot be undone.`,
			callback: async (confirmed: unknown) => {
				if (!confirmed) return;

				await deleteApplication(application);

				if (user?.uid && application.id) {
					await removeApplicationFromApplicant(user.uid, application.id);
				}

				showAlert('application', 'deleted');
			},
		});
	};

	const getApplicationKeyByType = (appType: string) => {
		return Object.keys(applicationConfigurations).find((key) => (applicationConfigurations as any)[key].type === appType);
	};

	const handleClick = (application: ApplyApplication) => {
		// Only in-progress drafts stay in the wizard. Everything else opens review
		// so applicants can scroll the whole app and attach any missing documents.
		if (application.status === ApplicationStatus.started) {
			navigate(generatePath(paths.updateApplication, { applicationType: getApplicationKeyByType(application.type), applicationID: application.id }), { replace: true });
			return;
		}
		navigate(generatePath(paths.reviewApp, { id: application.id }), { replace: true });
	};

	if (loading) {
		return <Loader />;
	}

	return (
		<PublicPageLayout maxWidth='lg' compact tightMobile applicantNav>
			<AuthFormCard
				layout='split'
				size='dashboard'
				tightMobile
				title={content.title}
				icon={<HistoryEduIcon />}
				eyebrow='Applicant Portal'
				intro={
					<Stack spacing={2.5} sx={{ width: '100%', flex: 1 }}>
						<Typography variant='body2' color='text.secondary' sx={homeDashboardIntroBodySx}>
							{content.intro.overview}
						</Typography>
						<Box>
							<Typography component='span' sx={homeDashboardIntroLabelSx}>
								Before you begin
							</Typography>
							<Typography variant='body2' color='text.secondary' sx={homeDashboardIntroBodySx}>
								{content.intro.preparation}
							</Typography>
						</Box>
						<Box>
							<Typography component='span' sx={homeDashboardIntroLabelSx}>
								Which application is right for you
							</Typography>
							<Box component='ul' sx={homeDashboardIntroListSx}>
								{content.intro.applicationPaths.map((item) => (
									<Typography
										key={item}
										component='li'
										variant='body2'
										color='text.secondary'
										dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item, sanitizeHtmlConfig) }}
									/>
								))}
							</Box>
						</Box>
						<Typography variant='body2' color='text.secondary' sx={homeDashboardIntroBodySx}>
							{content.intro.eligibility}
						</Typography>
						<Typography variant='body2' color='text.secondary' sx={homeDashboardIntroBodySx}>
							{content.intro.help}
						</Typography>
						<Box sx={{ mt: 'auto', pt: 3, width: '100%', display: 'flex', justifyContent: 'center' }}>
							<WindowInfo />
						</Box>
					</Stack>
				}>
				{announcement || null}
				<Stack {...homeApplicantDashboardSectionStackSx}>
					<Box sx={{ width: '100%' }}>
						<RSVPStatusCard />
					</Box>

					{applications.length > 0 && (
						<Box sx={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
							<Typography component='h2' sx={homeApplicantSectionTitleSx}>
								Your Applications
							</Typography>
							<Box sx={applicationCardsContainerSx}>
								{applications.map((application) => (
									<ApplicantApplicationCard
										key={application.id}
										layout={applicationCardLayout}
										application={application}
										attachmentProgress={attachmentProgressById[application.id]}
										editable={isApplicationEditable(application.status)}
										darkMode={darkMode}
										primaryColor={primaryColor}
										onOpen={() => handleClick(application)}
										onDelete={(event) => handleDelete(application, event)}
									/>
								))}
							</Box>
						</Box>
					)}

					<Box sx={{ width: '100%' }}>
						<Typography component='h2' sx={homeApplicantSectionTitleSx}>
							Available Applications
						</Typography>
						<Box sx={homeApplicantAvailableAppsSx}>
							{content.availableApps.map((app) => {
								const tileSx = homeApplicantAvailableAppTileSx(darkMode, app.disabled);
								const body = (
									<>
										<Box sx={{ minWidth: 0, flex: 1 }}>
											<Typography variant='body2' color='text.primary' sx={{ fontWeight: 700 }}>
												{app.label}
											</Typography>
											<Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.35, lineHeight: 1.45 }}>
												{app.description}
											</Typography>
											{app.disabled && (
												<Typography component='span' sx={{ ...homeApplicantDetailLabelSx, mt: 0.75, mb: 0, color: 'warning.main' }}>
													Not open right now
												</Typography>
											)}
										</Box>
										<ChevronRightIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
									</>
								);

								if (app.disabled) {
									return (
										<Paper key={app.type} variant='outlined' sx={tileSx} aria-disabled='true'>
											{body}
										</Paper>
									);
								}

								return (
									<Paper
										key={app.type}
										component={Link}
										to={generatePath(app.path, { applicationType: app.type })}
										variant='outlined'
										sx={tileSx}>
										{body}
									</Paper>
								);
							})}
						</Box>
					</Box>
				</Stack>
			</AuthFormCard>
		</PublicPageLayout>
	);
}
