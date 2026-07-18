import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import WaitingRoom from './WaitingRoom';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useMeeting } from '../../context/MeetingContext';
import { useAuth } from '../../context/AuthContext';
import { useTitle } from '../../context/HelmetContext';
import { useConfig } from '../../context/ConfigContext';
import { getRealTimeDocument } from '../../config/data/firebase';
import { getDoc } from 'firebase/firestore';
import { useApplicantPresence } from '../../hooks/useApplicantPresence';

// --- Mocks ---

vi.mock('react-router-dom', () => ({
	useParams: jest.fn(),
	useNavigate: jest.fn(),
	Link: ({ children, to, ...props }) => (
		<a href={to} {...props}>
			{children}
		</a>
	),
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

vi.mock('../../context/MeetingContext', () => ({
	useMeeting: jest.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

vi.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

vi.mock('../../context/ConfigContext', () => ({
	useConfig: jest.fn(),
}));

vi.mock('../../config/data/firebase', () => ({
	db: {},
	getRealTimeDocument: jest.fn(),
}));

vi.mock('firebase/firestore', () => ({
	doc: jest.fn(),
	getDoc: jest.fn(),
}));

vi.mock('../../config/data/collections', () => ({
	collections: {
		interviews: 'interviews',
		applicants: 'applicants',
	},
	InterviewStatus: {
		confirmed: 'confirmed',
		inProgress: 'in-progress',
	},
}));

vi.mock('../../config/Constants', () => ({
	brand: {
		helpEmail: 'test@example.com',
	},
}));

vi.mock('../../components/home/homePageStyles', () => ({
	homeAuthSubmitButtonSx: () => ({}),
	homeAuthSecondaryButtonSx: {},
	homeAuthActionRowSx: {},
	homeDashboardIntroBodySx: {},
	homeDashboardIntroLabelSx: {},
	homeDashboardIntroListSx: {},
	homeApplicantSectionTitleSx: {},
	homeApplicantApplicationCardSx: () => ({}),
	displayFont: 'serif',
}));

vi.mock('../../utils/interviewUtils', () => ({
	getInterviewReturnPath: () => '/apply',
	getInterviewReturnLabel: () => 'Return to Application',
	formatApplicantDisplayName: (data) => `${data?.firstName || ''} ${data?.lastName || ''}`.trim(),
	getInterviewAccessMessage: () => 'Access denied',
	isTerminalInterviewStatus: () => false,
}));

vi.mock('../../hooks/useApplicantPresence', () => ({
	useApplicantPresence: jest.fn(),
}));

vi.mock('../../components/review/ApplicantApplicationOverlay', () => ({
	default: () => null,
}));

vi.mock('../../components/home/PublicPageLayout', () => ({
	default: ({ children }) => <div data-testid='public-page-layout'>{children}</div>,
}));

vi.mock('../../components/home/PublicStatusPage', () => ({
	default: ({ children, title, subtitle }) => (
		<div data-testid='public-status-page'>
			<div>{title}</div>
			<div>{subtitle}</div>
			{children}
		</div>
	),
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

vi.mock('../../components/list/StatusCapsule', () => ({
	StatusCapsule: ({ status }) => <div data-testid='status-capsule'>{status}</div>,
}));

vi.mock('../../components/loader/Loader', () => ({
	default: () => (
		<div role='progressbar' data-testid='loader'>
			Loading...
		</div>
	),
}));

describe('WaitingRoom Component', () => {
	const mockNavigate = jest.fn();
	const mockDispatch = jest.fn();
	const mockSetVideoDeviceId = jest.fn();
	const mockSetAudioDeviceId = jest.fn();

	// Media Device Mocks
	const mockGetUserMedia = jest.fn();
	const mockEnumerateDevices = jest.fn();
	const mockStopTrack = jest.fn();

	beforeAll(() => {
		// Setup global navigator mocks
		Object.defineProperty(global.navigator, 'mediaDevices', {
			value: {
				getUserMedia: mockGetUserMedia,
				enumerateDevices: mockEnumerateDevices,
			},
			writable: true,
		});
	});

	beforeEach(() => {
		jest.clearAllMocks();

		// Router
		useParams.mockReturnValue({ interviewId: 'test-interview-123' });
		useNavigate.mockReturnValue(mockNavigate);

		// Contexts
		useTheme.mockReturnValue({
			darkMode: false,
			primaryColor: 'blue',
			dispatch: mockDispatch,
		});

		useMeeting.mockReturnValue({
			videoDeviceId: null,
			audioDeviceId: null,
			setVideoDeviceId: mockSetVideoDeviceId,
			setAudioDeviceId: mockSetAudioDeviceId,
		});

		useAuth.mockReturnValue({
			applicant: { firstName: 'John', lastName: 'Doe' },
			member: null,
			user: { uid: 'app-123' },
		});

		useTitle.mockImplementation(() => {});
		useConfig.mockReturnValue({ helpEmail: 'test@example.com' });

		// Firebase Default Mocks
		getDoc.mockResolvedValue({
			exists: () => true,
			data: () => ({
				applicantId: 'app-123',
				startTime: { toDate: () => new Date(Date.now() + 100000) }, // Future date
				status: 'confirmed',
				firstName: 'Applicant',
				lastName: 'Test',
			}),
		});

		// Mock Realtime Listener
		getRealTimeDocument.mockImplementation((collection, id, callback) => {
			callback({ status: 'confirmed' });
			return jest.fn(); // unsubscribe
		});

		// Media Mocks
		mockGetUserMedia.mockResolvedValue({
			getTracks: () => [{ stop: mockStopTrack }],
			getVideoTracks: () => [{ enabled: true, stop: mockStopTrack }],
			getAudioTracks: () => [{ enabled: true, stop: mockStopTrack }],
		});

		mockEnumerateDevices.mockResolvedValue([
			{ kind: 'videoinput', deviceId: 'cam-1', label: 'Camera 1' },
			{ kind: 'audioinput', deviceId: 'mic-1', label: 'Mic 1' },
		]);
	});

	test('renders loading state initially', async () => {
		render(<WaitingRoom />);
		expect(screen.getByRole('progressbar')).toBeInTheDocument();

		await screen.findByText(/Interview Waiting Room/i);
	});

	test('renders waiting room content after data loads', async () => {
		render(<WaitingRoom />);

		const header = await screen.findByText(/Interview Waiting Room/i);
		expect(header).toBeInTheDocument();

		expect(screen.getByText(/Device & permission check/i)).toBeInTheDocument();
		expect(screen.getByText(/How to prepare/i)).toBeInTheDocument();
		expect(screen.getByText(/What to expect/i)).toBeInTheDocument();
	});

	test('displays error if interview ID is missing', async () => {
		useParams.mockReturnValue({}); // No ID
		render(<WaitingRoom />);

		expect(await screen.findByText(/No interview ID was provided/i)).toBeInTheDocument();
		expect(screen.getByText(/Unable to Open Waiting Room/i)).toBeInTheDocument();
	});

	test('displays error if interview not found', async () => {
		getDoc.mockResolvedValue({ exists: () => false });

		render(<WaitingRoom />);

		expect(await screen.findByText(/Unable to Open Waiting Room/i)).toBeInTheDocument();
		expect(screen.getByText(/could not be found/i)).toBeInTheDocument();
	});

	test('handles device permissions flow', async () => {
		render(<WaitingRoom />);

		await screen.findByText(/Interview Waiting Room/i);

		const setupBtn = screen.getByText(/Set up camera & mic/i);
		expect(setupBtn).toBeInTheDocument();

		await act(async () => {
			fireEvent.click(setupBtn);
		});

		expect(mockGetUserMedia).toHaveBeenCalled();
		expect(mockEnumerateDevices).toHaveBeenCalled();

		await waitFor(() => {
			expect(screen.getByText(/Devices connected/i)).toBeInTheDocument();
		});

		const comboboxes = screen.getAllByRole('combobox');
		expect(comboboxes.length).toBeGreaterThanOrEqual(2);

		expect(screen.getAllByText('Camera').length).toBeGreaterThan(0);
		expect(screen.getAllByText('Microphone').length).toBeGreaterThan(0);
	});

	test('updates status when interview becomes in-progress', async () => {
		let statusCallback;
		getRealTimeDocument.mockImplementation((col, id, cb) => {
			statusCallback = cb;
			return jest.fn();
		});

		render(<WaitingRoom />);

		await screen.findByText(/Interview Waiting Room/i);

		act(() => {
			if (statusCallback) statusCallback({ status: 'confirmed' });
		});

		expect(screen.queryByText(/Interview starting/i)).not.toBeInTheDocument();

		act(() => {
			if (statusCallback) statusCallback({ status: 'in-progress' });
		});

		const startingText = await screen.findByText(/Interview starting/i);
		expect(startingText).toBeInTheDocument();

		expect(screen.getByTestId('redirect-countdown')).toHaveTextContent('10');
	});

	test('marks applicant as present via useApplicantPresence when applicant is signed in', async () => {
		render(<WaitingRoom />);

		await waitFor(() => {
			expect(useApplicantPresence).toHaveBeenCalledWith('test-interview-123', true);
		});
	});
});
