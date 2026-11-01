import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import HomeFooter from './HomeFooter';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockOnNavigateSection = jest.fn();
const mockUseAuth = jest.fn(() => ({ user: null }));
const mockUseConfig = jest.fn(() => ({ MEMBER_ONBOARDING_PAGE_ENABLED: true }));

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

vi.mock('../../context/ConfigContext', () => ({
	useConfig: () => mockUseConfig(),
}));

vi.mock('../theme/AccentColorPicker', () => ({
	default: () => <div data-testid='accent-picker' />,
}));

vi.mock('../../config/content/content', async () => {
	const actual = await vi.importActual('../../config/content/content');
	return {
		...actual,
		homePageContent: {
			...actual.homePageContent,
			appBar: {
				...actual.homePageContent.appBar,
				navLinks: [
					{ type: 'navigate', label: 'Register Now', path: '/register' },
					{ type: 'scroll', label: 'Platform Overview', sectionId: 'about' },
					{ type: 'scroll', label: 'Contact Sales', sectionId: 'contact' },
					{ type: 'navigate', label: 'Get Started', path: '/register-applicant' },
				],
			},
		},
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

const renderFooter = (topRef) =>
	render(
		<ThemeProvider theme={theme}>
			<MemoryRouter>
				<HomeFooter topRef={topRef} onNavigateSection={mockOnNavigateSection} />
			</MemoryRouter>
		</ThemeProvider>
	);

describe('HomeFooter', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseAuth.mockReturnValue({ user: null });
		mockUseConfig.mockReturnValue({ MEMBER_ONBOARDING_PAGE_ENABLED: true });
	});

	it('renders brand and section links', () => {
		const topRef = { current: document.createElement('div') };
		renderFooter(topRef);
		expect(screen.getByTestId('accent-picker')).toBeInTheDocument();
		const about = screen.getAllByRole('button').find((btn) => /overview|about|platform/i.test(btn.textContent || ''));
		expect(about).toBeTruthy();
		fireEvent.click(about);
		expect(mockOnNavigateSection).toHaveBeenCalled();
	});

	it('toggles theme', () => {
		renderFooter({ current: null });
		fireEvent.click(screen.getByLabelText(/Switch to (light|dark) mode/i));
		expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE' });
	});

	it('links to board registration when onboarding is enabled', () => {
		renderFooter({ current: null });
		fireEvent.click(screen.getByRole('button', { name: /Committee demo access/i }));
		expect(mockNavigate).toHaveBeenCalledWith('/board-registration');
	});

	it('scrolls to top when the back-to-top control is clicked', () => {
		const scrollIntoView = jest.fn();
		renderFooter({ current: { scrollIntoView } });
		fireEvent.click(screen.getByLabelText(/back to top|top of page|scroll to top/i));
		expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
	});

	it('navigates sign-in and dashboard auth actions', () => {
		renderFooter({ current: null });
		fireEvent.click(screen.getByLabelText('Sign in'));
		expect(mockNavigate).toHaveBeenCalled();

		mockUseAuth.mockReturnValue({ user: { uid: 'u1' } });
		renderFooter({ current: null });
		fireEvent.click(screen.getByLabelText('Go to dashboard'));
		expect(mockNavigate).toHaveBeenCalled();
	});

	it('hides board access when onboarding is disabled', () => {
		mockUseConfig.mockReturnValue({ MEMBER_ONBOARDING_PAGE_ENABLED: false });
		renderFooter({ current: null });
		expect(screen.queryByRole('button', { name: /Committee demo access/i })).not.toBeInTheDocument();
	});

	it('navigates footer links that use path navigation', () => {
		renderFooter({ current: null });
		fireEvent.click(screen.getByRole('button', { name: 'Register Now' }));
		expect(mockNavigate).toHaveBeenCalledWith('/register');
	});
});
