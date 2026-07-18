import React from 'react';
import { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { useDialog } from '../../context/DialogContext';
import { useTitle } from '../../context/HelmetContext';
import { deleteApplication, getRealTimeApplicationsByIDs, removeApplicationFromApplicant } from '../../config/data/firebase';
import { ApplicationStatus } from '../../config/data/collections';
import { getApplyContent } from '../../config/content';
import Apply from './Apply';

vi.mock('../../components/loader/Loader', () => ({ default: () => <div data-testid='loader' /> }));
vi.mock('../../components/home/PublicPageLayout', () => ({
	default: ({ children }) => <div data-testid='public-page-layout'>{children}</div>,
}));
vi.mock('../../components/auth/AuthFormCard', () => ({
	default: ({ children, title, intro }) => (
		<div data-testid='auth-form-card'>
			<div>{title}</div>
			{intro}
			{children}
		</div>
	),
}));
vi.mock('../../components/interviews/RSVPStatusCard', () => ({ default: () => <div data-testid='rsvp-card' /> }));
vi.mock('../../components/timer/WindowInfo', () => ({ default: () => <div data-testid='window-info' /> }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		useNavigate: () => mockNavigate,
		Link: React.forwardRef(({ children, to, ...props }, ref) => (
			<a href={to} {...props} ref={ref}>
				{children}
			</a>
		)),
	};
});

vi.mock('../../context/AuthContext');
vi.mock('../../context/ConfigContext');
vi.mock('../../context/ThemeContext');
vi.mock('../../context/AlertContext');
vi.mock('../../context/DialogContext');
vi.mock('../../context/HelmetContext');

vi.mock('../../config/data/firebase', () => ({
	getRealTimeApplicationsByIDs: vi.fn(() => () => {}),
	getCollectionData: vi.fn(() => Promise.resolve(null)),
	deleteApplication: vi.fn(() => Promise.resolve()),
	removeApplicationFromApplicant: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../config/content', () => ({
	getApplyContent: vi.fn(),
}));
vi.mock('../../config/ui/applicationConfig', () => ({
	applicationConfigurations: {
		scholarship: { type: 'Scholarship' },
		grant: { type: 'Grant' },
	},
}));

vi.mock('../../config/navigation/paths', () => ({
	__esModule: true,
	paths: {
		applyScholarship: '/apply/scholarship',
		applyGrant: '/apply/grant',
		updateApplication: '/apply/:applicationType/:applicationID',
		reviewApp: '/review/:id',
		createApplication: '/apply/create/:applicationType',
	},
}));

const mockUser = { uid: 'test-user-id' };
const mockApplicant = {
	applications: ['app-1-id', 'app-2-id', 'app-3-id'],
};
const mockApplicantNoApps = { applications: [] };

const mockApplications = [
	{ id: 'app-1-id', type: 'Scholarship', status: ApplicationStatus.started, submittedOn: '2023-01-15T12:00:00Z' },
	{ id: 'app-2-id', type: 'Grant', status: ApplicationStatus.submitted, submittedOn: '2023-01-20T12:00:00Z' },
	{ id: 'app-3-id', type: 'Scholarship', status: ApplicationStatus.awarded, submittedOn: '2022-02-10T12:00:00Z' },
];

const mockConfig = {
	APPLICANT_MESSAGE: 'Test Announcement',
};
const mockConfigNoMessage = {
	APPLICANT_MESSAGE: '',
};

const mockContent = {
	title: 'Dashboard',
	intro: {
		overview: 'Subtitle paragraph 1.',
		preparation: 'Prepare your documents.',
		applicationPaths: ['Select New Applicants if you are new.'],
		eligibility: 'Funding limits apply.',
		help: 'Email us for help.',
	},
	availableApps: [
		{ type: 'scholarship', path: '/apply/scholarship', label: 'Scholarship Application', description: 'First-time applicants.', disabled: false },
		{ type: 'grant', path: '/apply/grant', label: 'Grant Application', description: 'Returning applicants.', disabled: true },
	],
};

const mockShowDialog = vi.fn();

const setupMocks = ({ user, applicant, config, applications = [] }) => {
	mockNavigate.mockClear();
	getRealTimeApplicationsByIDs.mockClear().mockImplementation((ids, setApplications) => {
		setApplications(applications);
		return () => {};
	});
	deleteApplication.mockClear();
	removeApplicationFromApplicant.mockClear();
	mockShowDialog.mockClear();

	useAuth.mockReturnValue({ user, applicant });
	useConfig.mockReturnValue(config);
	useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none', primaryColor: 'green' });
	useAlert.mockReturnValue({
		showAlert: vi.fn(),
		showAnnouncement: vi.fn((props) => (props.message ? <div>{props.message}</div> : null)),
	});
	useDialog.mockReturnValue({
		showDialog: mockShowDialog,
	});
	useTitle.mockReturnValue({ setTitle: vi.fn() });
	getApplyContent.mockReturnValue(mockContent);
};

describe('src/pages/apply/Apply.tsx', () => {
	it('renders loader when no user is present', async () => {
		setupMocks({ user: null, applicant: null, config: mockConfigNoMessage });
		await act(async () => {
			render(<Apply />);
		});
		expect(screen.getByTestId('loader')).toBeInTheDocument();
		expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
	});

	it('renders page content, available apps, and no "Your Applications" when user has no applications', async () => {
		setupMocks({ user: mockUser, applicant: mockApplicantNoApps, config: mockConfigNoMessage });
		await act(async () => {
			render(<Apply />);
		});

		expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
		expect(screen.getByTestId('public-page-layout')).toBeInTheDocument();
		expect(screen.getByTestId('auth-form-card')).toBeInTheDocument();
		expect(screen.getByText('Dashboard')).toBeInTheDocument();
		expect(screen.getByText('Subtitle paragraph 1.')).toBeInTheDocument();
		expect(screen.getByTestId('rsvp-card')).toBeInTheDocument();
		expect(screen.queryByText('Your Applications')).not.toBeInTheDocument();
		expect(screen.getByText('Available Applications')).toBeInTheDocument();
		expect(screen.getByText('Scholarship Application')).toBeInTheDocument();
		expect(screen.getByText('Grant Application')).toBeInTheDocument();
		expect(screen.getByText('First-time applicants.')).toBeInTheDocument();
		expect(screen.getByText('Scholarship Application').closest('a')).toHaveAttribute('href', '/apply/scholarship');
		expect(screen.getByText('Grant Application').closest('[aria-disabled="true"]')).toBeInTheDocument();
		expect(screen.getByText('Not open right now')).toBeInTheDocument();
	});

	it('renders an announcement if configured', async () => {
		setupMocks({ user: mockUser, applicant: mockApplicantNoApps, config: mockConfig });
		const { showAnnouncement } = useAlert();
		await act(async () => {
			render(<Apply />);
		});

		expect(showAnnouncement).toHaveBeenCalledWith({ message: mockConfig.APPLICANT_MESSAGE });
		expect(screen.getByText(mockConfig.APPLICANT_MESSAGE)).toBeInTheDocument();
	});

	it('fetches and renders existing applications', async () => {
		setupMocks({ user: mockUser, applicant: mockApplicant, config: mockConfig, applications: mockApplications });
		await act(async () => {
			render(<Apply />);
		});

		expect(getRealTimeApplicationsByIDs).toHaveBeenCalledWith(mockApplicant.applications, expect.any(Function));
		expect(screen.getByText('Your Applications')).toBeInTheDocument();
		expect(screen.getByText('Scholarship (2023)')).toBeInTheDocument();
		expect(screen.getByText(ApplicationStatus.started)).toBeInTheDocument();
		expect(screen.getByText('Grant (2023)')).toBeInTheDocument();
		expect(screen.getByText(ApplicationStatus.submitted)).toBeInTheDocument();
		expect(screen.getByText('Scholarship (2022)')).toBeInTheDocument();
		expect(screen.getByText(ApplicationStatus.awarded)).toBeInTheDocument();
	});

	it('navigates to "updateApplication" when clicking a "Started" application', async () => {
		setupMocks({ user: mockUser, applicant: mockApplicant, config: mockConfig, applications: mockApplications });
		await act(async () => {
			render(<Apply />);
		});

		const startedAppCard = screen.getByText('Scholarship (2023)').closest('.MuiPaper-root');
		await act(async () => {
			fireEvent.click(startedAppCard);
		});

		const expectedPath = `/apply/scholarship/${mockApplications[0].id}`;
		expect(mockNavigate).toHaveBeenCalledWith(expectedPath, { replace: true });
	});

	it('navigates to "reviewApp" when clicking a "Submitted" application', async () => {
		setupMocks({ user: mockUser, applicant: mockApplicant, config: mockConfig, applications: mockApplications });
		await act(async () => {
			render(<Apply />);
		});

		const submittedAppCard = screen.getByText('Grant (2023)').closest('.MuiPaper-root');
		await act(async () => {
			fireEvent.click(submittedAppCard);
		});

		const expectedPath = `/review/${mockApplications[1].id}`;
		expect(mockNavigate).toHaveBeenCalledWith(expectedPath, { replace: true });
	});

	it('navigates to "reviewApp" when clicking a non-started application', async () => {
		setupMocks({ user: mockUser, applicant: mockApplicant, config: mockConfig, applications: mockApplications });
		await act(async () => {
			render(<Apply />);
		});

		const awardedAppCard = screen.getByText('Scholarship (2022)').closest('.MuiPaper-root');
		await act(async () => {
			fireEvent.click(awardedAppCard);
		});

		const expectedPath = `/review/${mockApplications[2].id}`;
		expect(mockNavigate).toHaveBeenCalledWith(expectedPath, { replace: true });
	});

	it('prompts before deleting an application', async () => {
		setupMocks({ user: mockUser, applicant: mockApplicant, config: mockConfig, applications: mockApplications });
		const { showDialog } = useDialog();

		await act(async () => {
			render(<Apply />);
		});

		const deleteIcons = screen.getAllByTestId('DeleteOutlinedIcon');
		await act(async () => {
			fireEvent.click(deleteIcons[0]);
		});

		expect(showDialog).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'confirmAction',
				messageOverride: expect.stringContaining('Delete your Scholarship application'),
			}),
		);
		expect(deleteApplication).not.toHaveBeenCalled();
	});

	it('deletes an application after confirmation', async () => {
		setupMocks({ user: mockUser, applicant: mockApplicant, config: mockConfig, applications: mockApplications });
		const { showAlert } = useAlert();
		mockShowDialog.mockImplementation(({ callback }) => {
			callback(true);
		});

		await act(async () => {
			render(<Apply />);
		});

		const deleteIcons = screen.getAllByTestId('DeleteOutlinedIcon');
		await act(async () => {
			fireEvent.click(deleteIcons[0]);
		});

		expect(mockNavigate).not.toHaveBeenCalled();
		expect(deleteApplication).toHaveBeenCalledWith(mockApplications[0]);
		expect(removeApplicationFromApplicant).toHaveBeenCalledWith(mockUser.uid, mockApplications[0].id);
		expect(showAlert).toHaveBeenCalledWith('application', 'deleted');
	});
});
