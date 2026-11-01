import { renderHook, waitFor } from '@testing-library/react';
import { useRealTimeList } from './useRealTimeList';
import { useAuth } from '../context/AuthContext';
import { getCollectionData } from '../config/data/firebase';
import { useParams } from 'react-router-dom';
import { useConfig } from '../context/ConfigContext';

// --- MOCKS ---
vi.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
vi.mock('../context/ConfigContext', () => ({ useConfig: jest.fn() }));
vi.mock('react-router-dom', () => ({ useParams: jest.fn() }));

vi.mock('../config/data/firebase', () => ({
	getCollectionData: jest.fn(),
}));

const mockFetcher = jest.fn();
const mockInterviewFetcher = jest.fn();
vi.mock('../config/admin', () => ({
	adminLists: {
		testList: {
			fetcher: (handler, cycleYear, type) => {
				mockFetcher(handler, cycleYear, type);
				handler([{ id: '1', name: 'Test Item' }]);
				return jest.fn();
			},
			enrich: false,
		},
		noFetcher: {
			enrich: false,
		},
		interviews: {
			fetcher: (handler, uid, isMember) => {
				mockInterviewFetcher(handler, uid, isMember);
				handler([{ id: 'iv1' }]);
				return jest.fn();
			},
			enrich: false,
		},
		archives: {
			fetcher: (handler, cycleYear, type) => {
				mockFetcher(handler, cycleYear, type);
				handler([]);
				return jest.fn();
			},
			enrich: false,
		},
		enrichedList: {
			fetcher: (handler) => {
				handler([
					{ id: 'app1', profile: 'prof1', completedBy: 'user1' },
					{ id: 'app2', profile: null },
				]);
				return jest.fn();
			},
			enrich: true,
		},
		enrichedFailList: {
			fetcher: (handler) => {
				handler([{ id: 'app1', profile: 'prof1', completedBy: 'user1' }]);
				return jest.fn();
			},
			enrich: true,
		},
	},
}));

describe('useRealTimeList', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useAuth.mockReturnValue({ user: { uid: 'admin' }, member: true });
		useParams.mockReturnValue({ year: null });
		useConfig.mockReturnValue({ CYCLE_YEAR: 2025, APPLICATION_DEADLINE: '2025-06-01' });
	});

	test('returns empty state if disabled', () => {
		const { result } = renderHook(() => useRealTimeList('testList', false));
		expect(result.current.data).toEqual([]);
		expect(result.current.loading).toBe(false);
	});

	test('fetches data using configured fetcher', async () => {
		const { result } = renderHook(() => useRealTimeList('testList', true));

		await waitFor(() => {
			expect(result.current.data).toHaveLength(1);
		});

		expect(result.current.data[0].name).toBe('Test Item');
		expect(result.current.loading).toBe(false);
		expect(mockFetcher).toHaveBeenCalledWith(expect.any(Function), 2025, 'testList');
	});

	test('enriches data by fetching profiles', async () => {
		getCollectionData.mockResolvedValue({
			applicantFirstName: 'John',
			applicantLastName: 'Doe',
		});

		const { result } = renderHook(() => useRealTimeList('enrichedList', true));

		await waitFor(() => {
			const enrichedItem = result.current.data.find((i) => i.id === 'app1');
			expect(enrichedItem).toHaveProperty('applicantName', 'John Doe');
		});

		const noProfileItem = result.current.data.find((i) => i.id === 'app2');
		expect(noProfileItem.applicantName).toBe('Unknown Applicant');
	});

	test('logs and marks profiles as not_found when enrichment fetch fails', async () => {
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		getCollectionData.mockRejectedValue(new Error('boom'));
		renderHook(() => useRealTimeList('enrichedFailList', true));
		await waitFor(() => {
			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch profile'), expect.any(Error));
		});
		consoleSpy.mockRestore();
	});

	test('uses interview-specific fetcher with user id', async () => {
		const { result } = renderHook(() => useRealTimeList('interviews', true));
		await waitFor(() => {
			expect(result.current.data).toHaveLength(1);
		});
		expect(mockInterviewFetcher).toHaveBeenCalledWith(expect.any(Function), 'admin', true);
	});

	test('allows scope-optional types without a cycle year', async () => {
		useConfig.mockReturnValue({});
		useParams.mockReturnValue({});
		const { result } = renderHook(() => useRealTimeList('archives', true));
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});
		expect(mockFetcher).toHaveBeenCalledWith(expect.any(Function), undefined, 'archives');
	});

	test('stops loading when cycle year is missing for scoped types', async () => {
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		useConfig.mockReturnValue({});
		useParams.mockReturnValue({});
		const { result } = renderHook(() => useRealTimeList('testList', true));
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});
		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Missing cycleYear'));
		consoleSpy.mockRestore();
	});

	test('stops loading when list config has no fetcher', async () => {
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		const { result } = renderHook(() => useRealTimeList('noFetcher', true));
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});
		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No fetcher function'));
		consoleSpy.mockRestore();
	});

	test('stops loading for unknown list types', async () => {
		const { result } = renderHook(() => useRealTimeList('does-not-exist', true));
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});
		expect(result.current.data).toEqual([]);
	});

	test('prefers URL year and CYCLE_YEAR over deadline year', async () => {
		useParams.mockReturnValue({ year: '2023' });
		useConfig.mockReturnValue({ CYCLE_YEAR: 2099, APPLICATION_DEADLINE: '2025-01-01' });
		renderHook(() => useRealTimeList('testList', true));
		await waitFor(() => {
			expect(mockFetcher).toHaveBeenCalledWith(expect.any(Function), 2023, 'testList');
		});

		jest.clearAllMocks();
		useParams.mockReturnValue({});
		useConfig.mockReturnValue({ CYCLE_YEAR: 2099 });
		renderHook(() => useRealTimeList('testList', true));
		await waitFor(() => {
			expect(mockFetcher).toHaveBeenCalledWith(expect.any(Function), 2099, 'testList');
		});
	});

	test('ignores non-numeric URL year values and skips scoped fetch', async () => {
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		useParams.mockReturnValue({ year: 'not-a-year' });
		useConfig.mockReturnValue({ APPLICATION_DEADLINE: '2024-06-01' });
		const { result } = renderHook(() => useRealTimeList('testList', true));
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});
		expect(mockFetcher).not.toHaveBeenCalled();
		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Missing cycleYear'));
		consoleSpy.mockRestore();
	});
});
