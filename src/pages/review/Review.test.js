import React from 'react';
import { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Review from './Review';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useDialog } from '../../context/DialogContext';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { useParams } from 'react-router-dom';

import { getApplication, getCollectionData, saveFile, getDownloadLinkForFile, deleteFile, saveCollectionData, updateApplicationStatus } from '../../config/data/firebase';
import { sendRequest } from '../../config/content/push';

vi.mock('react-router-dom', () => ({
	useParams: jest.fn(),
	useNavigate: jest.fn(),
	Link: ({ children, to, ...props }) => (
		<a href={to} {...props}>
			{children}
		</a>
	),
}));

vi.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
vi.mock('../../context/AlertContext', () => ({ useAlert: jest.fn() }));
vi.mock('../../context/DialogContext', () => ({ useDialog: jest.fn() }));
vi.mock('../../context/ConfigContext', () => ({ useConfig: jest.fn() }));
vi.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
vi.mock('../../context/HelmetContext', () => ({ useTitle: jest.fn() }));

vi.mock('../../components/home/PublicPageLayout', () => ({
	default: ({ children }) => <div data-testid='public-page-layout'>{children}</div>,
}));
vi.mock('../../components/auth/AuthFormCard', () => ({
	default: ({ children, title, intro, headerActions }) => (
		<div data-testid='auth-form-card'>
			<div>{title}</div>
			{headerActions}
			{intro}
			{children}
		</div>
	),
}));
vi.mock('../../components/list/StatusCapsule', () => ({
	StatusCapsule: ({ status }) => <div data-testid='status-capsule'>{status}</div>,
}));
vi.mock('../../config/navigation/paths', () => ({
	paths: { apply: '/apply' },
}));
vi.mock('../../config/navigation/routeUtils', () => ({
	generatePath: (path) => path,
}));

vi.mock('../../config/data/firebase', () => ({
	getApplication: jest.fn(),
	getCollectionData: jest.fn(),
	saveFile: jest.fn(),
	getDownloadLinkForFile: jest.fn(),
	deleteFile: jest.fn(),
	invalidateRequest: jest.fn(),
	saveCollectionData: jest.fn(),
	updateApplicationStatus: jest.fn(),
}));

vi.mock('../../config/content/push', () => ({
	sendRequest: jest.fn(),
}));

vi.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

vi.mock('../../config/data/collections', () => ({
	UploadType: { applicationAttachment: 'app-attachments' },
	ApplicationStatus: { started: 'Started', completed: 'Completed', submitted: 'Submitted', incomplete: 'Incomplete' },
	ApplicationType: { scholarship: 'Scholarship', newApplication: 'New Application', returningGrant: 'Returning Grant' },
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
		requests: 'requests',
	},
}));

vi.mock('../../config/Constants', () => ({
	attachmentFields: [
		{ key: 'testDoc', label: 'Test Document', requiredBy: ['Test App'] },
		{ key: 'recLetter', label: 'Recommendation Letter', requiredBy: ['Test App'] },
	],
	LettersOfRecommendation: {
		recLetter: { name: 'Rec Letter', icon: 'Icon' },
	},
	generateSecurePin: jest.fn(() => 'secure-pin'),
	generate6DigitNumber: jest.fn(() => '123456'),
	generateUploadLink: jest.fn(() => 'http://upload.link'),
}));

vi.mock('../../components/loader/Loader', () => ({ default: () => <div data-testid='loader'>Loading...</div> }));
vi.mock('../../components/layout/NotFound', () => ({ default: () => <div data-testid='not-found'>Not Found</div> }));

vi.mock('../../components/review/ReviewMobileDetails', () => ({
	ReviewProfileMobile: ({ data }) => (
		<div data-testid='profile-mobile'>
			{data.applicantFirstName} {data.applicantLastName} — {data.applicantMailingAddress?.description}
		</div>
	),
	ReviewFamilySection: () => <div data-testid='section-family'>Family Details</div>,
	ReviewEducationSection: () => <div data-testid='section-education'>Education Details</div>,
	ReviewExperienceSection: () => <div data-testid='section-experience'>Experience Details</div>,
	ReviewExpensesSection: () => <div data-testid='section-expenses'>Expenses Details</div>,
	ReviewIncomesSection: () => <div data-testid='section-incomes'>Incomes Details</div>,
	ReviewContributionsSection: () => <div data-testid='section-contributions'>Contributions Details</div>,
	ReviewProjectionsSection: () => <div data-testid='section-projections'>Projections Details</div>,
	ReviewMobileAttachmentCard: ({ label, children }) => (
		<div data-testid={`attachment-card-${label}`}>
			<span>{label}</span>
			{children}
		</div>
	),
}));

vi.mock('../../components/visuallyHiddenInput/VisuallyHiddenInput', () => ({
	__esModule: true,
	VisuallyHiddenInput: (props) => {
		const React = require('react');
		return React.createElement('input', {
			type: 'file',
			'data-testid': `file-input-${props.name}`,
			name: props.name,
			onChange: props.onChange,
		});
	},
}));

describe('Review Component', () => {
	const mockShowAlert = jest.fn();
	const mockHandleError = jest.fn();
	const mockShowDialog = jest.fn();

	const mockUser = { uid: 'user-123' };
	const appID = 'app-123';

	const mockApplication = {
		id: appID,
		type: 'Test App',
		status: 'Started',
		window: '2025-12-31',
		submittedOn: '2025-01-01',
		completedBy: 'user-123',
		profile: 'prof-1',
		family: 'fam-1',
		education: 'edu-1',
		experience: 'xpr-1',
		expenses: 'exp-1',
		incomes: 'inc-1',
		contributions: 'cont-1',
		projections: 'proj-1',
		attachments: 'att-1',
	};

	const mockProfile = {
		applicantFirstName: 'John',
		applicantLastName: 'Doe',
		applicantDOB: '2000-01-01',
		applicantEmailAddress: 'john@example.com',
		applicantMailingAddress: { description: '123 Main St' },
	};

	const mockAttachments = {
		attachmentsID: 'att-1',
		testDoc: null,
		recLetter: null,
	};

	beforeEach(() => {
		jest.clearAllMocks();

		useParams.mockReturnValue({ id: appID });
		useAuth.mockReturnValue({ user: mockUser });
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
		useDialog.mockReturnValue({ showDialog: mockShowDialog });
		useConfig.mockReturnValue({ APPLICATION_DEADLINE: '2025-12-31' });
		useTheme.mockReturnValue({ darkMode: false });

		getApplication.mockResolvedValue(mockApplication);

		getCollectionData.mockImplementation((uid, collection, docId) => {
			if (collection === 'profiles') return Promise.resolve(mockProfile);
			if (collection === 'attachments') return Promise.resolve(mockAttachments);
			return Promise.resolve({});
		});

		saveFile.mockResolvedValue('file/path.pdf');
		getDownloadLinkForFile.mockResolvedValue('http://file.link');
		saveCollectionData.mockResolvedValue(true);
		updateApplicationStatus.mockResolvedValue(true);
	});

	test('renders loader initially', () => {
		getApplication.mockReturnValue(new Promise(() => {}));
		render(<Review />);
		expect(screen.getByTestId('loader')).toBeInTheDocument();
	});

	test('renders Not Found if application does not exist', async () => {
		getApplication.mockResolvedValue(null);
		render(<Review />);
		await screen.findByTestId('not-found');
	});

	test('renders application details successfully', async () => {
		render(<Review />);

		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		expect(screen.getByText(/Your Test App Application/i)).toBeInTheDocument();
		expect(screen.getByTestId('profile-mobile')).toHaveTextContent(/John/);
		expect(screen.getByTestId('profile-mobile')).toHaveTextContent(/123 Main St/);
		expect(screen.getByTestId('section-family')).toBeInTheDocument();
		expect(screen.getByTestId('section-education')).toBeInTheDocument();
		expect(screen.getAllByText('Test Document')[0]).toBeInTheDocument();
		expect(screen.getAllByText('Missing')[0]).toBeInTheDocument();
	});

	test('handles file upload successfully', async () => {
		render(<Review />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
		const input = screen.getByTestId('file-input-testDoc');

		fireEvent.change(input, { target: { files: [file] } });

		await waitFor(() => {
			expect(saveFile).toHaveBeenCalledWith('app-attachments', appID, 'testDoc', file);
			expect(saveCollectionData).toHaveBeenCalled();
			expect(updateApplicationStatus).not.toHaveBeenCalled();
			expect(mockShowAlert).toHaveBeenCalled();
		});
	});

	test('handles requesting a recommendation letter', async () => {
		render(<Review />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const requestBtns = screen.getAllByText('Request Letter');
		fireEvent.click(requestBtns[0]);

		expect(mockShowDialog).toHaveBeenCalled();

		const dialogCall = mockShowDialog.mock.calls[0][0];
		expect(dialogCall.data).toEqual(
			expect.objectContaining({
				attachmentType: 'recLetter',
			})
		);
		const mockRequestData = { name: 'Teacher', email: 'teach@school.com' };

		await act(async () => {
			await dialogCall.callback(mockRequestData);
		});

		await waitFor(() => {
			expect(saveCollectionData).toHaveBeenCalled();
			expect(sendRequest).toHaveBeenCalled();
			expect(mockShowAlert).toHaveBeenCalledWith('request', 'sent');
		});
	});

	test('handles simulate upload with demo PDF', async () => {
		render(<Review />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const simulateBtns = screen.getAllByText('Simulate upload');
		expect(simulateBtns.length).toBeGreaterThan(0);

		await act(async () => {
			fireEvent.click(simulateBtns[0]);
		});

		await waitFor(() => {
			expect(saveFile).toHaveBeenCalled();
		});

		const [, , key, file] = saveFile.mock.calls[0];
		expect(key).toBe('testDoc');
		expect(file).toBeInstanceOf(File);
		expect(file.name).toBe('testDoc.pdf');
		expect(file.type).toBe('application/pdf');
	});

	test('handles deleting an attachment', async () => {
		const attachmentWithFile = {
			...mockAttachments,
			testDoc: { displayName: 'my-file.pdf', home: 'http://link', refLoc: 'path/to/file' },
		};
		getCollectionData.mockImplementation((uid, coll) => {
			if (coll === 'attachments') return Promise.resolve(attachmentWithFile);
			if (coll === 'profiles') return Promise.resolve(mockProfile);
			return Promise.resolve({});
		});

		render(<Review />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const chips = screen.getAllByText('my-file.pdf');
		expect(chips.length).toBeGreaterThan(0);

		const chip = chips[0].closest('.MuiChip-root');
		const deleteIcon = chip.querySelector('.MuiChip-deleteIcon');

		fireEvent.click(deleteIcon);

		await waitFor(() => {
			expect(deleteFile).toHaveBeenCalledWith('path/to/file');
			expect(mockShowAlert).toHaveBeenCalledWith('upload', 'deleted');
		});
	});
});
