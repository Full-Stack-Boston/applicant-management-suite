import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import HomeRequirementsSection from './HomeRequirementsSection';

vi.mock('../../context/ThemeContext', () => ({
	useTheme: () => ({ darkMode: false, primaryColor: 'green' }),
}));

vi.mock('../../context/ConfigContext', () => ({
	useConfig: () => ({ APPLICATION_DEADLINE: '2026-12-31' }),
}));

vi.mock('../../config/data/dateValue', () => ({
	toJsDate: () => new Date('2026-12-31'),
}));

const mockContent = vi.hoisted(() => ({
	deadlineMessage: 'Due by',
	information: {
		tabs: [
			{ label: 'About' },
			{
				label: 'Requirements Guide',
				content: {
					childTabs: [
						{
							label: 'New Applicant',
							content: {
								title: 'New Workflow',
								eligibilityNotice: 'Eligible notice',
								introParagraphs: ['Intro one'],
								requirements: [{ title: 'Personal Statement', description: 'Write it' }],
								applyNowSection: {
									enabled: true,
									title: 'Apply',
									paragraphs: ['Go'],
									buttons: [{ label: 'Create Account', path: '/register' }],
								},
							},
						},
						{
							label: 'Renewal',
							content: {
								title: 'Renewal Workflow',
								eligibilityNotice: 'Renew notice',
								requirements: [{ title: 'Updated Transcripts', description: 'Upload' }],
								applyNowSection: { enabled: false, title: '', paragraphs: [], buttons: [] },
							},
						},
						{
							label: 'Compliance',
							content: {
								title: 'Compliance Workflow',
								eligibilityNotice: 'Check notice',
								requirements: [{ title: 'Status Update', description: 'Confirm' }],
								applyNowSection: { enabled: false, title: '', paragraphs: [], buttons: [] },
							},
						},
						{
							label: 'Extra Path',
							content: {
								title: 'Extra Workflow',
								eligibilityNotice: 'Extra notice',
								requirements: [{ title: 'Mystery Doc', description: 'Fallback icon path' }],
								applyNowSection: { enabled: false, title: '', paragraphs: [], buttons: [] },
							},
						},
					],
				},
			},
		],
	},
}));

vi.mock('../../config/content', () => ({
	homePageContent: mockContent,
}));

vi.mock('./homePageStyles', () => ({
	homeSectionPadding: { xs: 2 },
	homeOutlinedOnPrimaryButtonSx: () => ({}),
	homePrimaryPanelSx: () => ({}),
	homeYellowButtonSx: () => ({}),
}));

vi.mock('./SectionHeading', () => ({
	default: ({ title, subtitle }) => (
		<div>
			<h2>{title}</h2>
			<p>{subtitle}</p>
		</div>
	),
}));

vi.mock('../../utils/sanitizeHtml', () => ({
	sanitizeHtmlConfig: {},
}));

const theme = createTheme({
	palette: {
		primary: { main: '#0288d1' },
		contentAccent: { main: '#0288d1' },
		action: { selected: '#eee' },
		custom: { yellow2: '#F9A825', black: '#000', white: '#fff' },
	},
});

describe('HomeRequirementsSection', () => {
	it('selects applicant types including icon fallback for extra tabs', () => {
		render(
			<ThemeProvider theme={theme}>
				<HomeRequirementsSection sectionId='requirements' />
			</ThemeProvider>
		);
		expect(screen.getByText('Requirements Guide')).toBeInTheDocument();
		fireEvent.click(screen.getByText('Extra Path'));
		expect(screen.getByText('Extra notice')).toBeInTheDocument();
		expect(screen.getByText('Mystery Doc')).toBeInTheDocument();
		expect(screen.getByText('Fallback icon path')).toBeInTheDocument();
	});
});
