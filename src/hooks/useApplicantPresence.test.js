import { renderHook } from '@testing-library/react';
import { useApplicantPresence } from './useApplicantPresence';
import { updateDoc } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
	doc: vi.fn(() => 'mock-ref'),
	updateDoc: vi.fn(() => Promise.resolve()),
}));

vi.mock('../config/data/firebase', () => ({
	db: {},
}));

describe('useApplicantPresence', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('marks present on mount and clears on unmount when enabled', () => {
		const { unmount } = renderHook(({ id, enabled }) => useApplicantPresence(id, enabled), {
			initialProps: { id: 'int-1', enabled: true },
		});

		expect(updateDoc).toHaveBeenCalledWith('mock-ref', { applicantPresent: true });

		unmount();

		expect(updateDoc).toHaveBeenCalledWith('mock-ref', { applicantPresent: false });
	});

	test('does nothing when disabled', () => {
		renderHook(() => useApplicantPresence('int-1', false));
		expect(updateDoc).not.toHaveBeenCalled();
	});
});
