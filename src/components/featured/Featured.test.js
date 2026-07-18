import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Featured from './Featured';
import { useConfig } from '../../context/ConfigContext';
import * as firebase from '../../config/data/firebase';
import { ApplicationType } from '../../config/data/collections';

vi.mock('../../context/ConfigContext', () => ({
	useConfig: jest.fn(),
}));

vi.mock('../../config/data/firebase', () => ({
	getDashboardBenchmarkData: jest.fn(),
}));

vi.mock('../timer/Timer', () => ({ default: () => <div data-testid='timer'>Timer</div> }));

vi.mock('../../config/data/collections', () => ({
	ApplicationType: {
		newApplication: 'New',
		returningGrant: 'Returning',
		scholarship: 'Scholarship',
	},
}));

const mockUseConfig = useConfig;
const mockGetDashboardData = firebase.getDashboardBenchmarkData;

describe('Featured', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		mockUseConfig.mockReturnValue({
			APPLICATION_DEADLINE: '2025-12-31T23:59:59Z',
			CYCLE_YEAR: 2025,
		});

		jest.useFakeTimers().setSystemTime(new Date('2025-12-21T12:00:00Z'));

		mockGetDashboardData.mockResolvedValue({
			currentCounts: {
				[ApplicationType.newApplication]: 10,
				[ApplicationType.returningGrant]: 20,
				[ApplicationType.scholarship]: 5,
			},
			benchmarkTargets: {
				[ApplicationType.newApplication]: 20,
				[ApplicationType.returningGrant]: 20,
				[ApplicationType.scholarship]: 50,
			},
			awardTrends: [
				{ year: 2022, New: 1, Returning: 2, Scholarship: 3 },
				{ year: 2023, New: 4, Returning: 5, Scholarship: 6 },
				{ year: 2024, New: 7, Returning: 8, Scholarship: 9 },
			],
		});
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	test('renders benchmark progress and 3-year trends', async () => {
		await act(async () => {
			render(<Featured />);
		});

		await waitFor(() => {
			expect(screen.getByText(/BENCHMARK PROGRESS/i)).toBeInTheDocument();
			expect(screen.getByText(/3-Year Award Trends/i)).toBeInTheDocument();
		});
	});

	test('renders Timer component', async () => {
		await act(async () => {
			render(<Featured />);
		});
		await waitFor(() => {
			expect(screen.getByTestId('timer')).toBeInTheDocument();
		});
	});

	test('calculates and displays deadline and days left', async () => {
		await act(async () => {
			render(<Featured />);
		});

		await waitFor(() => {
			expect(screen.getByText(/Deadline: 12\/31\/2025/i)).toBeInTheDocument();
			expect(screen.getByText(/11 days left/i)).toBeInTheDocument();
		});
	});

	test('fetches data and renders progress bars correctly', async () => {
		await act(async () => {
			render(<Featured />);
		});

		await waitFor(() => {
			expect(mockGetDashboardData).toHaveBeenCalledWith(2025);

			expect(screen.getByText('New Applicants: 10 / 20 (50%)')).toBeInTheDocument();
			expect(screen.getByText('Returning Grants: 20 / 20 (100%)')).toBeInTheDocument();
			expect(screen.getByText('Scholarships: 5 / 50 (10%)')).toBeInTheDocument();

			const progressBars = screen.getAllByRole('progressbar');
			expect(progressBars[0]).toHaveAttribute('aria-valuenow', '50');
			expect(progressBars[1]).toHaveAttribute('aria-valuenow', '100');
			expect(progressBars[2]).toHaveAttribute('aria-valuenow', '10');
		});
	});

	test('renders 3-year history correctly', async () => {
		await act(async () => {
			render(<Featured />);
		});

		await waitFor(() => {
			expect(screen.getByText('2022')).toBeInTheDocument();
			expect(screen.getByText('2023')).toBeInTheDocument();
			expect(screen.getByText('2024')).toBeInTheDocument();
			expect(screen.getByText('⬤ New')).toBeInTheDocument();
			expect(screen.getByText('⬤ Returning')).toBeInTheDocument();
			expect(screen.getByText('⬤ Scholarship')).toBeInTheDocument();
		});
	});
	test('renders dashboard variant and near-deadline progress styling', async () => {
		jest.useFakeTimers().setSystemTime(new Date('2025-12-28T12:00:00Z'));
		mockGetDashboardData.mockResolvedValue({
			currentCounts: {
				[ApplicationType.newApplication]: 2,
				[ApplicationType.returningGrant]: 0,
				[ApplicationType.scholarship]: 0,
			},
			benchmarkTargets: {
				[ApplicationType.newApplication]: 20,
				[ApplicationType.returningGrant]: 20,
				[ApplicationType.scholarship]: 50,
			},
			awardTrends: [],
		});

		await act(async () => {
			render(<Featured variant='dashboard' />);
		});

		await waitFor(() => {
			expect(screen.getByText(/days left/i)).toBeInTheDocument();
			expect(screen.getByText('New Applicants: 2 / 20 (10%)')).toBeInTheDocument();
		});
	});

	test('shows today when deadline matches current timestamp', async () => {
		const sameInstant = new Date('2025-12-31T23:59:59.000Z');
		jest.useFakeTimers().setSystemTime(sameInstant);
		mockUseConfig.mockReturnValue({
			APPLICATION_DEADLINE: sameInstant.toISOString(),
			CYCLE_YEAR: 2025,
		});

		await act(async () => {
			render(<Featured />);
		});

		await waitFor(() => {
			expect(screen.getByText(/\(today\)/i)).toBeInTheDocument();
		});
	});
});

