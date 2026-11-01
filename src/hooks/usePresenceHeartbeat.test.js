import { renderHook, act } from '@testing-library/react';
import { usePresenceHeartbeat } from './usePresenceHeartbeat';
import { touchUserPresence, clearUserPresence } from '../config/data/firebase';

vi.mock('../config/data/firebase', () => ({
	touchUserPresence: jest.fn(() => Promise.resolve()),
	clearUserPresence: jest.fn(() => Promise.resolve()),
}));

describe('usePresenceHeartbeat', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('does nothing without a user uid', () => {
		renderHook(() => usePresenceHeartbeat(null, 'member', null, null));
		expect(touchUserPresence).not.toHaveBeenCalled();
	});

	it('pings with member display name and clears on unmount', () => {
		const { unmount } = renderHook(() =>
			usePresenceHeartbeat({ uid: 'u1' }, 'member', { firstName: 'Ada', lastName: 'Lovelace' }, null)
		);
		expect(touchUserPresence).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'u1', role: 'member', displayName: 'Ada Lovelace' })
		);
		unmount();
		expect(clearUserPresence).toHaveBeenCalledWith('u1');
	});

	it('falls back to applicant name and responds to visibility', () => {
		renderHook(() =>
			usePresenceHeartbeat({ uid: 'u2' }, null, null, { firstName: 'Pat', lastName: 'Lee' })
		);
		expect(touchUserPresence).toHaveBeenCalledWith(
			expect.objectContaining({ displayName: 'Pat Lee', role: '' })
		);

		touchUserPresence.mockClear();
		act(() => {
			Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
			document.dispatchEvent(new Event('visibilitychange'));
		});
		expect(touchUserPresence).toHaveBeenCalled();
	});
});
