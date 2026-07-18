/**
 * APPLICATION REVIEW PAGE
 * ---------------------------------------------------------------------------
 * This page renders the full details of a specific application.
 *
 * * AUDIENCE:
 * 1. Applicants: View status, upload missing files, request recommendations.
 * 2. Admins: Read-only view of the applicant's data.
 *
 * * DATA ARCHITECTURE (The Aggregator):
 * Applications in Firestore are normalized. A single 'application' document
 * contains IDs pointing to documents in 'education', 'family', 'incomes', etc.
 * This component fetches all those linked documents in parallel and re-assembles
 * them into a single view.
 *
 * * AUTOMATION:
 * - Monitors attachment uploads.
 * - If all required files are present, it auto-updates status to 'completed'.
 */

import { useEffect, useState, useCallback, type ChangeEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import dayjs from 'dayjs';
import type { DocumentData } from 'firebase/firestore';

// UI Components
import { Typography, Box, Button, Chip, Divider, Stack } from '@mui/material';
import { HistoryEdu as HistoryEduIcon, ScienceOutlined } from '@mui/icons-material';

// Custom Components
import Loader from '../../components/loader/Loader';
import NotFound from '../../components/layout/NotFound';
import PublicPageLayout from '../../components/home/PublicPageLayout';
import AuthFormCard from '../../components/auth/AuthFormCard';
import { StatusCapsule } from '../../components/list/StatusCapsule';
import { VisuallyHiddenInput } from '../../components/visuallyHiddenInput/VisuallyHiddenInput';
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
} from '../../components/review/ReviewMobileDetails';

// Contexts
import { useAuth } from '../../context/AuthContext';
import { useTitle } from '../../context/HelmetContext';
import { useAlert } from '../../context/AlertContext';
import { useDialog } from '../../context/DialogContext';
import { useConfig } from '../../context/ConfigContext';

// Backend & Config
import { getApplication, getCollectionData, saveFile, getDownloadLinkForFile, deleteFile, invalidateRequest, saveCollectionData, updateApplicationStatus } from '../../config/data/firebase';
import { sendRequest } from '../../config/content/push';
import { attachmentFields, LettersOfRecommendation, generateSecurePin, generate6DigitNumber, generateUploadLink } from '../../config/Constants';
import { createDemoPdfFile } from '../../config/data/demoAttachments';
import { UploadType, ApplicationStatus, collections } from '../../config/data/collections';
import { templateApp, blankAttachment } from '../../config/data/Validation';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { homeApplicantSectionTitleSx, homeAuthSecondaryButtonSx, homeReviewDetailRowsSx, homeReviewStatusStackSx } from '../../components/home/homePageStyles';

type AttachmentEntry = {
	displayName?: string;
	home?: string;
	refLoc?: string;
	requestID?: string;
	uploadedBy?: string;
	[key: string]: unknown;
};

type AttachmentsMap = {
	attachmentsID?: string;
	[key: string]: AttachmentEntry | string | undefined;
};

/** Aggregated application view used by this page (sections hydrated as docs). */
type ReviewApplication = DocumentData & {
	type: string;
	status: string;
	window?: string;
	submittedOn?: string;
	profile?: DocumentData | null;
	family?: DocumentData | null;
	education?: DocumentData | null;
	experience?: DocumentData | null;
	expenses?: DocumentData | null;
	incomes?: DocumentData | null;
	contributions?: DocumentData | null;
	projections?: DocumentData | null;
	attachments: AttachmentsMap;
};

type AttachmentField = {
	key: string;
	label: string;
	icon: ReactNode;
	requiredBy: readonly string[];
};

const isApplicationComplete = (updatedAttachments: AttachmentsMap, appType: string): boolean => {
	const requiredAttachments = attachmentFields.filter((field) => (field.requiredBy as readonly string[]).includes(appType)).map((field) => field.key);
	return requiredAttachments.every((key) => {
		const entry = updatedAttachments[key] as AttachmentEntry | undefined;
		return entry?.home || entry?.requestID;
	});
};

interface AttachmentStatusCellProps {
	attachment: AttachmentField;
	field: AttachmentField;
	application: ReviewApplication;
	isEditable: boolean;
	handleUpload: (event: ChangeEvent<HTMLInputElement>) => void;
	handleSimulateUpload: (key: string) => void;
	handleDelete: (key: string, attachment: AttachmentEntry) => void;
	handleRequestRecommendation: (attachmentType: string) => void;
}

const AttachmentStatusCell = ({ attachment, field, application, isEditable, handleUpload, handleSimulateUpload, handleDelete, handleRequestRecommendation }: AttachmentStatusCellProps) => {
	const attachmentData = application.attachments[field.key] as AttachmentEntry | undefined;
	const canRequestLetter = Object.prototype.hasOwnProperty.call(LettersOfRecommendation, field.key);

	if (attachmentData?.displayName) {
		return <Chip clickable={!!attachmentData.home} component='a' href={attachmentData.home} target='_blank' rel='noopener noreferrer' label={attachmentData.displayName} onDelete={isEditable ? () => handleDelete(field.key, attachmentData) : undefined} />;
	}

	if (attachmentData?.requestID) {
		return <Chip label='Request Sent' onDelete={isEditable ? () => handleDelete(field.key, attachmentData) : undefined} />;
	}

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', width: '100%' }}>
			<Typography variant='body2' sx={{ color: 'custom.red', mb: 1 }}>
				Missing
			</Typography>
			{isEditable && (
				<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', width: '100%', gap: 1 }}>
					<Button size='small' component='label' variant='contained' startIcon={attachment.icon}>
						Upload
						<VisuallyHiddenInput name={field.key} onChange={handleUpload} type='file' accept='.pdf,application/pdf' />
					</Button>
					<Button size='small' variant='outlined' startIcon={<ScienceOutlined />} onClick={() => handleSimulateUpload(field.key)} sx={{ textTransform: 'none' }}>
						Simulate upload
					</Button>
					{canRequestLetter && (
						<>
							<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', my: 0.5 }}>
								<Divider sx={{ flexGrow: 1, borderColor: 'grey.500', borderBottomWidth: 2 }} />
								<Typography variant='body2' sx={{ mx: 2 }}>
									OR
								</Typography>
								<Divider sx={{ flexGrow: 1, borderColor: 'grey.500', borderBottomWidth: 2 }} />
							</Box>
							<Button size='small' variant='contained' onClick={() => handleRequestRecommendation(field.key)}>
								Request Letter
							</Button>
						</>
					)}
				</Box>
			)}
		</Box>
	);
};

function ReviewPageHeaderActions() {
	return (
		<Button component={Link} to={generatePath(paths.apply)} variant='outlined' size='small' fullWidth sx={{ ...homeAuthSecondaryButtonSx, width: { xs: '100%', sm: 'auto' } }}>
			Back to Dashboard
		</Button>
	);
}

export default function Review() {
	const { id: appID } = useParams();
	const { user } = useAuth();
	const { showAlert, handleError } = useAlert();
	const { showDialog } = useDialog();
	const config = useConfig();

	useTitle({ title: 'Review Application', appear: false });

	const [application, setApplication] = useState<ReviewApplication>(templateApp as unknown as ReviewApplication);
	const [wasNotFound, setWasNotFound] = useState(false);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);

	const requiredAttachments = attachmentFields.filter((attachment) => (attachment.requiredBy as readonly string[]).includes(application.type));

	useEffect(() => {
		const fetch = async () => {
			try {
				if (!user?.uid || !appID) return;
				const appData = await getApplication(user.uid, appID);

				if (appData) {
					const dataPromises = [getCollectionData(appData.completedBy, collections.profiles, appData.profile), getCollectionData(appData.completedBy, collections.families, appData.family), getCollectionData(appData.completedBy, collections.education, appData.education), getCollectionData(appData.completedBy, collections.experience, appData.experience), getCollectionData(appData.completedBy, collections.expenses, appData.expenses), getCollectionData(appData.completedBy, collections.incomes, appData.incomes), getCollectionData(appData.completedBy, collections.contributions, appData.contributions), getCollectionData(appData.completedBy, collections.projections, appData.projections), getCollectionData(appData.completedBy, collections.attachments, appData.attachments)];

					const [profile, family, education, experience, expenses, incomes, contributions, projections, attachments] = await Promise.all(dataPromises);

					setApplication({
						...appData,
						type: String(appData.type ?? ''),
						status: String(appData.status ?? ''),
						profile,
						family,
						education,
						experience,
						expenses,
						incomes,
						contributions,
						projections,
						attachments: (attachments || {}) as AttachmentsMap,
					});
				} else {
					setWasNotFound(true);
				}
			} catch (error) {
				handleError(error, 'reviewFetch');
				setWasNotFound(true);
			} finally {
				setLoading(false);
			}
		};
		if (user?.uid && appID) fetch();
	}, [appID, user, handleError]);

	const handleRequestRecommendation = useCallback(
		(attachmentType: string) => {
			showDialog({
				id: 'requestRecommendation',
				data: {
					fromName: `${application.profile?.applicantFirstName} ${application.profile?.applicantLastName}`,
					attachmentType,
				},
				callback: async (formData: unknown) => {
					if (!formData) return;
					const data = formData as { fromName?: string; [key: string]: unknown };

					try {
						const insecurePin = generate6DigitNumber();
						const securePin = await generateSecurePin(insecurePin);

						const request = {
							...data,
							id: uuid(),
							pinCode: securePin,
							attachmentType,
							attachmentsID: application.attachments.attachmentsID,
							applicationID: appID,
							fromName: data.fromName || `${application.profile?.applicantFirstName} ${application.profile?.applicantLastName}`,
							fromId: application.profile?.applicantID,
							status: 'Pending',
							expiryDate: config.APPLICATION_DEADLINE,
							completed: false,
							attempts: 0,
						};

						await saveCollectionData(collections.requests, request.id, request);
						const uploadLink = await generateUploadLink(request.id);
						await sendRequest(request, uploadLink, insecurePin);

						const updatedAttachments = { ...application.attachments, [attachmentType]: { requestID: request.id } };
						await saveCollectionData(collections.attachments, application.attachments.attachmentsID as string, updatedAttachments);
						setApplication((prev) => ({ ...prev, attachments: updatedAttachments }));

						showAlert('request', 'sent');
					} catch (error) {
						handleError(error, 'reviewSendRequest');
					}
				},
			});
		},
		[application, appID, config, showDialog, showAlert, handleError]
	);

	const handleDelete = useCallback(
		async (key: string, attachment: AttachmentEntry) => {
			try {
				if (attachment.refLoc) {
					await deleteFile(attachment.refLoc);
					showAlert('upload', 'deleted');
				} else if (attachment.requestID) {
					await invalidateRequest(attachment.requestID);
				}

				const updatedAttachments = { ...application.attachments, [key]: blankAttachment as AttachmentEntry };
				await saveCollectionData(collections.attachments, application.attachments.attachmentsID as string, updatedAttachments);
				setApplication((prev) => ({ ...prev, attachments: updatedAttachments }));
			} catch (error) {
				handleError(error, 'reviewHandleDelete');
			}
		},
		[application, showAlert, handleError]
	);

	const uploadAttachmentFile = useCallback(
		async (name: string, file: File | undefined) => {
			if (!file?.type.match('application/pdf')) return showAlert('upload', 'type');
			if (file.size > 25 * 1024 * 1024) return showAlert('upload', 'size');
			if (!appID) return;

			setUploading(true);
			try {
				const savedFileRef = await saveFile(UploadType.applicationAttachment, appID, name, file);
				const downloadLink = await getDownloadLinkForFile(savedFileRef);

				if (downloadLink) {
					const newAttachmentData: AttachmentEntry = {
						displayName: file.name,
						home: downloadLink,
						refLoc: savedFileRef as unknown as string,
						uploadedBy: 'applicant',
					};

					const updatedAttachments = { ...application.attachments, [name]: newAttachmentData };
					await saveCollectionData(collections.attachments, application.attachments.attachmentsID as string, updatedAttachments);
					setApplication((prev) => ({ ...prev, attachments: updatedAttachments }));

					if (isApplicationComplete(updatedAttachments, application.type) && user?.uid) {
						await updateApplicationStatus(user.uid, appID, ApplicationStatus.completed);
						setApplication((prev) => ({ ...prev, status: ApplicationStatus.completed }));
						showAlert('application', 'completed');
					} else {
						showAlert('application', 'incomplete');
					}
				} else {
					showAlert('upload', 'missing');
				}
			} catch (error) {
				handleError(error, 'reviewHandleUpload');
			} finally {
				setUploading(false);
			}
		},
		[appID, application, user?.uid, showAlert, handleError]
	);

	const handleUpload = useCallback(
		async (event: ChangeEvent<HTMLInputElement>) => {
			event.preventDefault();
			const { name, files } = event.target;
			await uploadAttachmentFile(name, files?.[0]);
		},
		[uploadAttachmentFile]
	);

	const handleSimulateUpload = useCallback(
		async (key: string) => {
			await uploadAttachmentFile(key, createDemoPdfFile(key));
		},
		[uploadAttachmentFile]
	);

	if (loading || uploading) return <Loader />;
	if (wasNotFound) return <NotFound />;

	const editableStatuses: string[] = [ApplicationStatus.started, ApplicationStatus.submitted, ApplicationStatus.incomplete];
	const isEditable = editableStatuses.includes(application.status);

	return (
		<PublicPageLayout maxWidth='lg' compact tightMobile applicantNav>
			<AuthFormCard
				layout='stacked'
				size='dashboard'
				compact
				tightMobile
				denseHeader
				headerAlign='left'
				headerActions={<ReviewPageHeaderActions />}
				title={`Your ${application.type} Application for ${dayjs(application.window).year()}`}
				icon={<HistoryEduIcon />}
				eyebrow='Review Application'
				intro={
					<Stack spacing={1} sx={homeReviewStatusStackSx}>
						<StatusCapsule status={application.status} />
						<Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center' }}>
							Submitted {application.submittedOn}
						</Typography>
					</Stack>
				}>
				<Stack spacing={3} sx={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
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
										<AttachmentStatusCell
											attachment={field as AttachmentField}
											field={field as AttachmentField}
											application={application}
											isEditable={isEditable}
											handleUpload={handleUpload}
											handleSimulateUpload={handleSimulateUpload}
											handleDelete={handleDelete}
											handleRequestRecommendation={handleRequestRecommendation}
										/>
									</ReviewMobileAttachmentCard>
								))}
							</Box>
						</Box>
					)}
				</Stack>
			</AuthFormCard>
		</PublicPageLayout>
	);
}
