import { renderHook, waitFor } from '@testing-library/react';
import { useApplicationAttachmentProgress } from './useApplicationAttachmentProgress';
import { ApplicationStatus } from '../../config/data/collections';

const { mockGetCollectionData } = vi.hoisted(() => ({
	mockGetCollectionData: jest.fn(),
}));

vi.mock('../../config/data/firebase', () => ({
	getCollectionData: (...args) => mockGetCollectionData(...args),
}));

const EMPTY_APPS = [];

describe('useApplicationAttachmentProgress', () => {
	beforeEach(() => {
		mockGetCollectionData.mockReset();
	});

	it('returns an empty map when there are no applications', () => {
		const { result } = renderHook(() => useApplicationAttachmentProgress(EMPTY_APPS));
		expect(result.current).toEqual({});
		expect(mockGetCollectionData).not.toHaveBeenCalled();
	});

	it('uses fallback progress when attachments or completedBy are missing', async () => {
		const apps = [
			{ id: 'a1', type: 'New Applicant', status: ApplicationStatus.started },
			{ id: 'a2', type: 'New Applicant', status: ApplicationStatus.started, attachments: 'att-1' },
		];
		const { result } = renderHook(() => useApplicationAttachmentProgress(apps));
		await waitFor(() => {
			expect(Object.keys(result.current)).toEqual(expect.arrayContaining(['a1', 'a2']));
		});
		expect(mockGetCollectionData).not.toHaveBeenCalled();
	});

	it('loads attachment progress for applications with attachment ids', async () => {
		mockGetCollectionData.mockResolvedValue({
			applicantPersonalLetter: { home: 'https://example.com/letter.pdf' },
		});
		const apps = [
			{
				id: 'a1',
				type: 'New Applicant',
				status: ApplicationStatus.started,
				attachments: 'att-1',
				completedBy: 'user-1',
			},
		];
		const { result } = renderHook(() => useApplicationAttachmentProgress(apps));
		await waitFor(() => {
			expect(result.current.a1?.uploaded).toBeGreaterThan(0);
		});
		expect(mockGetCollectionData).toHaveBeenCalled();
	});

	it('falls back when attachment fetch fails', async () => {
		mockGetCollectionData.mockRejectedValue(new Error('network'));
		const apps = [
			{
				id: 'a1',
				type: 'New Applicant',
				status: ApplicationStatus.started,
				attachments: 'att-1',
				completedBy: 'user-1',
			},
		];
		const { result } = renderHook(() => useApplicationAttachmentProgress(apps));
		await waitFor(() => {
			expect(result.current.a1).toBeTruthy();
		});
	});
});
