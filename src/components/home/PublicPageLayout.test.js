import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PublicPageLayout from './PublicPageLayout';

vi.mock('../../context/ThemeContext', () => ({
	useTheme: () => ({ darkMode: false, primaryColor: '#0288D1', dispatch: jest.fn() }),
}));

vi.mock('./HomeNav', () => ({
	default: () => <div data-testid='home-nav' />,
}));

vi.mock('./HomeFooter', () => ({
	default: () => <div data-testid='home-footer' />,
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
});
