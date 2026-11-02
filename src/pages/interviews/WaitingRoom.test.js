import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
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
		scheduled: 'Scheduled',
		invited: 'Invited',
		confirmed: 'confirmed',
		inProgress: 'in-progress',
		completed: 'Completed',
		cancelled: 'Cancelled',
		missed: 'Missed',
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
	getInterviewAccessMessage: (status) => (status === 'Cancelled' ? 'This interview was cancelled.' : 'Access denied'),
	isTerminalInterviewStatus: (status) => ['Completed', 'Cancelled', 'Missed'].includes(status),
}));

vi.mock('../../hooks/useApplicantPresence', () => ({
	useApplicantPresence: jest.fn(),
}));

vi.mock('../../components/review/ApplicantApplicationOverlay', () => ({
	default: ({ open, onClose, applicationId }) =>
		open ? (
			<div data-testid='application-overlay'>
				<span>{applicationId}</span>
				<button type='button' onClick={onClose}>
					Close Overlay
				</button>
			</div>
		) : null,
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
			configurable: true,
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
				applicationId: 'application-99',
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

	test('shows a permission error when the browser blocks media access', async () => {
		mockGetUserMedia.mockRejectedValueOnce(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }));
		render(<WaitingRoom />);
		await screen.findByText(/Interview Waiting Room/i);
		await act(async () => {
			fireEvent.click(screen.getByText(/Set up camera & mic/i));
		});
		expect(await screen.findByText(/You blocked camera and\/or microphone access/i)).toBeInTheDocument();
	});

	test('diagnoses a missing camera after successful permission request', async () => {
		mockEnumerateDevices.mockResolvedValueOnce([
			{ kind: 'audioinput', deviceId: 'mic-1', label: 'Mic 1' },
		]);
		render(<WaitingRoom />);
		await screen.findByText(/Interview Waiting Room/i);
		await act(async () => {
			fireEvent.click(screen.getByText(/Set up camera & mic/i));
		});
		expect(await screen.findByText(/No camera found/i)).toBeInTheDocument();
	});

	test('handles an interview assigned to another account', async () => {
		useAuth.mockReturnValue({
			applicant: { firstName: 'John', lastName: 'Doe' },
			member: null,
			user: { uid: 'different-user' },
		});
		render(<WaitingRoom />);
		expect(await screen.findByText(/Unable to Open Waiting Room/i)).toBeInTheDocument();
		expect(screen.getByText(/assigned to a different account/i)).toBeInTheDocument();
	});

	test('shows an unavailable gate for non-confirmed interview statuses', async () => {
		getDoc.mockResolvedValue({
			exists: () => true,
			data: () => ({
				applicantId: 'app-123',
				startTime: { toDate: () => new Date(Date.now() + 100000) },
				status: 'cancelled',
			}),
		});
		render(<WaitingRoom />);
		expect(await screen.findByText(/Waiting Room Unavailable/i)).toBeInTheDocument();
	});

	test('navigates away from the error status page', async () => {
		useParams.mockReturnValue({});
		render(<WaitingRoom />);
		expect(await screen.findByText(/Unable to Open Waiting Room/i)).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: /Return to Application/i }));
		expect(mockNavigate).toHaveBeenCalledWith('/apply');
	});

	test('opens application overlay and exposes leave/support actions', async () => {
		render(<WaitingRoom />);
		await screen.findByText(/Interview Waiting Room/i);

		fireEvent.click(screen.getByRole('button', { name: /View your application/i }));
		expect(await screen.findByTestId('application-overlay')).toHaveTextContent('application-99');
		fireEvent.click(screen.getByText('Close Overlay'));
		expect(screen.queryByTestId('application-overlay')).not.toBeInTheDocument();

		expect(screen.getByRole('link', { name: /Return to Application/i })).toHaveAttribute('href', '/apply');
		expect(screen.getByRole('link', { name: /Having trouble/i })).toHaveAttribute('href', 'mailto:test@example.com');
	});

	test('toggles camera/mic after permissions are granted', async () => {
		const videoTrack = { enabled: true, stop: mockStopTrack, kind: 'video' };
		const audioTrack = { enabled: true, stop: mockStopTrack, kind: 'audio' };
		mockGetUserMedia.mockResolvedValue({
			getTracks: () => [videoTrack, audioTrack],
			getVideoTracks: () => [videoTrack],
			getAudioTracks: () => [audioTrack],
		});
		mockEnumerateDevices.mockResolvedValue([
			{ kind: 'videoinput', deviceId: 'cam-1', label: 'Camera 1' },
			{ kind: 'videoinput', deviceId: 'cam-2', label: 'Camera 2' },
			{ kind: 'audioinput', deviceId: 'mic-1', label: 'Mic 1' },
			{ kind: 'audioinput', deviceId: 'mic-2', label: 'Mic 2' },
		]);

		useMeeting.mockReturnValue({
			videoDeviceId: 'cam-1',
			audioDeviceId: 'mic-1',
			setVideoDeviceId: mockSetVideoDeviceId,
			setAudioDeviceId: mockSetAudioDeviceId,
		});

		const closeAudio = jest.fn(() => Promise.resolve());
		const disconnect = jest.fn();
		const getByteFrequencyData = jest.fn((data) => {
			for (let i = 0; i < data.length; i += 1) data[i] = 40;
		});
		class FakeAudioContext {
			createMediaStreamSource() {
				return { connect: jest.fn(), disconnect };
			}
			createAnalyser() {
				return {
					fftSize: 0,
					frequencyBinCount: 8,
					getByteFrequencyData,
					connect: jest.fn(),
				};
			}
			close() {
				return closeAudio();
			}
		}
		window.AudioContext = FakeAudioContext;

		render(<WaitingRoom />);
		await screen.findByText(/Interview Waiting Room/i);
		await act(async () => {
			fireEvent.click(screen.getByText(/Set up camera & mic/i));
		});
		await waitFor(() => {
			expect(screen.getByText(/Devices connected/i)).toBeInTheDocument();
		});
		await waitFor(() => {
			expect(screen.getByLabelText('Microphone level meter')).toBeInTheDocument();
		});

		expect(screen.getByLabelText(/Mute microphone/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Turn off camera/i)).toBeInTheDocument();
		fireEvent.click(screen.getByLabelText(/Mute microphone/i));
		expect(screen.getByLabelText(/Unmute microphone/i)).toBeInTheDocument();
		expect(screen.getByText(/\(muted\)/i)).toBeInTheDocument();
		fireEvent.click(screen.getByLabelText(/Turn off camera/i));
		expect(screen.getByLabelText(/Turn on camera/i)).toBeInTheDocument();
		expect(audioTrack.enabled).toBe(false);
		expect(videoTrack.enabled).toBe(false);

		const micSelect = screen.getAllByRole('combobox')[1];
		fireEvent.mouseDown(micSelect);
		const listbox = await screen.findByRole('listbox');
		fireEvent.click(within(listbox).getByText('Mic 2'));
		expect(mockSetAudioDeviceId).toHaveBeenCalledWith('mic-2');
	});

	test('falls back to separate video/audio streams on NotFoundError', async () => {
		mockGetUserMedia
			.mockRejectedValueOnce(Object.assign(new Error('not found'), { name: 'NotFoundError' }))
			.mockResolvedValueOnce({
				getTracks: () => [{ stop: mockStopTrack }],
				getVideoTracks: () => [{ enabled: true, stop: mockStopTrack }],
				getAudioTracks: () => [],
			})
			.mockResolvedValueOnce({
				getTracks: () => [{ stop: mockStopTrack }],
				getVideoTracks: () => [],
				getAudioTracks: () => [{ enabled: true, stop: mockStopTrack }],
			});

		render(<WaitingRoom />);
		await screen.findByText(/Interview Waiting Room/i);
		await act(async () => {
			fireEvent.click(screen.getByText(/Set up camera & mic/i));
		});
		await waitFor(() => {
			expect(screen.getByText(/Devices connected/i)).toBeInTheDocument();
		});
		expect(mockGetUserMedia).toHaveBeenCalledTimes(3);
	});

	test('diagnoses a missing microphone after successful permission request', async () => {
		mockEnumerateDevices.mockResolvedValueOnce([
			{ kind: 'videoinput', deviceId: 'cam-1', label: 'Camera 1' },
		]);
		render(<WaitingRoom />);
		await screen.findByText(/Interview Waiting Room/i);
		await act(async () => {
			fireEvent.click(screen.getByText(/Set up camera & mic/i));
		});
		expect(await screen.findByText(/No microphone found/i)).toBeInTheDocument();
	});

	test('surfaces NotReadableError when devices are locked by another app', async () => {
		mockGetUserMedia.mockRejectedValueOnce(Object.assign(new Error('busy'), { name: 'NotReadableError' }));
		render(<WaitingRoom />);
		await screen.findByText(/Interview Waiting Room/i);
		await act(async () => {
			fireEvent.click(screen.getByText(/Set up camera & mic/i));
		});
		expect(await screen.findByText(/already in use by another application/i)).toBeInTheDocument();
	});

	test('rejects browsers without mediaDevices support', async () => {
		Object.defineProperty(global.navigator, 'mediaDevices', {
			value: {},
			configurable: true,
			writable: true,
		});
		render(<WaitingRoom />);
		await screen.findByText(/Interview Waiting Room/i);
		await act(async () => {
			fireEvent.click(screen.getByText(/Set up camera & mic/i));
		});
		expect(await screen.findByText(/does not support media device access/i)).toBeInTheDocument();
		Object.defineProperty(global.navigator, 'mediaDevices', {
			value: {
				getUserMedia: mockGetUserMedia,
				enumerateDevices: mockEnumerateDevices,
			},
			configurable: true,
			writable: true,
		});
	});

	test('shows preview failure when getUserMedia fails after permissions', async () => {
		useMeeting.mockReturnValue({
			videoDeviceId: 'cam-1',
			audioDeviceId: 'mic-1',
			setVideoDeviceId: mockSetVideoDeviceId,
			setAudioDeviceId: mockSetAudioDeviceId,
		});
		mockGetUserMedia
			.mockResolvedValueOnce({
				getTracks: () => [{ stop: mockStopTrack }],
				getVideoTracks: () => [{ enabled: true, stop: mockStopTrack }],
				getAudioTracks: () => [{ enabled: true, stop: mockStopTrack }],
			})
			.mockRejectedValueOnce(new Error('preview failed'));

		render(<WaitingRoom />);
		await screen.findByText(/Interview Waiting Room/i);
		await act(async () => {
			fireEvent.click(screen.getByText(/Set up camera & mic/i));
		});
		expect(await screen.findByText(/Could not start devices/i)).toBeInTheDocument();
	});

	test('redirects into the interview room after the connecting countdown', async () => {
		vi.useFakeTimers();
		let statusCallback;
		getRealTimeDocument.mockImplementation((col, id, cb) => {
			statusCallback = cb;
			return jest.fn();
		});

		render(<WaitingRoom />);
		await act(async () => {
			await Promise.resolve();
		});
		expect(screen.getByText(/Interview Waiting Room/i)).toBeInTheDocument();

		act(() => {
			statusCallback({ status: 'in-progress' });
		});
		expect(screen.getByText(/Interview starting/i)).toBeInTheDocument();
		expect(screen.getByTestId('redirect-countdown')).toHaveTextContent('10');

		for (let i = 0; i < 10; i += 1) {
			await act(async () => {
				await vi.advanceTimersByTimeAsync(1000);
			});
		}
		expect(mockNavigate).toHaveBeenCalledWith('/interviews/interview-room/test-interview-123');
		vi.useRealTimers();
	});

	test('shows past-schedule standby copy when the interview time has passed', async () => {
		jest.useFakeTimers({ shouldAdvanceTime: true });
		getDoc.mockResolvedValue({
			exists: () => true,
			data: () => ({
				applicantId: 'app-123',
				applicationId: 'application-99',
				startTime: { toDate: () => new Date(Date.now() - 60000) },
				status: 'confirmed',
				firstName: 'Applicant',
				lastName: 'Test',
			}),
		});
		getDoc
			.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({
					applicantId: 'app-123',
					applicationId: 'application-99',
					startTime: { toDate: () => new Date(Date.now() - 60000) },
					status: 'confirmed',
				}),
			})
			.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ firstName: 'Applicant', lastName: 'Test' }),
			});

		render(<WaitingRoom />);
		await screen.findByText(/Interview Waiting Room/i);
		await act(async () => {
			jest.advanceTimersByTime(1100);
		});
		expect(await screen.findByText(/should begin shortly/i)).toBeInTheDocument();
		jest.useRealTimers();
	});

	test('surfaces a load failure when interview fetch throws', async () => {
		getDoc.mockRejectedValueOnce(new Error('network'));
		render(<WaitingRoom />);
		expect(await screen.findByText(/could not load this interview/i)).toBeInTheDocument();
	});

	test('marks the interview missing when the realtime listener returns null', async () => {
		let statusCallback;
		getRealTimeDocument.mockImplementation((col, id, cb) => {
			statusCallback = cb;
			return jest.fn();
		});
		render(<WaitingRoom />);
		await screen.findByText(/Interview Waiting Room/i);
		act(() => {
			statusCallback(null);
		});
		expect(await screen.findByText(/Unable to Open Waiting Room/i)).toBeInTheDocument();
	});

	test('shows connecting copy for in-progress interviews and redirects after access denial timeout', async () => {
		vi.useFakeTimers();
		let statusCallback;
		getRealTimeDocument.mockImplementation((_col, _id, cb) => {
			statusCallback = cb;
			return jest.fn();
		});
		render(<WaitingRoom />);
		await act(async () => {
			await Promise.resolve();
		});
		expect(screen.getByText(/Interview Waiting Room/i)).toBeInTheDocument();

		act(() => {
			statusCallback({ status: 'in-progress', startTime: { toDate: () => new Date(Date.now() + 60000) } });
		});
		expect(screen.getByText(/Interview starting/i)).toBeInTheDocument();

		act(() => {
			statusCallback({ status: 'Cancelled' });
		});
		expect(screen.getByText(/This interview was cancelled/i)).toBeInTheDocument();

		for (let i = 0; i < 8; i += 1) {
			await act(async () => {
				await vi.advanceTimersByTimeAsync(1000);
			});
		}
		expect(mockNavigate).toHaveBeenCalled();
		vi.useRealTimers();
	});



});

