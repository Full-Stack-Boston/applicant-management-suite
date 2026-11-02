import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CallUI from './CallInterface'; // Import the default export
import { useParticipantProperty, useLocalSessionId, useDaily, useScreenShare, useParticipantIds, useDailyEvent } from '@daily-co/daily-react';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useMeeting } from '../../context/MeetingContext';

// Mock all hooks from @daily-co/daily-react
vi.mock('@daily-co/daily-react', () => ({
	useDailyEvent: jest.fn(),
	useParticipantProperty: jest.fn(),
	useLocalSessionId: jest.fn(),
	useDaily: jest.fn(),
	useScreenShare: jest.fn(),
	useParticipantIds: jest.fn(),
}));

// Mock Contexts
vi.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
vi.mock('../../context/AlertContext', () => ({ useAlert: jest.fn() }));
vi.mock('../../context/MeetingContext', () => ({ useMeeting: jest.fn() }));

// Mock react-router-dom
const mockNavigate = jest.fn();
vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useNavigate: () => mockNavigate,
}));

describe('CallUI (and sub-components)', () => {
	const mockCallObject = {
		leave: jest.fn(),
		setLocalAudio: jest.fn(),
		setLocalVideo: jest.fn(),
		startScreenShare: jest.fn(),
		stopScreenShare: jest.fn(),
		updateParticipant: jest.fn(),
		updateInputSettings: jest.fn(),
		on: jest.fn(),
		off: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Default Mocks
		useDaily.mockReturnValue(mockCallObject);
		useAuth.mockReturnValue({ member: true }); // Admin user
		useAlert.mockReturnValue({ showAlert: jest.fn() });
		useMeeting.mockReturnValue({ participantDetails: {} });
		useLocalSessionId.mockReturnValue('local-id');
		useScreenShare.mockReturnValue({ screens: [] });
		useParticipantIds.mockReturnValue(['local-id', 'remote-id-1']);

		// Default participant property mock
		useParticipantProperty.mockImplementation((id, prop) => {
			if (id === 'local-id' && prop === 'local') return true;
			if (id === 'local-id' && prop === 'user_name') return 'Local User';
			if (id === 'remote-id-1' && prop === 'user_name') return 'Remote User';
			if (prop === 'tracks.audio.state') return 'on';
			if (prop === 'tracks.video.state') return 'on';
			if (prop === 'audio') return true; // <-- ADD THIS
			if (prop === 'video') return true; // <-- ADD THIS
			return null;
		});
	});

	describe('ParticipantTile', () => {
		it('renders local user tile without admin menu', () => {
			useParticipantIds.mockReturnValue(['local-id']);
			render(<CallUI isAdmin={true} />, { wrapper: MemoryRouter });

			expect(screen.getByText('Local User')).toBeInTheDocument();
			expect(screen.queryByTestId('MoreVertIcon')).not.toBeInTheDocument();
		});

		it('renders remote user tile with admin menu for admin', () => {
			useParticipantIds.mockReturnValue(['remote-id-1']);
			render(<CallUI isAdmin={true} />, { wrapper: MemoryRouter });

			expect(screen.getByText('Remote User')).toBeInTheDocument();
			// Admin menu <MoreVert /> icon SHOULD be present
			expect(screen.getByTestId('MoreVertIcon')).toBeInTheDocument();
		});

		it('renders remote user tile without admin menu for non-admin', () => {
			useParticipantIds.mockReturnValue(['remote-id-1']);
			render(<CallUI isAdmin={false} />, { wrapper: MemoryRouter });

			expect(screen.getByText('Remote User')).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: /morevert/i })).not.toBeInTheDocument();
		});

		it('shows avatar when video is off', () => {
			useParticipantProperty.mockImplementation((id, prop) => {
				if (id === 'remote-id-1' && prop === 'user_name') return 'Remote User';
				if (prop === 'tracks.video.state') return 'off'; // Video is OFF
				if (prop === 'tracks.audio.state') return 'off'; // <-- ADD THIS
				return null;
			});
			useParticipantIds.mockReturnValue(['remote-id-1']);

			render(<CallUI isAdmin={true} />, { wrapper: MemoryRouter });

			expect(screen.getByText('R')).toBeInTheDocument(); // Avatar with first initial
			expect(screen.getByText('(Camera is off, mic is muted)')).toBeInTheDocument();
		});
	});

	describe('CallControls', () => {
		it('toggles microphone', () => {
			render(<CallUI isAdmin={true} />, { wrapper: MemoryRouter });
			fireEvent.click(screen.getByRole('button', { name: /mic/i }));
			expect(mockCallObject.setLocalAudio).toHaveBeenCalledWith(false); // Toggling from on (true) to false
		});

		it('toggles camera', () => {
			render(<CallUI isAdmin={true} />, { wrapper: MemoryRouter });
			fireEvent.click(screen.getByRole('button', { name: 'Stop camera' }));
			expect(mockCallObject.setLocalVideo).toHaveBeenCalledWith(false); // Toggling from on (true) to false
		});

		it('leaves call', () => {
			render(<CallUI isAdmin={true} />, { wrapper: MemoryRouter });
			fireEvent.click(screen.getByText('Exit'));
			expect(mockCallObject.leave).toHaveBeenCalled();
			expect(mockNavigate).toHaveBeenCalledWith('/members/interviews/dashboard');
		});

		it('toggles background blur and noise cancellation', async () => {
			mockCallObject.updateInputSettings.mockResolvedValue(undefined);
			render(<CallUI isAdmin={true} />, { wrapper: MemoryRouter });

			fireEvent.click(screen.getByTestId('BlurOffIcon').closest('button'));
			await waitFor(() => {
				expect(mockCallObject.updateInputSettings).toHaveBeenCalledWith(
					expect.objectContaining({ video: expect.any(Object) })
				);
			});

			// Second click disables blur
			fireEvent.click(screen.getByTestId('BlurOnIcon').closest('button'));
			await waitFor(() => {
				expect(mockCallObject.updateInputSettings).toHaveBeenCalledWith({
					video: { processor: { type: 'none' } },
				});
			});

			fireEvent.click(screen.getByTestId('NoiseControlOffIcon').closest('button'));
			await waitFor(() => {
				expect(mockCallObject.updateInputSettings).toHaveBeenCalledWith(
					expect.objectContaining({ audio: expect.any(Object) })
				);
			});

			fireEvent.click(screen.getByTestId('NoiseAwareIcon').closest('button'));
			await waitFor(() => {
				expect(mockCallObject.updateInputSettings).toHaveBeenCalledWith({
					audio: { processor: { type: 'none' } },
				});
			});
		});

		it('starts and stops screen share based on local screen track', () => {
			useParticipantProperty.mockImplementation((id, prop) => {
				if (id === 'local-id' && prop === 'local') return true;
				if (id === 'local-id' && prop === 'user_name') return 'Local User';
				if (prop === 'tracks.audio.state') return 'on';
				if (prop === 'tracks.video.state') return 'on';
				if (prop === 'audio') return true;
				if (prop === 'video') return true;
				if (prop === 'screen') return false;
				return null;
			});

			const { unmount } = render(<CallUI isAdmin={true} />, { wrapper: MemoryRouter });
			fireEvent.click(screen.getByTestId('ScreenShareIcon').closest('button'));
			expect(mockCallObject.startScreenShare).toHaveBeenCalled();
			unmount();

			useParticipantProperty.mockImplementation((id, prop) => {
				if (id === 'local-id' && prop === 'local') return true;
				if (prop === 'audio') return true;
				if (prop === 'video') return true;
				if (prop === 'screen') return true;
				if (prop === 'tracks.audio.state') return 'on';
				if (prop === 'tracks.video.state') return 'on';
				return null;
			});
			render(<CallUI isAdmin={true} />, { wrapper: MemoryRouter });
			fireEvent.click(screen.getByTestId('StopScreenShareIcon').closest('button'));
			expect(mockCallObject.stopScreenShare).toHaveBeenCalled();
		});

		it('opens admin drawer, apps drawer, and leaves as applicant', () => {
			const onOpenDrawer = jest.fn();
			const onOpenAdminDrawer = jest.fn();
			useAuth.mockReturnValue({ member: { id: 'm1' } });
			const { unmount } = render(
				<CallUI isAdmin={true} onOpenDrawer={onOpenDrawer} onOpenAdminDrawer={onOpenAdminDrawer} />,
				{ wrapper: MemoryRouter }
			);

			fireEvent.click(screen.getByTestId('AdminPanelSettingsIcon').closest('button'));
			expect(onOpenAdminDrawer).toHaveBeenCalled();
			fireEvent.click(screen.getByText('Apps'));
			expect(onOpenDrawer).toHaveBeenCalled();
			unmount();

			useAuth.mockReturnValue({ member: null });
			render(<CallUI isAdmin={false} />, { wrapper: MemoryRouter });
			fireEvent.click(screen.getByText('Exit'));
			expect(mockCallObject.leave).toHaveBeenCalled();
			expect(mockNavigate).toHaveBeenCalled();
		});
	});

	describe('ParticipantMenu and screen tiles', () => {
		it('runs admin mute/video/eject menu actions', async () => {
			const showAlert = jest.fn();
			useAlert.mockReturnValue({ showAlert });
			useParticipantIds.mockReturnValue(['remote-id-1']);
			render(<CallUI isAdmin={true} />, { wrapper: MemoryRouter });

			fireEvent.click(screen.getByTestId('MoreVertIcon').closest('button'));
			fireEvent.click(await screen.findByText('Mute Audio'));
			expect(mockCallObject.updateParticipant).toHaveBeenCalledWith('remote-id-1', { setAudio: false });

			fireEvent.click(screen.getByTestId('MoreVertIcon').closest('button'));
			fireEvent.click(await screen.findByText('Stop Video'));
			expect(mockCallObject.updateParticipant).toHaveBeenCalledWith('remote-id-1', { setVideo: false });

			fireEvent.click(screen.getByTestId('MoreVertIcon').closest('button'));
			fireEvent.click(await screen.findByText('Eject Participant'));
			expect(mockCallObject.updateParticipant).toHaveBeenCalledWith('remote-id-1', { eject: true });
		});

		it('renders screen share tiles when screens exist', () => {
			useScreenShare.mockReturnValue({ screens: [{ session_id: 'scr-1' }] });
			useParticipantIds.mockReturnValue([]);
			const { container } = render(<CallUI isAdmin={false} />, { wrapper: MemoryRouter });
			expect(container.querySelectorAll('video').length).toBeGreaterThan(0);
		});
	});

	describe('MediaStream attachment and fullscreen', () => {
		const OriginalMediaStream = global.MediaStream;

		afterEach(() => {
			global.MediaStream = OriginalMediaStream;
		});

		it('attaches videoTrack and audioTrack MediaStream on participant tile', async () => {
			const mediaStreamCtor = jest.fn(function MediaStreamMock(tracks) {
				this.tracks = tracks;
			});
			global.MediaStream = mediaStreamCtor;

			const videoTrack = { id: 'v-track', kind: 'video' };
			const audioTrack = { id: 'a-track', kind: 'audio' };

			useParticipantIds.mockReturnValue(['remote-id-1']);
			useParticipantProperty.mockImplementation((id, prop) => {
				if (id === 'remote-id-1' && prop === 'user_name') return 'Remote User';
				if (prop === 'tracks.audio.state') return 'on';
				if (prop === 'tracks.video.state') return 'on';
				if (prop === 'videoTrack') return videoTrack;
				if (prop === 'audioTrack') return audioTrack;
				if (prop === 'audio') return true;
				if (prop === 'video') return true;
				return null;
			});

			const { container } = render(<CallUI isAdmin={false} />, { wrapper: MemoryRouter });
			await waitFor(() => {
				expect(mediaStreamCtor).toHaveBeenCalled();
			});
			const passedTracks = mediaStreamCtor.mock.calls[0][0];
			expect(passedTracks).toEqual(expect.arrayContaining([videoTrack, audioTrack]));
			const videoEl = container.querySelector('video');
			expect(videoEl.srcObject).toBeTruthy();
		});

		it('clears participant tile MediaStream when tracks are missing', async () => {
			useParticipantIds.mockReturnValue(['remote-id-1']);
			useParticipantProperty.mockImplementation((id, prop) => {
				if (id === 'remote-id-1' && prop === 'user_name') return 'Remote User';
				if (prop === 'tracks.audio.state') return 'on';
				if (prop === 'tracks.video.state') return 'on';
				if (prop === 'videoTrack') return null;
				if (prop === 'audioTrack') return null;
				return null;
			});

			const { container } = render(<CallUI isAdmin={false} />, { wrapper: MemoryRouter });
			await waitFor(() => {
				const videoEl = container.querySelector('video');
				expect(videoEl).toBeTruthy();
				expect(videoEl.srcObject).toBeNull();
			});
		});

		it('attaches playable screen share track plus screen audio MediaStream', async () => {
			const mediaStreamCtor = jest.fn(function MediaStreamMock(tracks) {
				this.tracks = tracks;
			});
			global.MediaStream = mediaStreamCtor;

			const screenVideoTrack = { id: 'sv', kind: 'video' };
			const screenAudioTrack = { id: 'sa', kind: 'audio' };

			useScreenShare.mockReturnValue({ screens: [{ session_id: 'scr-1' }] });
			useParticipantIds.mockReturnValue([]);
			useParticipantProperty.mockImplementation((id, prop) => {
				if (id === 'scr-1' && prop === 'screenVideoTrack') return screenVideoTrack;
				if (id === 'scr-1' && prop === 'tracks.screenVideo.state') return 'playable';
				if (id === 'scr-1' && prop === 'tracks.screenAudioTrack') return screenAudioTrack;
				return null;
			});

			render(<CallUI isAdmin={false} />, { wrapper: MemoryRouter });
			await waitFor(() => {
				expect(mediaStreamCtor).toHaveBeenCalled();
			});
			expect(mediaStreamCtor.mock.calls[0][0]).toEqual(
				expect.arrayContaining([screenVideoTrack, screenAudioTrack])
			);
		});

		it('skips non-playable screen video track and clears empty screen MediaStream', async () => {
			const mediaStreamCtor = jest.fn(function MediaStreamMock(tracks) {
				this.tracks = tracks;
			});
			global.MediaStream = mediaStreamCtor;

			useScreenShare.mockReturnValue({ screens: [{ session_id: 'scr-2' }] });
			useParticipantIds.mockReturnValue([]);
			useParticipantProperty.mockImplementation((id, prop) => {
				if (id === 'scr-2' && prop === 'screenVideoTrack') return { id: 'loading' };
				if (id === 'scr-2' && prop === 'tracks.screenVideo.state') return 'loading';
				if (id === 'scr-2' && prop === 'tracks.screenAudioTrack') return null;
				return null;
			});

			const { container } = render(<CallUI isAdmin={false} />, { wrapper: MemoryRouter });
			await waitFor(() => {
				const videos = container.querySelectorAll('video');
				expect(videos.length).toBeGreaterThan(0);
			});
			expect(mediaStreamCtor).not.toHaveBeenCalled();
		});

		it('requests fullscreen from the screen share button and double-click', async () => {
			global.MediaStream = jest.fn(function MediaStreamMock(tracks) {
				this.tracks = tracks;
			});
			const requestFullscreen = jest.fn();
			useScreenShare.mockReturnValue({ screens: [{ session_id: 'scr-fs' }] });
			useParticipantIds.mockReturnValue([]);
			useParticipantProperty.mockImplementation((id, prop) => {
				if (id === 'scr-fs' && prop === 'screenVideoTrack') return { id: 'sv' };
				if (id === 'scr-fs' && prop === 'tracks.screenVideo.state') return 'playable';
				return null;
			});

			const { container } = render(<CallUI isAdmin={false} />, { wrapper: MemoryRouter });
			const videoEl = await waitFor(() => {
				const el = container.querySelector('video');
				expect(el).toBeTruthy();
				return el;
			});
			videoEl.requestFullscreen = requestFullscreen;

			fireEvent.click(screen.getByTestId('FullscreenIcon').closest('button'));
			expect(requestFullscreen).toHaveBeenCalledTimes(1);

			fireEvent.doubleClick(videoEl);
			expect(requestFullscreen).toHaveBeenCalledTimes(2);
		});

		it('shows picture avatar when video is off and pictureUrl is present', () => {
			useMeeting.mockReturnValue({
				participantDetails: {
					'remote-id-1': { pictureUrl: 'https://example.com/face.png' },
				},
			});
			useParticipantIds.mockReturnValue(['remote-id-1']);
			useParticipantProperty.mockImplementation((id, prop) => {
				if (id === 'remote-id-1' && prop === 'user_name') return 'Remote User';
				if (prop === 'tracks.video.state') return 'off';
				if (prop === 'tracks.audio.state') return 'on';
				return null;
			});

			render(<CallUI isAdmin={false} />, { wrapper: MemoryRouter });
			expect(screen.getByAltText('Remote User')).toHaveAttribute('src', 'https://example.com/face.png');
			expect(screen.getByText('(Camera is off)')).toBeInTheDocument();
		});

		it('falls back to Guest label when user_name is missing', () => {
			useParticipantIds.mockReturnValue(['remote-id-1']);
			useParticipantProperty.mockImplementation((id, prop) => {
				if (prop === 'tracks.audio.state') return 'on';
				if (prop === 'tracks.video.state') return 'on';
				if (prop === 'user_name') return null;
				return null;
			});
			render(<CallUI isAdmin={false} />, { wrapper: MemoryRouter });
			expect(screen.getByText('Guest')).toBeInTheDocument();
		});
	});

	describe('CallAlerter events', () => {
		it('alerts on join/leave/notify/eject events', () => {
			jest.useFakeTimers();
			const showAlert = jest.fn();
			useAlert.mockReturnValue({ showAlert });
			const handlers = {};
			useDailyEvent.mockImplementation((event, handler) => {
				handlers[event] = handler;
			});
			mockCallObject.participants = jest.fn(() => ({
				'sess-1': { user_name: 'Pat' },
			}));

			render(<CallUI isAdmin={true} />, { wrapper: MemoryRouter });

			handlers['participant-joined']({ participant: { local: true } });
			handlers['participant-joined']({ participant: { local: false, session_id: 'sess-1' } });
			jest.advanceTimersByTime(1500);
			expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Pat has joined') }));

			handlers['app-message']({ data: { event: 'notify', message: 'Wrap up' } });
			expect(showAlert).toHaveBeenCalledWith({ message: 'Wrap up', type: 'info' });

			handlers['participant-left']({ participant: { local: false, user_name: 'Sam' } });
			expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Sam has left') }));

			handlers['left-meeting']({ reason: 'ejected' });
			expect(showAlert).toHaveBeenCalledWith(
				expect.objectContaining({ message: expect.stringContaining('removed from the meeting'), type: 'error' })
			);

			jest.useRealTimers();
		});
	});
});

