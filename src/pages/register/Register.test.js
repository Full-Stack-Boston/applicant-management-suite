import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Register from './Register';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useNavigate } from 'react-router-dom';
import { registerUser, saveApplicantData, findApplicantAccountsByEmail, saveFile, getDownloadLinkForFile } from '../../config/data/firebase';
import { pushNotice } from '../../config/content/push';

// 1. MOCK DEPENDENCIES
vi.mock('react-router-dom', () => ({
	useNavigate: jest.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: () => ({ boxShadow: 'mock-shadow' }),
}));

vi.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

vi.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

const mockUseConfig = jest.fn(() => ({ MEMBER_ONBOARDING_PAGE_ENABLED: false }));
vi.mock('../../context/ConfigContext', () => ({
	useConfig: () => mockUseConfig(),
}));

vi.mock('../../config/data/firebase', () => ({
	registerUser: jest.fn(),
	saveApplicantData: jest.fn(),
	findApplicantAccountsByEmail: jest.fn(() => Promise.resolve([])),
	saveFile: jest.fn(),
	getDownloadLinkForFile: jest.fn(),
}));

vi.mock('uuid', () => ({
	v4: () => 'mock-uuid',
}));

vi.mock('../../components/visuallyHiddenInput/VisuallyHiddenInput', () => ({
	VisuallyHiddenInput: (props) => <input data-testid='profile-upload' {...props} />,
}));

vi.mock('firebase/firestore', () => ({
	serverTimestamp: () => 'SERVER_TS',
}));

vi.mock('../../config/navigation/paths', () => ({
	paths: { redirect: '/redirect', login: '/login' },
}));

vi.mock('../../config/navigation/routeUtils', () => ({
	generatePath: jest.fn((path) => path),
}));

vi.mock('../../config/content/push', () => ({
	pushNotice: jest.fn(),
	ContactTemplate: { welcome: 'welcome-template' },
}));

vi.mock('../../components/loader/Loader', () => ({ default: () => <div data-testid='loader'>Loading...</div> }));
vi.mock('../../components/footer/CopyrightFooter', () => ({ default: () => <div>Copyright</div> }));
vi.mock('../../components/home/PublicPageLayout', () => ({
	default: ({ children }) => <div data-testid='public-page-layout'>{children}</div>,
}));
vi.mock('../../components/auth/AuthFormCard', () => ({
	default: ({ children, title }) => (
		<div data-testid='auth-form-card'>
			{title}
			{children}
		</div>
	),
}));
vi.mock('../../components/home/homePageStyles', () => ({
	homeAuthSubmitButtonSx: () => ({}),
	homeAuthSecondaryButtonSx: {},
	homeAuthActionRowSx: {},
	homeAuthProfileUploadRowSx: {},
}));

// 2. MOCK CONTENT CONFIG
vi.mock('../../config/content/content', () => ({
	applicantRegistrationContent: {
		title: 'Mock Sign Up',
		icon: 'Icon',
		fields: [
			{ name: 'firstName', label: 'First Name', component: 'TextField', required: true },
			{ name: 'lastName', label: 'Last Name', component: 'TextField', required: true },
			{ name: 'callMe', label: 'Nickname', component: 'TextField', required: true },
			{ name: 'email', label: 'Email', component: 'TextField', required: true },
			{ name: 'password', label: 'Password', component: 'TextField', type: 'password' },
			{ name: 'confirmPassword', label: 'Confirm Password', component: 'TextField', type: 'password' },
			{ name: 'picture', label: 'Picture', component: 'ProfilePictureUpload' },
			{ name: 'unknown', label: 'Unknown', component: 'MysteryWidget' },
		],
		buttons: [
			{ id: 'submit', label: 'Sign Up', type: 'submit', variant: 'contained' },
			{ id: 'cancel', label: 'Cancel', type: 'button', variant: 'outlined', navigationPath: '/login' },
		],
		links: [{ id: 'login', label: 'Login', navigationPath: '/login' }],
	},
	homePageContent: {
		demoBoardAccess: { registerLinkLabel: 'Board Access', path: '/register/member' },
	},
}));

describe('Register Component', () => {
	const mockNavigate = jest.fn();
	const mockShowAlert = jest.fn();
	const mockHandleError = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		useNavigate.mockReturnValue(mockNavigate);
		useAuth.mockReturnValue({ loading: false });
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
		mockUseConfig.mockReturnValue({ MEMBER_ONBOARDING_PAGE_ENABLED: false });
		findApplicantAccountsByEmail.mockResolvedValue([]);
	});

	const fillRequiredFields = () => {
		fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
		fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
		fireEvent.change(screen.getByLabelText(/Nickname/i), { target: { value: 'Johnny' } });
		fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });
		fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'password123' } });
		fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'password123' } });
	};

	test('renders loader when auth is loading', () => {
		useAuth.mockReturnValue({ loading: true });
		render(<Register />);
		expect(screen.getByTestId('loader')).toBeInTheDocument();
	});

	test('renders form fields based on config', () => {
		render(<Register />);
		expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Sign Up/i })).toBeInTheDocument();
	});

	test('shows alert if passwords do not match', async () => {
		render(<Register />);

		fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: '123456' } });
		fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: '654321' } });
		fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

		expect(mockShowAlert).toHaveBeenCalledWith('register', 'notmatching');
		expect(registerUser).not.toHaveBeenCalled();
	});

	test('shows warning if required fields are missing', async () => {
		render(<Register />);

		// Passwords match, but names missing
		fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: '123456' } });
		fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: '123456' } });
		fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

		expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
	});

	test('successfully registers user', async () => {
		registerUser.mockResolvedValue({ user: { uid: 'test-uid' } });
		saveApplicantData.mockResolvedValue(true);

		render(<Register />);

		fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
		fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
		fireEvent.change(screen.getByLabelText(/Nickname/i), { target: { value: 'Johnny' } });
		fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });
		fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'password123' } });
		fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'password123' } });

		fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

		await waitFor(() => {
			expect(registerUser).toHaveBeenCalledWith('john@example.com', 'password123');
		});

		await waitFor(() => {
			expect(saveApplicantData).toHaveBeenCalledWith(
				'test-uid',
				expect.objectContaining({
					firstName: 'John',
					lastName: 'Doe',
					email: 'john@example.com',
				})
			);
		});

		await waitFor(() => {
			expect(pushNotice).toHaveBeenCalled();
			expect(mockShowAlert).toHaveBeenCalledWith('register', 'success');
			expect(mockNavigate).toHaveBeenCalledWith('/redirect', { replace: true });
		});
	});

	test('handles registration errors via handleError', async () => {
		const error = new Error('Firebase Error');
		registerUser.mockRejectedValue(error);

		render(<Register />);
		fillRequiredFields();
		fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalledWith(error, 'register-handleSubmit', true);
		});
	});

	test('blocks registration when email already exists', async () => {
		findApplicantAccountsByEmail.mockResolvedValue([{ id: 'existing' }]);
		render(<Register />);
		fillRequiredFields();
		fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));
		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
		});
		expect(registerUser).not.toHaveBeenCalled();
	});

	test('alerts when applicant save fails', async () => {
		registerUser.mockResolvedValue({ user: { uid: 'test-uid' } });
		saveApplicantData.mockResolvedValue(false);
		render(<Register />);
		fillRequiredFields();
		fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));
		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith('register', 'error');
		});
	});

	test('alerts when registerUser returns no user', async () => {
		registerUser.mockResolvedValue({ user: null });
		render(<Register />);
		fillRequiredFields();
		fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));
		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith('register', 'error');
		});
		expect(saveApplicantData).not.toHaveBeenCalled();
	});


	test('navigates via secondary button and login link', () => {
		render(<Register />);
		fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
		expect(mockNavigate).toHaveBeenCalledWith('/login');
		fireEvent.click(screen.getByRole('button', { name: /^Login$/i }));
		expect(mockNavigate).toHaveBeenCalledWith('/login');
	});

	test('shows board access link when member onboarding is enabled', () => {
		mockUseConfig.mockReturnValue({ MEMBER_ONBOARDING_PAGE_ENABLED: true });
		render(<Register />);
		expect(screen.getByRole('button', { name: /Board Access/i })).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: /Board Access/i }));
		expect(mockNavigate).toHaveBeenCalledWith('/register/member');
	});

	test('uploads a valid profile picture', async () => {
		saveFile.mockResolvedValue('file-ref');
		getDownloadLinkForFile.mockResolvedValue('https://cdn/pic.png');
		render(<Register />);
		expect(screen.getByText(/Upload Profile Picture/i)).toBeInTheDocument();

		const file = new File(['abc'], 'avatar.png', { type: 'image/png' });
		fireEvent.change(screen.getByTestId('profile-upload'), { target: { files: [file], name: 'picture' } });

		await waitFor(() => {
			expect(saveFile).toHaveBeenCalled();
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});
	});

	test('rejects invalid and oversized profile uploads', async () => {
		render(<Register />);
		const textFile = new File(['abc'], 'notes.txt', { type: 'text/plain' });
		fireEvent.change(screen.getByTestId('profile-upload'), { target: { files: [textFile], name: 'picture' } });
		expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/valid image/i) }));

		const big = new File([new Uint8Array(26 * 1024 * 1024)], 'big.png', { type: 'image/png' });
		Object.defineProperty(big, 'size', { value: 26 * 1024 * 1024 });
		fireEvent.change(screen.getByTestId('profile-upload'), { target: { files: [big], name: 'picture' } });
		expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/25MB/i) }));
	});

	test('handles upload download-link failure', async () => {
		saveFile.mockResolvedValue('file-ref');
		getDownloadLinkForFile.mockResolvedValue(null);
		render(<Register />);
		const file = new File(['abc'], 'avatar.png', { type: 'image/png' });
		fireEvent.change(screen.getByTestId('profile-upload'), { target: { files: [file], name: 'picture' } });
		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
		});
	});
});
