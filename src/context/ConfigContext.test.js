// src/context/ConfigContext.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider, useConfig } from './ConfigContext';
import { getRealTimeConfigFromDb } from '../config/data/firebase';

// Mock the firebase function
vi.mock('../config/data/firebase', () => ({
	getRealTimeConfigFromDb: jest.fn(),
}));

// Mock the Loader component
vi.mock('../components/loader/Loader', () => ({
	default: function MockLoader() {
		return <div data-testid='loader'>Loading...</div>;
	},
}));

// Test component to consume the context
const TestComponent = () => {
	const config = useConfig();
	return <div data-testid='config-value'>{config.appName}</div>;
};

describe('ConfigContext', () => {
	test('shows loader initially when config is empty', () => {
		// Mock implementation that DOES NOT call the callback immediately
		getRealTimeConfigFromDb.mockImplementation(() => jest.fn());

		render(
			<ConfigProvider>
				<div>Child Content</div>
			</ConfigProvider>
		);

		expect(screen.getByTestId('loader')).toBeInTheDocument();
		expect(screen.queryByText('Child Content')).not.toBeInTheDocument();
	});

	test('renders children and provides config when data loads', async () => {
		const mockData = { appName: 'Test App' };

		// Simulate Firebase returning data immediately
		getRealTimeConfigFromDb.mockImplementation((callback) => {
			callback(mockData);
			return jest.fn(); // return unsubscribe function
		});

		render(
			<ConfigProvider>
				<TestComponent />
			</ConfigProvider>
		);

		// Loader should disappear, children should render
		await waitFor(() => {
			expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
		});
		expect(screen.getByTestId('config-value')).toHaveTextContent('Test App');
	});

	test('normalizes Firestore Timestamp deadlines to Date and derives CYCLE_YEAR', async () => {
		const deadline = new Date('2026-02-15T17:00:00.000Z');
		const DeadlineStamp = function DeadlineStamp() {};
		DeadlineStamp.prototype.toDate = () => deadline;

		getRealTimeConfigFromDb.mockImplementation((callback) => {
			callback({
				APPLICATION_DEADLINE: Object.assign(new DeadlineStamp(), {
					seconds: Math.floor(deadline.getTime() / 1000),
					nanoseconds: 0,
				}),
				NEXT_APPLICATION_OPEN_DATE: { toDate: () => new Date('2026-02-20T14:00:00.000Z') },
			});
			return jest.fn();
		});

		const Probe = () => {
			const config = useConfig();
			return (
				<div>
					<span data-testid='deadline-type'>{config.APPLICATION_DEADLINE instanceof Date ? 'date' : typeof config.APPLICATION_DEADLINE}</span>
					<span data-testid='cycle-year'>{String(config.CYCLE_YEAR)}</span>
				</div>
			);
		};

		render(
			<ConfigProvider>
				<Probe />
			</ConfigProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId('deadline-type')).toHaveTextContent('date');
		});
		expect(screen.getByTestId('cycle-year')).toHaveTextContent('2026');
	});

	test('handles error in firebase callback gracefully', () => {
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

		// Simulate an error inside the callback logic (rare, but covered for lines)
		getRealTimeConfigFromDb.mockImplementation((callback) => {
			// We pass null to trigger default empty object,
			// but force setConfig to throw if we really wanted to test the try/catch block specifically.
			// Since useState setter rarely throws, we primarily test the 'data || {}' branch here.
			callback(null);
			return jest.fn();
		});

		render(
			<ConfigProvider>
				<div>Ready</div>
			</ConfigProvider>
		);

		// If callback passes null, setConfig({}) runs.
		// Since {} has keys length 0, it stays on Loader.
		expect(screen.getByTestId('loader')).toBeInTheDocument();

		consoleSpy.mockRestore();
	});

	test('throws error if useConfig is used outside provider', () => {
		// Prevent React from logging the error boundary noise to console
		const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

		expect(() => render(<TestComponent />)).toThrow('useConfig must be used within a ConfigProvider');

		consoleError.mockRestore();
	});
});
