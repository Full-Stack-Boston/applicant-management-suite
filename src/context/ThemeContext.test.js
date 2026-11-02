import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, useTheme, ThemeReducer } from './ThemeContext';
import { useAuth } from './AuthContext';
import { updateUserPreferences } from '../config/data/firebase';

// Mock Auth and Firebase
vi.mock('./AuthContext', () => ({
	useAuth: jest.fn(),
}));

vi.mock('../config/data/firebase', () => ({
	updateUserPreferences: jest.fn(),
}));

vi.mock('../config/data/collections', () => ({
	collections: { members: 'members', applicants: 'applicants' },
}));

// Mock MUI Theme Provider to avoid huge style calculation overhead in tests
vi.mock('@mui/material/styles', () => ({
	ThemeProvider: ({ children }) => <div>{children}</div>,
	createTheme: () => ({ palette: { boxShadow: 'mock-shadow' } }),
}));

vi.mock('@mui/material/CssBaseline', () => ({
	default: () => null,
}));

vi.mock('../config/ui/theme', () => ({
	default: () => ({
		palette: { boxShadow: 'mock-shadow' },
	}),
	colors: {
		blue: '#0277BD',
		green: '#2E7D32',
		teal: '#0F766E',
		yellow: '#B7892E',
		yellow2: '#B7892E',
		brown: '#546E7A',
		red: '#C62828',
	},
}));

const TestConsumer = () => {
	const { darkMode, primaryColor, dispatch } = useTheme();
	return (
		<div>
			<div data-testid='theme-mode'>{darkMode ? 'DARK' : 'LIGHT'}</div>
			<div data-testid='theme-color'>{primaryColor}</div>
			<button onClick={() => dispatch({ type: 'TOGGLE' })}>Toggle</button>
			<button onClick={() => dispatch({ type: 'LIGHT' })}>Light</button>
			<button onClick={() => dispatch({ type: 'DARK' })}>Dark</button>
			<button onClick={() => dispatch({ type: 'SET_COLOR', payload: 'teal' })}>Set Color</button>
		</div>
	);
};

describe('ThemeContext', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();
		// Mock matchMedia
		window.matchMedia = jest.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: jest.fn(), // Deprecated
			removeListener: jest.fn(), // Deprecated
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
			dispatchEvent: jest.fn(),
		}));
	});

	test('loads state from localStorage if available', () => {
		localStorage.setItem('pf_theme_prefs', JSON.stringify({ darkMode: true, primaryColor: 'blue' }));
		useAuth.mockReturnValue({ member: null });

		render(
			<ThemeProvider>
				<TestConsumer />
			</ThemeProvider>
		);

		expect(screen.getByTestId('theme-mode')).toHaveTextContent('DARK');
	});

	test('toggles theme and updates database for logged in member', () => {
		useAuth.mockReturnValue({
			user: { uid: '123' },
			member: { preferences: {} },
		});

		render(
			<ThemeProvider>
				<TestConsumer />
			</ThemeProvider>
		);

		// Initial default is light (false)
		expect(screen.getByTestId('theme-mode')).toHaveTextContent('LIGHT');

		// Toggle
		fireEvent.click(screen.getByText('Toggle'));

		expect(screen.getByTestId('theme-mode')).toHaveTextContent('DARK');

		// Verify DB update
		expect(updateUserPreferences).toHaveBeenCalledWith('123', 'members', expect.objectContaining({ darkMode: true }));
	});

	test('loads cloud preferences and saves color for applicants', () => {
		useAuth.mockReturnValue({
			user: { uid: 'app-1' },
			member: null,
			applicant: { preferences: { darkMode: true, primaryColor: 'green' } },
		});

		render(
			<ThemeProvider>
				<TestConsumer />
			</ThemeProvider>
		);

		expect(screen.getByTestId('theme-mode')).toHaveTextContent('DARK');
		expect(screen.getByTestId('theme-color')).toHaveTextContent('green');

		fireEvent.click(screen.getByText('Set Color'));
		expect(updateUserPreferences).toHaveBeenCalledWith('app-1', 'applicants', expect.objectContaining({ primaryColor: 'teal' }));
		fireEvent.click(screen.getByText('Light'));
		expect(updateUserPreferences).toHaveBeenCalledWith('app-1', 'applicants', expect.objectContaining({ darkMode: false }));
		fireEvent.click(screen.getByText('Dark'));
		expect(updateUserPreferences).toHaveBeenCalledWith('app-1', 'applicants', expect.objectContaining({ darkMode: true }));
	});

	test('follows system color-scheme changes when no prefs are saved', () => {
		let changeHandler;
		window.matchMedia = jest.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			addEventListener: jest.fn((event, handler) => {
				if (event === 'change') changeHandler = handler;
			}),
			removeEventListener: jest.fn(),
			addListener: jest.fn(),
			removeListener: jest.fn(),
			dispatchEvent: jest.fn(),
		}));
		useAuth.mockReturnValue({ user: null, member: null, applicant: null });

		render(
			<ThemeProvider>
				<TestConsumer />
			</ThemeProvider>
		);

		expect(typeof changeHandler).toBe('function');
		act(() => {
			changeHandler({ matches: true });
		});
		expect(screen.getByTestId('theme-mode')).toHaveTextContent('DARK');
		act(() => {
			changeHandler({ matches: false });
		});
		expect(screen.getByTestId('theme-mode')).toHaveTextContent('LIGHT');
	});

	test('throws when useTheme is used outside provider', () => {
		const Broken = () => {
			useTheme();
			return null;
		};
		expect(() => render(<Broken />)).toThrow(/must be used within a ThemeProvider/i);
	});

	test('ThemeReducer ignores unknown actions', () => {
		const state = { darkMode: true, primaryColor: 'green' };
		expect(ThemeReducer(state, { type: 'UNKNOWN' })).toBe(state);
	});
});
