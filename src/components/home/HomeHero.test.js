import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import HomeHero from './HomeHero';
import { useTheme } from '../../context/ThemeContext';
import { useConfig } from '../../context/ConfigContext';

const mocks = vi.hoisted(() => ({
	navigate: vi.fn(),
	onLearnMore: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
	useNavigate: () => mocks.navigate,
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: vi.fn(),
}));

vi.mock('../../context/ConfigContext', () => ({
	useConfig: vi.fn(),
}));

vi.mock('../timer/WindowInfo', () => ({
	default: () => <div data-testid='window-info'>Window info</div>,
}));

vi.mock('../../config/content', () => ({
	homePageContent: {
		intro: {
			backgroundImages: { dark: 'dark.jpg', light: 'light.jpg' },
			windowInfo: { enabled: true },
			externalLink: { enabled: true, url: 'https://example.com', label: 'External board' },
			welcomeText: { enabled: true, line1: 'Welcome', line2: 'Applicant Management' },
		},
		missionLine: 'Help applicants find support.',
		demoBoardAccess: { path: '/member-register', heroLinkLabel: 'Board access' },
	},
}));

vi.mock('./homePageStyles', () => ({
	displayFont: 'serif',
	homeHeroOverlay: () => 'linear-gradient(#000, #111)',
	homeOutlinedOnDarkButtonSx: {},
	homeYellowButtonSx: {},
}));

describe('HomeHero', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useTheme.mockReturnValue({ darkMode: false });
		useConfig.mockReturnValue({ MEMBER_ONBOARDING_PAGE_ENABLED: false });
	});

	it('renders hero content and handles public actions', () => {
		render(<HomeHero topRef={React.createRef()} onLearnMore={mocks.onLearnMore} />);

		expect(screen.getByText('Applicant Management')).toBeInTheDocument();
		expect(screen.getByTestId('window-info')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'External board' })).toHaveAttribute('href', 'https://example.com');
		fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
		fireEvent.click(screen.getByRole('button', { name: 'Explore the Platform' }));
		fireEvent.click(screen.getByRole('button', { name: /Returning applicant/i }));
		expect(mocks.navigate).toHaveBeenCalledTimes(2);
		expect(mocks.onLearnMore).toHaveBeenCalled();
	});

	it('uses dark imagery and exposes board access when enabled', () => {
		useTheme.mockReturnValue({ darkMode: true });
		useConfig.mockReturnValue({ MEMBER_ONBOARDING_PAGE_ENABLED: true });
		render(<HomeHero topRef={React.createRef()} onLearnMore={mocks.onLearnMore} />);

		expect(screen.getByRole('button', { name: 'Board access' })).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Board access' }));
		expect(mocks.navigate).toHaveBeenCalled();
	});
});
