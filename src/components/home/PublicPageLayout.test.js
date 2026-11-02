import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PublicPageLayout from './PublicPageLayout';

const mockNavigate = jest.fn();
vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useNavigate: () => mockNavigate,
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: () => ({ darkMode: false, primaryColor: '#0288D1', dispatch: jest.fn() }),
}));

vi.mock('./HomeNav', () => ({
	default: ({ onNavigateSection }) => (
		<button type='button' data-testid='home-nav' onClick={() => onNavigateSection('about')}>
			Nav
		</button>
	),
}));

vi.mock('./HomeFooter', () => ({
	default: ({ onNavigateSection }) => (
		<button type='button' data-testid='home-footer' onClick={() => onNavigateSection('contact')}>
			Footer
		</button>
	),
}));

vi.mock('../../config/navigation/routeUtils', () => ({
	generatePath: () => '/home',
}));

vi.mock('../../config/navigation/paths', () => ({
	paths: { home: 'home' },
}));

const theme = createTheme({
	palette: { custom: { yellow2: '#F9A825', black: '#000', white: '#fff' } },
});

describe('PublicPageLayout', () => {
	it('renders nav, children, and footer', () => {
		render(
			<ThemeProvider theme={theme}>
				<MemoryRouter>
					<PublicPageLayout>
						<div>Page body</div>
					</PublicPageLayout>
				</MemoryRouter>
			</ThemeProvider>
		);
		expect(screen.getByTestId('home-nav')).toBeInTheDocument();
		expect(screen.getByText('Page body')).toBeInTheDocument();
		expect(screen.getByTestId('home-footer')).toBeInTheDocument();
	});

	it('supports compact fitViewport layout', () => {
		render(
			<ThemeProvider theme={theme}>
				<MemoryRouter>
					<PublicPageLayout compact fitViewport applicantNav>
						<div>Compact</div>
					</PublicPageLayout>
				</MemoryRouter>
			</ThemeProvider>
		);
		expect(screen.getByText('Compact')).toBeInTheDocument();
	});

	it('navigates home with section hashes from nav and footer', () => {
		mockNavigate.mockClear();
		render(
			<ThemeProvider theme={theme}>
				<MemoryRouter>
					<PublicPageLayout applicantNav>
						<div>Body</div>
					</PublicPageLayout>
				</MemoryRouter>
			</ThemeProvider>
		);
		fireEvent.click(screen.getByTestId('home-nav'));
		expect(mockNavigate).toHaveBeenCalledWith('/home#about');
		fireEvent.click(screen.getByTestId('home-footer'));
		expect(mockNavigate).toHaveBeenCalledWith('/home#contact');
	});
});
