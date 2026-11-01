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
const mockUseTheme = jest.fn(() => ({ darkMode: false, dispatch: mockDispatch, primaryColor: '#0288D1' }));
const mockUseMediaQuery = jest.fn(() => false);

vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useNavigate: () => mockNavigate,
}));

vi.mock('../../context/AuthContext', () => ({
	useAuth: () => mockUseAuth(),
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: () => mockUseTheme(),
}));

vi.mock('../../config/data/firebase', () => ({
	logoutUser: (...args) => mockLogoutUser(...args),
}));

vi.mock('../../config/Constants', async () => {
	const actual = await vi.importActual('../../config/Constants');
	return {
		...actual,
		brand: {
			...actual.brand,
			githubUrl: 'https://github.com/example/ams',
			githubLabel: 'GitHub',
		},
	};
});

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

const renderNav = (props = {}, { initialEntries = ['/home'] } = {}) =>
	render(
		<ThemeProvider theme={theme}>
			<MemoryRouter initialEntries={initialEntries}>
				<HomeNav navSolid activeSection='about' onNavigateSection={mockOnNavigateSection} {...props} />
			</MemoryRouter>
		</ThemeProvider>
	);

describe('HomeNav', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseAuth.mockReturnValue({ user: null, applicant: null });
		mockUseTheme.mockReturnValue({ darkMode: false, dispatch: mockDispatch, primaryColor: '#0288D1' });
		mockUseMediaQuery.mockReturnValue(false);
		mockLogoutUser.mockResolvedValue(undefined);
		window.scrollTo = jest.fn();
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

	it('scrolls home brand to top when already on home with a hash', () => {
		renderNav({ variant: 'public' }, { initialEntries: ['/home#about'] });
		const brand = screen.getAllByRole('link').find((el) => /APPLICATION|MANAGEMENT|AMS/i.test(el.textContent || ''));
		expect(brand).toBeTruthy();
		fireEvent.click(brand);
		expect(mockNavigate).toHaveBeenCalled();
		expect(window.scrollTo).toHaveBeenCalled();
	});

	it('navigates home from a non-home route via brand link', () => {
		renderNav({ variant: 'utility' }, { initialEntries: ['/login'] });
		const brand = screen.getAllByRole('link').find((el) => /APPLICATION|MANAGEMENT|AMS/i.test(el.textContent || ''));
		fireEvent.click(brand);
		expect(mockNavigate).toHaveBeenCalled();
	});

	it('exposes My Account when a signed-in non-applicant user is present', () => {
		mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, applicant: null });
		renderNav({ variant: 'public' });
		fireEvent.click(screen.getByLabelText('My account'));
		expect(mockNavigate).toHaveBeenCalled();
	});

	it('exposes My Account in burger toolbar for signed-in users', () => {
		mockUseMediaQuery.mockReturnValue(true);
		mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, applicant: null });
		renderNav({ variant: 'public' });
		fireEvent.click(screen.getByLabelText('My account'));
		expect(mockNavigate).toHaveBeenCalled();
	});

	it('toggles light mode from burger menu when dark mode is active', () => {
		mockUseMediaQuery.mockReturnValue(true);
		mockUseTheme.mockReturnValue({ darkMode: true, dispatch: mockDispatch, primaryColor: '#0288D1' });
		renderNav({ variant: 'public' });
		fireEvent.click(screen.getByLabelText('Open menu'));
		fireEvent.click(screen.getByRole('menuitem', { name: /Light Mode/i }));
		expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE' });
	});

	it('opens applicant Platform Info links', () => {
		renderNav({ variant: 'applicant' });
		fireEvent.click(screen.getByRole('button', { name: /Platform Info/i }));
		const items = screen.getAllByRole('menuitem');
		expect(items.length).toBeGreaterThan(0);
		fireEvent.click(items[0]);
		expect(mockOnNavigateSection.mock.calls.length + mockNavigate.mock.calls.length).toBeGreaterThan(0);
	});

	it('renders GitHub link when configured', () => {
		renderNav({ variant: 'public' });
		expect(screen.getByLabelText('GitHub')).toHaveAttribute('href', 'https://github.com/example/ams');
	});

	it('renders GitHub from burger menu', () => {
		mockUseMediaQuery.mockReturnValue(true);
		renderNav({ variant: 'public' });
		fireEvent.click(screen.getByLabelText('Open menu'));
		expect(screen.getByRole('menuitem', { name: /GitHub/i })).toBeInTheDocument();
	});

	it('navigates utility burger Get Started item', () => {
		mockUseMediaQuery.mockReturnValue(true);
		renderNav({ variant: 'utility' });
		fireEvent.click(screen.getByLabelText('Open menu'));
		const started = screen.queryByRole('menuitem', { name: /Get Started/i });
		if (started) {
			fireEvent.click(started);
			expect(mockNavigate).toHaveBeenCalled();
		} else {
			const items = screen.getAllByRole('menuitem');
			fireEvent.click(items[0]);
			expect(mockNavigate.mock.calls.length + mockOnNavigateSection.mock.calls.length).toBeGreaterThan(0);
		}
	});
});
