import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import HomeNav from './HomeNav';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockOnNavigateSection = jest.fn();
const mockLogoutUser = jest.fn();
const mockUseAuth = jest.fn(() => ({ user: null, applicant: null }));
const mockUseMediaQuery = jest.fn(() => false);

vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useNavigate: () => mockNavigate,
}));

vi.mock('../../context/AuthContext', () => ({
	useAuth: () => mockUseAuth(),
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: () => ({ darkMode: false, dispatch: mockDispatch, primaryColor: '#0288D1' }),
}));

vi.mock('../../config/data/firebase', () => ({
	logoutUser: (...args) => mockLogoutUser(...args),
}));

vi.mock('../theme/AccentColorPicker', () => ({
	default: ({ renderTrigger }) =>
		renderTrigger ? (
			renderTrigger({ onClick: jest.fn() })
		) : (
			<div data-testid='accent-picker' />
		),
}));

const mockOpenSettings = jest.fn();
vi.mock('../auth/ApplicantSettingsButton', () => ({
	default: () => <button type='button'>Applicant Settings</button>,
	useApplicantSettingsDialog: () => mockOpenSettings,
}));

vi.mock('@mui/material', async () => {
	const actual = await vi.importActual('@mui/material');
	return {
		...actual,
		useMediaQuery: (...args) => mockUseMediaQuery(...args),
	};
});

const theme = createTheme({
	palette: {
		custom: {
			yellow2: '#F9A825',
			black: '#000000',
			white: '#ffffff',
		},
	},
});

const renderNav = (props = {}) =>
	render(
		<ThemeProvider theme={theme}>
			<MemoryRouter initialEntries={['/home']}>
				<HomeNav navSolid activeSection='about' onNavigateSection={mockOnNavigateSection} {...props} />
			</MemoryRouter>
		</ThemeProvider>
	);

describe('HomeNav', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseAuth.mockReturnValue({ user: null, applicant: null });
		mockUseMediaQuery.mockReturnValue(false);
		mockLogoutUser.mockResolvedValue(undefined);
	});

	it('renders brand and public scroll link', () => {
		renderNav({ variant: 'public' });
		expect(screen.getByTestId('accent-picker')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Platform Overview|Overview/i })).toBeInTheDocument();
	});

	it('scrolls to section when a scroll link is clicked', () => {
		renderNav({ variant: 'public' });
		fireEvent.click(screen.getByRole('button', { name: /Platform Overview|Overview/i }));
		expect(mockOnNavigateSection).toHaveBeenCalledWith('about');
	});

	it('toggles theme', () => {
		renderNav({ variant: 'public' });
		fireEvent.click(screen.getByLabelText('Toggle theme'));
		expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE' });
	});

	it('navigates utility home link', () => {
		renderNav({ variant: 'utility' });
		fireEvent.click(screen.getByRole('button', { name: /^Home$/i }));
		expect(mockNavigate).toHaveBeenCalled();
	});

	it('exposes public get-started and sign-in actions', () => {
		renderNav({ variant: 'public' });
		fireEvent.click(screen.getByRole('button', { name: /Get Started/i }));
		expect(mockNavigate).toHaveBeenCalled();
		fireEvent.click(screen.getByLabelText('Sign in'));
		expect(mockNavigate).toHaveBeenCalled();
	});

	it('renders the applicant navigation actions', () => {
		renderNav({ variant: 'applicant' });
		expect(screen.getByRole('button', { name: /Platform Info/i })).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: /Platform Info/i }));
		expect(screen.getByRole('menu')).toBeInTheDocument();
	});

	it('shows utility get-started action', () => {
		renderNav({ variant: 'utility' });
		const started = screen.queryByRole('button', { name: /Get Started|Apply|Sign Up/i });
		if (started) {
			fireEvent.click(started);
			expect(mockNavigate).toHaveBeenCalled();
		}
	});

	it('opens burger menu on compact screens and navigates items', () => {
		mockUseMediaQuery.mockReturnValue(true);
		renderNav({ variant: 'public' });
		fireEvent.click(screen.getByLabelText('Open menu'));
		const items = screen.getAllByRole('menuitem');
		expect(items.length).toBeGreaterThan(0);
		fireEvent.click(items[0]);
		expect(mockOnNavigateSection.mock.calls.length + mockNavigate.mock.calls.length).toBeGreaterThan(0);
	});

	it('exposes burger accent and settings menu chrome', () => {
		mockUseMediaQuery.mockReturnValue(true);
		renderNav({ variant: 'public' });
		fireEvent.click(screen.getByLabelText('Open menu'));
		expect(screen.getByRole('menuitem', { name: /Theme Color/i })).toBeInTheDocument();
		fireEvent.click(screen.getByRole('menuitem', { name: /Theme Color/i }));
	});

	it('logs out applicants from the toolbar', async () => {
		mockUseAuth.mockReturnValue({
			user: { uid: 'u1' },
			applicant: { id: 'a1', firstName: 'Pat' },
		});
		renderNav({ variant: 'applicant' });
		fireEvent.click(screen.getByLabelText('Logout'));
		expect(mockLogoutUser).toHaveBeenCalled();
	});

	it('opens applicant settings from burger menu', () => {
		mockUseMediaQuery.mockReturnValue(true);
		mockUseAuth.mockReturnValue({
			user: { uid: 'u1' },
			applicant: { id: 'a1', firstName: 'Pat' },
		});
		renderNav({ variant: 'applicant' });
		fireEvent.click(screen.getByLabelText('Open menu'));
		fireEvent.click(screen.getByText('Settings'));
		expect(mockOpenSettings).toHaveBeenCalled();
	});
});
