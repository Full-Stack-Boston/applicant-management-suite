import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import RSVPStatusCard from './RSVPStatusCard';
import { getRealTimeMeetings, generateICSDownloadURL } from '../../config/data/firebase';
import { updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { InterviewStatus } from '../../config/data/collections';
import { useAlert } from '../../context/AlertContext';
import muiTheme from '../../config/ui/theme';

// Mock dependencies
vi.mock('firebase/firestore', () => ({
	doc: vi.fn(),
	updateDoc: vi.fn(),
}));
vi.mock('../../config/data/firebase', () => ({
	db: {},
	generateICSDownloadURL: vi.fn(),
	getRealTimeMeetings: vi.fn(),
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../context/ThemeContext', () => ({ useTheme: vi.fn() }));
vi.mock('../../context/AlertContext', () => ({ useAlert: vi.fn() }));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
	...(await importOriginal()),
	useNavigate: () => mockNavigate,
}));

// Helper to create mock date objects
const toDate = (dateStr) => ({ toDate: () => new Date(dateStr) });

const renderCard = (ui) =>
	render(
		<ThemeProvider theme={muiTheme(false, 'green')}>
			<MemoryRouter>{ui}</MemoryRouter>
		</ThemeProvider>
	);

describe('RSVPStatusCard', () => {
	const mockInterviewBase = {
		id: 'interview123',
		rsvpStatus: 'unknown',
		status: InterviewStatus.invited,
		startTime: toDate('2025-12-10T14:00:00'),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		useAuth.mockReturnValue({ user: { uid: 'applicant123' } });
		useTheme.mockReturnValue({ darkMode: false, primaryColor: 'green' });
		useAlert.mockReturnValue({ showAlert: vi.fn(), handleError: vi.fn() });
		updateDoc.mockResolvedValue(undefined);
		doc.mockReturnValue('mock-doc-ref');
	});

	it('renders nothing if loading or no interviews', () => {
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback([]); // Empty array
			return () => {};
		});
		const { container } = renderCard(<RSVPStatusCard />);
		expect(container).toBeEmptyDOMElement();
	});

	it('renders "unknown" state with Confirm/Unavailable buttons', async () => {
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback([mockInterviewBase]);
			return () => {};
		});
		renderCard(<RSVPStatusCard />);

		await waitFor(() => {
			expect(screen.getByText(/Your interview is scheduled. Please confirm/i)).toBeInTheDocument();
			expect(screen.getByText('Confirm')).toBeInTheDocument();
			expect(screen.getByText('Unavailable')).toBeInTheDocument();
		});
	});

	it('calls updateDoc with "yes" when "Confirm" is clicked', async () => {
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback([mockInterviewBase]);
			return () => {};
		});
		renderCard(<RSVPStatusCard />);

		const confirmButton = await screen.findByText('Confirm');
		fireEvent.click(confirmButton);

		await waitFor(() => {
			expect(updateDoc).toHaveBeenCalledWith(
				'mock-doc-ref',
				expect.objectContaining({
					rsvpStatus: 'yes',
					status: InterviewStatus.confirmed,
				})
			);
		});
	});

	it('renders "yes" state with confirmed chip and waiting room button', async () => {
		const confirmedInterview = {
			...mockInterviewBase,
			rsvpStatus: 'yes',
			status: InterviewStatus.confirmed,
		};
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback([confirmedInterview]);
			return () => {};
		});
		renderCard(<RSVPStatusCard />);

		await waitFor(() => {
			expect(screen.getByText(/Your interview is scheduled and confirmed./i)).toBeInTheDocument();
			expect(screen.getByText('Your RSVP')).toBeInTheDocument();
			expect(screen.getByText('RSVP: Confirmed')).toBeInTheDocument();
			expect(screen.getByText('Go to Waiting Room')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText('Go to Waiting Room'));
		expect(mockNavigate).toHaveBeenCalledWith('/interviews/waiting-room/interview123');
	});

	it('renders "inProgress" state with "Join Interview Now" button', async () => {
		const inProgressInterview = {
			...mockInterviewBase,
			rsvpStatus: 'yes',
			status: InterviewStatus.inProgress,
		};
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback([inProgressInterview]);
			return () => {};
		});
		renderCard(<RSVPStatusCard />);

		const joinButton = await screen.findByText('Join Interview Now');
		expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
		expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();
		expect(screen.queryByText('Your RSVP')).not.toBeInTheDocument();
		fireEvent.click(joinButton);
		expect(mockNavigate).toHaveBeenCalledWith('/interviews/interview-room/interview123');
	});

	it('hides Confirm/Unavailable when interview is in progress even if RSVP is still unknown', async () => {
		const inProgressInterview = {
			...mockInterviewBase,
			rsvpStatus: 'unknown',
			status: InterviewStatus.inProgress,
		};
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback([inProgressInterview]);
			return () => {};
		});
		renderCard(<RSVPStatusCard />);

		await waitFor(() => {
			expect(screen.getByText('Join Interview Now')).toBeInTheDocument();
		});
		expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
		expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();
	});

	it('renders interview history below active invites', async () => {
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback([
				mockInterviewBase,
				{
					id: 'interview456',
					rsvpStatus: 'yes',
					status: InterviewStatus.completed,
					startTime: toDate('2024-06-01T14:00:00'),
				},
			]);
			return () => {};
		});
		renderCard(<RSVPStatusCard />);

		await waitFor(() => {
			expect(screen.getByText('Interview Invites')).toBeInTheDocument();
			expect(screen.queryByText('Interview History')).not.toBeInTheDocument();
			expect(screen.getByText('Completed')).toBeInTheDocument();
		});
	});

	it('marks interview unavailable on click', async () => {
		const mockShowAlert = vi.fn();
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: vi.fn() });
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback([mockInterviewBase]);
			return () => {};
		});
		renderCard(<RSVPStatusCard />);
		fireEvent.click(await screen.findByText('Unavailable'));
		await waitFor(() => {
			expect(updateDoc).toHaveBeenCalledWith(
				'mock-doc-ref',
				expect.objectContaining({ rsvpStatus: 'no' }),
			);
			expect(mockShowAlert).toHaveBeenCalledWith({ message: 'RSVP updated successfully.', type: 'success' });
		});
	});

	it('reports RSVP update failures', async () => {
		const mockHandleError = vi.fn();
		useAlert.mockReturnValue({ showAlert: vi.fn(), handleError: mockHandleError });
		updateDoc.mockRejectedValueOnce(new Error('write failed'));
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback([mockInterviewBase]);
			return () => {};
		});
		renderCard(<RSVPStatusCard />);
		fireEvent.click(await screen.findByText('Confirm'));
		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error), 'RSVP update failed');
		});
	});

	it('renders unavailable RSVP copy and capsule', async () => {
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback([{ ...mockInterviewBase, rsvpStatus: 'no', status: InterviewStatus.invited }]);
			return () => {};
		});
		renderCard(<RSVPStatusCard />);
		expect(await screen.findByText(/rescheduling is essential/i)).toBeInTheDocument();
		expect(screen.getByText('RSVP: Unavailable')).toBeInTheDocument();
	});

	it('downloads ICS invites and surfaces calendar errors', async () => {
		const mockShowAlert = vi.fn();
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: vi.fn() });
		const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
		generateICSDownloadURL.mockResolvedValueOnce('https://example.com/invite.ics');
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback([mockInterviewBase]);
			return () => {};
		});
		renderCard(<RSVPStatusCard />);
		fireEvent.click(await screen.findByText(/Add to Calendar/i));
		await waitFor(() => {
			expect(generateICSDownloadURL).toHaveBeenCalled();
			expect(openSpy).toHaveBeenCalledWith('https://example.com/invite.ics', '_blank');
		});

		generateICSDownloadURL.mockRejectedValueOnce(new Error('ics failed'));
		fireEvent.click(screen.getByText(/Add to Calendar/i));
		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith({
				message: 'Could not fetch calendar invite. Try again later.',
				type: 'error',
			});
		});
		openSpy.mockRestore();
	});

	it('skips subscriptions when no user is signed in', () => {
		useAuth.mockReturnValue({ user: null });
		const { container } = renderCard(<RSVPStatusCard />);
		expect(getRealTimeMeetings).not.toHaveBeenCalled();
		expect(container).toBeEmptyDOMElement();
	});
});
