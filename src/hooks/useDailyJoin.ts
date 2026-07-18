/**
 * Joins a Daily call once per enabled/token/device change.
 * Callbacks are held in refs so unstable parent handlers (e.g. toasts) cannot re-trigger leave+join.
 */

import { useEffect, useRef } from 'react';
import type { DailyCall } from '@daily-co/daily-js';

interface JoinTokenResult {
	token?: string | null;
	roomUrl?: string | null;
}

interface UseDailyJoinOptions {
	callObject: DailyCall | null;
	enabled: boolean;
	fetchToken: () => Promise<JoinTokenResult>;
	videoDeviceId: string | null;
	audioDeviceId: string | null;
	onJoined: () => void;
	onError: (err: unknown) => void;
}

/** Joins a Daily call with a cleaned-up joined-meeting listener; re-runs safely on dependency changes. */
export const useDailyJoin = ({ callObject, enabled, fetchToken, videoDeviceId, audioDeviceId, onJoined, onError }: UseDailyJoinOptions) => {
	const onJoinedRef = useRef(onJoined);
	const onErrorRef = useRef(onError);
	const fetchTokenRef = useRef(fetchToken);

	useEffect(() => {
		onJoinedRef.current = onJoined;
	}, [onJoined]);

	useEffect(() => {
		onErrorRef.current = onError;
	}, [onError]);

	useEffect(() => {
		fetchTokenRef.current = fetchToken;
	}, [fetchToken]);

	useEffect(() => {
		if (!callObject || !enabled) return;

		let cancelled = false;

		const handleJoinedMeeting = () => {
			if (!cancelled) onJoinedRef.current();
		};

		callObject.on('joined-meeting', handleJoinedMeeting);

		const joinCall = async () => {
			try {
				const { token, roomUrl } = await fetchTokenRef.current();
				if (cancelled) return;

				if (!token || !roomUrl) throw new Error('Invalid token or roomUrl received.');

				const state = callObject.meetingState();
				if (state === 'joined-meeting' || state === 'joining-meeting') {
					await callObject.leave();
				}

				if (cancelled) return;

				await callObject.join({
					url: roomUrl,
					token,
					videoSource: videoDeviceId || true,
					audioSource: audioDeviceId || true,
				});
			} catch (err) {
				if (!cancelled) {
					console.error('Daily join failed:', err);
					onErrorRef.current(err);
				}
			}
		};

		joinCall();

		return () => {
			cancelled = true;
			callObject.off('joined-meeting', handleJoinedMeeting);
		};
	}, [callObject, enabled, videoDeviceId, audioDeviceId]);
};
