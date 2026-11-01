import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AdminDrawer from './AdminDrawer';
import { useParticipantIds, useDaily } from '@daily-co/daily-react';
import { onSnapshot, updateDoc } from 'firebase/firestore';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';
import * as firebase from '../../config/data/firebase';

// Mock Dependencies
vi.mock('@daily-co/daily-react', () => ({
	useParticipantIds: jest.fn(),
	useDaily: jest.fn(),
}));
vi.mock('firebase/functions', () => ({
	httpsCallable: jest.fn(),
}));
vi.mock('../../config/data/firebase', () => ({
	functions: { app: 'mock-functions' },
	db: { app: 'mock-db' },
	endInterview: jest.fn(),
	markInterviewAsMissed: jest.fn(),
}));
vi.mock('firebase/firestore', () => ({
	doc: jest.fn(() => ({ path: 'siteConfig/config123' })),
	updateDoc: jest.fn(() => Promise.resolve()),
	onSnapshot: jest.fn(),
}));
vi.mock('../../context/AlertContext', () => ({ useAlert: jest.fn() }));
vi.mock('../../context/ConfigContext', () => ({ useConfig: jest.fn() }));
vi.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
vi.mock('./ParticipantRow', () => ({ default: (props) => <div data-testid='participant-row'>{props.id}</div> }));


describe('AdminDrawer Component', () => {
	const mockOnClose = jest.fn();
	const mockOnRelevantAppsChange = jest.fn();
	const mockOnStartNextInterview = jest.fn();
	const mockShowAlert = jest.fn();
	const mockHandleError = jest.fn();
	const mockSendAppMessage = jest.fn();

	const mockMember = { permissions: { site: true } };
	const mockConfig = { CONFIG_ID: 'config123' };

	const mockNextInterview = {
		id: 'next123',
		applicationId: 'app456',
		displayName: 'Jane Doe',
		startTime: { toDate: () => new Date('2025-01-01T10:00:00Z') },
		applicantPresent: true,
	};
	const mockPrevInterview = {
		applicationId: 'app123',
		displayName: 'John Smith',
		status: 'Completed',
		startTime: { toDate: () => new Date('2025-01-01T09:00:00Z') },
		endTime: { toDate: () => new Date('2025-01-01T09:30:00Z') },
	};

	beforeEach(() => {
		jest.clearAllMocks();
		useParticipantIds.mockReturnValue(['participant-1', 'participant-2']);
		useDaily.mockReturnValue({ sendAppMessage: mockSendAppMessage });
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
		useConfig.mockReturnValue(mockConfig);
		useAuth.mockReturnValue({ member: mockMember });
		firebase.endInterview.mockResolvedValue(true);
		firebase.markInterviewAsMissed.mockResolvedValue(true);
		onSnapshot.mockImplementation((docRef, callback) => {
			callback({ exists: () => true, data: () => ({ AUTO_DELIBERATE: false }) });
			return () => {};
		});
	});

	describe('Interview Mode (isDeliberation=false)', () => {
		it('calls endInterview on "End and Complete" click', async () => {
			render(<AdminDrawer open={true} onClose={mockOnClose} interviewId='interview123' isAdmin={true} />);
			await act(async () => {
				fireEvent.click(screen.getByText('End and Complete'));
			});
			expect(firebase.endInterview).toHaveBeenCalledWith({ interviewId: 'interview123' });
		});

		it('shows next-candidate waiting state and Complete & Next', async () => {
			const onCompleteAndNext = jest.fn();
			render(
				<AdminDrawer
					open={true}
					onClose={mockOnClose}
					interviewId='interview123'
					isAdmin={true}
					nextInterview={mockNextInterview}
					onCompleteAndNext={onCompleteAndNext}
				/>
			);
			expect(screen.getByText('Jane Doe')).toBeInTheDocument();
			expect(screen.getByText('Applicant is waiting')).toBeInTheDocument();
			await act(async () => {
				fireEvent.click(screen.getByText('Complete & Next'));
			});
			expect(onCompleteAndNext).toHaveBeenCalledWith('next123');
		});

		it('sends wrap-up notice via Daily app message', async () => {
			render(<AdminDrawer open={true} onClose={mockOnClose} interviewId='interview123' isAdmin={true} />);
			await act(async () => {
				fireEvent.click(screen.getByText('Send Wrap-Up Notice'));
			});
			expect(mockSendAppMessage).toHaveBeenCalledWith(
				expect.objectContaining({ event: 'notify' }),
				'*'
			);
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'info' }));
		});

		it('toggles AUTO_DELIBERATE in site config', async () => {
			render(<AdminDrawer open={true} onClose={mockOnClose} interviewId='interview123' isAdmin={true} />);
			const toggle = screen.getByRole('switch', { name: /Deliberate after interviews/i });
			await act(async () => {
				fireEvent.click(toggle);
			});
			expect(updateDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ AUTO_DELIBERATE: true })
			);
		});
	});

	describe('Deliberation Mode (isDeliberation=true)', () => {
		it('renders deliberation UI with next and previous interviews', () => {
			render(<AdminDrawer open={true} onClose={mockOnClose} isDeliberation={true} nextInterview={mockNextInterview} previousInterview={mockPrevInterview} onStartNextInterview={mockOnStartNextInterview} />);

			// This should now pass because the real dayjs is being used
			expect(screen.getByText('Duration: 30m 0s')).toBeInTheDocument();
		});

		it('calls onRelevantAppsChange with app IDs from props', () => {
			render(<AdminDrawer open={true} onClose={mockOnClose} isDeliberation={true} nextInterview={mockNextInterview} previousInterview={mockPrevInterview} onRelevantAppsChange={mockOnRelevantAppsChange} />);
			expect(mockOnRelevantAppsChange).toHaveBeenCalledWith(['app123', 'app456']);
		});

		it('joins in-progress interview and starts next interview', async () => {
			const onJoinInterview = jest.fn();
			render(
				<AdminDrawer
					open={true}
					onClose={mockOnClose}
					isDeliberation={true}
					isAdmin={true}
					inProgressInterview={{ id: 'live-1', displayName: 'Live Candidate' }}
					nextInterview={mockNextInterview}
					onJoinInterview={onJoinInterview}
					onStartNextInterview={mockOnStartNextInterview}
				/>
			);
			await act(async () => {
				fireEvent.click(screen.getByText('Join Now'));
			});
			expect(onJoinInterview).toHaveBeenCalledWith('live-1');
		});

		it('starts next interview when none in progress', async () => {
			render(
				<AdminDrawer
					open={true}
					onClose={mockOnClose}
					isDeliberation={true}
					isAdmin={true}
					previousInterview={mockPrevInterview}
					nextInterview={mockNextInterview}
					onStartNextInterview={mockOnStartNextInterview}
				/>
			);
			await act(async () => {
				fireEvent.click(screen.getByText('Start Next Interview'));
			});
			expect(mockOnStartNextInterview).toHaveBeenCalledWith('next123');
		});
	});
});
