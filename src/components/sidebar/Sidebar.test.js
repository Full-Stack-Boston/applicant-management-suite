import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Sidebar from './Sidebar';
import { useSidebar } from '../../context/SidebarContext';
import { useTheme } from '../../context/ThemeContext';
import { useSidebarMenu } from '../../config/navigation/sidebarConfig';
import { useMediaQuery } from '@mui/material';
import { accentColorPickerTooltip } from '../../config/ui/accentColors';

// --- MOCKS ---
vi.mock('../../context/SidebarContext', () => ({ useSidebar: jest.fn() }));
vi.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
vi.mock('../../config/navigation/sidebarConfig', () => ({ useSidebarMenu: jest.fn() }));
vi.mock('react-router-dom', () => ({
	Link: ({ children, to }) => <a href={to}>{children}</a>,
	useLocation: () => ({ pathname: '/dash' }),
	generatePath: () => '/',
}));
vi.mock('../../config/navigation/routeUtils', () => ({ generatePath: () => '/' }));
vi.mock('@mui/material', async () => {
	const actual = await vi.importActual('@mui/material');
	return {
		...actual,
		useMediaQuery: jest.fn(() => false),
	};
});

describe('Sidebar', () => {
	const mockSetCollapsed = jest.fn();
	const mockDispatch = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		useSidebar.mockReturnValue({ collapsed: false, setCollapsed: mockSetCollapsed });
		useTheme.mockReturnValue({ darkMode: false, primaryColor: 'blue', dispatch: mockDispatch });
		useMediaQuery.mockReturnValue(false);

		useSidebarMenu.mockReturnValue([
			{
				title: 'Main',
				pages: [
					{ text: 'Dashboard', link: '/dash', icon: <span>Icon</span>, disable: false },
					{ text: 'Disabled', link: '/nope', icon: <span>X</span>, disable: true },
				],
			},
		]);
	});

	test('renders menu items', () => {
		render(<Sidebar />);
		expect(screen.getByText('Main')).toBeInTheDocument();
		expect(screen.getByText('Dashboard')).toBeInTheDocument();
		expect(screen.getByText('Disabled')).toBeInTheDocument();
	});

	test('renders in collapsed mode (fades text for animation)', () => {
		useSidebar.mockReturnValue({ collapsed: true, setCollapsed: mockSetCollapsed });
		render(<Sidebar />);

		const label = screen.getByText('Dashboard');
		expect(label).toBeInTheDocument();
		expect(label.closest('.MuiListItemText-root')).toHaveStyle({ opacity: '0' });
	});

	test('toggles dark mode and collapse from bottom controls', () => {
		render(<Sidebar />);
		fireEvent.click(screen.getByLabelText('Switch to Dark Mode'));
		expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE' });
		fireEvent.click(screen.getByLabelText('Collapse Sidebar'));
		expect(mockSetCollapsed).toHaveBeenCalledWith(true);
	});

	test('opens accent color menu and selects a color', () => {
		render(<Sidebar />);
		fireEvent.click(screen.getByLabelText(accentColorPickerTooltip));

		const presentation = document.body.querySelector('.MuiModal-root, .MuiPopover-root, .MuiMenu-root');
		expect(presentation).toBeTruthy();
		const swatches = Array.from(presentation.querySelectorAll('div')).filter((el) => getComputedStyle(el).cursor === 'pointer' && el.clientWidth <= 30);
		expect(swatches.length).toBeGreaterThan(0);
		fireEvent.click(swatches[0]);
		expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_COLOR' }));
	});

	test('shows light-mode tip when dark mode is active', () => {
		useTheme.mockReturnValue({ darkMode: true, primaryColor: 'green', dispatch: mockDispatch });
		useSidebar.mockReturnValue({ collapsed: true, setCollapsed: mockSetCollapsed });
		render(<Sidebar />);
		expect(screen.getAllByAltText('AMS').length).toBeGreaterThan(0);
		fireEvent.click(screen.getByLabelText('Switch to Light Mode'));
		expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE' });
		fireEvent.click(screen.getByLabelText('Expand Sidebar'));
		expect(mockSetCollapsed).toHaveBeenCalledWith(false);
	});

	test('compacts on small screens', () => {
		useMediaQuery.mockReturnValue(true);
		render(<Sidebar />);
		const label = screen.getByText('Dashboard');
		expect(label.closest('.MuiListItemText-root')).toHaveStyle({ opacity: '0' });
	});

	test('defers expanding controls after collapse animation', () => {
		vi.useFakeTimers();
		useSidebar.mockReturnValue({ collapsed: true, setCollapsed: mockSetCollapsed });
		const { rerender } = render(<Sidebar />);
		useSidebar.mockReturnValue({ collapsed: false, setCollapsed: mockSetCollapsed });
		rerender(<Sidebar />);
		act(() => {
			vi.advanceTimersByTime(500);
		});
		vi.useRealTimers();
		expect(screen.getByText('Dashboard')).toBeInTheDocument();
	});
});
