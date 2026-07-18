/**
 * Application Controller (The "Wizard")
 * Manages the multi-step application process for applicants.
 * Handles:
 * 1. Data Loading (Fetching existing drafts or creating new ones).
 * 2. Navigation (Next/Back/Save & Exit).
 * 3. Validation (Triggering form validation before proceeding).
 * 4. Persistence (Saving step data to specific Firestore collections).
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { v4 as uuidv4 } from 'uuid';
import { Button, Box, Stepper, Step, StepButton, Typography, useMediaQuery, Stack } from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';

// Context & Hooks
import { useAuth } from '../../../context/AuthContext';
import { useApplicationContext } from '../../../context/ApplicationContext';
import { useConfig } from '../../../context/ConfigContext';
import { useTitle } from '../../../context/HelmetContext';
import { useAlert } from '../../../context/AlertContext';
import { useTheme } from '../../../context/ThemeContext';

// Config & Firebase
import { saveCollectionData, getApplication, getCollectionData, getApplicant, addApplicationToApplicant, updateApplicantData } from '../../../config/data/firebase';
import { attachmentFields } from '../../../config/Constants';
import { collections, ApplicationStatus } from '../../../config/data/collections';
import { generatePath } from '../../../config/navigation/routeUtils';
import { paths } from '../../../config/navigation/paths';
import { ContactTemplate, pushNotice } from '../../../config/content/push';
import { applicationConfigurations } from '../../../config/ui/applicationConfig';

// Components
import Loader from '../../loader/Loader';
import NotFound from '../../layout/NotFound';
import PublicPageLayout from '../../home/PublicPageLayout';
import AuthFormCard from '../../auth/AuthFormCard';
import GenericFormPage from '../../forms/GenericFormPage';
import { homeAuthSecondaryButtonSx, homeAuthSubmitButtonSx } from '../../home/homePageStyles';

import type { DocumentData } from 'firebase/firestore';
import type { EducationForm, ExperienceForm, IncomesForm, ProfileForm } from '../../../types/forms';
import type { ApplicationRecord } from '../types';

dayjs.extend(customParseFormat);

// Map string keys from config to actual React components
const componentMap: Record<string, typeof GenericFormPage> = {
	GenericFormPage,
};

// --- Local Types ---

type WizardAppConfig = (typeof applicationConfigurations)[keyof typeof applicationConfigurations];

type HandleErrorFn = (error: unknown, context: string) => void;

interface LoadExistingResult {
	notFound: boolean;
	application?: ApplicationRecord;
	completed?: DocumentData | null;
	applicant?: DocumentData | null;
}

// --- Helpers ---

// Maps section keys (e.g., "education") to the specific ID field name expected by the DB
const getRecordIdKeyForSection = (sectionKey: string): string => {
	const map: Record<string, string> = {
		profile: 'applicantID',
		family: 'familyID',
		education: 'educationRecordID',
		experience: 'experienceRecordID',
		expenses: 'expensesID',
		incomes: 'incomesReportID',
		contributions: 'contributionsID',
		projections: 'projectionsID',
		attachments: 'attachmentsID',
	};
	return map[sectionKey] || 'id';
};

// Maps section keys to their Firestore collection names
const getCollectionNameForSection = (sectionKey: string): string => {
	const map: Record<string, string> = {
		profile: collections.profiles,
		family: collections.families,
		education: collections.education,
		experience: collections.experience,
		expenses: collections.expenses,
		incomes: collections.incomes,
		contributions: collections.contributions,
		projections: collections.projections,
		attachments: collections.attachments,
	};
	return map[sectionKey];
};

// Validates if all required attachments are present
const checkApplicationCompleteness = (applicationData: ApplicationRecord, appConfig: WizardAppConfig) => {
	let attachmentsComplete = true;
	const requiredAttachments = attachmentFields.filter((field) => (field.requiredBy as string[]).includes(appConfig.type)).map((field) => field.key);
	const attachments = applicationData.attachments as Record<string, { displayName?: string; requestID?: string } | undefined> | undefined;

	for (const key of requiredAttachments) {
		const attachment = attachments?.[key];
		// Must exist and have either a displayName (uploaded) or requestID (requested)
		if (!attachment || (!attachment.displayName && !attachment.requestID)) {
			attachmentsComplete = false;
			break;
		}
	}

	return attachmentsComplete ? ApplicationStatus.completed : ApplicationStatus.incomplete;
};

// Creates an update object for the Applicant Profile based on Application Data
const buildApplicantUpdate = (appState: ApplicationRecord, applicantState: DocumentData) => {
	const update: Record<string, unknown> = {};

	// Sync Profile Info
	const profile = appState.profile as Partial<ProfileForm> | undefined;
	if (profile) {
		update.firstName = profile.applicantFirstName || applicantState?.firstName;
		update.lastName = profile.applicantLastName || applicantState?.lastName;
		update.email = profile.applicantEmailAddress || applicantState?.email;
		update.cell = profile.applicantCellPhone || applicantState?.cell;
		update.homePhone = profile.applicantHomePhone || applicantState?.homePhone;
	}

	// Sync Education Info
	const education = appState.education as Partial<EducationForm> | undefined;
	if (education) {
		update.school = education.schoolName || applicantState?.school;
		update.major = education.major || applicantState?.major;
		if (education.expectedGraduationDate) {
			update.gradYear = Number(new Date(education.expectedGraduationDate).getFullYear());
		}
	}

	// Sync Organization/Role
	const experience = appState.experience as (Partial<ExperienceForm> & { positions?: Array<{ role?: string; organization?: string }> }) | undefined;
	if (experience?.positions) {
		const rawIndex = experience.currentOrganization;
		const currentIndex = Number.parseInt(String(rawIndex ?? ''), 10);
		if (rawIndex !== 'undefined' && !Number.isNaN(currentIndex) && experience.positions[currentIndex]) {
			const unit = experience.positions[currentIndex];
			update.organization = `${unit.role} | ${unit.organization}`;
		}
	}
	return update;
};

const loadExistingApplication = async (appId: string, userId: string, appConfig: WizardAppConfig, handleError: HandleErrorFn): Promise<LoadExistingResult> => {
	try {
		const appData = await getApplication(userId, appId);
		if (!appData) return { notFound: true };

		const collectionsToFetch = appConfig.dataCollections || [];
		const fetchedData: ApplicationRecord = {};

		// Fetch linked documents (Family, Education, etc.)
		await Promise.all(
			collectionsToFetch.map(async ({ key, collectionName }) => {
				const recordId = appData[key];
				if (recordId) {
					fetchedData[key] = await getCollectionData(userId, collectionName, String(recordId));
				}
			})
		);

		const applicant = await getApplicant(userId);
		return {
			application: { ...fetchedData, id: appId },
			completed: appData,
			applicant,
			notFound: false,
		};
	} catch (error) {
		handleError(error, `fetchData`);
		return { notFound: true };
	}
};

const initializeNewApplication = async (userId: string, handleError: HandleErrorFn) => {
	try {
		const applicantData = await getApplicant(userId);
		return { applicant: applicantData, newId: uuidv4() };
	} catch (error) {
		handleError(error, `fetchApplicant`);
		return { applicant: null, newId: uuidv4() };
	}
};

// --- Main Component ---

export default function ApplicationController() {
	const { applicationType, applicationID: paramID } = useParams();
	const appConfig = useMemo(() => (applicationType ? (applicationConfigurations as Record<string, WizardAppConfig>)[applicationType] : undefined), [applicationType]);

	// Wizard State
	const [activeStep, setActiveStep] = useState(0);
	const [completed, setCompleted] = useState<Record<string, unknown>>({}); // Tracks completion of each section (stores IDs)
	const [applicationID, setApplicationID] = useState<string | null>(paramID || null);

	// Data State
	const [application, setApplication] = useState<ApplicationRecord>((appConfig?.template ?? {}) as unknown as ApplicationRecord);
	const [applicant, setApplicant] = useState<DocumentData | null>(null);

	// UI State
	const [hasErrors, setHasErrors] = useState(false);
	const [wasNotFound, setWasNotFound] = useState(false);
	const [submissionAttempted, setSubmissionAttempted] = useState(false);

	// Hooks & Context
	const siteConfig = useConfig() as { APPLICATION_DEADLINE?: string; VALIDATION_OVERRIDE?: boolean };
	const { user } = useAuth();
	const { setAllowEditing, loading, setLoading } = useApplicationContext();
	const navigate = useNavigate();
	const { showAlert, handleError } = useAlert();
	const handleErrorRef = useRef(handleError); // Persist ref to avoid effect dependencies
	const { primaryColor } = useTheme();
	const theme = useMuiTheme();
	const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

	useTitle({ title: appConfig?.title || 'Application', appear: false });

	const steps = useMemo(() => appConfig?.steps || [], [appConfig]);

	useEffect(() => {
		handleErrorRef.current = handleError;
	}, [handleError]);

	// Initialization Effect
	useEffect(() => {
		const initialize = async () => {
			if (!appConfig || !user?.uid) return;
			setLoading(true);

			if (paramID) {
				// Load existing application
				const result = await loadExistingApplication(paramID, user.uid, appConfig, handleErrorRef.current);
				if (result.notFound) {
					setWasNotFound(true);
				} else {
					const appStatus = result.completed?.status;
					if (appStatus && appStatus !== ApplicationStatus.started) {
						navigate(generatePath(paths.reviewApp, { id: paramID }), { replace: true });
						return;
					}
					setApplicant(result.applicant ?? null);
					setApplication((prev) => ({ ...prev, ...result.application }));
					setCompleted(result.completed ?? {});
					setAllowEditing(appStatus === ApplicationStatus.started);
				}
			} else {
				// Initialize new application
				const { applicant: loadedApplicant, newId } = await initializeNewApplication(user.uid, handleErrorRef.current);
				setApplicant(loadedApplicant ?? null);
				setApplicationID(newId);
				setApplication(appConfig.template as unknown as ApplicationRecord);
				setAllowEditing(true);
			}
			setLoading(false);
		};
		initialize();
	}, [paramID, user?.uid, appConfig, setAllowEditing, setLoading, navigate]);

	// Navigation Helpers
	const totalSteps = useCallback(() => steps.length, [steps]);
	const isLastStep = useCallback(() => activeStep === totalSteps() - 1, [activeStep, totalSteps]);

	const handleNext = useCallback(() => {
		const isLast = activeStep === steps.length - 1;
		const allCompleted = Object.keys(completed).length >= steps.length - 1;

		// Find next incomplete step if at end, otherwise just next
		const newActiveStep = isLast && !allCompleted ? steps.findIndex((_step: string, i: number) => !completed[appConfig?.pages[i]?.section ?? '']) : activeStep + 1;

		setActiveStep(newActiveStep);
	}, [activeStep, steps, completed, appConfig]);

	const handleBack = () => setActiveStep((prev) => prev - 1);

	const handleReset = () => {
		setActiveStep(0);
		setCompleted({});
		if (appConfig) setApplication(appConfig.template as unknown as ApplicationRecord);
	};

	const handleLogout = () => navigate(generatePath(paths.apply));

	// Save Data Helpers
	const updateApplicantAndApplicationRecords = useCallback(
		async (updatedCompleted: Record<string, unknown>, currentApplicationState: ApplicationRecord) => {
			if (!applicationID || !appConfig || !user) return;
			try {
				const deadlineDate = new Date(siteConfig.APPLICATION_DEADLINE as string);
				const applicationRecord = {
					id: applicationID,
					...updatedCompleted,
					completedBy: user.uid,
					type: appConfig.type,
					status: ApplicationStatus.started,
					window: siteConfig.APPLICATION_DEADLINE,
					cycleYear: deadlineDate.getFullYear(),
					deadline: deadlineDate,
					lastUpdated: new Date().toLocaleString(),
				};
				await saveCollectionData(collections.applications, applicationID, applicationRecord);

				// Sync critical info back to Applicant Profile
				const applicantUpdate = buildApplicantUpdate(currentApplicationState, applicant || {});
				if (Object.keys(applicantUpdate).length > 0) {
					await updateApplicantData(user.uid, applicantUpdate);
				}

				// Ensure application is linked to user
				await addApplicationToApplicant(user.uid, applicationID);
			} catch (error) {
				handleError(error, `updateRecords`);
			}
		},
		[applicationID, user, appConfig, siteConfig, applicant, handleError]
	);

	// Handler: Validation Passed -> Save & Proceed
	const handleValidationSuccess = useCallback(async () => {
		setSubmissionAttempted(false);

		const currentStepConfig = appConfig?.pages[activeStep];

		// Skip saving for informational steps (like Confirmation)
		if (!currentStepConfig || currentStepConfig.section === 'confirmation') {
			handleNext();
			return;
		}

		if (!user) return;

		const sectionKey = currentStepConfig.section;
		const collectionName = getCollectionNameForSection(sectionKey);
		const dataToSave: Record<string, unknown> = { ...((application[sectionKey] ?? {}) as Record<string, unknown>), completedBy: user.uid };
		const recordIdKey = getRecordIdKeyForSection(sectionKey);

		// Generate ID if missing
		let recordID = dataToSave[recordIdKey] as string | undefined;
		if (!recordID) {
			recordID = uuidv4();
			dataToSave[recordIdKey] = recordID;
		}

		// Special handling for Projections (sync with Incomes)
		if (collectionName === collections.projections) {
			const incomes = application.incomes as Partial<IncomesForm> | undefined;
			dataToSave['applicantEarnings'] = incomes?.earningsAppliedToEducation;
			dataToSave['applicantSavings'] = incomes?.savingsAppliedToEducation;
		}

		// Save Step Data
		const isStepSaved = await saveCollectionData(collectionName, recordID, dataToSave);

		if (isStepSaved) {
			const newCompleted = { ...completed, [sectionKey]: recordID };
			setCompleted(newCompleted);

			await updateApplicantAndApplicationRecords(newCompleted, application);

			showAlert('application', 'updated');
			handleNext();
		} else {
			showAlert('application', 'failed');
		}
	}, [activeStep, appConfig, application, completed, handleNext, showAlert, user, updateApplicantAndApplicationRecords]);

	const handleValidationFailure = useCallback(() => {
		setSubmissionAttempted(false);
		showAlert('validation', 'fields');
	}, [showAlert]);

	// Handler: "Next" Button Clicked
	const handleComplete = () => {
		if (isLastStep()) {
			handleNext();
			return;
		}
		if (siteConfig.VALIDATION_OVERRIDE) {
			handleValidationSuccess();
		} else {
			setSubmissionAttempted(true); // Triggers validation in GenericFormPage
		}
	};

	// Handler: Final Submission
	const handleApplicationSubmit = async (event: React.MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		const now = new Date().toLocaleString();

		if (!appConfig || !applicationID || !user) return;
		try {
			// 1. Mark as Submitted
			const submissionDeadline = new Date(siteConfig.APPLICATION_DEADLINE as string);
			const submission = {
				id: applicationID,
				...completed,
				completedBy: user.uid,
				type: appConfig.type,
				status: ApplicationStatus.submitted,
				lastUpdated: now,
				submittedOn: now,
				window: siteConfig.APPLICATION_DEADLINE,
				cycleYear: submissionDeadline.getFullYear(),
				deadline: submissionDeadline,
			};
			await saveCollectionData(collections.applications, applicationID, submission);
			showAlert('application', 'submitted');

			// 2. Check Completeness (Missing attachments?)
			const finalStatus = checkApplicationCompleteness(application, appConfig);
			await saveCollectionData(collections.applications, applicationID, { status: finalStatus });

			// 3. Send Notifications
			const profile = application.profile as Partial<ProfileForm> | undefined;
			const firstName = profile?.applicantFirstName || applicant?.firstName;
			const lastName = profile?.applicantLastName || applicant?.lastName;
			const update = {
				id: user.uid,
				firstName: firstName,
				lastName: lastName,
				name: `${firstName} ${lastName}`,
				email: profile?.applicantEmailAddress || applicant?.email,
			};

			const template = finalStatus === ApplicationStatus.completed ? ContactTemplate.appCompleted : ContactTemplate.appIncomplete;

			await pushNotice(template, update, {});

			navigate(generatePath(paths.apply));
		} catch (error) {
			handleError(error, `handleSubmit_${applicationType}`);
		}
	};

	const renderActiveStepForm = () => {
		if (!appConfig) return null;
		const stepConfig = appConfig.pages[activeStep];
		if (!stepConfig) return <Typography>Page configuration is missing for this step.</Typography>;

		const PageComponent = componentMap[stepConfig.component];
		if (!PageComponent) return <Typography>Form component "{stepConfig.component}" not found.</Typography>;

		return <PageComponent sectionName={stepConfig.section} application={application} setApplication={setApplication} setHasErrors={setHasErrors} submissionAttempted={submissionAttempted} onValidationSuccess={handleValidationSuccess} onValidationFailure={handleValidationFailure} applicationType={appConfig.type} />;
	};

	const getButtonText = (original: string, smallScreenText: string) => (isSmallScreen ? smallScreenText : original);

	if (!appConfig || wasNotFound) return <NotFound />;
	if (loading) return <Loader />;

	return (
		<PublicPageLayout maxWidth='lg' compact tightMobile applicantNav>
			<AuthFormCard
				layout='stacked'
				size='dashboard'
				compact
				tightMobile
				denseHeader
				headerAlign='left'
				title={appConfig.title}
				icon={<HistoryEduIcon />}
				eyebrow='Application'
				intro={
					<Stack spacing={1.5} sx={{ width: '100%' }}>
						<Typography
							variant='body2'
							color='text.secondary'
							sx={{ display: { xs: 'block', md: 'none' }, textAlign: 'left', fontWeight: 600 }}>
							Step {activeStep + 1} of {steps.length}: {steps[activeStep]}
						</Typography>
						<Stepper
							activeStep={activeStep}
							alternativeLabel={!isSmallScreen}
							sx={{
								display: { xs: 'none', md: 'flex' },
								width: '100%',
								overflowX: 'auto',
								'& .MuiStepLabel-label': {
									fontSize: { md: '0.7rem', lg: '0.75rem' },
								},
							}}>
							{steps.map((label: string, index: number) => (
								<Step key={label} completed={completed[appConfig.pages[index]?.section ?? ''] !== undefined}>
									<StepButton color='inherit' onClick={() => setActiveStep(index)}>
										{label}
									</StepButton>
								</Step>
							))}
						</Stepper>
					</Stack>
				}>
				<Box sx={{ width: '100%', minWidth: 0 }}>{renderActiveStepForm()}</Box>

				<Box
					sx={{
						width: '100%',
						mt: 2.5,
						pt: 2,
						borderTop: '1px solid',
						borderColor: 'divider',
					}}>
					{isLastStep() ? (
						<Box
							sx={{
								display: 'flex',
								flexDirection: { xs: 'column', sm: 'row' },
								gap: 1.5,
								alignItems: 'stretch',
							}}>
							<Button variant='outlined' onClick={handleLogout} sx={homeAuthSecondaryButtonSx}>
								{getButtonText('Return to Applicant Portal', 'Leave')}
							</Button>
							<Button variant='outlined' onClick={handleReset} sx={homeAuthSecondaryButtonSx}>
								{getButtonText('Clear & Start Over', 'Reset')}
							</Button>
							<Box sx={{ flex: { sm: '1 1 auto' }, display: { xs: 'none', sm: 'block' } }} />
							<Button variant='contained' onClick={handleApplicationSubmit} disabled={hasErrors} sx={homeAuthSubmitButtonSx(primaryColor)}>
								{getButtonText('Confirm & Submit', 'Submit')}
							</Button>
						</Box>
					) : (
						<Box
							sx={{
								display: 'flex',
								flexDirection: { xs: 'column', sm: 'row' },
								gap: 1.5,
								alignItems: 'stretch',
							}}>
							<Button variant='outlined' onClick={handleLogout} sx={homeAuthSecondaryButtonSx}>
								{getButtonText('Save & Exit', 'Exit')}
							</Button>
							<Button variant='outlined' disabled={activeStep === 0} onClick={handleBack} sx={homeAuthSecondaryButtonSx}>
								Back
							</Button>
							<Box sx={{ flex: { sm: '1 1 auto' }, display: { xs: 'none', sm: 'block' } }} />
							<Button variant='contained' type='submit' onClick={handleComplete} sx={homeAuthSubmitButtonSx(primaryColor)}>
								{getButtonText('Save & Continue', 'Next')}
							</Button>
						</Box>
					)}
				</Box>
			</AuthFormCard>
		</PublicPageLayout>
	);
}