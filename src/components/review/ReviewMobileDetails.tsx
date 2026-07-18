import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useTheme } from '../../context/ThemeContext';
import {
	homeApplicantDetailLabelSx,
	homeReviewDetailFieldFullSx,
	homeReviewDetailRowsSx,
	homeReviewDetailRowSx,
	homeReviewSectionPanelSx,
} from '../home/homePageStyles';

type FirestoreDoc = Record<string, unknown>;

const calculateAge = (dob: string | undefined): string => {
	if (!dob) return '';
	const birthDate = new Date(dob);
	const today = new Date();
	let age = today.getFullYear() - birthDate.getFullYear();
	const monthDifference = today.getMonth() - birthDate.getMonth();
	if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
		age--;
	}
	return String(age);
};

function useReviewPanelSx() {
	const { darkMode } = useTheme();
	return homeReviewSectionPanelSx(darkMode);
}

/** Prefer denser review layout at all widths; callers may still pass desktop for tests. */
export function ReviewResponsiveDetails({ desktop: _desktop, mobile }: { desktop: React.ReactNode; mobile: React.ReactNode }) {
	return <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>{mobile}</Box>;
}

export function ReviewMobileField({ label, value, fullWidth = false }: { label: string; value: React.ReactNode; fullWidth?: boolean }) {
	const display = value === null || value === undefined || value === '' ? '—' : value;
	return (
		<Box sx={{ ...homeReviewDetailRowSx, ...(fullWidth ? homeReviewDetailFieldFullSx : {}) }}>
			<Typography component='span' sx={homeApplicantDetailLabelSx}>
				{label}
			</Typography>
			<Typography variant='body2' sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.45 }}>
				{display}
			</Typography>
		</Box>
	);
}

function ReviewFieldGrid({ children, columns }: { children: React.ReactNode; columns?: { xs?: number; sm?: number; md?: number } }) {
	return (
		<Box
			sx={{
				...homeReviewDetailRowsSx,
				...(columns
					? {
							gridTemplateColumns: {
								xs: `repeat(${columns.xs ?? 1}, minmax(0, 1fr))`,
								sm: `repeat(${columns.sm ?? 2}, minmax(0, 1fr))`,
								md: `repeat(${columns.md ?? 3}, minmax(0, 1fr))`,
							},
						}
					: {}),
			}}>
			{children}
		</Box>
	);
}

function ReviewMobileCard({ title, children, columns }: { title?: string; children: React.ReactNode; columns?: { xs?: number; sm?: number; md?: number } }) {
	const panelSx = useReviewPanelSx();
	return (
		<Paper variant='outlined' sx={panelSx}>
			{title && (
				<Typography variant='subtitle2' sx={{ mb: 1.25, fontWeight: 600, color: 'text.secondary' }}>
					{title}
				</Typography>
			)}
			<ReviewFieldGrid columns={columns}>{children}</ReviewFieldGrid>
		</Paper>
	);
}

function ReviewMobileEmpty({ message }: { message: string }) {
	const panelSx = useReviewPanelSx();
	return (
		<Paper variant='outlined' sx={{ ...panelSx, py: 1.5 }}>
			<Typography variant='body2' color='text.secondary'>
				{message}
			</Typography>
		</Paper>
	);
}

function ReviewMobileStack({ children, spacing = 1.5 }: { children: React.ReactNode; spacing?: number }) {
	return (
		<Stack spacing={spacing} sx={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
			{children}
		</Stack>
	);
}

export function ReviewProfileMobile({ data }: { data: FirestoreDoc }) {
	const dob = data.applicantDOB as string | undefined;
	const address = (data.applicantMailingAddress as FirestoreDoc | undefined)?.description as string | undefined;

	return (
		<ReviewMobileCard>
			<ReviewMobileField
				label='Full Name'
				value={`${data.applicantFirstName as string} ${(data.applicantMiddleInitial as string) || ''} ${data.applicantLastName as string}`.replace(/\s+/g, ' ').trim()}
			/>
			<ReviewMobileField
				label='Date of Birth'
				value={dob && dayjs(dob).isValid() ? `${dayjs(dob).format('MM/DD/YYYY')} (age ${calculateAge(dob)})` : undefined}
			/>
			<ReviewMobileField label='Email' value={data.applicantEmailAddress as string} />
			<ReviewMobileField label='Home Phone' value={data.applicantHomePhone as string} />
			<ReviewMobileField label='Cell Phone' value={data.applicantCellPhone as string} />
			<ReviewMobileField label='Mailing Address' value={address} fullWidth />
		</ReviewMobileCard>
	);
}

export function ReviewFamilyMobile({ data }: { data: FirestoreDoc }) {
	const members = (data.familyMembers as FirestoreDoc[] | undefined) ?? [];

	if (members.length === 0) {
		return <ReviewMobileEmpty message='No family reported.' />;
	}

	return (
		<ReviewMobileStack>
			{members.map((entry) => (
				<ReviewMobileCard key={`${entry.relation as string}-${entry.fullName as string}`} title={(entry.relation as string) || 'Family Member'} columns={{ xs: 1, sm: 2, md: 2 }}>
					<ReviewMobileField label='Name' value={entry.fullName as string} />
					<ReviewMobileField label='Occupation' value={entry.occupation as string} />
					<ReviewMobileField label='Age' value={entry.age as string | number} />
				</ReviewMobileCard>
			))}
		</ReviewMobileStack>
	);
}

export function ReviewEducationMobile({ data }: { data: FirestoreDoc }) {
	const previousSchools = (data.previousSchools as string[] | undefined) ?? [];

	return (
		<ReviewMobileStack>
			<ReviewMobileCard title='Current School'>
				<ReviewMobileField label='School Name' value={data.schoolName as string} fullWidth />
				<ReviewMobileField label='Major' value={data.major as string} fullWidth />
				<ReviewMobileField
					label='Expected Graduation'
					value={
						data.expectedGraduationDate
							? dayjs(data.expectedGraduationDate as string)
									.add(12, 'hour')
									.format('MMMM YYYY')
							: 'N/A'
					}
				/>
				<ReviewMobileField label='GPA' value={data.currentGPA as string | number} />
			</ReviewMobileCard>
			{previousSchools.length > 0 ? (
				<ReviewMobileCard title='Previous Schools' columns={{ xs: 1, sm: 2, md: 2 }}>
					{previousSchools.map((school) => (
						<Typography key={school} variant='body2' sx={{ ...homeReviewDetailRowSx, alignSelf: 'center' }}>
							{school}
						</Typography>
					))}
				</ReviewMobileCard>
			) : (
				<ReviewMobileEmpty message='No previous education reported.' />
			)}
		</ReviewMobileStack>
	);
}

export function ReviewExperienceMobile({ data }: { data: FirestoreDoc }) {
	const positions = (data.positions as FirestoreDoc[] | undefined) ?? [];

	if (positions.length === 0) {
		return <ReviewMobileEmpty message='No experience reported.' />;
	}

	return (
		<ReviewMobileStack>
			{positions.map((pos) => (
				<ReviewMobileCard key={`${pos.type as string}-${pos.organization as string}-${pos.role as string}`} title={pos.organization as string} columns={{ xs: 1, sm: 2, md: 2 }}>
					<ReviewMobileField label='Role' value={pos.role as string} />
					<ReviewMobileField label='Type' value={pos.type as string} />
					<ReviewMobileField label='Location' value={pos.location as string} />
				</ReviewMobileCard>
			))}
		</ReviewMobileStack>
	);
}

export function ReviewExpensesMobile({ data }: { data: FirestoreDoc }) {
	const otherExpenses = (data.otherExpenses as FirestoreDoc[] | undefined) ?? [];

	return (
		<ReviewMobileStack>
			<ReviewMobileCard title='School Costs' columns={{ xs: 1, sm: 2, md: 4 }}>
				<ReviewMobileField label='Tuition' value={data.tuitionCost as string | number} />
				<ReviewMobileField label='Room & Board' value={data.roomAndBoardCost as string | number} />
				<ReviewMobileField label='Books' value={data.bookCost as string | number} />
				<ReviewMobileField label='Commuting' value={data.commutingCost as string | number} />
			</ReviewMobileCard>
			{otherExpenses.length > 0 ? (
				<ReviewMobileCard title='Other Expenses' columns={{ xs: 1, sm: 2, md: 2 }}>
					{otherExpenses.map((exp) => (
						<ReviewMobileField key={exp.title as string} label={exp.title as string} value={exp.amount as string | number} />
					))}
				</ReviewMobileCard>
			) : (
				<ReviewMobileEmpty message='No other expenses reported.' />
			)}
		</ReviewMobileStack>
	);
}

export function ReviewIncomesMobile({ data }: { data: FirestoreDoc }) {
	const otherIncomeSources = (data.otherIncomeSources as FirestoreDoc[] | undefined) ?? [];

	return (
		<ReviewMobileStack>
			<ReviewMobileCard title='Seasonal Earnings' columns={{ xs: 2, sm: 4, md: 4 }}>
				<ReviewMobileField label='Summer' value={data.summerEarnings as string | number} />
				<ReviewMobileField label='Fall' value={data.fallEarnings as string | number} />
				<ReviewMobileField label='Winter' value={data.winterEarnings as string | number} />
				<ReviewMobileField label='Spring' value={data.springEarnings as string | number} />
			</ReviewMobileCard>
			<ReviewMobileCard title='Applied to Education' columns={{ xs: 1, sm: 2, md: 4 }}>
				<ReviewMobileField label='Earnings Applied' value={data.earningsAppliedToEducation as string | number} />
				<ReviewMobileField label='Savings Applied' value={data.savingsAppliedToEducation as string | number} />
				<ReviewMobileField label='School Awards' value={data.collegeAward as string | number} />
				<ReviewMobileField label='Loans' value={data.loansAmount as string | number} />
			</ReviewMobileCard>
			{otherIncomeSources.length > 0 ? (
				<ReviewMobileCard title='Other Income Sources' columns={{ xs: 1, sm: 2, md: 2 }}>
					{otherIncomeSources.map((income) => (
						<ReviewMobileField key={income.title as string} label={income.title as string} value={income.amount as string | number} />
					))}
				</ReviewMobileCard>
			) : (
				<ReviewMobileEmpty message='No other income sources reported.' />
			)}
		</ReviewMobileStack>
	);
}

export function ReviewContributionsMobile({ data }: { data: FirestoreDoc }) {
	const siblingSchools = (data.siblingSchools as FirestoreDoc[] | undefined) ?? [];

	return (
		<ReviewMobileStack>
			<ReviewMobileCard title='Parent Income'>
				<ReviewMobileField label='Parent 1 Income' value={data.p1ExpectedAnnualIncome as string | number} />
				<ReviewMobileField label='Parent 2 Income' value={data.p2ExpectedAnnualIncome as string | number} />
				<ReviewMobileField label='Investment Income' value={data.parentInvestmentIncome as string | number} />
			</ReviewMobileCard>
			<ReviewMobileCard title='Household' columns={{ xs: 1, sm: 2, md: 2 }}>
				<ReviewMobileField label="Parent's Own Home?" value={data.parentsOwnOrRentHome as string} />
				<ReviewMobileField label="Parent's Married?" value={data.parentsMaritalStatus as string} />
			</ReviewMobileCard>
			{siblingSchools.length > 0 ? (
				<ReviewMobileCard title='Sibling Schools' columns={{ xs: 1, sm: 2, md: 2 }}>
					{siblingSchools.map((school) => (
						<ReviewMobileField key={school.title as string} label={school.title as string} value={school.cost as string | number} />
					))}
				</ReviewMobileCard>
			) : (
				<ReviewMobileEmpty message='No sibling school expenses reported.' />
			)}
			<ReviewMobileCard title='Extraordinary Circumstances & Expenses' columns={{ xs: 1, sm: 1, md: 1 }}>
				<Typography variant='body2' sx={{ wordBreak: 'break-word', gridColumn: '1 / -1' }}>
					{(data.anyExtraordinaryExpenses as string) || '—'}
				</Typography>
			</ReviewMobileCard>
		</ReviewMobileStack>
	);
}

export function ReviewProjectionsMobile({ data }: { data: FirestoreDoc }) {
	return (
		<ReviewMobileCard title='Financial Projections' columns={{ xs: 1, sm: 2, md: 4 }}>
			<ReviewMobileField label='Applicant Earnings' value={data.applicantEarnings as string | number} />
			<ReviewMobileField label='Applicant Savings' value={data.applicantSavings as string | number} />
			<ReviewMobileField label='Family Contributions' value={data.applicantFamily as string | number} />
			<ReviewMobileField label='Request from Fund' value={data.request as string | number} />
		</ReviewMobileCard>
	);
}

export function ReviewFamilySection({ data }: { data: FirestoreDoc }) {
	return <ReviewFamilyMobile data={data} />;
}

export function ReviewEducationSection({ data }: { data: FirestoreDoc }) {
	return <ReviewEducationMobile data={data} />;
}

export function ReviewExperienceSection({ data }: { data: FirestoreDoc }) {
	return <ReviewExperienceMobile data={data} />;
}

export function ReviewExpensesSection({ data }: { data: FirestoreDoc }) {
	return <ReviewExpensesMobile data={data} />;
}

export function ReviewIncomesSection({ data }: { data: FirestoreDoc }) {
	return <ReviewIncomesMobile data={data} />;
}

export function ReviewContributionsSection({ data }: { data: FirestoreDoc }) {
	return <ReviewContributionsMobile data={data} />;
}

export function ReviewProjectionsSection({ data }: { data: FirestoreDoc }) {
	return <ReviewProjectionsMobile data={data} />;
}

export function ReviewMobileAttachmentCard({ label, children }: { label: string; children: React.ReactNode }) {
	const panelSx = useReviewPanelSx();
	return (
		<Paper variant='outlined' sx={panelSx}>
			<Typography component='span' sx={homeApplicantDetailLabelSx}>
				{label}
			</Typography>
			<Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, width: '100%' }}>{children}</Box>
		</Paper>
	);
}
