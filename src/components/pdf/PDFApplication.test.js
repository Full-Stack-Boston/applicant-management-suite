import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PDFApplication } from './PDFApplication';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { getApplication, getAwardsData, getCollectionData } from '../../config/data/firebase';
import { getBlob, ref } from 'firebase/storage';
import { convertPDFBlobToImages } from '../../config/Constants';

const mocks = vi.hoisted(() => ({
	navigate: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
	useAuth: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
	useNavigate: vi.fn(),
	useParams: vi.fn(),
}));

vi.mock('../../config/data/firebase', () => ({
	getApplication: vi.fn(),
	getAwardsData: vi.fn(),
	getCollectionData: vi.fn(),
	storage: {},
}));

vi.mock('firebase/storage', () => ({
	getBlob: vi.fn(),
	ref: vi.fn(),
}));

vi.mock('../../config/Constants', () => ({
	brand: { organizationShortName: 'AMS' },
	convertPDFBlobToImages: vi.fn(),
}));

vi.mock('../../config/navigation/paths', () => ({
	paths: { login: '/login' },
}));

vi.mock('../../config/navigation/routeUtils', () => ({
	generatePath: (path) => path,
}));

vi.mock('../../config/data/collections', () => ({
	ApplicationStatus: { started: 'Started' },
	ApplicationType: { newApplication: 'New Applicant' },
	collections: {
		profiles: 'profiles',
		families: 'families',
		education: 'education',
		experience: 'experience',
		expenses: 'expenses',
		incomes: 'incomes',
		contributions: 'contributions',
		projections: 'projections',
		attachments: 'attachments',
		applicants: 'applicants',
		awards: 'awards',
	},
}));

vi.mock('../loader/Loader', () => ({
	default: () => <div data-testid='pdf-loader'>Loading PDF</div>,
}));

vi.mock('../layout/NotFound', () => ({
	default: () => <div>Application not found</div>,
}));

vi.mock('./PDFPreview', () => ({
	default: ({ displayName, pages }) => <div data-testid='pdf-preview'>{displayName} ({pages.length} pages)</div>,
}));

const application = {
	id: 'app-1',
	status: 'Submitted',
	completedBy: 'user-1',
	profile: 'profile-1',
	family: 'family-1',
	education: 'education-1',
	experience: 'experience-1',
	expenses: 'expenses-1',
	incomes: 'incomes-1',
	contributions: 'contributions-1',
	projections: 'projections-1',
	attachments: 'attachments-1',
	awards: ['award-1'],
};

const records = {
	profiles: {
		applicantFirstName: 'Ada',
		applicantMiddleInitial: 'A',
		applicantLastName: 'Lovelace',
		applicantDOB: '2000-01-15',
		applicantMailingAddress: { description: '1 Analytical Engine Way' },
		applicantCellPhone: '555-0100',
		applicantEmailAddress: 'ada@example.com',
	},
	families: {
		familyMembers: [{ fullName: 'Ann Lovelace', occupation: 'Engineer', age: 42, relation: 'Parent' }],
	},
	education: {
		schoolName: 'University',
		major: 'Mathematics',
		expectedGraduationDate: '2028-05-01',
		currentGPA: '4.0',
		previousSchools: ['Somerville High', { school: 'Cambridge Academy' }],
	},
	experience: {
		currentOrganization: '0',
		positions: [
			{ type: 'Current', organization: 'Analytical Engines', location: 'London', role: 'Developer' },
			{ type: 'Past', organization: 'Ada Labs', location: 'London', role: 'Researcher' },
		],
	},
	expenses: {
		tuitionCost: 12000,
		roomAndBoardCost: '13,000',
		bookCost: '$500',
		commutingCost: '',
		otherExpenses: [{ title: 'Travel', amount: 250 }],
	},
	incomes: {
		summerEarnings: 1000,
		fallEarnings: 2000,
		winterEarnings: '$3,000',
		springEarnings: 'not a number',
		earningsAppliedToEducation: 400,
		savingsAppliedToEducation: 500,
		collegeAward: 600,
		loansAmount: 700,
		otherIncomeSources: [{ title: 'Tutoring', amount: 800 }],
	},
	contributions: {
		p1ExpectedAnnualIncome: 50000,
		p2ExpectedAnnualIncome: 60000,
		parentInvestmentIncome: 7000,
		parentsOwnOrRentHome: 'Own',
		parentsMaritalStatus: 'Married',
		siblingSchools: [{ title: 'State College', cost: 9000 }],
		anyExtraordinaryExpenses: 'Unexpected medical costs',
	},
	projections: {
		applicantEarnings: 1000,
		applicantSavings: 2000,
		applicantFamily: 3000,
		request: 4000,
	},
	applicants: {
		firstName: 'Ada',
		lastName: 'Lovelace',
		callMe: 'Ada',
		email: 'ada@example.com',
		cell: '555-0100',
		school: 'University',
		gradYear: 2028,
		major: 'Mathematics',
		organization: 'Ada Labs',
	},
};

describe('PDFApplication', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useAuth.mockReturnValue({ user: { uid: 'member-1' } });
		useNavigate.mockReturnValue(mocks.navigate);
		useParams.mockReturnValue({ id: 'app-1' });
		getApplication.mockResolvedValue(application);
		getCollectionData.mockImplementation((_userId, collectionName) => Promise.resolve(records[collectionName]));
		getAwardsData.mockResolvedValue([{ awardID: 'award-1', type: 'Grant', awardAmount: 1500, deadline: '2026-12-31' }]);
		ref.mockImplementation((_storage, path) => ({ path }));
		getBlob.mockImplementation(({ path }) => {
			if (path === 'bad-file') return Promise.reject(new Error('broken attachment'));
			return Promise.resolve(new Blob(['file']));
		});
		convertPDFBlobToImages.mockResolvedValue(['pdf-page']);
		globalThis.URL.createObjectURL = vi.fn(() => 'image-page');
		globalThis.print = vi.fn();
	});

	it('loads and renders the complete application packet', async () => {
		getCollectionData.mockImplementation((_userId, collectionName) => {
			if (collectionName === 'attachments') {
				return Promise.resolve({
					essay: { displayName: 'essay.pdf', refLoc: 'essay-file' },
					photo: { displayName: 'photo.png', refLoc: 'photo-file' },
					broken: { displayName: 'broken.pdf', refLoc: 'bad-file' },
				});
			}
			return Promise.resolve(records[collectionName]);
		});

		await act(async () => {
			render(<PDFApplication />);
		});

		expect(await screen.findByText('Applicant Information')).toBeInTheDocument();
		expect(screen.getByText('AMS Application')).toBeInTheDocument();
		expect(screen.getByText(/Name:\s*Ada\s+Lovelace/)).toBeInTheDocument();
		expect(screen.getByText('Ann Lovelace')).toBeInTheDocument();
		expect(screen.getByText('Somerville High')).toBeInTheDocument();
		expect(screen.getByText('Cambridge Academy')).toBeInTheDocument();
		expect(screen.getByText('Current - Analytical Engines')).toBeInTheDocument();
		expect(screen.getByText('Tutoring')).toBeInTheDocument();
		expect(screen.getByText('Travel')).toBeInTheDocument();
		expect(screen.getByText('Unexpected medical costs')).toBeInTheDocument();
		expect(screen.getByText('essay.pdf (1 pages)')).toBeInTheDocument();
		expect(screen.getByText('photo.png (1 pages)')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: /Print \/ Save as PDF/i }));
		fireEvent.click(screen.getByRole('button', { name: '← Back' }));
		expect(globalThis.print).toHaveBeenCalled();
		expect(mocks.navigate).toHaveBeenCalledWith(-1);
	});

	it('handles missing ids, missing applications, and unauthenticated users', async () => {
		useParams.mockReturnValueOnce({}).mockReturnValueOnce({ id: 'missing' });
		const { unmount } = render(<PDFApplication />);
		expect(await screen.findByText('Application not found')).toBeInTheDocument();
		unmount();

		getApplication.mockResolvedValueOnce(null);
		render(<PDFApplication />);
		expect(await screen.findByText('Application not found')).toBeInTheDocument();
		expect(getApplication).toHaveBeenCalledWith('missing', 'missing');

		useAuth.mockReturnValue({ user: null });
		useParams.mockReturnValue({});
		render(<PDFApplication />);
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/login'));
	});

	it('decrements age when birthday has not occurred yet this year', async () => {
		vi.useFakeTimers({ now: new Date('2026-06-15T15:00:00.000Z') });
		getCollectionData.mockImplementation((_userId, collectionName) => {
			if (collectionName === 'profiles') {
				// Birthday later in the year → calculateAge subtracts one.
				return Promise.resolve({ ...records.profiles, applicantDOB: '2000-09-01' });
			}
			return Promise.resolve(records[collectionName]);
		});

		await act(async () => {
			render(<PDFApplication />);
		});

		expect(await screen.findByText(/\(25 years old\)/)).toBeInTheDocument();
		vi.useRealTimers();
	});

	it('skips awards fetch when awards are empty and surfaces fetch errors', async () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		getApplication.mockResolvedValueOnce({ ...application, awards: [] });

		const { unmount } = render(<PDFApplication />);
		expect(await screen.findByText('Applicant Information')).toBeInTheDocument();
		expect(getAwardsData).not.toHaveBeenCalled();
		expect(screen.queryByText('Award History')).not.toBeInTheDocument();
		unmount();

		getApplication.mockRejectedValueOnce(new Error('pdf-load-failed'));
		render(<PDFApplication />);
		await waitFor(() => expect(errorSpy).toHaveBeenCalled());
		errorSpy.mockRestore();
	});
});
