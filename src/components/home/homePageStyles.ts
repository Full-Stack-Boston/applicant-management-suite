export const displayFont = '"Fraunces", "Georgia", serif';

export const homeSectionPadding = { xs: 7, md: 9 };

export const homeContentWidth = { xs: '100%', md: 'min(960px, 92vw)' };

export const homeSectionAltBg = (darkMode: boolean) =>
	darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(2,136,209,0.04)';

export const homeHeroOverlay = (darkMode: boolean) =>
	darkMode
		? 'linear-gradient(135deg, rgba(8,12,18,0.88) 0%, rgba(2,136,209,0.55) 55%, rgba(46,125,50,0.45) 100%)'
		: 'linear-gradient(135deg, rgba(2,136,209,0.78) 0%, rgba(46,125,50,0.55) 55%, rgba(0,0,0,0.35) 100%)';

export const homeAccentStripe = {
	height: 4,
	width: 56,
	borderRadius: 999,
	bgcolor: 'custom.yellow2',
	mb: 2,
};

export const homeCardBorder = (darkMode: boolean) =>
	darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(2,136,209,0.12)';

/** Centered readable column; text stays left-aligned inside. */
export const homeProseBlock = {
	maxWidth: 720,
	width: '100%',
	minWidth: 0,
	boxSizing: 'border-box',
	mx: 'auto',
} as const;

const usesDarkOnPrimary = (primaryColor: string) => primaryColor === 'yellow2';

/** Text/icons on primary-colored surfaces (nav, footer, CTA panels). */
export const homePrimaryForeground = (primaryColor: string) =>
	usesDarkOnPrimary(primaryColor) ? 'custom.black' : 'common.white';

export const homeNavForeground = homePrimaryForeground;

/** Hover wash that keeps contrast on primary-colored panels. */
const homeOnPrimaryHoverBg = (primaryColor: string) =>
	usesDarkOnPrimary(primaryColor) ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.14)';

export const homeNavActiveBorderColor = (primaryColor: string) =>
	usesDarkOnPrimary(primaryColor) ? 'custom.black' : 'custom.yellow2';

export const homeNavBrandLinkSx = {
	fontWeight: 700,
	letterSpacing: '.08em',
	color: 'inherit',
	textDecoration: 'none',
	whiteSpace: 'nowrap',
	flexShrink: 0,
} as const;

/** Nav text buttons on the primary AppBar — lock hover color so theme text-button styles cannot match the bar. */
export const homeNavLinkButtonSx = (primaryColor: string) => ({
	color: 'inherit',
	fontWeight: 500,
	fontSize: { md: '0.8125rem', lg: '0.875rem' },
	borderRadius: 0,
	px: { md: 0.75, lg: 1.25 },
	py: 0.5,
	minWidth: 'auto',
	whiteSpace: 'nowrap',
	flexShrink: 0,
	lineHeight: 1.2,
	'&:hover': {
		color: 'inherit',
		bgcolor: homeOnPrimaryHoverBg(primaryColor),
		opacity: 1,
	},
});

export const homeNavToolbarIconSx = {
	color: 'inherit',
	flexShrink: 0,
	'&:hover': {
		color: 'inherit',
		opacity: 1,
	},
} as const;

/** Shared sx for blocks with primary.main background. */
export const homePrimaryPanelSx = (primaryColor: string) => ({
	bgcolor: 'primary.main',
	color: homePrimaryForeground(primaryColor),
});

/** Yellow CTA on dark or primary panels — locks hover text to black (theme contained hover overrides color). */
export const homeYellowButtonSx = {
	bgcolor: 'custom.yellow2',
	color: 'custom.black',
	fontWeight: 700,
	'--variant-containedBg': (theme: { palette: { custom: { yellow2: string } } }) => theme.palette.custom.yellow2,
	'--variant-containedColor': (theme: { palette: { custom: { black: string } } }) => theme.palette.custom.black,
	'&:hover': {
		bgcolor: 'custom.yellow',
		color: 'custom.black',
		'--variant-containedBg': (theme: { palette: { custom: { yellow: string } } }) => theme.palette.custom.yellow,
		'--variant-containedColor': (theme: { palette: { custom: { black: string } } }) => theme.palette.custom.black,
	},
} as const;

/** Outlined button on dark hero imagery — locks hover text to white. */
export const homeOutlinedOnDarkButtonSx = {
	borderColor: 'rgba(255,255,255,0.75)',
	color: 'common.white',
	'&:hover': {
		borderColor: 'common.white',
		color: 'common.white',
		bgcolor: 'rgba(255,255,255,0.08)',
	},
} as const;

/** Outlined button on primary-colored panels. */
export const homeOutlinedOnPrimaryButtonSx = (primaryColor: string) =>
	usesDarkOnPrimary(primaryColor)
		? {
				borderColor: 'custom.black',
				color: 'custom.black',
				fontWeight: 600,
				'&:hover': {
					borderColor: 'custom.black',
					color: 'custom.black',
					bgcolor: 'rgba(0,0,0,0.08)',
				},
			}
		: {
				borderColor: 'common.white',
				color: 'common.white',
				fontWeight: 600,
				'&:hover': {
					borderColor: 'custom.yellow2',
					color: 'common.white',
					bgcolor: 'rgba(255,255,255,0.08)',
				},
			};

/** Contained button using theme primary (e.g. contact form submit). */
export const homeContainedPrimaryButtonSx = (primaryColor: string) => ({
	fontWeight: 700,
	...(usesDarkOnPrimary(primaryColor)
		? {
				bgcolor: 'primary.main',
				color: 'custom.black',
				'--variant-containedBg': (theme: { palette: { primary: { main: string } } }) => theme.palette.primary.main,
				'--variant-containedColor': (theme: { palette: { custom: { black: string } } }) => theme.palette.custom.black,
				'&:hover': {
					bgcolor: 'custom.yellow',
					color: 'custom.black',
					'--variant-containedBg': (theme: { palette: { custom: { yellow: string } } }) => theme.palette.custom.yellow,
					'--variant-containedColor': (theme: { palette: { custom: { black: string } } }) => theme.palette.custom.black,
				},
				'&.Mui-disabled': { bgcolor: 'primary.main', color: 'custom.black', opacity: 0.5 },
			}
		: {
				'--variant-containedColor': '#FFFFFF',
				'&:hover': {
					color: '#FFFFFF',
					'--variant-containedColor': '#FFFFFF',
					'--variant-containedBg': (theme: { palette: { custom: { black: string } } }) => theme.palette.custom.black,
				},
			}),
});

export const homeFooterIconButtonSx = (primaryColor: string) => ({
	color: homePrimaryForeground(primaryColor),
	bgcolor: usesDarkOnPrimary(primaryColor) ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
	p: 1,
	'&:hover': {
		color: homePrimaryForeground(primaryColor),
		bgcolor: usesDarkOnPrimary(primaryColor) ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.22)',
		opacity: 1,
	},
});

export const homeFooterDividerSx = (primaryColor: string) => ({
	borderColor: usesDarkOnPrimary(primaryColor) ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)',
});

/** Footer text buttons (About / Requirements / etc.) on the primary panel. */
export const homeFooterNavButtonSx = (primaryColor: string) => ({
	color: homePrimaryForeground(primaryColor),
	justifyContent: 'flex-start',
	px: 0,
	minWidth: 0,
	fontWeight: 600,
	letterSpacing: '0.04em',
	'&:hover': {
		color: homePrimaryForeground(primaryColor),
		bgcolor: homeOnPrimaryHoverBg(primaryColor),
		opacity: 1,
	},
});

/**
 * Accent-colored footer links on the primary panel.
 * Hover must keep the same readable color — theme Link hover to primary would vanish into the footer bg.
 */
export const homeFooterAccentLinkSx = (primaryColor: string) => {
	const linkColor = usesDarkOnPrimary(primaryColor) ? 'custom.black' : 'custom.yellow2';
	return {
		color: linkColor,
		fontWeight: 600,
		textDecoration: 'none',
		opacity: 1,
		'&:hover, &:focus-visible': {
			color: linkColor,
			opacity: 1,
			textDecoration: 'underline',
		},
	};
};

/** Primary submit on auth/public forms. */
export const homeAuthSubmitButtonSx = (primaryColor: string) => ({
	...homeContainedPrimaryButtonSx(primaryColor),
});

/** Secondary outlined action on auth/public forms. */
export const homeAuthSecondaryButtonSx = {
	fontWeight: 600,
	textAlign: 'center',
} as const;

/** Side-by-side auth actions with equal width and height. */
export const homeAuthActionRowSx = {
	display: 'flex',
	flexDirection: { xs: 'column', sm: 'row' },
	gap: 1.5,
	alignItems: 'stretch',
	'& > .MuiButton-root': {
		flex: { sm: 1 },
		width: { xs: '100%', sm: 'auto' },
	},
} as const;

/** Centered profile picture upload row in auth forms. */
export const homeAuthProfileUploadRowSx = {
	display: 'flex',
	flexDirection: { xs: 'column', sm: 'row' },
	justifyContent: 'center',
	alignItems: 'center',
	gap: 2,
	py: 0.5,
	width: '100%',
} as const;

/** Lottie container shared by public status pages (404, 403, etc.). */
export const homeStatusPageLottieSx = {
	width: '100%',
	maxWidth: 360,
	mx: 'auto',
	mb: 2,
} as const;

/** Square lotties (403) — max width chosen so height matches the 404 lottie at 360px. */
export const homeStatusPageLottieSquareSx = {
	width: '100%',
	maxWidth: 260,
	mx: 'auto',
	mb: 2,
} as const;

/** Centered status block below review page headers. */
export const homeReviewStatusStackSx = {
	alignItems: 'center',
	width: '100%',
	py: 1.25,
	borderBottom: 1,
	borderColor: 'divider',
} as const;

/** Compact stacked label/value rows on review pages. */
export const homeReviewDetailRowsSx = {
	display: 'grid',
	gridTemplateColumns: {
		xs: '1fr',
		sm: 'repeat(2, minmax(0, 1fr))',
		md: 'repeat(3, minmax(0, 1fr))',
	},
	gap: { xs: 1.25, sm: 1.5 },
	py: 0.25,
	width: '100%',
	maxWidth: '100%',
	minWidth: 0,
	boxSizing: 'border-box',
} as const;

export const homeReviewDetailRowSx = {
	minWidth: 0,
	maxWidth: '100%',
} as const;

export const homeReviewDetailFieldFullSx = {
	gridColumn: { xs: '1 / -1', sm: '1 / -1' },
} as const;

export const homeReviewSectionPanelSx = (darkMode: boolean) => ({
	p: { xs: 1.5, sm: 2 },
	borderRadius: 2,
	border: '1px solid',
	borderColor: homeCardBorder(darkMode),
	bgcolor: homeSectionAltBg(darkMode),
	boxShadow: 0,
	width: '100%',
	maxWidth: '100%',
	minWidth: 0,
	boxSizing: 'border-box',
});

/** Section heading inside applicant dashboard panels. */
export const homeApplicantSectionTitleSx = {
	fontFamily: displayFont,
	fontSize: { xs: '1.15rem', sm: '1.25rem' },
	fontWeight: 400,
	mb: { xs: 2, md: 1.5 },
	color: 'text.primary',
} as const;

/** Vertical rhythm between dashboard sections (Apply page). */
export const homeApplicantDashboardSectionStackSx = {
	spacing: { xs: 4.5, md: 3.5 },
	width: '100%',
	minWidth: 0,
	maxWidth: '100%',
	boxSizing: 'border-box',
} as const;

/** Small section label inside dashboard intro copy. */
export const homeDashboardIntroLabelSx = {
	display: 'block',
	letterSpacing: '0.12em',
	fontWeight: 700,
	fontSize: '0.68rem',
	textTransform: 'uppercase',
	color: (theme: { palette: { contentAccent?: { main: string }; primary: { main: string } } }) =>
		theme.palette.contentAccent?.main ?? theme.palette.primary.main,
	mb: 0.75,
} as const;

export const homeDashboardIntroBodySx = {
	lineHeight: 1.65,
} as const;

export const homeDashboardIntroListSx = {
	m: 0,
	pl: 2.25,
	display: 'flex',
	flexDirection: 'column',
	gap: 0.75,
	'& li': {
		lineHeight: 1.6,
	},
} as const;

/** Grid for application summary cards. */
export const homeApplicantCardGridSx = {
	display: 'grid',
	gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(240px, 1fr))' },
	gap: 1.5,
	width: '100%',
} as const;

/** Full-width stack for list-style application tiles. */
export const homeApplicantCardListSx = {
	display: 'flex',
	flexDirection: 'column',
	gap: 1,
	width: '100%',
	minWidth: 0,
	maxWidth: '100%',
	boxSizing: 'border-box',
} as const;

/** Side-by-side fields inside applicant summary cards (status / date, etc.). */
export const homeApplicantCardSplitRowSx = {
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'flex-start',
	gap: 2,
	width: '100%',
} as const;

/** Uppercase label used in applicant dashboard detail rows. */
export const homeApplicantDetailLabelSx = {
	display: 'block',
	letterSpacing: '0.08em',
	fontWeight: 700,
	fontSize: '0.62rem',
	textTransform: 'uppercase',
	color: 'text.secondary',
	mb: 0.35,
} as const;

export const homeApplicantDetailIconSx = {
	fontSize: 20,
	mt: 0.15,
	flexShrink: 0,
	color: (theme: { palette: { contentAccent?: { main: string }; primary: { main: string } } }) =>
		theme.palette.contentAccent?.main ?? theme.palette.primary.main,
} as const;

export const homeApplicantDetailRowSx = {
	display: 'flex',
	alignItems: 'flex-start',
	gap: 1.25,
	minWidth: 0,
} as const;

/** Clickable application summary card on the applicant portal. */
export const homeApplicantCardSx = (darkMode: boolean) => ({
	p: 2,
	borderRadius: 2,
	borderColor: homeCardBorder(darkMode),
	display: 'flex',
	flexDirection: 'column',
	gap: 1.25,
	minHeight: 188,
	position: 'relative',
	boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.28)' : '2px 4px 10px 1px rgba(0, 0, 0, 0.38)',
	transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
	'&:hover': {
		borderColor: darkMode ? 'rgba(255,255,255,0.22)' : 'rgba(2,136,209,0.28)',
		boxShadow: darkMode ? '0 4px 16px rgba(0,0,0,0.35)' : '2px 6px 16px 2px rgba(0, 0, 0, 0.5)',
	},
});

/** Compact application summary card — no forced min-height. */
export const homeApplicantApplicationCardSx = (darkMode: boolean) => ({
	...homeApplicantCardSx(darkMode),
	minHeight: 'unset',
	gap: 1,
	minWidth: 0,
	maxWidth: '100%',
	boxSizing: 'border-box',
	boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.28)' : '0 2px 10px rgba(0, 0, 0, 0.38)',
	'&:hover': {
		borderColor: darkMode ? 'rgba(255,255,255,0.22)' : 'rgba(2,136,209,0.28)',
		boxShadow: darkMode ? '0 4px 16px rgba(0,0,0,0.35)' : '0 4px 14px rgba(0, 0, 0, 0.45)',
	},
});

/** Full-width application list tile. */
export const homeApplicantApplicationListRowSx = (darkMode: boolean) => ({
	...homeApplicantApplicationCardSx(darkMode),
	width: '100%',
	p: 1.5,
	gap: 0.75,
});

/** Stack of available-application launch tiles. */
export const homeApplicantAvailableAppsSx = {
	display: 'flex',
	flexDirection: 'column',
	gap: 1,
	width: '100%',
	minWidth: 0,
	maxWidth: '100%',
	boxSizing: 'border-box',
} as const;

/** Interactive available-application tile (Link/Paper). */
export const homeApplicantAvailableAppTileSx = (darkMode: boolean, disabled: boolean) => ({
	...homeApplicantApplicationListRowSx(darkMode),
	textDecoration: 'none',
	color: 'inherit',
	display: 'flex',
	flexDirection: 'row',
	alignItems: 'center',
	justifyContent: 'space-between',
	gap: 1.5,
	opacity: disabled ? 0.55 : 1,
	cursor: disabled ? 'default' : 'pointer',
	pointerEvents: disabled ? 'none' : 'auto',
	'&:hover': disabled
		? {}
		: {
				borderColor: darkMode ? 'rgba(255,255,255,0.22)' : 'rgba(2,136,209,0.28)',
				boxShadow: darkMode ? '0 4px 16px rgba(0,0,0,0.35)' : '0 4px 14px rgba(0, 0, 0, 0.45)',
			},
});

/** @deprecated Prefer homeApplicantAvailableAppsSx */
export const homeApplicantAppButtonRowSx = homeApplicantAvailableAppsSx;
