/** Shared layout tokens for admin pages inside AdminLayout (list pages, settings, sender, finances). */

import type { SxProps, Theme } from '@mui/material';

export const adminPageTitleSx: SxProps<Theme> = { fontSize: '24px' };

/** MUI Typography `color` uses camelCase palette keys (e.g. textPrimary), not dot paths (text.primary).
 * Light mode uses textPrimary (not textHighlight) so titles stay readable when primary is a light accent (e.g. yellow).
 */
export const getAdminPageTitleColor = (darkMode: boolean): string => (darkMode ? 'textPrimary' : 'textPrimary');

/** Prefer this over sx.color so palette keys resolve correctly in both modes. */
export const getAdminPageTitleProps = (darkMode: boolean) =>
	({
		sx: {
			...adminPageTitleSx,
			// Brand accent when it meets contrast; otherwise fall back via contentAccent token.
			color: darkMode ? 'text.primary' : 'contentAccent.main',
		},
	}) as const;

/** Card/section headings inside asset views — inherits theme `text.heading` via subtitle1. */
export const getCardHeadingColor = (_darkMode: boolean): string => 'text.heading';

/** Prefer Typography `variant="subtitle1"`; this sx is for non-Typography nodes. */
export const cardHeadingSx: SxProps<Theme> = {
	color: 'text.heading',
	fontWeight: 700,
	fontSize: '0.95rem',
	lineHeight: 1.35,
	letterSpacing: '0.02em',
};

/** Nested labels inside a section (e.g. Income, Expenses under Financials). */
export const assetSubsectionTitleSx: SxProps<Theme> = {
	fontWeight: 600,
	fontSize: '0.95rem',
	color: 'text.heading',
	mb: 0.75,
};

export const adminPageHeaderSx = (boxShadow: string): SxProps<Theme> => ({
	borderRadius: '12px',
	boxShadow,
	bgcolor: 'background.paper',
	display: 'flex',
	alignItems: 'center',
	p: 1,
	px: 2,
	width: '100%',
	maxWidth: '100%',
	boxSizing: 'border-box',
});

export const adminPagePanelSx = (boxShadow: string): SxProps<Theme> => ({
	bgcolor: 'background.paper',
	borderRadius: '12px',
	boxShadow,
	color: 'text.primary',
	width: '100%',
	maxWidth: '100%',
	minWidth: 0,
	boxSizing: 'border-box',
});

export const adminListPageSx: SxProps<Theme> = {
	width: '100%',
	maxWidth: '100%',
	minWidth: 0,
	display: 'flex',
	flexDirection: 'column',
	flex: 1,
	minHeight: 0,
	boxSizing: 'border-box',
};

/** Form/tool pages that grow with content and scroll inside AdminLayout (not flex-filled). */
export const adminToolPageSx: SxProps<Theme> = {
	width: '100%',
	maxWidth: '100%',
	minWidth: 0,
	display: 'flex',
	flexDirection: 'column',
	gap: 2,
	boxSizing: 'border-box',
};

/** Mobile list layout — cards align with the page title card width. */
export const adminListMobileLayoutSx: SxProps<Theme> = {
	...adminListPageSx,
	gap: 1.5,
	width: '100%',
	maxWidth: '100%',
};

export const adminMobileCardSx = (boxShadow: string): SxProps<Theme> => ({
	width: '100%',
	maxWidth: '100%',
	minWidth: 0,
	minHeight: 'fit-content',
	boxSizing: 'border-box',
	display: 'flex',
	flexDirection: 'column',
	borderRadius: '12px',
	boxShadow,
	bgcolor: 'background.paper',
	overflow: 'hidden',
});

export const datatableContainerSx: SxProps<Theme> = {
	width: '100%',
	maxWidth: '100%',
	minWidth: 0,
	display: 'flex',
	flexDirection: 'column',
	flex: 1,
	minHeight: 0,
	height: { xs: 'auto', md: '100%' },
};

/** Rounded shell — overflow:hidden clips grid content; box-shadow on same node is not clipped. */
export const datatableGridShellSx = (boxShadow: string): SxProps<Theme> => ({
	flex: 1,
	minHeight: { xs: 360, md: 0 },
	width: '100%',
	maxWidth: '100%',
	borderRadius: '12px',
	boxShadow,
	bgcolor: 'background.paper',
	overflow: 'hidden',
	display: 'flex',
	flexDirection: 'column',
});

export const datatableGridSx: SxProps<Theme> = {
	flex: 1,
	width: '100%',
	maxWidth: '100%',
	minHeight: 0,
	border: 'none',
	boxShadow: 'none',
	borderRadius: 0,
	bgcolor: 'transparent',
	display: 'flex',
	flexDirection: 'column',
	'& .MuiDataGrid-main': {
		flex: 1,
		minHeight: 0,
	},
	'& .MuiDataGrid-cell': {
		minWidth: 0,
		borderColor: 'divider',
		// Slightly more top padding: Lexend glyphs sit high in the em-box, so equal
		// box padding still reads top-heavy next to Nunito/PF.
		pt: 1,
		pb: 0.5,
		display: 'flex',
		alignItems: 'center',
	},
	'& .MuiDataGrid-cellContent': {
		display: 'flex',
		alignItems: 'center',
		width: '100%',
		minWidth: 0,
	},
	'& .MuiDataGrid-cell .MuiTypography-root': {
		margin: 0,
		// Tighter than body1 1.5 so less empty descender air under each line.
		lineHeight: 1.35,
	},
	'& .MuiDataGrid-columnHeader': {
		minWidth: 0,
	},
	'& .MuiDataGrid-columnHeaders': {
		borderRadius: 0,
		borderBottom: '1px solid',
		borderColor: 'divider',
	},
	'& .MuiDataGrid-footerContainer': {
		borderRadius: 0,
		borderTop: '1px solid',
		borderColor: 'divider',
	},
	'& .MuiDataGrid-toolbarContainer': {
		borderBottom: '1px solid',
		borderColor: 'divider',
		px: 1.5,
		py: 1,
		gap: 1.5,
		flexWrap: 'wrap',
		justifyContent: 'flex-start',
		alignItems: 'stretch',
	},
	'& .MuiDataGrid-overlayWrapper': {
		minHeight: 220,
	},
	'& .MuiDataGrid-cell[data-field="picture"]': {
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		px: 0.5,
	},
	'& .MuiDataGrid-columnHeader[data-field="picture"]': {
		justifyContent: 'center',
	},
	'& .MuiDataGrid-cell[data-field="action"]': {
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		pl: 1,
		pr: 2.5,
	},
	'& .MuiDataGrid-columnHeader[data-field="action"]': {
		pl: 1,
		pr: 2.5,
	},
};

export const datatableAvatarCellSx: SxProps<Theme> = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	width: '100%',
	height: '100%',
};

export const datatableAvatarSx: SxProps<Theme> = {
	width: 40,
	height: 40,
};

/** Collapsible table expanded rows and nested detail tables. */
export const collapsibleDetailCellSx: SxProps<Theme> = {
	paddingBottom: 0,
	paddingTop: 0,
	bgcolor: 'background.paper',
};

export const collapsibleDetailPanelSx: SxProps<Theme> = {
	padding: 2,
	borderRadius: '8px',
	border: '1px solid',
	borderColor: 'divider',
	bgcolor: 'background.paper',
};

export const nestedDetailTableContainerSx: SxProps<Theme> = {
	boxShadow: 0,
	border: '1px solid',
	borderColor: 'divider',
	bgcolor: 'background.paper',
};

export const nestedDetailTableHeadSx: SxProps<Theme> = {
	fontWeight: 'bold',
	color: 'text.primary',
	bgcolor: 'action.hover',
};

export const collapsibleTableContainerSx: SxProps<Theme> = {
	width: '100%',
	maxWidth: '100%',
	minWidth: 0,
	overflowX: 'auto',
	maxHeight: '80vh',
	boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
	borderRadius: '12px',
	mt: 2,
	bgcolor: 'background.paper',
};

export const actionCellSx: SxProps<Theme> = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	gap: 0.5,
	flexWrap: 'wrap',
	height: '100%',
	width: '100%',
};

/** Single-asset view pages (/…/view/…) — width constraints match list pages. */
export const singleAssetPageSx: SxProps<Theme> = {
	width: '100%',
	maxWidth: '100%',
	minWidth: 0,
	boxSizing: 'border-box',
	display: 'flex',
	flexDirection: 'column',
	gap: { xs: 1.5, md: 2 },
	p: 0,
};

/** Top row (profile + actions) and similar horizontal sections. */
export const singleAssetRowSx: SxProps<Theme> = {
	display: 'flex',
	flexDirection: { xs: 'column', md: 'row' },
	gap: { xs: 2, md: '20px' },
	width: '100%',
	maxWidth: '100%',
	minWidth: 0,
	boxSizing: 'border-box',
};

/** Stacked sections below the header row (notes, tables, etc.). */
export const singleAssetStackSx: SxProps<Theme> = {
	width: '100%',
	maxWidth: '100%',
	minWidth: 0,
	boxSizing: 'border-box',
};

/** Multi-card grid rows on application views. */
export const singleAssetGridRowSx: SxProps<Theme> = {
	...singleAssetRowSx,
	flexWrap: { md: 'wrap' },
};

/** Card shell on view pages — paper surface like sidebar, navbar, and list cards. */
export const assetCardShellSx = (boxShadow: string): SxProps<Theme> => ({
	bgcolor: 'background.paper',
	borderRadius: '12px',
	boxShadow,
	color: 'text.primary',
	position: 'relative',
	width: '100%',
	maxWidth: '100%',
	minWidth: 0,
	boxSizing: 'border-box',
	overflow: 'hidden',
});

export const assetCardContentSx: SxProps<Theme> = {
	p: { xs: '16px', md: '20px' },
	minWidth: 0,
	maxWidth: '100%',
	overflowX: 'auto',
};

/** Tighter in-card padding for asset detail views (matches dashboard density). */
export const assetViewCardContentSx: SxProps<Theme> = {
	p: { xs: 1.25, md: 1.5 },
	minWidth: 0,
	maxWidth: '100%',
	overflowX: 'auto',
};

/** @deprecated Use assetViewCardContentSx */
export const applicationAssetCardContentSx = assetViewCardContentSx;

/** Dashboard stat-card grid (4 columns; partial last row spans evenly). */
export const dashboardWidgetGridSx: SxProps<Theme> = {
	display: 'grid',
	gridTemplateColumns: {
		xs: '1fr',
		sm: 'repeat(2, minmax(0, 1fr))',
		md: 'repeat(4, minmax(0, 1fr))',
	},
	gap: 1.5,
	width: '100%',
	maxWidth: '100%',
	minWidth: 0,
	boxSizing: 'border-box',
};

/** Dashboard panel shell — matches list cards and datatable shell. */
export const dashboardPanelSx = (boxShadow: string): SxProps<Theme> => ({
	bgcolor: 'background.paper',
	borderRadius: '12px',
	boxShadow,
	width: '100%',
	maxWidth: '100%',
	minWidth: 0,
	boxSizing: 'border-box',
	overflow: 'hidden',
});

/** Featured row: three equal-height columns on md+. */
export const dashboardFeaturedRowSx: SxProps<Theme> = {
	display: { xs: 'flex', md: 'grid' },
	flexDirection: { xs: 'column', md: 'unset' },
	gridTemplateColumns: { md: 'minmax(0, 1fr) minmax(0, 1.6fr) minmax(0, 1fr)' },
	gap: 1.5,
	width: '100%',
	minWidth: 0,
	alignItems: 'stretch',
	minHeight: { md: 420 },
};

/** Inner surface for dashboard modules (no extra shadow; wrapper provides shell). */
export const dashboardModuleSurfaceSx: SxProps<Theme> = {
	display: 'flex',
	flexDirection: 'column',
	width: '100%',
	height: '100%',
	minHeight: 0,
	px: 2,
	py: 1.5,
	bgcolor: 'background.paper',
	color: 'text.primary',
	boxSizing: 'border-box',
};

export const dashboardSectionTitleSx: SxProps<Theme> = {
	fontWeight: 'bold',
	fontSize: '15px',
	color: 'text.heading',
	px: 0,
	pt: 0,
	pb: 1.25,
};

/** Tables embedded in dashboard panels — no nested card chrome. */
export const dashboardEmbeddedTableSx: SxProps<Theme> = {
	width: '100%',
	maxWidth: '100%',
	minWidth: 0,
	bgcolor: 'transparent',
	boxShadow: 'none',
	borderRadius: 0,
	mt: 0,
	overflowX: 'auto',
};
