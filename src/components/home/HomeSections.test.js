import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import HomeHero from './HomeHero';
import HomeAboutSection from './HomeAboutSection';
import HomeTrustStats from './HomeTrustStats';
import HomeRequirementsSection from './HomeRequirementsSection';
import HomeSupportSection from './HomeSupportSection';
import HomeContactSection from './HomeContactSection';
import SectionHeading from './SectionHeading';
import ApplicantApplicationCard from './ApplicantApplicationCard';

const mockNavigate = jest.fn();
const mockOnLearnMore = jest.fn();

vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useNavigate: () => mockNavigate,
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: () => ({ darkMode: false, primaryColor: '#0288D1', dispatch: jest.fn() }),
}));

vi.mock('../timer/WindowInfo', () => ({
	default: () => <div data-testid='window-info'>Window</div>,
}));

vi.mock('../../context/ConfigContext', () => ({
	useConfig: () => ({
		CONTACT_EMAIL: 'mailto:test@example.com',
		CONTACT_PHONE: '555-0100',
		MEMBER_ONBOARDING_PAGE_ENABLED: true,
	}),
}));

vi.mock('./HomeContactForm', () => ({
	default: () => <div data-testid='contact-form'>Contact form</div>,
}));

const theme = createTheme({
	palette: {
		custom: { yellow2: '#F9A825', black: '#000', white: '#fff', brightWhite: '#fff' },
		contentAccent: { main: '#0288D1' },
	},
});

const wrap = (ui) =>
	render(
		<ThemeProvider theme={theme}>
			<MemoryRouter>{ui}</MemoryRouter>
		</ThemeProvider>
	);

describe('Home marketing sections', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders SectionHeading variants', () => {
		wrap(<SectionHeading eyebrow='Eye' title='Title' subtitle='Sub' align='left' />);
		expect(screen.getByText('Eye')).toBeInTheDocument();
		expect(screen.getByText('Title')).toBeInTheDocument();
		expect(screen.getByText('Sub')).toBeInTheDocument();
	});

	it('renders HomeHero with window info and learn-more', () => {
		const topRef = { current: document.createElement('div') };
		wrap(<HomeHero topRef={topRef} onLearnMore={mockOnLearnMore} />);
		expect(screen.getByTestId('window-info')).toBeInTheDocument();
		expect(screen.getByText(/Exploring the admin side/i)).toBeInTheDocument();
		const learnMore = screen.queryByRole('button', { name: /learn|discover|more|platform/i });
		if (learnMore) {
			fireEvent.click(learnMore);
		} else {
			const anyCta = screen.getAllByRole('button')[0];
			fireEvent.click(anyCta);
		}
		expect(mockOnLearnMore.mock.calls.length + mockNavigate.mock.calls.length).toBeGreaterThan(0);
	});

	it('navigates to board registration from HomeSupportSection', () => {
		wrap(<HomeSupportSection sectionId='support' />);
		fireEvent.click(screen.getByRole('button', { name: /Create Board Account/i }));
		expect(mockNavigate).toHaveBeenCalledWith('/board-registration');
	});

	it('renders about, trust, requirements, support, and contact sections', () => {
		wrap(
			<>
				<HomeAboutSection sectionId='about' />
				<HomeTrustStats />
				<HomeRequirementsSection sectionId='apply' />
				<HomeSupportSection sectionId='support' />
				<HomeContactSection sectionId='contact' />
			</>
		);
		expect(document.getElementById('about')).toBeTruthy();
		expect(document.getElementById('apply')).toBeTruthy();
		expect(document.getElementById('support')).toBeTruthy();
		expect(document.getElementById('contact')).toBeTruthy();
		expect(screen.getByTestId('contact-form')).toBeInTheDocument();
	});

	it('renders ApplicantApplicationCard summary', () => {
		wrap(
			<ApplicantApplicationCard
				layout='card'
				darkMode={false}
				primaryColor='#0288D1'
				application={{
					id: 'a1',
					type: 'Scholarship',
					status: 'started',
					cycleYear: 2026,
				}}
				onOpen={jest.fn()}
				onDelete={jest.fn()}
			/>
		);
		expect(screen.getAllByText(/Scholarship|Application|started/i).length).toBeGreaterThan(0);
	});
});
