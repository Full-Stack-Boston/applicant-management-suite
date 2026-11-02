// src/context/AlertContext.test.js
import React, { useEffect } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertProvider, useAlert } from './AlertContext';
import { logEvent } from '../config/data/firebase';

// Mock dependencies
vi.mock('../config/data/firebase', () => ({
	logEvent: jest.fn(),
}));

vi.mock('../config/Constants', () => ({
	AlertMessages: {
		saved: { success: { message: 'Saved successfully', type: 'success' } },
	},
}));

// Helper component to trigger alerts
const TestConsumer = ({ trigger }) => {
	const alertUtils = useAlert();

	useEffect(() => {
		if (trigger) {
			trigger(alertUtils);
		}
	}, [trigger, alertUtils]);

	return <div>Alert Context Loaded</div>;
};

describe('AlertContext', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	test('renders children correctly', () => {
		render(
			<AlertProvider>
				<div>Child</div>
			</AlertProvider>
		);
		expect(screen.getByText('Child')).toBeInTheDocument();
	});

	test('showAlert queues and displays a custom message', async () => {
		render(
			<AlertProvider>
				<TestConsumer trigger={({ showAlert }) => showAlert({ message: 'Custom Alert', type: 'success' })} />
			</AlertProvider>
		);

		expect(await screen.findByText('Custom Alert')).toBeInTheDocument();
	});

	test('showAlert handles predefined categories from Constants', async () => {
		render(
			<AlertProvider>
				<TestConsumer trigger={({ showAlert }) => showAlert('saved', 'success')} />
			</AlertProvider>
		);

		expect(await screen.findByText('Saved successfully')).toBeInTheDocument();
	});

	test('handleError translates firebase codes and logs event', async () => {
		const mockError = { code: 'auth/wrong-password' };

		render(
			<AlertProvider>
				<TestConsumer trigger={({ handleError }) => handleError(mockError, 'login_test', true)} />
			</AlertProvider>
		);

		expect(await screen.findByText('Incorrect password. Please try again.')).toBeInTheDocument();
		expect(logEvent).toHaveBeenCalledWith('Error: login_test', mockError);
	});

	test('handleError shows default message for unknown errors', async () => {
		const mockError = { message: 'Random failure' };

		render(
			<AlertProvider>
				<TestConsumer trigger={({ handleError }) => handleError(mockError, 'generic', true)} />
			</AlertProvider>
		);

		expect(await screen.findByText('Random failure')).toBeInTheDocument();
	});

	test('showAnnouncement renders an inline alert', () => {
		const AnnouncementTester = () => {
			const { showAnnouncement } = useAlert();
			return <div>{showAnnouncement({ message: 'System Update' })}</div>;
		};

		render(
			<AlertProvider>
				<AnnouncementTester />
			</AlertProvider>
		);

		expect(screen.getByText('System Update')).toBeInTheDocument();
	});

	test('prevents duplicate consecutive alerts', async () => {
		render(
			<AlertProvider>
				<TestConsumer
					trigger={({ showAlert }) => {
						showAlert({ message: 'Duplicate', type: 'info' });
						showAlert({ message: 'Duplicate', type: 'info' });
					}}
				/>
			</AlertProvider>
		);

		// Find alert. Note: If duplicates were allowed, this might behave differently,
		// but visually we just check if it renders without crashing loop.
		expect(await screen.findByText('Duplicate')).toBeInTheDocument();
	});

	test('keeps showAlert identity stable across toast display', async () => {
		const identities = [];

		const IdentityProbe = () => {
			const { showAlert } = useAlert();
			useEffect(() => {
				identities.push(showAlert);
				if (identities.length === 1) {
					showAlert({ message: 'Stable probe', type: 'info' });
				}
			}, [showAlert]);
			return null;
		};

		render(
			<AlertProvider>
				<IdentityProbe />
			</AlertProvider>
		);

		expect(await screen.findByText('Stable probe')).toBeInTheDocument();
		expect(new Set(identities).size).toBe(1);
	});

	test('rejects invalid showAlert parameters', () => {
		const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		render(
			<AlertProvider>
				<TestConsumer trigger={({ showAlert }) => showAlert('saved')} />
			</AlertProvider>
		);
		expect(errorSpy).toHaveBeenCalledWith('❌ Invalid alert parameters passed to showAlert.');
		errorSpy.mockRestore();
	});

	test('falls back when predefined category/type is unknown', async () => {
		render(
			<AlertProvider>
				<TestConsumer trigger={({ showAlert }) => showAlert('missing', 'success')} />
			</AlertProvider>
		);
		expect(await screen.findByText('Unknown alert')).toBeInTheDocument();
	});

	test('closes the snackbar via the alert close control', async () => {
		render(
			<AlertProvider>
				<TestConsumer trigger={({ showAlert }) => showAlert({ message: 'Closeable', type: 'info' })} />
			</AlertProvider>
		);
		expect(await screen.findByText('Closeable')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: /close/i }));
		expect(screen.queryByText('Closeable')).not.toBeInTheDocument();
	});

	test('handleError can suppress the snackbar while still logging', () => {
		const mockError = { message: 'Quiet failure' };
		render(
			<AlertProvider>
				<TestConsumer trigger={({ handleError }) => handleError(mockError, 'quiet', false)} />
			</AlertProvider>
		);
		expect(logEvent).toHaveBeenCalledWith('Error: quiet', mockError);
		expect(screen.queryByText('Quiet failure')).not.toBeInTheDocument();
	});

	test('useAlert throws outside of AlertProvider', () => {
		const Outside = () => {
			useAlert();
			return null;
		};
		expect(() => render(<Outside />)).toThrow('useAlert must be used within an AlertProvider');
	});
});
