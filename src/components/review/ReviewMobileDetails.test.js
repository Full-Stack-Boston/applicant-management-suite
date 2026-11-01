import React from 'react';
import { render, screen } from '@testing-library/react';
import { useTheme } from '../../context/ThemeContext';
import {
	ReviewResponsiveDetails,
	ReviewMobileField,
	ReviewProfileMobile,
	ReviewFamilyMobile,
	ReviewEducationMobile,
	ReviewExperienceMobile,
	ReviewExpensesMobile,
	ReviewIncomesMobile,
	ReviewContributionsMobile,
	ReviewProjectionsMobile,
	ReviewFamilySection,
	ReviewEducationSection,
	ReviewExperienceSection,
	ReviewExpensesSection,
	ReviewIncomesSection,
	ReviewContributionsSection,
	ReviewProjectionsSection,
	ReviewMobileAttachmentCard,
} from './ReviewMobileDetails';

vi.mock('../../context/ThemeContext', () => ({
	useTheme: vi.fn(),
}));

vi.mock('../home/homePageStyles', () => ({
	homeApplicantDetailLabelSx: {},
	homeReviewDetailFieldFullSx: {},
	homeReviewDetailRowsSx: {},
	homeReviewDetailRowSx: {},
	homeReviewSectionPanelSx: () => ({}),
}));

const rich = {
	applicantFirstName: 'Ada',
	applicantMiddleInitial: 'A',
	applicantLastName: 'Lovelace',
	applicantDOB: '2000-01-15',
	applicantEmailAddress: 'ada@example.com',
	applicantHomePhone: '555-0101',
	applicantCellPhone: '555-0102',
	applicantMailingAddress: { description: '1 Main Street' },
	familyMembers: [{ relation: 'Parent', fullName: 'Ann Lovelace', occupation: 'Engineer', age: 42 }],
	schoolName: 'University',
	major: 'Mathematics',
	expectedGraduationDate: '2028-05-01',
	currentGPA: 4,
	previousSchools: ['Somerville High'],
	positions: [{ type: 'Current', organization: 'Ada Labs', role: 'Developer', location: 'London' }],
	tuitionCost: 1000,
	roomAndBoardCost: 2000,
	bookCost: 300,
	commutingCost: 400,
	otherExpenses: [{ title: 'Travel', amount: 500 }],
	summerEarnings: 600,
	fallEarnings: 700,
	winterEarnings: 800,
	springEarnings: 900,
	earningsAppliedToEducation: 100,
	savingsAppliedToEducation: 200,
	collegeAward: 300,
	loansAmount: 400,
	otherIncomeSources: [{ title: 'Tutoring', amount: 500 }],
	p1ExpectedAnnualIncome: 60000,
	p2ExpectedAnnualIncome: 70000,
	parentInvestmentIncome: 8000,
	parentsOwnOrRentHome: 'Own',
	parentsMaritalStatus: 'Married',
	siblingSchools: [{ title: 'State College', cost: 9000 }],
	anyExtraordinaryExpenses: 'Medical expense',
	applicantEarnings: 1000,
	applicantSavings: 2000,
	applicantFamily: 3000,
	request: 4000,
};

const empty = {
	...rich,
	applicantDOB: 'not-a-date',
	applicantMailingAddress: undefined,
	familyMembers: [],
	previousSchools: [],
	positions: [],
	otherExpenses: [],
	otherIncomeSources: [],
	siblingSchools: [],
	anyExtraordinaryExpenses: '',
};

describe('ReviewMobileDetails', () => {
	beforeEach(() => {
		useTheme.mockReturnValue({ darkMode: false });
	});

	it('renders all populated review sections and empty states', () => {
		render(
			<>
				<ReviewResponsiveDetails desktop={<span>Desktop</span>} mobile={<span>Mobile</span>} />
				<ReviewMobileField label='Blank' value='' fullWidth />
				<ReviewProfileMobile data={rich} />
				<ReviewProfileMobile data={empty} />
				<ReviewFamilyMobile data={rich} />
				<ReviewEducationMobile data={rich} />
				<ReviewExperienceMobile data={rich} />
				<ReviewExpensesMobile data={rich} />
				<ReviewIncomesMobile data={rich} />
				<ReviewContributionsMobile data={rich} />
				<ReviewProjectionsMobile data={rich} />
				<ReviewFamilySection data={empty} />
				<ReviewEducationSection data={empty} />
				<ReviewExperienceSection data={empty} />
				<ReviewExpensesSection data={empty} />
				<ReviewIncomesSection data={empty} />
				<ReviewContributionsSection data={empty} />
				<ReviewProjectionsSection data={empty} />
				<ReviewMobileAttachmentCard label='Transcript'>
					<span>Attachment action</span>
				</ReviewMobileAttachmentCard>
			</>,
		);

		expect(screen.getByText('Mobile')).toBeInTheDocument();
		expect(screen.getAllByText('—').length).toBeGreaterThan(0);
		expect(screen.getAllByText('Ada A Lovelace')).toHaveLength(2);
		expect(screen.getByText('Ann Lovelace')).toBeInTheDocument();
		expect(screen.getByText('Somerville High')).toBeInTheDocument();
		expect(screen.getByText('Ada Labs')).toBeInTheDocument();
		expect(screen.getByText('Travel')).toBeInTheDocument();
		expect(screen.getByText('Tutoring')).toBeInTheDocument();
		expect(screen.getByText('State College')).toBeInTheDocument();
		expect(screen.getByText('Medical expense')).toBeInTheDocument();
		expect(screen.getByText('Attachment action')).toBeInTheDocument();
		expect(screen.getByText('No family reported.')).toBeInTheDocument();
		expect(screen.getByText('No previous education reported.')).toBeInTheDocument();
		expect(screen.getByText('No experience reported.')).toBeInTheDocument();
		expect(screen.getByText('No other expenses reported.')).toBeInTheDocument();
		expect(screen.getByText('No other income sources reported.')).toBeInTheDocument();
		expect(screen.getByText('No sibling school expenses reported.')).toBeInTheDocument();
	});
});
