/**
 * MATERIAL UI THEME CONFIGURATION
 * ---------------------------------------------------------------------------
 * Visual design system: colors, typography, and global component styles.
 * Prefer palette + component overrides here so pages inherit a cohesive look
 * without per-component color hardcoding.
 *
 * FEATURES:
 * 1. Dark/Light Mode Support.
 * 2. Dynamic Primary Color (customizable via Settings).
 * 3. Centralized Component Overrides (DataGrid, Buttons, Inputs, headings).
 */

import { createTheme } from '@mui/material/styles';
import type { CSSObject, Theme, ThemeOptions } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';
// Registers the MuiDataGrid key on ThemeOptions['components'].
import type {} from '@mui/x-data-grid/themeAugmentation';

// --- 1. Color Palette Definition ---

/**
 * Base color tokens. Prefer referencing these (or theme.palette.*) from UI code.
 * Tuned for an institutional / professional AMS demo aesthetic:
 * cool neutrals, readable body text, accents that hold contrast on white cards.
 */
export const colors = {
	// Semantic accents (user-selectable primary keys)
	blue: '#0277BD',
	green: '#2E7D32',
	/** Deep teal — professional institutional accent (replaces former crimson picker option). */
	teal: '#0F766E',
	yellow: '#B7892E',
	yellow2: '#B7892E',
	/** Slate — readable as an accent. */
	brown: '#546E7A',
	/** Semantic / status only — not an accent picker option. */
	red: '#C62828',

	// Neutrals & surfaces
	black: process.env.REACT_APP_PRELOAD_BG_DARK || '#0F172A',
	stBlack: '#1E293B',
	/** Page / workspace wash (light). */
	white: process.env.REACT_APP_PRELOAD_BG_LIGHT || '#E8EEF4',
	offWhite: '#E8EEF4',
	stWhite: '#F1F5F9',
	/** Elevated cards / panels. */
	brightWhite: '#FFFFFF',

	lightBG: '#E8EEF4',
	lightCanvas: '#E8EEF4',
	lightPaper: '#FFFFFF',
	darkBG: '#0F172A',
	darkCanvas: '#0F172A',
	darkPaper: '#1E293B',

	// Text
	lightTextPrimary: '#0F172A',
	lightTextSecondary: '#64748B',
	darkTextPrimary: '#F1F5F9',
	darkTextSecondary: '#94A3B8',
};

export type ColorKey = keyof typeof colors;

/** Relative luminance for WCAG contrast (sRGB hex). */
const parseHex = (hex: string): number[] => {
	const normalized = hex.replace('#', '');
	const full = normalized.length === 3 ? normalized.split('').map((c: string) => c + c).join('') : normalized;
	const channels = full.match(/.{2}/g)?.map((pair: string) => parseInt(pair, 16)) ?? [0, 0, 0];
	return channels;
};

/** Mix two hex colors; `weight` is the share of `foreground` (0–1). Returns #rrggbb for MUI alpha(). */
const mixHex = (foreground: string, background: string, weight: number): string => {
	const fg = parseHex(foreground);
	const bg = parseHex(background);
	const w = Math.min(1, Math.max(0, weight));
	const mixed = fg.map((channel, index) => Math.round(channel * w + bg[index] * (1 - w)));
	return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
};

const relativeLuminance = (hex: string): number => {
	const channels = parseHex(hex).map((value) => value / 255);
	const [r, g, b] = channels.map((channel) =>
		channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
	);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (foreground: string, background: string): number => {
	const fg = relativeLuminance(foreground);
	const bg = relativeLuminance(background);
	const lighter = Math.max(fg, bg);
	const darker = Math.min(fg, bg);
	return (lighter + 0.05) / (darker + 0.05);
};

const MIN_CONTENT_CONTRAST = 4.5;

/** Pick a readable accent for icons/eyebrows on neutral section surfaces. */
export const resolveContentAccent = (mode: 'light' | 'dark', primaryKey: string): string => {
	const surface = mode === 'dark' ? colors.darkPaper : colors.lightPaper;
	const primary = colors[primaryKey as ColorKey] || colors.blue;
	const candidates = [
		primary,
		colors.blue,
		colors.teal,
		colors.green,
		colors.brown,
		mode === 'dark' ? colors.darkTextPrimary : colors.lightTextPrimary,
		mode === 'dark' ? colors.yellow : colors.brown,
	];

	for (const candidate of candidates) {
		if (contrastRatio(candidate, surface) >= MIN_CONTENT_CONTRAST) {
			return candidate;
		}
	}

	return mode === 'dark' ? colors.darkTextPrimary : colors.lightTextPrimary;
};

/** Pick a readable color for inline links / text actions on neutral surfaces. */
export const resolveContentLink = (mode: 'light' | 'dark', primaryKey: string): string => resolveContentAccent(mode, primaryKey);

/**
 * Custom color tokens exposed on `theme.palette.custom`.
 */
const commonCustomColors = {
	custom: {
		brown: colors.brown,
		red: colors.red,
		teal: colors.teal,
		black: colors.black,
		white: colors.white,
		offWhite: colors.offWhite,
		brightWhite: colors.brightWhite,
		yellow: colors.yellow,
		yellow2: colors.yellow2,
		blue: colors.blue,
		green: colors.green,
		stwhite: colors.stWhite,
		stblack: colors.stBlack,
		lightBG: colors.lightBG,
		darkBG: colors.darkBG,
		lightTextPrimary: colors.lightTextPrimary,
		lightTextSecondary: colors.lightTextSecondary,
		darkTextPrimary: colors.darkTextPrimary,
		darkTextSecondary: colors.darkTextSecondary,
	},
};

const headerForeground = (background: string): string =>
	contrastRatio(colors.brightWhite, background) >= MIN_CONTENT_CONTRAST ? colors.brightWhite : colors.black;

const getDataGridStyles = (mode: 'light' | 'dark', mainColor: string): { root: CSSObject } => {
	const isLight = mode === 'light';
	const cellColor = isLight ? colors.lightTextPrimary : colors.darkTextPrimary;
	const headerBg = isLight ? mainColor : mixHex(mainColor, colors.stBlack, 0.58);
	const headerFg = headerForeground(mainColor);
	const rowBorderColor = isLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(241, 245, 249, 0.12)';

	return {
		root: {
			'& .MuiDataGrid-cell': {
				color: cellColor,
				borderColor: rowBorderColor,
				display: 'flex',
				alignItems: 'center',
				'& .MuiTypography-root': { color: 'inherit' },
			},
			'& .MuiDataGrid-cellContent': {
				display: 'flex',
				alignItems: 'center',
				width: '100%',
				minWidth: 0,
				lineHeight: 'normal',
			},
			'& .MuiDataGrid-columnHeader': {
				display: 'flex',
				alignItems: 'center',
				backgroundColor: headerBg,
				color: headerFg,
			},
			'& .MuiDataGrid-columnHeaders': {
				backgroundColor: headerBg,
				color: headerFg,
				borderColor: rowBorderColor,
			},
			'& .MuiDataGrid-columnHeaderTitle': {
				color: headerFg,
				fontSize: '15px',
				fontFamily: 'Lexend, Segoe UI, sans-serif',
				fontWeight: '600',
				letterSpacing: '0.4px',
			},
			'& .MuiDataGrid-sortIcon, & .MuiDataGrid-menuIconButton, & .MuiDataGrid-iconButtonContainer .MuiIconButton-root': {
				color: headerFg,
			},
			'& .MuiDataGrid-row:hover': {
				backgroundColor: isLight ? colors.stWhite : colors.stBlack,
				'& .MuiDataGrid-cell': { color: cellColor, fontWeight: 'bold' },
			},
			'& .MuiDataGrid-footerContainer': {
				color: cellColor,
				borderTopColor: rowBorderColor,
			},
			'& .MuiTablePagination-root, & .MuiTablePagination-selectIcon, & .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel': {
				color: cellColor,
			},
			'& .MuiDataGrid-selectedRowCount, & .MuiDataGrid-toolbarContainer': {
				color: cellColor,
			},
			'& .MuiCheckbox-root': {
				color: isLight ? colors.lightTextSecondary : colors.darkTextSecondary,
			},
		},
	};
};

// --- 2. Theme Generator ---

/**
 * @param {string} mode - 'light' | 'dark'
 * @param {string} primaryColor - Key from the `colors` object (e.g., 'green', 'blue').
 */
const getDesignTokens = (mode: 'light' | 'dark', primaryColor: string): ThemeOptions => {
	const mainColor = colors[primaryColor as ColorKey] || colors.blue;
	const contentAccent = resolveContentAccent(mode, primaryColor);
	const contentLink = resolveContentLink(mode, primaryColor);
	/** Headings track the accent so the picker has an obvious effect. */
	const headingColor = contentAccent;
	const onPrimary = headerForeground(mainColor);
	/** Soft workspace wash — neutral base with a readable accent tint (hex only; MUI alpha() rejects color-mix). */
	const canvasColor = mode === 'light' ? mixHex(mainColor, colors.lightCanvas, 0.14) : mixHex(mainColor, colors.darkCanvas, 0.18);
	const primaryHover = mode === 'light' ? mixHex(mainColor, colors.black, 0.78) : mixHex(mainColor, colors.brightWhite, 0.72);
	const primarySoft = mode === 'light' ? mixHex(mainColor, colors.brightWhite, 0.12) : mixHex(mainColor, colors.darkPaper, 0.18);

	const commonConfig: ThemeOptions = {
		typography: {
			fontFamily: 'Lexend, Segoe UI, sans-serif',
			h1: { fontWeight: 700 },
			h2: { fontWeight: 700 },
			h3: { fontWeight: 700 },
			h4: { fontWeight: 700 },
			h5: { fontWeight: 700 },
			h6: { fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.3, letterSpacing: '0.01em' },
			/** Card / panel section titles — use `variant="subtitle1"`. */
			subtitle1: {
				fontFamily: 'Lexend, Segoe UI, sans-serif',
				fontSize: '0.95rem',
				fontWeight: 700,
				lineHeight: 1.35,
				letterSpacing: '0.02em',
			},
			subtitle2: {
				fontFamily: 'Lexend, Segoe UI, sans-serif',
				fontSize: '0.8rem',
				fontWeight: 600,
				lineHeight: 1.35,
				letterSpacing: '0.04em',
				textTransform: 'uppercase',
			},
			button: {
				fontFamily: 'Lexend, Segoe UI, sans-serif',
				fontWeight: 600,
				letterSpacing: '0.03em',
			},
		},
		palette: {
			...commonCustomColors,
			contentAccent: { main: contentAccent },
			contentLink: { main: contentLink },
			success: { main: colors.green },
			error: { main: colors.red },
			warning: { main: colors.yellow },
			info: { main: colors.blue },
		},
		components: {
			MuiCssBaseline: {
				styleOverrides: {
					body: {
						fontFamily: 'Lexend, Segoe UI, sans-serif',
					},
				},
			},
			MuiAlert: {
				styleOverrides: {
					root: { fontSize: '1.2rem', fontWeight: 'bold', padding: '1rem', borderRadius: '12px', textAlign: 'center' },
				},
				// The standardSuccess/standardError/etc. slot keys were removed from
				// AlertClasses; per-severity styling now goes through variants.
				variants: [
					{ props: { variant: 'standard', severity: 'success' }, style: { backgroundColor: colors.green, color: colors.brightWhite } },
					{ props: { variant: 'standard', severity: 'error' }, style: { backgroundColor: colors.red, color: colors.brightWhite } },
					{ props: { variant: 'standard', severity: 'warning' }, style: { backgroundColor: colors.yellow, color: colors.black } },
					{ props: { variant: 'standard', severity: 'info' }, style: { backgroundColor: colors.blue, color: colors.brightWhite } },
				],
			},
			MuiButton: {
				defaultProps: { variant: 'contained', size: 'medium' },
				styleOverrides: {
					root: {
						borderRadius: '8px',
						textTransform: 'none',
					},
				},
			},
			MuiLink: {
				styleOverrides: {
					root: ({ theme }) => ({
						color: theme.palette.contentLink.main,
						fontWeight: 600,
						// Never fade or recolor on hover — primary-panel links would vanish into the accent bg.
						'&:hover': {
							color: theme.palette.contentLink.main,
							opacity: 1,
							textDecoration: 'underline',
						},
					}),
				},
			},
			MuiTypography: {
				styleOverrides: {
					h6: ({ theme }) => ({
						color: theme.palette.text.heading,
					}),
					subtitle1: ({ theme }) => ({
						color: theme.palette.text.heading,
					}),
					subtitle2: ({ theme }) => ({
						color: theme.palette.text.secondary,
					}),
				},
			},
			MuiList: {
				styleOverrides: { root: { padding: 0 } },
			},
			MuiListItemIcon: {
				styleOverrides: { root: { minWidth: '30px', '&:hover': { color: colors.brightWhite } } },
			},
			MuiTableCell: {
				styleOverrides: { body: { fontSize: '15px' } },
			},
			MuiTableHead: {
				styleOverrides: { root: { '& th': { fontWeight: 'bold', fontSize: '16px' } } },
			},
			MuiTableBody: {
				styleOverrides: { root: { '& tr:last-child td, & tr:last-child th': { borderBottom: 'none' } } },
			},
			MuiDataGrid: {
				styleOverrides: getDataGridStyles(mode, mainColor),
			},
		},
	};

	const lightConfig: ThemeOptions = {
		palette: {
			mode: 'light',
			primary: { main: mainColor, contrastText: onPrimary, soft: primarySoft },
			secondary: { main: colors.black },
			background: {
				default: canvasColor,
				main: colors.brightWhite,
				paper: colors.lightPaper,
				canvas: canvasColor,
				passive: colors.stWhite,
				seethru: colors.stWhite,
			},
			highlight: { main: mainColor },
			divider: 'rgba(15, 23, 42, 0.1)',
			text: {
				main: colors.brightWhite,
				light: colors.white,
				dark: colors.black,
				active: colors.black,
				primary: colors.lightTextPrimary,
				secondary: colors.lightTextSecondary,
				heading: headingColor,
				highlight: mainColor,
			},
			boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
			DataGrid: {
				bg: colors.brightWhite,
				headerBg: mainColor,
				pinnedBg: colors.brightWhite,
			},
		},
		components: {
			MuiCssBaseline: {
				styleOverrides: {
					body: { backgroundColor: canvasColor, color: colors.lightTextPrimary, fontFamily: 'Lexend, Segoe UI, sans-serif' },
				},
			},
			MuiTab: { styleOverrides: { root: { color: colors.black, '&.Mui-selected': { color: mainColor } } } },
			MuiTextField: {
				styleOverrides: {
					root: {
						'& .MuiOutlinedInput-root': {
							'& fieldset': { borderColor: 'rgba(15, 23, 42, 0.28)' },
							'&:hover fieldset': { borderColor: mainColor },
							'&.Mui-focused fieldset': { borderColor: mainColor },
						},
					},
				},
			},
			MuiSelect: { styleOverrides: { root: { '& .MuiSvgIcon-root': { color: colors.black } }, select: { color: colors.black } } },
			MuiOutlinedInput: {
				styleOverrides: {
					root: {
						'&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: mainColor },
						'&:hover .MuiOutlinedInput-notchedOutline': { borderColor: mainColor },
						'.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(15, 23, 42, 0.28)' },
					},
					input: { '::placeholder': { color: colors.lightTextSecondary, opacity: 1 } },
				},
			},
			MuiInputLabel: { styleOverrides: { root: { color: colors.lightTextSecondary, '&.Mui-focused': { color: mainColor } } } },
			MuiButton: {
				styleOverrides: {
					contained: {
						backgroundColor: mainColor,
						color: onPrimary,
						'--variant-containedColor': onPrimary,
						'--variant-containedBg': mainColor,
						'&:hover': {
							backgroundColor: primaryHover,
							color: onPrimary,
							'--variant-containedBg': primaryHover,
							'--variant-containedColor': onPrimary,
						},
						'&.Mui-disabled': { backgroundColor: mainColor, color: onPrimary, opacity: 0.5 },
					},
					outlined: {
						borderColor: mainColor,
						color: mainColor,
						'&:hover': { borderColor: primaryHover, color: primaryHover, backgroundColor: primarySoft },
					},
					text: {
						color: contentLink,
						fontWeight: 700,
						'&:hover': { backgroundColor: primarySoft, color: contentLink },
					},
				},
			},
			MuiCheckbox: {
				styleOverrides: {
					root: { color: colors.lightTextSecondary, '&.Mui-checked': { color: mainColor }, '&.MuiCheckbox-indeterminate': { color: mainColor } },
				},
			},
			MuiListItemButton: {
				styleOverrides: {
					root: {
						margin: '0px',
						padding: '0px 5px',
						color: colors.lightTextSecondary,
						'&:hover': { backgroundColor: mainColor, color: onPrimary },
						'&.Mui-selected': { backgroundColor: primarySoft, color: mainColor },
						'&.Mui-selected:hover': { backgroundColor: mainColor, color: onPrimary },
					},
				},
			},
			MuiListItemIcon: {
				styleOverrides: {
					root: {
						color: colors.lightTextSecondary,
						'&:hover': { color: colors.black },
						'.Mui-selected &': { color: mainColor },
					},
				},
			},
			MuiListItemText: {
				styleOverrides: {
					primary: { fontSize: '14px', fontWeight: 'bold', color: colors.lightTextPrimary, '&:hover': { color: colors.black } },
					secondary: { fontSize: '14px', fontWeight: 'bold', color: colors.lightTextPrimary, '&:hover': { color: colors.black } },
				},
			},
			MuiTableCell: { styleOverrides: { body: { color: colors.lightTextPrimary } } },
			MuiTableHead: { styleOverrides: { root: { '& th': { color: colors.lightTextPrimary } } } },
			MuiChip: {
				styleOverrides: {
					filled: { backgroundColor: mainColor, color: onPrimary },
					outlined: { borderColor: mainColor, color: mainColor },
				},
			},
		},
	};

	const darkConfig: ThemeOptions = {
		palette: {
			mode: 'dark',
			primary: { main: mainColor, contrastText: onPrimary, soft: primarySoft },
			secondary: { main: colors.brightWhite },
			background: {
				default: canvasColor,
				main: colors.black,
				paper: colors.darkPaper,
				canvas: canvasColor,
				passive: colors.black,
				seethru: colors.stBlack,
			},
			highlight: { main: mainColor },
			divider: 'rgba(241, 245, 249, 0.12)',
			text: {
				main: colors.white,
				active: colors.brightWhite,
				light: colors.white,
				dark: colors.black,
				primary: colors.darkTextPrimary,
				secondary: colors.darkTextSecondary,
				heading: headingColor,
				highlight: mainColor,
			},
			boxShadow: '0 4px 18px rgba(0, 0, 0, 0.45)',
			DataGrid: {
				bg: colors.darkPaper,
				headerBg: colors.stBlack,
				pinnedBg: colors.darkPaper,
			},
		},
		components: {
			MuiCssBaseline: {
				styleOverrides: {
					body: { backgroundColor: canvasColor, color: colors.darkTextPrimary, fontFamily: 'Lexend, Segoe UI, sans-serif' },
				},
			},
			MuiTab: { styleOverrides: { root: { color: colors.brightWhite, '&.Mui-selected': { color: mainColor } } } },
			MuiTextField: {
				styleOverrides: {
					root: {
						'& .MuiOutlinedInput-root': {
							'& fieldset': { borderColor: 'rgba(241, 245, 249, 0.28)' },
							'&:hover fieldset': { borderColor: mainColor },
							'&.Mui-focused fieldset': { borderColor: mainColor },
						},
					},
				},
			},
			MuiSelect: { styleOverrides: { root: { '& .MuiSvgIcon-root': { color: colors.brightWhite } }, select: { color: colors.brightWhite } } },
			MuiOutlinedInput: {
				styleOverrides: {
					root: {
						'&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: mainColor },
						'&:hover .MuiOutlinedInput-notchedOutline': { borderColor: mainColor },
						'.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(241, 245, 249, 0.28)' },
					},
					input: { '::placeholder': { color: colors.darkTextSecondary, opacity: 1 } },
				},
			},
			MuiInputLabel: { styleOverrides: { root: { color: colors.darkTextSecondary, '&.Mui-focused': { color: mainColor } } } },
			MuiButton: {
				styleOverrides: {
					contained: {
						backgroundColor: mainColor,
						color: onPrimary,
						'--variant-containedColor': onPrimary,
						'--variant-containedBg': mainColor,
						'&:hover': {
							backgroundColor: primaryHover,
							color: onPrimary,
							'--variant-containedBg': primaryHover,
							'--variant-containedColor': onPrimary,
						},
						'&.Mui-disabled': { backgroundColor: mainColor, color: onPrimary, opacity: 0.5 },
					},
					outlined: {
						borderColor: mainColor,
						color: mainColor,
						'&:hover': { borderColor: primaryHover, color: primaryHover, backgroundColor: primarySoft },
					},
					text: {
						color: contentLink,
						fontWeight: 700,
						'&:hover': { backgroundColor: primarySoft, color: contentLink },
					},
				},
			},
			MuiCheckbox: {
				styleOverrides: {
					root: { color: colors.darkTextSecondary, '&.Mui-checked': { color: mainColor }, '&.MuiCheckbox-indeterminate': { color: mainColor } },
				},
			},
			MuiListItemButton: {
				styleOverrides: {
					root: {
						margin: '0px',
						padding: '0px 5px',
						'&:hover': { backgroundColor: mainColor },
						'&.Mui-selected': { backgroundColor: primarySoft, color: mainColor },
						'&.Mui-selected:hover': { backgroundColor: mainColor },
					},
				},
			},
			MuiListItemIcon: {
				styleOverrides: {
					root: {
						color: colors.darkTextSecondary,
						'&:hover': { color: colors.brightWhite },
						'.Mui-selected &': { color: mainColor },
					},
				},
			},
			MuiListItemText: {
				styleOverrides: {
					primary: { fontSize: '14px', fontWeight: 'bold', color: colors.darkTextSecondary, '&:hover': { color: colors.brightWhite } },
					secondary: { fontSize: '14px', fontWeight: 'bold', color: colors.darkTextSecondary, '&:hover': { color: colors.brightWhite } },
				},
			},
			MuiTableCell: { styleOverrides: { body: { color: colors.darkTextPrimary } } },
			MuiTableHead: { styleOverrides: { root: { '& th': { color: colors.darkTextPrimary } } } },
			MuiChip: {
				styleOverrides: {
					filled: { backgroundColor: mainColor, color: onPrimary },
					outlined: { borderColor: mainColor, color: mainColor },
				},
			},
		},
	};

	return deepmerge(commonConfig, mode === 'light' ? lightConfig : darkConfig);
};

const theme = (darkMode: boolean, primaryColor: string): Theme => createTheme(getDesignTokens(darkMode ? 'dark' : 'light', primaryColor));

export default theme;
