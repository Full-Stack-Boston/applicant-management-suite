import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import InterviewRoom from './InterviewRoom';
import { useParams, useNavigate } from 'react-router-dom';
import { useMeeting } from '../../context/MeetingContext';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { useTitle } from '../../context/HelmetContext';
import { getDoc, onSnapshot } from 'firebase/firestore';

// NEW: Import generateJoinToken for mocking
import { generateJoinToken, endInterview, updateInterviewStatus } from '../../config/data/firebase';

// --- Mocks ---

vi.mock('react-router-dom', () => ({
	useParams: jest.fn(),
	useNavigate: jest.fn(),
}));

vi.mock('@daily-co/daily-react', () => ({
	DailyProvider: ({ children }) => <div data-testid='daily-provider'>{children}</div>,
}));

vi.mock('firebase/functions', () => ({
	httpsCallable: jest.fn(),
}));

vi.mock('firebase/firestore', () => ({
	doc: jest.fn(),
	getDoc: jest.fn(),
	onSnapshot: jest.fn(),
	updateDoc: jest.fn(() => Promise.resolve()),
}));

// UPDATED: Include generateJoinToken in mock
vi.mock('../../config/data/firebase', () => ({
	db: {},
	functions: {},
	generateJoinToken: jest.fn(),
	getRealTimeMeetings: jest.fn(() => jest.fn()),
	endInterview: jest.fn(),
	updateInterviewStatus: jest.fn(),
}));

vi.mock('../../config/data/collections', () => ({
	collections: {
		interviews: 'interviews',
		applicants: 'applicants',
		members: 'members',
		applications: 'applications',
	},
	InterviewStatus: {
		inProgress: 'in-progress',
		completed: 'completed',
		cancelled: 'cancelled',
		missed: 'missed',
		confirmed: 'confirmed',
	},
}));

// Context Mocks
vi.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

vi.mock('../../context/MeetingContext', () => ({
	useMeeting: jest.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

vi.mock('../../context/ConfigContext', () => ({
	useConfig: jest.fn(),
}));

vi.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

// Child Component Mocks
vi.mock('../../components/loader/Loader', () => ({ default: () => <div data-testid='loader'>Loading...</div> }));
vi.mock('../../components/interviews/AdminDrawer', () => ({
	default: ({ open, onClose, onCompleteAndNext, nextInterview }) => (
		<div data-testid='admin-drawer' data-open={open ? 'true' : 'false'}>
			<button type='button' onClick={onClose}>
				Close Admin
			</button>
			<button
				type='button'
				onClick={() => onCompleteAndNext?.(nextInterview?.id || 'next-interview-1')}>
				Complete And Next
			</button>
		</div>
	),
}));
vi.mock('../../components/interviews/ApplicationViewer', () => ({
	default: ({ open, onClose }) => (
		<div data-testid='app-viewer' data-open={open ? 'true' : 'false'}>
			<button type='button' onClick={onClose}>
				Close Apps
			</button>
		</div>
	),
}));
vi.mock('../../components/interviews/CallInterface', () => ({
	default: ({ onOpenDrawer, onOpenAdminDrawer }) => (
		<div data-testid='call-ui'>
			<button type='button' onClick={onOpenAdminDrawer}>
				Open Admin
			</button>
			<button type='button' onClick={onOpenDrawer}>
				Open Apps
			</button>
		</div>
	),
}));
vi.mock('../../components/interviews/VideoRoomUnavailable', () => ({
	default: ({ title, message, onLeave, leaveLabel }) => (
		<div data-testid='video-unavailable'>
			<h1>{title}</h1>
			<p>{message}</p>
			<button type='button' onClick={onLeave}>
				{leaveLabel}
			</button>
		</div>
	),
}));

describe('InterviewRoom Component', () => {
	const mockNavigate = jest.fn();
	const mockShowAlert = jest.fn();
	const mockHandleError = jest.fn();
	const mockSetParticipantDetails = jest.fn();

	let mockCallObject;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();

		useParams.mockReturnValue({ interviewId: 'test-interview-123' });
		useNavigate.mockReturnValue(mockNavigate);
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
		useTitle.mockImplementation(() => {});
		useConfig.mockReturnValue({ AUTO_DELIBERATE: false });

		useAuth.mockReturnValue({
			user: { uid: 'user-123' },
			member: null,
			applicant: { id: 'app-1' },
		});

		mockCallObject = {
			on: jest.fn(),
			off: jest.fn(),
			join: jest.fn(),
			leave: jest.fn(),
			meetingState: jest.fn().mockReturnValue('left-meeting'),
			participants: jest.fn().mockReturnValue({
				local: { session_id: 'local', user_id: 'user-123', owner: false },
			}),
		};

		useMeeting.mockReturnValue({
			callObject: mockCallObject,
			videoDeviceId: 'cam-1',
			audioDeviceId: 'mic-1',
			setParticipantDetails: mockSetParticipantDetails,
		});

		// UPDATED: Use generateJoinToken directly
		generateJoinToken.mockResolvedValue({
			data: { token: 'mock-token', roomUrl: 'mock-url' },
		});

		// Default Snapshot: In Progress
		onSnapshot.mockImplementation((ref, onNext) => {
			onNext({
				exists: () => true,
				data: () => ({ status: 'in-progress', applicantId: 'app-1' }),
			});
			return jest.fn();
		});

		getDoc.mockResolvedValue({
			exists: () => true,
			data: () => ({ picture: { home: 'http://pic.url' } }),
		});
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	test('renders loader initially', async () => {
		render(<InterviewRoom />);
		expect(screen.getByTestId('loader')).toBeInTheDocument();

		await waitFor(() => expect(mockCallObject.on).toHaveBeenCalled());
	});

	test('displays error if missing interview ID', async () => {
		useParams.mockReturnValue({});
		render(<InterviewRoom />);

		await waitFor(() => {
			expect(screen.getByText(/Please supply an Interview ID/i)).toBeInTheDocument();
		});
	});

	test('displays error if interview not found', async () => {
		onSnapshot.mockImplementation((ref, onNext) => {
			onNext({ exists: () => false });
			return jest.fn();
		});

		render(<InterviewRoom />);

		await waitFor(() => {
			expect(screen.getByText(/Interview was not found/i)).toBeInTheDocument();
		});
	});

	test('joins meeting when status is in-progress', async () => {
		render(<InterviewRoom />);

		await waitFor(() => {
			expect(mockCallObject.on).toHaveBeenCalledWith('joined-meeting', expect.any(Function));
		});

		const joinedCallback = mockCallObject.on.mock.calls.find((call) => call[0] === 'joined-meeting')[1];
		await act(async () => {
			joinedCallback();
		});

		await waitFor(() => {
			expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
		});

		expect(screen.getByTestId('daily-provider')).toBeInTheDocument();
		expect(screen.getByTestId('call-ui')).toBeInTheDocument();
	});

	test('renders InterviewEnded component when status is completed', async () => {
		// Override default mock to return 'completed' immediately
		onSnapshot.mockImplementation((ref, onNext) => {
			onNext({
				exists: () => true,
				data: () => ({ status: 'completed' }),
			});
			return jest.fn();
		});

		render(<InterviewRoom />);

		// With the fix, the loader should clear and show concluded message
		await waitFor(() => {
			expect(screen.getByText(/Interview Concluded/i)).toBeInTheDocument();
		});
		expect(screen.getByText(/Return to Dashboard/i)).toBeInTheDocument();
	});

	test('redirects members to deliberation room automatically if config enabled', async () => {
		useAuth.mockReturnValue({
			user: { uid: 'mem-1' },
			member: { id: 'mem-1' },
			applicant: null,
		});
		useConfig.mockReturnValue({ AUTO_DELIBERATE: true });

		let snapshotCallback;
		onSnapshot.mockImplementation((ref, onNext) => {
			snapshotCallback = onNext;
			onNext({ exists: () => true, data: () => ({ status: 'in-progress' }) });
			return jest.fn();
		});

		render(<InterviewRoom />);

		await waitFor(() => expect(mockCallObject.on).toHaveBeenCalledWith('joined-meeting', expect.any(Function)));
		const joinedCallback = mockCallObject.on.mock.calls.find((call) => call[0] === 'joined-meeting')[1];
		await act(async () => joinedCallback());

		// Update to completed
		await act(async () => {
			snapshotCallback({ exists: () => true, data: () => ({ status: 'completed' }) });
		});

		expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'info' }));

		for (let i = 0; i < 6; i++) {
			act(() => {
				jest.advanceTimersByTime(1000);
			});
		}

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith('/interviews/deliberation-room');
		});
	});

	test('does not redirect applicants automatically', async () => {
		useConfig.mockReturnValue({ AUTO_DELIBERATE: true });

		let snapshotCallback;
		onSnapshot.mockImplementation((ref, onNext) => {
			snapshotCallback = onNext;
			onNext({ exists: () => true, data: () => ({ status: 'in-progress' }) });
			return jest.fn();
		});

		render(<InterviewRoom />);

		await waitFor(() => expect(mockCallObject.on).toHaveBeenCalledWith('joined-meeting', expect.any(Function)));
		const joinedCallback = mockCallObject.on.mock.calls.find((call) => call[0] === 'joined-meeting')[1];
		await act(async () => joinedCallback());

		await act(async () => {
			snapshotCallback({ exists: () => true, data: () => ({ status: 'completed' }) });
		});

		expect(screen.getByText(/Interview Concluded/i)).toBeInTheDocument();

		for (let i = 0; i < 6; i++) {
			act(() => {
				jest.advanceTimersByTime(1000);
			});
		}

		expect(mockNavigate).not.toHaveBeenCalledWith('/interviews/deliberation-room');
	});

	test('displays error if joining fails', async () => {
		// UPDATED: Use generateJoinToken directly
		generateJoinToken.mockRejectedValue(new Error('Token Gen Failed'));

		render(<InterviewRoom />);

		await waitFor(() => {
			expect(screen.getByText(/Interview Room Unavailable/i)).toBeInTheDocument();
		});
		expect(screen.getByText(/Token Gen Failed/i)).toBeInTheDocument();
	});

	test('toggles drawers and completes next interview flow', async () => {
		const { getRealTimeMeetings } = await import('../../config/data/firebase');
		getRealTimeMeetings.mockImplementation((uid, onlyUpcoming, cb) => {
			cb([{ id: 'next-interview-1', status: 'confirmed' }]);
			return jest.fn();
		});
		endInterview.mockResolvedValue(undefined);
		updateInterviewStatus.mockResolvedValue(undefined);

		useAuth.mockReturnValue({
			user: { uid: 'mem-1' },
			member: { id: 'mem-1' },
			applicant: null,
		});

		render(<InterviewRoom />);

		await waitFor(() => expect(mockCallObject.on).toHaveBeenCalledWith('joined-meeting', expect.any(Function)));
		const joinedCallback = mockCallObject.on.mock.calls.find((call) => call[0] === 'joined-meeting')[1];
		await act(async () => joinedCallback());

		await waitFor(() => expect(screen.getByTestId('call-ui')).toBeInTheDocument());

		fireEvent.click(screen.getByText('Open Admin'));
		expect(screen.getByTestId('admin-drawer')).toHaveAttribute('data-open', 'true');
		fireEvent.click(screen.getByText('Close Admin'));
		expect(screen.getByTestId('admin-drawer')).toHaveAttribute('data-open', 'false');

		fireEvent.click(screen.getByText('Open Apps'));
		expect(screen.getByTestId('app-viewer')).toHaveAttribute('data-open', 'true');
		fireEvent.click(screen.getByText('Close Apps'));
		expect(screen.getByTestId('app-viewer')).toHaveAttribute('data-open', 'false');

		fireEvent.click(screen.getByText('Complete And Next'));
		await waitFor(() => {
			expect(endInterview).toHaveBeenCalledWith({ interviewId: 'test-interview-123' });
			expect(updateInterviewStatus).toHaveBeenCalledWith(
				expect.objectContaining({ interviewId: 'next-interview-1' })
			);
		});
	});

	test('handles complete-and-next failures', async () => {
		endInterview.mockRejectedValueOnce(new Error('end failed'));
		useAuth.mockReturnValue({
			user: { uid: 'mem-1' },
			member: { id: 'mem-1' },
			applicant: null,
		});

		render(<InterviewRoom />);
		await waitFor(() => expect(mockCallObject.on).toHaveBeenCalledWith('joined-meeting', expect.any(Function)));
		const joinedCallback = mockCallObject.on.mock.calls.find((call) => call[0] === 'joined-meeting')[1];
		await act(async () => joinedCallback());
		await waitFor(() => expect(screen.getByTestId('call-ui')).toBeInTheDocument());

		fireEvent.click(screen.getByText('Complete And Next'));
		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error), 'interview-complete-and-next');
		});
	});

	test('navigates to the next interview when complete-and-next finishes', async () => {
		const { getRealTimeMeetings } = await import('../../config/data/firebase');
		getRealTimeMeetings.mockImplementation((_uid, _onlyUpcoming, cb) => {
			cb([{ id: 'next-interview-9', status: 'confirmed' }]);
			return jest.fn();
		});
		endInterview.mockResolvedValue(undefined);
		updateInterviewStatus.mockResolvedValue(undefined);
		useAuth.mockReturnValue({
			user: { uid: 'mem-1' },
			member: { id: 'mem-1' },
			applicant: null,
		});

		let snapshotCallback;
		onSnapshot.mockImplementation((_ref, onNext) => {
			snapshotCallback = onNext;
			onNext({ exists: () => true, data: () => ({ status: 'in-progress' }) });
			return jest.fn();
		});

		render(<InterviewRoom />);
		await waitFor(() => expect(mockCallObject.on).toHaveBeenCalledWith('joined-meeting', expect.any(Function)));
		const joinedCallback = mockCallObject.on.mock.calls.find((call) => call[0] === 'joined-meeting')[1];
		await act(async () => joinedCallback());
		await waitFor(() => expect(screen.getByTestId('call-ui')).toBeInTheDocument());

		fireEvent.click(screen.getByText('Complete And Next'));
		await waitFor(() => {
			expect(endInterview).toHaveBeenCalled();
		});

		await act(async () => {
			snapshotCallback({ exists: () => true, data: () => ({ status: 'completed' }) });
		});

		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith(
				expect.objectContaining({ message: expect.stringMatching(/Moving to the next interview/) })
			);
			expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('next-interview-9'));
		});
	});

	test('returns applicants to apply from the concluded screen', async () => {
		onSnapshot.mockImplementation((ref, onNext) => {
			onNext({ exists: () => true, data: () => ({ status: 'completed' }) });
			return jest.fn();
		});
		render(<InterviewRoom />);
		fireEvent.click(await screen.findByText(/Return to Dashboard/i));
		expect(mockNavigate).toHaveBeenCalledWith('/apply');
	});

	test('returns members to the interviews dashboard from the concluded screen', async () => {
		useAuth.mockReturnValue({
			user: { uid: 'mem-1' },
			member: { id: 'mem-1' },
			applicant: null,
		});
		onSnapshot.mockImplementation((ref, onNext) => {
			onNext({ exists: () => true, data: () => ({ status: 'completed' }) });
			return jest.fn();
		});
		render(<InterviewRoom />);
		fireEvent.click(await screen.findByText(/Return to Dashboard/i));
		expect(mockNavigate).toHaveBeenCalledWith('/members/interviews/dashboard');
	});

	test('surfaces invalid token payloads from generateJoinToken', async () => {
		generateJoinToken.mockResolvedValueOnce({ data: {} });
		render(<InterviewRoom />);
		await waitFor(() => {
			expect(screen.getByText(/Interview Room Unavailable/i)).toBeInTheDocument();
		});
		expect(screen.getByText(/Invalid token or roomUrl received/i)).toBeInTheDocument();
	});

	test('surfaces snapshot listener failures', async () => {
		onSnapshot.mockImplementation((ref, onNext, onError) => {
			onError?.(new Error('snapshot failed'));
			return jest.fn();
		});
		render(<InterviewRoom />);
		await waitFor(() => {
			expect(screen.getByText(/Interview Room Unavailable/i)).toBeInTheDocument();
		});
	});

	test('leaves the unavailable gate via the leave button', async () => {
		useParams.mockReturnValue({});
		render(<InterviewRoom />);
		await waitFor(() => {
			expect(screen.getByTestId('video-unavailable')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByRole('button'));
		expect(mockNavigate).toHaveBeenCalled();
	});

	test('marks local owner participants and loads member pictures', async () => {
		mockCallObject.participants.mockReturnValue({
			local: { session_id: 'local', user_id: 'user-123', owner: true },
		});
		getDoc.mockResolvedValue({
			exists: () => true,
			data: () => ({ picture: { home: 'http://pic.url' } }),
		});
		render(<InterviewRoom />);
		await waitFor(() => expect(mockCallObject.on).toHaveBeenCalledWith('joined-meeting', expect.any(Function)));
		const joinedCallback = mockCallObject.on.mock.calls.find((call) => call[0] === 'joined-meeting')[1];
		await act(async () => joinedCallback());
		await waitFor(() => {
			expect(mockSetParticipantDetails).toHaveBeenCalled();
		});
	});
});
