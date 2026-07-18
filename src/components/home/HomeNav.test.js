import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import HomeNav from './HomeNav';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockOnNavigateSection = jest.fn();
const mockLogoutUser = jest.fn();

vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useNavigate: () => mockNavigate,
}));

vi.mock('../../context/AuthContext', () => ({
	useAuth: () => ({ user: null, applicant: null }),
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: () => ({ darkMode: false, dispatch: mockDispatch, primaryColor: '#0288D1' }),
}));

vi.mock('../../config/data/firebase', () => ({
	logoutUser: (...args) => mockLogoutUser(...args),
}));

vi.mock('../theme/AccentColorPicker', () => ({
	default: () => <div data-testid='accent-picker' />,
}));

vi.mock('../auth/ApplicantSettingsButton', () => ({
	default: () => null,
	useApplicantSettingsDialog: () => jest.fn(),
}));

vi.mock('@mui/material', async () => {
	const actual = await vi.importActual('@mui/material');
	return {
		...actual,
		useMediaQuery: () => false,
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
});
