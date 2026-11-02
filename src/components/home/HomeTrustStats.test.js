import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import HomeTrustStats from './HomeTrustStats';

vi.mock('../../context/ThemeContext', () => ({
	useTheme: () => ({ darkMode: false }),
}));

vi.mock('./homePageStyles', () => ({
	displayFont: 'TestFont',
	homeCardBorder: () => '1px solid #ccc',
	homeSectionAltBg: () => '#f5f5f5',
}));

const mockContent = vi.hoisted(() => ({
	trustStats: {
		enabled: true,
		items: [
			{ value: '1', label: 'One' },
			{ value: '2', label: 'Two' },
			{ value: '3', label: 'Three' },
			{ value: '4', label: 'Four' },
			{ value: '5', label: 'Five' },
		],
	},
}));

vi.mock('../../config/content', () => ({
	homePageContent: mockContent,
}));

const theme = createTheme({
	palette: {
		primary: { main: '#0288d1', contrastText: '#fff' },
		contentAccent: { main: '#0288d1' },
		custom: { green: '#2e7d32', blue: '#0288d1', stblack: '#111', brightWhite: '#fff' },
	},
});

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('HomeTrustStats', () => {
	it('renders trust stats including icon fallback for extra items', () => {
		renderWithTheme(<HomeTrustStats />);
		expect(screen.getByText('One')).toBeInTheDocument();
		expect(screen.getByText('Five')).toBeInTheDocument();
	});

	it('returns null when trust stats are disabled', () => {
		mockContent.trustStats.enabled = false;
		const { container } = renderWithTheme(<HomeTrustStats />);
		expect(container).toBeEmptyDOMElement();
		mockContent.trustStats.enabled = true;
	});
});
