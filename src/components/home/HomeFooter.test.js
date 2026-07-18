import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import HomeFooter from './HomeFooter';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockOnNavigateSection = jest.fn();

vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useNavigate: () => mockNavigate,
}));

vi.mock('../../context/AuthContext', () => ({
	useAuth: () => ({ user: null }),
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: () => ({ darkMode: false, dispatch: mockDispatch, primaryColor: '#0288D1' }),
}));

vi.mock('../../context/ConfigContext', () => ({
	useConfig: () => ({ MEMBER_ONBOARDING_PAGE_ENABLED: true }),
}));

vi.mock('../theme/AccentColorPicker', () => ({
	default: () => <div data-testid='accent-picker' />,
}));

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
});
