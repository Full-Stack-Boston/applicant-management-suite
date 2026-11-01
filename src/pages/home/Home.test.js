import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from './Home';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';

vi.mock('../../components/home/HomeNav', () => ({ default: () => <div data-testid='home-nav'>Nav</div> }));
vi.mock('../../components/home/HomeHero', () => ({ default: () => <div data-testid='home-hero'>Hero</div> }));
vi.mock('../../components/home/HomeTrustStats', () => ({ default: () => <div data-testid='home-trust'>Trust</div> }));
vi.mock('../../components/home/HomeAboutSection', () => ({ default: () => <div data-testid='home-about'>About</div> }));
vi.mock('../../components/home/HomeRequirementsSection', () => ({ default: () => <div data-testid='home-requirements'>Requirements</div> }));
vi.mock('../../components/home/HomeContactSection', () => ({ default: () => <div data-testid='home-contact'>Contact</div> }));
vi.mock('../../components/home/HomeSupportSection', () => ({ default: () => <div data-testid='home-support'>Support</div> }));
vi.mock('../../components/home/HomeFooter', () => ({ default: () => <div data-testid='home-footer'>Footer</div> }));

const { mockScrollToSection, homePageContent } = vi.hoisted(() => ({
	mockScrollToSection: jest.fn(),
	homePageContent: {
		appBar: { enabled: true },
		intro: { enabled: true },
		information: { enabled: true },
		footer: { enabled: true },
		sectionIds: { about: 'about', apply: 'apply', contact: 'contact', support: 'support' },
	},
}));

vi.mock('../../components/home/useHomeSectionNav', () => ({
	useHomeSectionNav: () => ({ activeSection: 'about', navSolid: false, scrollToSection: mockScrollToSection }),
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

vi.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

vi.mock('../../config/content', () => ({
	homePageContent,
}));

describe('Home Component', () => {
	beforeEach(() => {
		useTheme.mockReturnValue({ darkMode: false });
		useTitle.mockImplementation(() => {});
		mockScrollToSection.mockClear();
		homePageContent.appBar.enabled = true;
		homePageContent.intro.enabled = true;
		homePageContent.footer.enabled = true;
		window.location.hash = '';
	});

	it('renders spruced public sections when enabled', () => {
		render(<Home />);
		expect(screen.getByTestId('home-nav')).toBeInTheDocument();
		expect(screen.getByTestId('home-hero')).toBeInTheDocument();
		expect(screen.getByTestId('home-trust')).toBeInTheDocument();
		expect(screen.getByTestId('home-about')).toBeInTheDocument();
		expect(screen.getByTestId('home-requirements')).toBeInTheDocument();
		expect(screen.getByTestId('home-contact')).toBeInTheDocument();
		expect(screen.getByTestId('home-support')).toBeInTheDocument();
		expect(screen.getByTestId('home-footer')).toBeInTheDocument();
		expect(useTitle).toHaveBeenCalledWith({ title: 'Home', appear: true });
	});

	it('scrolls to a matching hash section on mount', () => {
		window.location.hash = '#contact';
		render(<Home />);
		expect(mockScrollToSection).toHaveBeenCalledWith('contact');
	});

	it('hides optional chrome when content flags are disabled', () => {
		homePageContent.appBar.enabled = false;
		homePageContent.intro.enabled = false;
		homePageContent.footer.enabled = false;
		render(<Home />);
		expect(screen.queryByTestId('home-nav')).not.toBeInTheDocument();
		expect(screen.queryByTestId('home-hero')).not.toBeInTheDocument();
		expect(screen.queryByTestId('home-footer')).not.toBeInTheDocument();
	});
});
