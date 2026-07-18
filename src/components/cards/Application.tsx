/**
 * Application Detail Card
 * The primary view for reviewing a submitted application.
 * Fetches and displays related data (Family, Education, Financials) and allows status management.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Box, Typography, Chip } from '@mui/material';
import { v4 as uuid } from 'uuid';
import dayjs from 'dayjs';
import { serverTimestamp } from 'firebase/firestore';

// Context & Hooks
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { assetSubsectionTitleSx, assetViewCardContentSx, singleAssetGridRowSx, singleAssetStackSx } from '../../config/ui/adminPageStyles';
import { formatDateTimeLocal, formatPlaceAddress } from '../../config/ui/displayFormat';

// Config & Utils
import { generatePath } from '../../config/navigation/routeUtils';
import { capitalize, attachmentFields } from '../../config/Constants';
import { collections } from '../../config/data/collections';
import { getApplicationActions } from '../../config/ui/buttonActions';
import { ContactTemplate, pushNotice } from '../../config/content/push';
import { getCollectionData, getRealTimeAwardsByIDs, saveCollectionData } from '../../config/data/firebase';

// Components
import SingleAssetPage, { AssetCard } from '../layout/SingleAssetPage';
import Loader from '../loader/Loader';
import NotFound from '../layout/NotFound';
import NotesSection from '../notes/NotesSection';
import AssetProfileSection from '../assets/AssetProfileSection';
import InfoTable from '../assets/InfoTable';
import Section from '../assets/Section';
import {
	AssignmentOutlined as TypeIcon,
	PersonOutlined as PersonIcon,
	SchoolOutlined as SchoolIcon,
	MenuBookOutlined as MajorIcon,
	BusinessOutlined as OrgIcon,
	EmailOutlined as EmailIcon,
	PhoneIphoneOutlined as CellIcon,
	ScheduleOutlined as UpdatedIcon,
} from '@mui/icons-material';

import type { DocumentData } from 'firebase/firestore';
import type { ApplicantRecord, ApplicationCardProps, DynamicAction, ExperiencePosition, FamilyMember } from './types';

// --- Sub-components (Helpers) ---

const sumArray = (arr: Array<{ amount?: string | number }> | null | undefined) => {
	if (!arr || !Array.isArray(arr)) return 0;
	return arr.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
};

const FamilyInfo = ({ data }: { data: { familyMembers?: FamilyMember[] } }) => (
	<Box>
		{data.familyMembers?.map((member) => (
			<Box key={`${member.relation}-${member.fullName}`} sx={{ mb: 1.5 }}>
				<Typography variant='body1' sx={{ fontWeight: 'bold', color: 'text.primary' }}>
					{member.relation}: {member.fullName}, Age {member.age}
				</Typography>
				<Typography variant='body2' sx={{ color: 'text.secondary' }}>
					Occupation: {member.occupation}
				</Typography>
			</Box>
		))}
	</Box>
);

FamilyInfo.propTypes = {
	data: PropTypes.shape({
		familyMembers: PropTypes.arrayOf(PropTypes.object),
	}).isRequired,
};

const EducationInfo = ({ data }: { data: DocumentData }) => (
	<InfoTable
		data={[
			{ label: 'School', value: data.schoolName },
			{ label: 'Major', value: data.major },
			{ label: 'Current GPA', value: data.currentGPA },
			{ label: 'Graduation Year', value: data.expectedGraduationDate ? dayjs(data.expectedGraduationDate).year() : 'N/A' },
			{ label: 'Previous Schools', value: data.previousSchools?.join(', ') },
		]}
	/>
);

EducationInfo.propTypes = {
	data: PropTypes.shape({
		schoolName: PropTypes.string,
		major: PropTypes.string,
		currentGPA: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		expectedGraduationDate: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
		previousSchools: PropTypes.arrayOf(PropTypes.string),
	}).isRequired,
};

const ExperienceInfo = ({ data }: { data: { positions?: ExperiencePosition[]; currentOrganization?: string | number } }) => {
	const { darkMode } = useTheme();

	return (
		<Box>
			<Typography variant='h5' gutterBottom sx={{ color: darkMode ? 'secondary.main' : 'text.highlight' }}>
				Record
			</Typography>
			{data.positions?.map((pos: ExperiencePosition, index: number) => {
				const isCurrent = Number(index === Number(data.currentOrganization));
				let backgroundColor = 'transparent';
				if (isCurrent) {
					backgroundColor = darkMode ? 'custom.green' : 'custom.black';
				}

				let textColor = 'custom.black';
				if (darkMode) {
					textColor = 'custom.white';
				} else if (isCurrent) {
					textColor = 'custom.brightWhite';
				}

				const secondaryColor = textColor === 'custom.black' ? 'text.secondary' : 'custom.white';

				return (
					<Box key={`${pos.type}-${pos.organization}`} sx={{ mb: 2, bgcolor: backgroundColor, p: '10px', borderRadius: '8px' }}>
						<Typography variant='body1' sx={{ color: textColor, fontWeight: 'bold' }}>
							{pos.organization}
							{pos.location ? ` (${formatPlaceAddress(pos.location)})` : ''}
						</Typography>
						<Typography variant='body2' sx={{ color: secondaryColor }}>
							Role: {pos.role}
						</Typography>
						<Typography variant='body2' sx={{ color: secondaryColor }}>
							{pos.type}
						</Typography>
					</Box>
				);
			})}
		</Box>
	);
};

ExperienceInfo.propTypes = {
	data: PropTypes.object.isRequired,
};

const FinancialTable = ({ title, data, total }: { title: string; data?: DocumentData | null; total?: number }) => {
	if (!data) return null;

	const formattedData = Object.entries(data)
		.filter(([key]) => !key.endsWith('ID') && key !== 'completedBy' && key !== 'id')
		.flatMap(([key, value]) => {
			if (Array.isArray(value)) {
				return value.map((item) => ({
					label: capitalize(item.title || 'Other'),
					value: (Number(item.amount) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
				}));
			}
			const numericValue = Number(value) || 0;
			let formattedLabel = key.replace(/([A-Z])/g, ' $1').trim();
			return [
				{
					label: capitalize(formattedLabel),
					value: numericValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
				},
			];
		});

	if (total !== undefined && total !== null) {
		formattedData.push({
			label: 'TOTAL',
			value: Number(total).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
		});
	}

	return (
		<Box sx={{ flex: 1, minWidth: '250px' }}>
			<Typography variant='h5' gutterBottom sx={assetSubsectionTitleSx}>
				{title}
			</Typography>
			<InfoTable data={formattedData} />
		</Box>
	);
};

FinancialTable.propTypes = {
	title: PropTypes.string.isRequired,
	data: PropTypes.object,
	total: PropTypes.number,
};

// --- Main Component ---

export const Application = ({ application: initialApplication }: ApplicationCardProps) => {
	const navigate = useNavigate();
	const { showDialog } = useDialog();
	const { showAlert, handleError } = useAlert();
	const { member } = useAuth();
	const config = useConfig();

	const [application, setApplication] = useState(initialApplication);
	const [applicant, setApplicant] = useState<ApplicantRecord | null>(null);
	const [family, setFamily] = useState<DocumentData | null>(null);
	const [education, setEducation] = useState<DocumentData | null>(null);
	const [experience, setExperience] = useState<DocumentData | null>(null);
	const [incomes, setIncomes] = useState<DocumentData | null>(null);
	const [expenses, setExpenses] = useState<DocumentData | null>(null);
	const [projections, setProjections] = useState<DocumentData | null>(null);
	const [contributions, setContributions] = useState<DocumentData | null>(null);
	const [attachments, setAttachments] = useState<DocumentData | null>(null);
	const [awards, setAwards] = useState<DocumentData[]>([]);
	const [loading, setLoading] = useState(true);
	const [showNotes, setShowNotes] = useState(false);

	useEffect(() => {
		const fetchData = async () => {
			if (!application) return;
			if (!application.completedBy) return;
			setLoading(true);
			try {
				const completedBy = application.completedBy;
				const dataPromises = [
					getCollectionData(completedBy, collections.families, application.family ?? ''),
					getCollectionData(completedBy, collections.education, application.education ?? ''),
					getCollectionData(completedBy, collections.experience, application.experience ?? ''),
					getCollectionData(completedBy, collections.incomes, application.incomes ?? ''),
					getCollectionData(completedBy, collections.expenses, application.expenses ?? ''),
					getCollectionData(completedBy, collections.projections, application.projections ?? ''),
					getCollectionData(completedBy, collections.contributions, application.contributions ?? ''),
					getCollectionData(completedBy, collections.attachments, application.attachments ?? ''),
					getCollectionData(completedBy, collections.applicants, completedBy),
				];
				const [familyData, educationData, experienceData, incomesData, expensesData, projectionsData, contributionsData, attachmentsData, applicantData] = await Promise.all(dataPromises);

				setFamily(familyData ?? null);
				setEducation(educationData ?? null);
				setExperience(experienceData ?? null);
				setIncomes(incomesData ?? null);
				setExpenses(expensesData ?? null);
				setProjections(projectionsData ?? null);
				setContributions(contributionsData ?? null);
				setAttachments(attachmentsData ?? null);
				setApplicant(applicantData ?? null);
			} catch (error) {
				console.error('Error fetching application details:', error);
			}
			setLoading(false);
		};
		fetchData();
	}, [application]);

	useEffect(() => {
		if (application?.awards && application.awards.length > 0) {
			const unsubscribe = getRealTimeAwardsByIDs(application.awards, setAwards);
			return () => unsubscribe();
		}
	}, [application?.awards]);

	const handleAction = (action: DynamicAction & { dialogId?: string }, asset: ApplicationCardProps['application']) => {
		const dialogId = action.dialogId;

		if (action.navTo) {
			const { path, params } = action.navTo(asset);
			navigate(generatePath(path, params));
			return;
		}

		if (action.onClick) {
			action.onClick(asset);
			return;
		}

		switch (dialogId) {
			case 'changeAppStatus':
				showDialog({
					id: 'changeAppStatus',
					data: { currentStatus: asset.status },
					callback: async (value: unknown) => {
						const result = value as { status?: string } | null;
						if (result?.status) {
							try {
								await saveCollectionData(collections.applications, asset.id, { status: result.status });
								setApplication((prev) => ({ ...prev, status: result.status }));
								showAlert({ message: 'Application status updated!', type: 'success' });
							} catch (error) {
								handleError(error, 'changeAppStatus-applicationCard');
							}
						}
					},
				});
				break;

			case 'markEligibility':
				showDialog({
					id: 'markEligibility',
					callback: async (value: unknown) => {
						const result = value as string | null;
						if (result) {
							try {
								await saveCollectionData(collections.applications, asset.id, { status: result });
								setApplication((prev) => ({ ...prev, status: result }));
								showAlert({ message: `Application marked as ${result}!`, type: 'success' });
							} catch (error) {
								handleError(error, 'markEligibility-applicationCard');
							}
						}
					},
				});
				break;

			case 'addAward':
				showDialog({
					id: 'addAward',
					callback: async (value: unknown) => {
						const result = value as { awardAmount?: string; awardName?: string; awardFollowUp?: string } | null;
						if (result?.awardAmount && result?.awardName) {
							try {
								const awardId = uuid();
								const awardData = {
									id: awardId,
									memberId: member?.id,
									applicationId: asset.id,
									applicantId: asset.completedBy,
									date: serverTimestamp(),
									type: result.awardName,
									amount: result.awardAmount,
									followUp: result.awardFollowUp,
								};
								await saveCollectionData(collections.awards, awardId, awardData);
								await saveCollectionData(collections.applications, asset.id, { status: 'Awarded' });
								await pushNotice(ContactTemplate.appApproved, applicant ?? {}, { award: awardData });

								setApplication((prev) => ({ ...prev, status: 'Awarded' }));
								showAlert({ message: 'Award added successfully!', type: 'success' });
							} catch (error) {
								handleError(error, 'addAward-applicationCard');
							}
						}
					},
				});
				break;

			default:
				console.error(`No dialog handler for ID: ${dialogId}`);
		}
	};

	const buildApplicationActions = getApplicationActions as (showNotes: boolean, setShowNotes: React.Dispatch<React.SetStateAction<boolean>>, member?: unknown) => DynamicAction[];
	const actions = useMemo(() => buildApplicationActions(showNotes, setShowNotes, member), [buildApplicationActions, showNotes, member]);

	const requiredAttachments = useMemo(() => {
		if (!application.type) return [];
		return attachmentFields.filter((field) => field.requiredBy.includes(application.type as 'New Applicant' | 'Returning Grant' | 'Scholarship Check In'));
	}, [application.type]);

	const applicationDetails = useMemo(
		() => [
			{ label: 'Name', value: `${applicant?.firstName ?? ''} ${applicant?.lastName ?? ''}`.trim(), icon: PersonIcon },
			{ label: 'Type', value: application.type, icon: TypeIcon },
			{ label: 'School', value: applicant?.school ? `${applicant.school} (${applicant?.gradYear ?? '—'})` : undefined, icon: SchoolIcon },
			{ label: 'Major', value: applicant?.major, icon: MajorIcon },
			{ label: 'Organization', value: applicant?.organization, icon: OrgIcon },
			{
				label: 'Email',
				value: applicant?.email ? (
					<Box component='a' href={`mailto:${applicant.email}`} sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
						{applicant.email}
					</Box>
				) : undefined,
				icon: EmailIcon,
			},
			{ label: 'Phone', value: applicant?.cell, icon: CellIcon },
		],
		[application, applicant],
	);

	const updatedAt = (application.lastUpdated || application.submittedOn) as string | number | Date | null | undefined;

	const calculatedTotals = useMemo(() => {
		if (!expenses || !incomes) return { expenses: 0, income: 0 };

		const expenseSum = (Number(expenses.tuitionCost) || 0) + (Number(expenses.roomAndBoardCost) || 0) + (Number(expenses.bookCost) || 0) + (Number(expenses.commutingCost) || 0) + sumArray(expenses.otherExpenses);
		const incomeSum = (Number(incomes.earningsAppliedToEducation) || 0) + (Number(incomes.savingsAppliedToEducation) || 0) + (Number(incomes.collegeAward) || 0) + (Number(incomes.loansAmount) || 0) + sumArray(incomes.otherIncomeSources);

		return { expenses: expenseSum, income: incomeSum };
	}, [expenses, incomes]);

	if (loading) return <Loader />;
	if (!application) return <NotFound />;

	return (
		<SingleAssetPage>
			<Box sx={singleAssetStackSx}>
				<AssetCard contentSx={assetViewCardContentSx}>
					<AssetProfileSection
						image={applicant?.picture?.home}
						displayName={applicant?.callMe}
						status={application.status}
						config={config}
						details={applicationDetails}
						actions={actions as DynamicAction[]}
						asset={application}
						onAction={handleAction as (action: DynamicAction, asset?: Record<string, unknown>) => void}
						footerMeta={
							updatedAt ? (
								<Box
									sx={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: { xs: 'center', sm: 'flex-end' },
										gap: 0.75,
									}}>
									<UpdatedIcon sx={{ fontSize: 16, color: 'text.secondary' }} aria-hidden />
									<Typography component='span' sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontWeight: 500, whiteSpace: 'nowrap' }}>
										Last updated {formatDateTimeLocal(updatedAt)}
									</Typography>
								</Box>
							) : undefined
						}
					/>
				</AssetCard>
			</Box>

			{showNotes && (
				<Box sx={singleAssetStackSx}>
					<AssetCard contentSx={assetViewCardContentSx}>
						<NotesSection targetId={application?.id} targetCollection={collections.applications} />
					</AssetCard>
				</Box>
			)}

			<Box sx={singleAssetGridRowSx}>
				{family && (
					<AssetCard flex={1} contentSx={assetViewCardContentSx}>
						<Section title='Family'>
							<FamilyInfo data={family} />
						</Section>
					</AssetCard>
				)}
				{education && (
					<AssetCard flex={1} contentSx={assetViewCardContentSx}>
						<Section title='Education'>
							<EducationInfo data={education} />
						</Section>
					</AssetCard>
				)}
				{experience && (
					<AssetCard flex={1} contentSx={assetViewCardContentSx}>
						<Section title='Experience'>
							<ExperienceInfo data={experience} />
						</Section>
					</AssetCard>
				)}
			</Box>

			{(incomes || expenses || projections) && (
				<Box sx={singleAssetStackSx}>
					<AssetCard contentSx={assetViewCardContentSx}>
						<Section title='Financials'>
							<Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, mt: 2 }}>
								<FinancialTable title='Income' data={incomes} total={calculatedTotals.income} />
								<FinancialTable title='Expenses' data={expenses} total={calculatedTotals.expenses} />
								<FinancialTable title='Projections' data={projections} />
							</Box>
							{contributions?.anyExtraordinaryExpenses && (
								<Box sx={{ mt: 2 }}>
									<Typography variant='h6' gutterBottom sx={{ color: 'text.primary' }}>
										Extraordinary Circumstances
									</Typography>
									<Typography variant='body2' sx={{ whiteSpace: 'pre-line', color: 'text.primary' }}>
										{contributions.anyExtraordinaryExpenses}
									</Typography>
								</Box>
							)}
						</Section>
					</AssetCard>
				</Box>
			)}

			{awards?.length > 0 && (
				<Box sx={singleAssetStackSx}>
					<AssetCard contentSx={assetViewCardContentSx}>
						<Section title='Awards'>
							<InfoTable
								data={awards.map((award) => ({
									label: award.type,
									value: `$${award.awardAmount} awarded on ${dayjs(award.createdOn).format('MM/DD/YYYY')}`,
								}))}
							/>
						</Section>
					</AssetCard>
				</Box>
			)}

			{requiredAttachments.length > 0 && (
				<Box sx={singleAssetStackSx}>
					<AssetCard contentSx={assetViewCardContentSx}>
						<Section title='Required Attachments'>
							<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
								{requiredAttachments.map((field) => {
									const attachmentData = attachments?.[field.key];
									if (attachmentData?.home) {
										return <Chip key={field.key} label={field.label} component='a' href={attachmentData.home} target='_blank' rel='noopener noreferrer' clickable color='success' variant='filled' />;
									} else if (attachmentData?.requestID) {
										return <Chip key={field.key} label={`${field.label} (Requested)`} color='warning' variant='filled' />;
									} else {
										return <Chip key={field.key} label={`${field.label} (Missing)`} color='error' variant='outlined' />;
									}
								})}
							</Box>
						</Section>
					</AssetCard>
				</Box>
			)}
		</SingleAssetPage>
	);
};

Application.propTypes = {
	application: PropTypes.shape({
		id: PropTypes.string,
		family: PropTypes.string,
		education: PropTypes.string,
		experience: PropTypes.string,
		incomes: PropTypes.string,
		expenses: PropTypes.string,
		projections: PropTypes.string,
		contributions: PropTypes.string,
		attachments: PropTypes.string,
		completedBy: PropTypes.string,
		status: PropTypes.string,
		type: PropTypes.string,
		awards: PropTypes.arrayOf(PropTypes.string),
		lastUpdated: PropTypes.string,
		submittedOn: PropTypes.any,
	}).isRequired,
};