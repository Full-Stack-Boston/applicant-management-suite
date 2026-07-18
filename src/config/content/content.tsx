/**
 * STATIC CONTENT CONFIGURATION (CMS)
 * ---------------------------------------------------------------------------
 * This file serves as the "Copy Deck" for the application.
 * It contains all the static text, labels, instructions, and marketing copy
 * displayed on the public-facing pages (Home, Login, Register, Dashboard).
 *
 * * WHY EDIT THIS FILE?
 * - To change the "Welcome" text on the landing page.
 * - To update the instructions for the Application Wizard.
 * - To modify the Login/Register form labels.
 * - To change the "Contact Sales" information.
 */

import { paths } from '../navigation/paths';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import { Assets, brand } from '../Constants';

// --- 1. Landing Page (Public Home) ---

/**
 * Configuration for the main Landing Page.
 * Controls the Hero section, Navigation Bar, Info Tabs, and Footer.
 */
export const homePageContent = {
	// Top Hero Section (Image & Welcome Text)
	intro: {
		enabled: true,
		backgroundImages: {
			light: Assets.heroLM,
			dark: Assets.heroDM,
		},
		externalLink: {
			enabled: true,
			label: 'Full Stack Boston', // Text for the external link (top right)
			url: 'https://fullstackboston.com',
		},
		welcomeText: {
			enabled: true,
			line1: 'Welcome to the',
			line2: brand.organizationName, // e.g. "Application Management Suite"
		},
		windowInfo: {
			enabled: true, // Shows the "Application Window: Open/Closed" widget
		},
		scrollFab: {
			enabled: true,
			label: 'Discover the Platform', // Text for the "Scroll Down" button
		},
	},

	// Top Navigation Bar
	appBar: {
		enabled: true,
		organizationName: {
			long: brand.organizationName.toUpperCase(),
			short: `${brand.organizationShortName} DEMO`,
		},
		// Links displayed in the Navbar
		navLinks: [
			{ type: 'scroll', label: 'Platform Overview', shortLabel: 'Overview', sectionId: 'about' },
			{ type: 'scroll', label: 'Workflow Types', shortLabel: 'Workflows', sectionId: 'apply' },
			{ type: 'scroll', label: 'Contact Sales', shortLabel: 'Contact', sectionId: 'contact' },
			{ type: 'navigate', label: 'Get Started', path: paths.registerApplicant },
		],
		applicantNavLinks: [{ type: 'navigate', label: 'Dashboard', path: paths.apply }],
		applicantInfoLinks: [
			{ type: 'scroll', label: 'Platform Overview', sectionId: 'about' },
			{ type: 'scroll', label: 'Workflow Types', sectionId: 'apply' },
			{ type: 'scroll', label: 'Contact Sales', sectionId: 'contact' },
		],
		utilityNavLinks: [{ type: 'navigate', label: 'Home', path: paths.home }],
		themeToggle: { enabled: true },
		authLink: { enabled: true },
	},

	// Main Content Area (Tabs & Information)
	information: {
		enabled: true,
		mainTitle: 'Streamline Your Grant & Scholarship Administration',
		tabs: [
			// Tab 1: General Platform Info
			{
				label: 'Platform Overview',
				content: {
					title: 'About the Suite',
					paragraphs: [
						'The Application Management Suite (AMS) by Full Stack Boston is a robust, secure, and scalable platform designed to modernize how organizations collect, review, and administer applications. Whether you are managing scholarships, community grants, or fellowship programs, AMS reduces administrative overhead while providing a seamless experience for your applicants.',
						'Our suite replaces disjointed paper trails and email chains with a centralized dashboard. Administrators can define custom requirements, automate communication, and coordinate review committees, all from one intuitive interface.',
						"Security and privacy are at the core of AMS. Built on Google Cloud's Firebase infrastructure, the platform ensures that sensitive applicant data, from financial aid reports to personal transcripts, is encrypted and accessible only to authorized personnel.",
						'Key capabilities include:',
						'"Dynamic Workflow Engine: Tailor the application process for different cohorts. Create distinct paths for new applicants, returning grantees, or multi-year scholarship recipients without managing separate systems."',
						'"Integrated Review Tools: Empower your committee members with dedicated review portals. Assign applications, score candidates based on custom rubrics, and deliberate in real-time with integrated video conferencing."',
						'This demo environment showcases the full lifecycle of an application. Feel free to register a test applicant account, submit a mock application, or create a committee account via board registration to tour the administrative side firsthand.',
					],
				},
			},
			// Tab 2: Workflow Demonstrations (Nested Tabs)
			{
				label: 'Workflow Types',
				content: {
					childTabs: [
						{
							label: 'Standard Grant',
							content: {
								title: 'Standard Intake Workflow',
								eligibilityNotice:
									'This demo path models a <strong>first-time applicant</strong> intake with full document collection.',
								introParagraphs: ['This workflow demonstrates a typical intake process for <strong>new applicants</strong>. It requires comprehensive data collection, including demographics, file attachments, and external recommendations. In a live environment, this workflow acts as the primary funnel for your program.'],
								deadlineMessage: 'Applications for this cycle must be finalized by',
								requirements: [
									{ title: 'Personal Statement', description: 'Demonstrate the rich text editor capabilities for applicant essays and personal narratives.' },
									{ title: 'External Recommendations', description: 'Automate the collection of letters from teachers, mentors, or community leaders via secure upload links.' },
									{ title: 'Academic Transcripts', description: 'Securely upload and store PDF transcripts with preview capabilities for reviewers.' },
									{ title: 'Financial Aid Reporting', description: 'Collect sensitive financial data (like FAFSA/SAR) with enterprise-grade encryption.' },
									{ title: 'Proof of Eligibility', description: 'Configure custom validation rules to ensure applicants meet your specific criteria before applying.' },
								],
								applyNowSection: {
									enabled: true,
									title: 'Try the Demo',
									paragraphs: ['Experience the applicant journey yourself. Create a test account to start a new application.<br /><br /><strong>Feature Highlight: Autosave & Progress Tracking are enabled.</strong>'],
									buttons: [
										{ label: 'Create Test Account', path: paths.registerApplicant },
										{ label: 'Login to Dashboard', path: paths.login },
									],
								},
							},
						},
						{
							label: 'Renewal Request',
							content: {
								title: 'Renewal Workflow',
								eligibilityNotice:
									'Use this path to demo <strong>returning applicants</strong> with pre-filled prior-year data.',
								introParagraphs: ['The Renewal workflow is optimized for <strong>returning users</strong>. It pre-fills data from previous years, reducing friction for applicants and ensuring data consistency for your records. Ideal for multi-year grants or annual funding cycles.'],
								deadlineMessage: 'Renewal requests must be submitted by',
								requirements: [
									{ title: 'Impact Statement', description: 'Ask returning grantees to update you on their progress and how previous funding was utilized.' },
									{ title: 'Updated Transcripts', description: 'Collect only the new necessary documentation, skipping previously submitted baseline data.' },
									{ title: 'Streamlined Review', description: 'Renewals can be routed to a simplified review queue for faster processing.' },
								],
								applyNowSection: {
									enabled: true,
									title: 'Test the Workflow',
									paragraphs: ['Log in to see how the system handles returning user data.<br /><br /><strong>Feature Highlight: Pre-filled forms reduce abandonment rates.</strong>'],
									buttons: [{ label: 'Go To Applicant Dashboard', path: paths.login }],
								},
							},
						},
						{
							label: 'Compliance Check-In',
							content: {
								title: 'Compliance Workflow',
								eligibilityNotice:
									'Use this path for a <strong>lightweight compliance check-in</strong> without a full re-application.',
								introParagraphs: ['This workflow demonstrates a <strong>lightweight check-in</strong> for multi-year scholarship recipients. It ensures compliance with program terms (e.g., maintaining GPA) without requiring a full application re-submission.'],
								deadlineMessage: 'Check-ins must be completed by',
								requirements: [
									{ title: 'Status Update', description: 'A brief form to confirm enrollment status, contact details, and program compliance.' },
									{ title: 'Verification Documents', description: 'Upload current semester grades or proof of enrollment.' },
								],
								applyNowSection: {
									enabled: true,
									title: 'View Check-In Process',
									paragraphs: ['See how easy it is for long-term recipients to maintain their status.<br /><br /><strong>Feature Highlight: Automated reminders ensure timely compliance.</strong>'],
									buttons: [{ label: 'Go To Applicant Dashboard', path: paths.login }],
								},
							},
						},
					],
				},
			},
			// Tab 3: Contact Info
			{
				label: 'Contact Sales',
				content: {
					title: 'Get in Touch',
					subtitle:
						'Interested in deploying AMS for your organization? Use the contact form. Messages go to the project owner. You can also reach Full Stack Boston by phone or the @fullstackboston.com addresses listed here.',
					scamNotice:
						'Full Stack Boston and this AMS demo never ask for payment, passwords, or Social Security numbers through unofficial channels. Use only the contact options on this site.',
					address: {
						enabled: false,
						title: 'Headquarters',
						lines: [],
					},
					emails: {
						enabled: true,
						title: 'Email',
						items: [
							{ label: 'General', configKey: 'MAIL_TO_GENERAL_EMAIL' },
							{ label: 'Webmaster', configKey: 'MAIL_TO_WEBMASTER' },
							{ label: 'Admin', configKey: 'MAIL_TO_CHAIRMAN' },
						],
					},
					phones: {
						enabled: true,
						title: 'Phone',
						items: [
							{ label: 'Main line', configKey: 'TEL_GENERAL' },
							{ label: 'Support', configKey: 'TEL_WEBMASTER' },
						],
					},
				},
			},
		],
		// Bottom "Call to Action" sections
		bottomSections: {
			enabled: true,
			supportUs: {
				enabled: true,
				title: 'Custom Solutions',
				paragraphs: [
					'Every organization has a unique process. AMS is built to be flexible. We offer custom implementation services to tailor the workflow, data collection, and branding to your specific needs.',
					'Whether you are a small non-profit or a large university department, we can scale the infrastructure to match your volume.',
				],
				mailTo: {
					title: 'To discuss a custom deployment',
					lines: [
						'Use the contact form above. Messages go to the project owner.',
						'Or call the main / support lines listed under Contact Sales.',
						'Web: ams.fullstackboston.com',
					],
				},
			},
			applyNow: {
				enabled: true,
				title: 'Start Your Trial',
				paragraph:
					'Ready to see the platform in action? Create a demo applicant account to walk through intake, or register a committee account to explore the admin dashboard, inbox, and interview tools.',
				button: {
					label: 'Access Demo Portal',
					path: paths.login,
				},
				boardButton: {
					label: 'Create Board Account',
					path: paths.registerMember,
				},
			},
		},
	},

	/** Demo-only copy pointing visitors to `/board-registration` (hidden when MEMBER_ONBOARDING_PAGE_ENABLED is false). */
	demoBoardAccess: {
		heroLinkLabel: 'Exploring the admin side? Create a board account',
		loginLinkLabel: 'Demo staff access? Register a committee account',
		registerLinkLabel: 'Need committee access instead? Register as board staff',
		footerLinkLabel: 'Committee demo access',
		path: paths.registerMember,
	},

	// Footer Content
	footer: {
		enabled: true,
		organizationName: {
			long: brand.organizationName.toUpperCase(),
			short: brand.organizationShortName,
		},
		scrollToTopButton: {
			enabled: true,
			labels: { long: 'Back to Top', short: 'Up' },
		},
		themeToggle: { enabled: true },
		authLink: { enabled: true },
		copyright: {
			enabled: true,
			line1: `${brand.organizationName} | Powered by ${brand.broughtToYouBy}`,
			startYear: 2023,
		},
		githubLink: {
			enabled: true,
			label: 'Source on GitHub',
			url: brand.githubUrl,
		},
	},

	missionLine: `${brand.tagline} Built by ${brand.broughtToYouBy}. Source available on GitHub.`,

	deadlineMessage: 'Demo applications and attachments should be finalized by end of day',

	trustStats: {
		enabled: true,
		items: [
			{ value: '1 platform', label: 'Intake through deliberation' },
			{ value: '3 workflows', label: 'Standard, renewal, compliance' },
			{ value: 'Firebase', label: 'Auth, data, and hosting' },
			{ value: 'FSB', label: 'Deployed by Full Stack Boston' },
		],
	},

	sectionIds: {
		about: 'about',
		apply: 'apply',
		contact: 'contact',
		support: 'support',
	},
};

// --- 2. Applicant Registration Page ---

/**
 * Text and Labels for the Applicant Sign-Up Form.
 */
export const applicantRegistrationContent = {
	title: 'Create Demo Account',
	icon: <PersonOutlinedIcon />,
	fields: [
		{ component: 'ProfilePictureUpload', name: 'picture' },
		{ component: 'TextField', name: 'firstName', label: 'First Name', required: true, autoComplete: 'given-name', autoFocus: true, margin: 'dense' },
		{ component: 'TextField', name: 'lastName', label: 'Last Name', required: true, autoComplete: 'family-name', margin: 'dense' },
		{ component: 'TextField', name: 'callMe', label: 'Preferred Name', required: true, autoComplete: 'nickname', margin: 'dense' },
		{ component: 'TextField', name: 'email', label: 'Email Address', type: 'email', required: true, autoComplete: 'email', margin: 'dense' },
		{ component: 'TextField', name: 'password', label: 'Password', type: 'password', required: true, autoComplete: 'new-password', margin: 'dense' },
		{ component: 'TextField', name: 'confirmPassword', label: 'Confirm Password', type: 'password', required: true, autoComplete: 'new-password', margin: 'dense' },
	],
	buttons: [
		{ id: 'submit', label: 'Register Account', type: 'submit', variant: 'outlined', fullWidth: true },
		{ id: 'home', label: 'Cancel', variant: 'outlined', fullWidth: true, navigationPath: paths.home },
	],
	links: [{ id: 'signIn', label: 'Already have an account? Sign In', navigationPath: paths.login }],
};

// --- 3. Login Page ---

/**
 * Text and Labels for the Login Form.
 */
export const loginContent = {
	title: `${brand.organizationShortName} Portal Login`,
	icon: <LockOutlinedIcon />,
	fields: [
		{ component: 'TextField', name: 'email', label: 'Email Address', required: true, fullWidth: true, id: 'email', autoComplete: 'email', autoFocus: true, margin: 'normal' },
		{ component: 'TextField', name: 'password', label: 'Password', type: 'password', required: true, fullWidth: true, id: 'password', autoComplete: 'current-password', margin: 'normal' },
		{ component: 'Checkbox', name: 'remember', label: 'Remember me' },
	],
	buttons: [
		{ id: 'submit', label: 'Sign In', type: 'submit', variant: 'outlined', fullWidth: true },
		{ id: 'home', label: 'Back to Home', variant: 'outlined', fullWidth: true, navigationPath: paths.home },
	],
	links: [
		{ id: 'forgotPassword', label: 'Forgot password?', action: 'handlePasswordReset' },
		{ id: 'signUp', label: 'New to the demo? Create an account', navigationPath: paths.registerApplicant },
	],
};

// --- 4. Applicant Dashboard (Apply Home) ---

interface AvailableApp {
	type: string;
	path: string;
	disabled: boolean;
	label: string;
	description: string;
}

export interface ApplyDashboardIntro {
	overview: string;
	preparation: string;
	applicationPaths: string[];
	eligibility: string;
	help: string;
}

export interface ApplyContent {
	title: string;
	intro: ApplyDashboardIntro;
	availableApps: AvailableApp[];
}

/**
 * Configuration for the Applicant's "Dashboard" where they select a workflow.
 * @param {Object} config - The global system configuration (used to disable apps).
 */
export const getApplyContent = (config: Record<string, unknown>): ApplyContent => ({
	title: 'Dashboard',
	intro: {
		overview: `This dashboard is your home for the ${brand.organizationShortName} demo application process. From here you can begin a workflow, resume a draft, review a submission, and respond to interview invitations when the window is open.`,
		preparation:
			'Before you start, gather supporting documents as PDF files. You will also need the full name, email address, and phone number for each person writing a recommendation on your behalf.',
		applicationPaths: [
			'Select <strong>Standard Grant</strong> for a first-time intake with full data collection, files, and references.',
			'Select <strong>Renewal</strong> for a returning applicant with an optimized flow that reuses existing data.',
			'Select <strong>Compliance Check-In</strong> for a lightweight scholarship status update.',
		],
		eligibility: 'This is a demo environment. In production, your organization would define cycle limits and eligibility rules here.',
		help: `Need help navigating the demo? Contact ${brand.contactEmail}.`,
	},
	availableApps: [
		{
			type: 'newApplicants',
			path: paths.createApplication,
			disabled: config.NEW_APPLICANT_APPLICATIONS_DISABLED !== false,
			label: 'Standard Grant',
			description: 'Full intake for first-time applicants, including documents and recommendations.',
		},
		{
			type: 'returningGrants',
			path: paths.createApplication,
			disabled: config.RETURNING_APPLICANT_APPLICATIONS_DISABLED !== false,
			label: 'Renewal',
			description: 'Optimized renewal flow for applicants with existing data on file.',
		},
		{
			type: 'scholarshipRecipients',
			path: paths.createApplication,
			disabled: config.SCHOLARSHIP_RECIPIENT_APPLICATIONS_DISABLED !== false,
			label: 'Compliance Check-In',
			description: 'Lightweight status update for ongoing scholarship recipients.',
		},
	],
});
