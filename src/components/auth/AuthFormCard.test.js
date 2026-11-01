import React from 'react';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import AuthFormCard from './AuthFormCard';
import { useTheme } from '../../context/ThemeContext';

vi.mock('../../context/ThemeContext', () => ({
	useTheme: vi.fn(),
}));

const renderCard = (props = {}) =>
	render(
		<ThemeProvider theme={theme}>
			<AuthFormCard
				title='Sign in'
				eyebrow='Account access'
				subtitle='Use your credentials to continue.'
				icon={<span data-testid='card-icon'>★</span>}
				intro={<p>Helpful introduction.</p>}
				headerActions={<button type='button'>Header action</button>}
				{...props}>
				<label>
					Email
					<input aria-label='Email' />
				</label>
			</AuthFormCard>
		</ThemeProvider>,
	);

const theme = createTheme({
	palette: {
		custom: { black: '#000000', white: '#ffffff' },
		contentAccent: { main: '#0288D1' },
	},
});

describe('AuthFormCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useTheme.mockReturnValue({ darkMode: false, primaryColor: '#0288D1' });
	});

	it('renders a stacked card with the optional header content', () => {
		renderCard({ headerAlign: 'left', tightMobile: true });

		expect(screen.getAllByRole('heading', { name: 'Sign in' })).not.toHaveLength(0);
		expect(screen.getByText('Helpful introduction.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Header action' })).toBeInTheDocument();
		expect(screen.getByLabelText('Email')).toBeInTheDocument();
	});

	it('renders compact split and dense layouts with node titles', () => {
		renderCard({
			title: <span>Applicant portal</span>,
			layout: 'split',
			size: 'dashboard',
			compact: true,
			tightMobile: true,
			denseHeader: true,
		});

		expect(screen.getByText('Applicant portal')).toBeInTheDocument();
		expect(screen.getByText('Helpful introduction.')).toBeInTheDocument();
		expect(screen.getByTestId('card-icon')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Header action' })).toBeInTheDocument();
	});

	it('supports a compact stacked card without an icon or actions', () => {
		renderCard({
			title: <span>Compact status</span>,
			eyebrow: undefined,
			subtitle: undefined,
			icon: undefined,
			intro: undefined,
			headerActions: undefined,
			compact: true,
			size: 'wide',
		});

		expect(screen.getByText('Compact status')).toBeInTheDocument();
		expect(screen.queryByTestId('card-icon')).not.toBeInTheDocument();
	});
});
