import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccessDenied from './AccessDenied';
import { useAuth } from '../../context/AuthContext';
import { isAdminPath } from '../../config/navigation/routeUtils';

// --- Mocks ---

// 1. Mock Auth Context
vi.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

// 2. Minimal mocks for config files
vi.mock('../../config/navigation/routeUtils', () => ({
	isAdminPath: jest.fn(),
	generatePath: () => '/',
}));
vi.mock('../../config/navigation/paths', () => ({
	paths: { home: 'default', redirect: 'default' },
}));

vi.mock('../../utils/lottie', () => ({
	default: function MockLottie() {
		return <div data-testid='lottie-animation'>Lottie Animation</div>;
	},
}));

// 4. Mock Constants
vi.mock('../../config/Constants', () => ({
	Assets: { accessDeniedLottie: 'mock-animation-data' },
	brand: { theOrganizationName: 'AMS', organizationName: 'AMS', shortName: 'AMS', githubUrl: '', githubLabel: 'GitHub' },
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: () => ({ primaryColor: '#0288D1', darkMode: false, boxShadow: 'none' }),
}));

vi.mock('../home/homePageStyles', () => ({
	homeAuthSubmitButtonSx: () => ({}),
	homeStatusPageLottieSx: {},
	homeStatusPageLottieSquareSx: {},
}));

vi.mock('../home/PublicStatusPage', () => ({
	__esModule: true,
	default: ({ title, children, subtitle }) => (
		<div data-testid='public-status-page'>
			<h1>{title}</h1>
			{subtitle && <p>{subtitle}</p>}
			{children}
		</div>
	),
}));

describe('AccessDenied Component', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		isAdminPath.mockReturnValue(false);
	});

	test('renders 403 text and animation', () => {
		useAuth.mockReturnValue({ user: null });

		render(
			<MemoryRouter>
				<AccessDenied />
			</MemoryRouter>
		);

		expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
		expect(screen.getByTestId('lottie-animation')).toBeInTheDocument();
	});

	test('displays custom message if provided', () => {
		useAuth.mockReturnValue({ user: null });
		const customMsg = 'You need a premium account.';

		render(
			<MemoryRouter>
				<AccessDenied message={customMsg} />
			</MemoryRouter>
		);

		expect(screen.getByText(customMsg)).toBeInTheDocument();
	});

	test('shows "Go Home" button pointing to homePath when logged out', () => {
		useAuth.mockReturnValue({ user: null }); // Logged out

		const testHomePath = '/custom-home-link';

		render(
			<MemoryRouter>
				<AccessDenied homePath={testHomePath} />
			</MemoryRouter>
		);

		// CHANGED: searching for 'link' role instead of 'button'
		const button = screen.getByRole('link', { name: /Go Home/i });
		expect(button).toBeInTheDocument();
		expect(button).toHaveAttribute('href', testHomePath);
	});

	test('shows "Go to Dashboard" button pointing to dashboardPath when logged in', () => {
		useAuth.mockReturnValue({ user: { uid: '123' }, role: 'member' }); // Logged in

		const testDashPath = '/custom-dashboard-link';

		render(
			<MemoryRouter>
				<AccessDenied dashboardPath={testDashPath} />
			</MemoryRouter>
		);

		// CHANGED: searching for 'link' role instead of 'button'
		const button = screen.getByRole('link', { name: /Go to Dashboard/i });
		expect(button).toBeInTheDocument();
		expect(button).toHaveAttribute('href', testDashPath);
	});
});
