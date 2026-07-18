import { renderHook, waitFor } from '@testing-library/react';
import { useDailyJoin } from './useDailyJoin';

describe('useDailyJoin', () => {
	let mockCallObject;

	beforeEach(() => {
		vi.clearAllMocks();
		mockCallObject = {
			on: vi.fn(),
			off: vi.fn(),
			join: vi.fn().mockResolvedValue(undefined),
			leave: vi.fn().mockResolvedValue(undefined),
			meetingState: vi.fn().mockReturnValue('left-meeting'),
		};
	});

	test('registers joined-meeting listener and joins when enabled', async () => {
		const onJoined = vi.fn();
		const fetchToken = vi.fn().mockResolvedValue({ token: 'tok', roomUrl: 'https://daily.test/room' });

		renderHook(() =>
			useDailyJoin({
				callObject: mockCallObject,
				enabled: true,
				fetchToken,
				videoDeviceId: 'cam',
				audioDeviceId: 'mic',
				onJoined,
				onError: vi.fn(),
			})
		);

		await waitFor(() => expect(fetchToken).toHaveBeenCalled());
		expect(mockCallObject.on).toHaveBeenCalledWith('joined-meeting', expect.any(Function));
		expect(mockCallObject.join).toHaveBeenCalledWith({
			url: 'https://daily.test/room',
			token: 'tok',
			videoSource: 'cam',
			audioSource: 'mic',
		});

		const joinedHandler = mockCallObject.on.mock.calls.find((call) => call[0] === 'joined-meeting')?.[1];
		joinedHandler?.();
		expect(onJoined).toHaveBeenCalled();
	});

	test('does not re-join when onJoined/onError identities change', async () => {
		const fetchToken = vi.fn().mockResolvedValue({ token: 'tok', roomUrl: 'https://daily.test/room' });
		let onJoined = vi.fn();
		let onError = vi.fn();

		const { rerender } = renderHook(
			({ onJoined: joined, onError: errored }) =>
				useDailyJoin({
					callObject: mockCallObject,
					enabled: true,
					fetchToken,
					videoDeviceId: null,
					audioDeviceId: null,
					onJoined: joined,
					onError: errored,
				}),
			{ initialProps: { onJoined, onError } }
		);

		await waitFor(() => expect(fetchToken).toHaveBeenCalledTimes(1));

		onJoined = vi.fn();
		onError = vi.fn();
		rerender({ onJoined, onError });

		await waitFor(() => expect(fetchToken).toHaveBeenCalledTimes(1));
		expect(mockCallObject.leave).not.toHaveBeenCalled();
	});

	test('cleans up listener on unmount', async () => {
		const fetchToken = vi.fn().mockResolvedValue({ token: 'tok', roomUrl: 'https://daily.test/room' });

		const { unmount } = renderHook(() =>
			useDailyJoin({
				callObject: mockCallObject,
				enabled: true,
				fetchToken,
				videoDeviceId: null,
				audioDeviceId: null,
				onJoined: vi.fn(),
				onError: vi.fn(),
			})
		);

		await waitFor(() => expect(fetchToken).toHaveBeenCalled());
		const joinedHandler = mockCallObject.on.mock.calls.find((call) => call[0] === 'joined-meeting')?.[1];
		unmount();
		expect(mockCallObject.off).toHaveBeenCalledWith('joined-meeting', joinedHandler);
	});
});
