import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ApplicantOutlookPanel from './ApplicantOutlookPanel';

vi.mock('../../config/ui/tableConfig', () => ({
	UserLastLogin: ({ userId }) => <span>Last login for {userId}</span>,
}));

vi.mock('../../config/ui/adminPageStyles', () => ({
	dashboardEmbeddedTableSx: {},
	dashboardModuleSurfaceSx: {},
	dashboardSectionTitleSx: {},
}));

const renderPanel = (data, props = {}) =>
	render(
		<MemoryRouter>
			<ApplicantOutlookPanel data={data} {...props} />
		</MemoryRouter>,
	);

describe('ApplicantOutlookPanel', () => {
	it('renders populated and empty outlook sections', () => {
		const data = {
			cycleYear: 2026,
			sections: [
				{
					id: 'brandNewAccounts',
					title: 'Brand-new accounts',
					link: '/applicants',
					isComplete: true,
					applicants: [
						{
							applicantId: 'correct',
							name: 'Correct Applicant',
							gradYear: '2028',
							awardDisplay: 'No award',
							cycleStatus: 'correct',
						},
						{
							applicantId: 'wrong',
							name: 'Wrong Applicant',
							gradYear: null,
							awardDisplay: 'Grant',
							cycleStatus: 'wrong',
						},
						{
							applicantId: 'none',
							name: 'Unstarted Applicant',
							gradYear: null,
							awardDisplay: 'No award',
							cycleStatus: 'none',
						},
					],
				},
				{
					id: 'expectedNewApplications',
					title: 'Expected new applications',
					link: '/applications',
					isComplete: false,
					applicants: [],
				},
				{
					id: 'lostInTheWeeds',
					title: 'Lost in the weeds',
					link: '/lost',
					isComplete: false,
					applicants: [],
				},
				{
					id: 'expectedReturningGrants',
					title: 'Expected returning grants',
					link: '/grants',
					isComplete: true,
					applicants: [
						{
							applicantId: 'grant',
							name: 'Grant Applicant',
							gradYear: '2027',
							awardDisplay: 'Returning grant',
							cycleStatus: 'correct',
						},
					],
				},
				{
					id: 'expectedReturningScholarships',
					title: 'Expected returning scholarships',
					link: '/scholarships',
					isComplete: false,
					applicants: [],
				},
			],
		};

		renderPanel(data, { variant: 'dashboard' });

		expect(screen.getByText('APPLICANT OUTLOOK (2026)')).toBeInTheDocument();
		expect(screen.getByText('Correct Applicant')).toBeInTheDocument();
		expect(screen.getByText('Class of 2028')).toBeInTheDocument();
		expect(screen.getAllByText('Unknown')).toHaveLength(2);
		expect(screen.getAllByLabelText('Correct application type started')).toHaveLength(2);
		expect(screen.getByLabelText('Wrong application type started')).toBeInTheDocument();
		expect(screen.getByText('Last login for correct')).toBeInTheDocument();
		expect(screen.getByText('No expected new applicant applications this cycle.')).toBeInTheDocument();
		expect(screen.getByText('No dormant accounts lost in the weeds.')).toBeInTheDocument();
		expect(screen.getByText('No prior scholarship awardees expected this cycle.')).toBeInTheDocument();

		fireEvent.click(screen.getAllByText('View list')[0]);
		expect(screen.getAllByRole('link', { name: /View list/i })).not.toHaveLength(0);
	});

	it('uses the empty outlook when data is absent', () => {
		renderPanel(null);

		expect(screen.getByText(new RegExp(`APPLICANT OUTLOOK \\(${new Date().getFullYear()}\\)`))).toBeInTheDocument();
		expect(screen.queryByText('View list')).not.toBeInTheDocument();
	});
});
