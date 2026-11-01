import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Timer from './Timer';
import { useConfig } from '../../context/ConfigContext';

vi.mock('../../context/ConfigContext', () => ({ useConfig: jest.fn() }));
const mockOnModeChange = jest.fn();

describe('Timer', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	test('displays deadline countdown correctly', async () => {
		// useConfig.mockReturnValue must be set before render
		useConfig.mockReturnValue({
			APPLICATION_DEADLINE: '2025-12-31T23:59:59Z',
			NEXT_APPLICATION_OPEN_DATE: null,
		});

		// Set time to 9 seconds before deadline
		jest.setSystemTime(new Date('2025-12-31T23:59:50Z'));

		render(<Timer onModeChange={mockOnModeChange} />);

		await act(async () => {
			jest.advanceTimersByTime(1000);
		});

		await waitFor(() => {
			expect(screen.getByText(/Time Remaining:/)).toBeInTheDocument();
			// 8 seconds left now
			// --- THIS IS THE FIX ---
			// Use a regex to find the text *within* the element
			expect(screen.getByText(/0 Days, 0 Hours, 0 Minutes, 8 Seconds/)).toBeInTheDocument();
		});
	});

	test('displays closed message when past deadline', async () => {
		useConfig.mockReturnValue({
			APPLICATION_DEADLINE: '2025-12-31T23:59:59Z',
		});
		// Set time AFTER deadline
		jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));

		render(<Timer onModeChange={mockOnModeChange} />);
		await act(async () => {
			jest.advanceTimersByTime(1000);
		});

		await waitFor(() => {
			expect(screen.getByText(/period is closed/i)).toBeInTheDocument();
		});
	});

	test('enters closed mode when deadline is missing', async () => {
		useConfig.mockReturnValue({
			APPLICATION_DEADLINE: null,
			NEXT_APPLICATION_OPEN_DATE: null,
		});
		jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
		render(<Timer onModeChange={mockOnModeChange} />);
		await act(async () => {
			jest.advanceTimersByTime(1000);
		});
		await waitFor(() => {
			expect(mockOnModeChange).toHaveBeenCalledWith('closed');
		});
	});

	test('shows nextOpen countdown when open date is sooner than deadline', async () => {
		useConfig.mockReturnValue({
			APPLICATION_DEADLINE: '2026-12-31T23:59:59Z',
			NEXT_APPLICATION_OPEN_DATE: '2026-01-10T00:00:00Z',
		});
		jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
		render(<Timer onModeChange={mockOnModeChange} />);
		await act(async () => {
			jest.advanceTimersByTime(1000);
		});
		await waitFor(() => {
			expect(mockOnModeChange).toHaveBeenCalledWith('nextOpen');
		});
	});

	test('shows nextOpen after deadline when closer to next open', async () => {
		useConfig.mockReturnValue({
			APPLICATION_DEADLINE: '2025-12-01T00:00:00Z',
			NEXT_APPLICATION_OPEN_DATE: '2026-01-15T00:00:00Z',
		});
		jest.setSystemTime(new Date('2026-01-10T00:00:00Z'));
		render(<Timer onModeChange={mockOnModeChange} />);
		await act(async () => {
			jest.advanceTimersByTime(1000);
		});
		await waitFor(() => {
			expect(mockOnModeChange).toHaveBeenCalledWith('nextOpen');
		});
	});
});
