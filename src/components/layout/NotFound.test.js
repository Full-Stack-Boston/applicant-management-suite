import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from './NotFound';
import { useAuth } from '../../context/AuthContext';
import { isAdminPath } from '../../config/navigation/routeUtils';

// --- Mocks ---
vi.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

vi.mock('../../config/navigation/routeUtils', () => ({
	isAdminPath: jest.fn(),
	generatePath: (path) => path,
}));

vi.mock('../../utils/lottie', () => ({
	default: function MockLottie() {
		return <div data-testid='lottie-404'>404 Animation</div>;
	},
}));

vi.mock('../../config/Constants', () => ({
	Assets: { notFoundLottie: 'mock-data' },
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

vi.mock('../../config/navigation/paths', () => ({
	paths: { home: '/home', redirect: '/redirect' },
}));

vi.mock('../home/PublicStatusPage', () => ({
	__esModule: true,
	default: ({ title, eyebrow, subtitle, children }) => (
		<div data-testid='public-status-page'>
			{eyebrow && <p>{eyebrow}</p>}
			<h1>{title}</h1>
			{subtitle && <p>{subtitle}</p>}
			{children}
		</div>
	),
}));

describe('NotFound Component', () => {
	test('renders 404 text and current pathname', () => {
		useAuth.mockReturnValue({ user: null });
		isAdminPath.mockReturnValue(false);

		render(
			<MemoryRouter initialEntries={['/bad-route']}>
				<NotFound />
			</MemoryRouter>
		);

		expect(screen.getByText('404')).toBeInTheDocument();
		expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
		expect(screen.getByText(/\/bad-route/)).toBeInTheDocument();
	});

	test('redirects to Home if user is logged out', () => {
		useAuth.mockReturnValue({ user: null });

		render(
			<MemoryRouter>
				<NotFound />
			</MemoryRouter>
		);

		const link = screen.getByRole('link', { name: /Go Home/i });
		expect(link).toHaveAttribute('href', '/home');
	});

	test('redirects to Dashboard if user is logged in', () => {
		useAuth.mockReturnValue({ user: { uid: '123' }, role: 'member' });

		render(
			<MemoryRouter>
				<NotFound />
			</MemoryRouter>
		);

		const link = screen.getByRole('link', { name: /Go to Dashboard/i });
		expect(link).toHaveAttribute('href', '/redirect');
	});
});
