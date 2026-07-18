import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Redirect from './Redirect';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { UserType } from '../../config/data/collections';

vi.mock('react-router-dom', () => ({
	useNavigate: jest.fn(),
	Link: ({ to, children, ...rest }) => (
		<a href={to} {...rest}>
			{children}
		</a>
	),
}));

vi.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

vi.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

vi.mock('../../config/data/collections', () => ({
	UserType: {
		applicant: 'applicant',
		member: 'member',
		both: 'both',
	},
}));

vi.mock('../../config/navigation/paths', () => ({
	paths: {
		apply: '/apply-path',
		memberDash: '/dashboard-path',
		logout: '/logout-path',
		home: '/home-path',
	},
}));

vi.mock('../../config/navigation/routeUtils', () => ({
	generatePath: jest.fn((path) => path),
}));

vi.mock('../../components/loader/Loader', () => ({ default: () => <div data-testid='loader'>Loading...</div> }));
vi.mock('../../components/home/PublicPageLayout', () => ({
	default: ({ children }) => <div data-testid='public-page-layout'>{children}</div>,
}));
vi.mock('../../components/auth/AuthFormCard', () => ({
	default: ({ children, title, subtitle }) => (
		<div data-testid='auth-form-card'>
			<h1>{title}</h1>
			{subtitle && <p>{subtitle}</p>}
			{children}
		</div>
	),
}));
vi.mock('../../components/home/homePageStyles', () => ({
	homeAuthSubmitButtonSx: () => ({}),
	homeAuthSecondaryButtonSx: {},
}));

describe('Redirect Component', () => {
	const mockNavigate = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		useNavigate.mockReturnValue(mockNavigate);
		useTheme.mockReturnValue({
			boxShadow: 'mock-shadow',
			primaryColor: '#1976d2',
		});
		generatePath.mockImplementation((path) => path);
	});

	test('renders loader when loading is true', () => {
		useAuth.mockReturnValue({
			loading: true,
			role: null,
		});

		render(<Redirect />);
		expect(screen.getByTestId('loader')).toBeInTheDocument();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	test('redirects "applicant" role automatically', () => {
		useAuth.mockReturnValue({
			loading: false,
			role: UserType.applicant,
		});

		render(<Redirect />);
		expect(mockNavigate).toHaveBeenCalledWith(paths.apply, { replace: true });
	});

	test('redirects "member" role automatically', () => {
		useAuth.mockReturnValue({
			loading: false,
			role: UserType.member,
		});

		render(<Redirect />);
		expect(mockNavigate).toHaveBeenCalledWith(paths.memberDash, { replace: true });
	});

	test('renders selection UI for "both" role', () => {
		useAuth.mockReturnValue({
			loading: false,
			role: UserType.both,
			logout: jest.fn(),
		});

		render(<Redirect />);
		expect(mockNavigate).not.toHaveBeenCalled();
		expect(screen.getByText('Which account?')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^Applicant$/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^Member$/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
	});

	test('redirects to applicant path when Applicant button is clicked (Role: both)', async () => {
		useAuth.mockReturnValue({
			loading: false,
			role: UserType.both,
			logout: jest.fn(),
		});

		render(<Redirect />);
		fireEvent.click(screen.getByRole('button', { name: /^Applicant$/i }));

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith(paths.apply, { replace: true });
		});
	});

	test('redirects to member path when Member button is clicked (Role: both)', async () => {
		useAuth.mockReturnValue({
			loading: false,
			role: UserType.both,
			logout: jest.fn(),
		});

		render(<Redirect />);
		fireEvent.click(screen.getByRole('button', { name: /^Member$/i }));

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith(paths.memberDash, { replace: true });
		});
	});

	test('navigates to logout when Logout button is clicked (Role: both)', () => {
		const logout = jest.fn();
		useAuth.mockReturnValue({
			loading: false,
			role: UserType.both,
			logout,
		});

		render(<Redirect />);
		fireEvent.click(screen.getByRole('button', { name: /Logout/i }));
		expect(logout).toHaveBeenCalled();
		expect(mockNavigate).toHaveBeenCalledWith(paths.logout);
	});

	test('shows recoverable UI when authenticated with no profile role', () => {
		const logout = jest.fn();
		useAuth.mockReturnValue({
			loading: false,
			user: { uid: 'u1' },
			role: null,
			profilesReady: true,
			logout,
		});

		render(<Redirect />);
		expect(screen.getByText(/No profile found/i)).toBeInTheDocument();
		expect(screen.getByTestId('public-page-layout')).toBeInTheDocument();
		expect(mockNavigate).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole('button', { name: /Logout/i }));
		expect(logout).toHaveBeenCalled();
	});
});
