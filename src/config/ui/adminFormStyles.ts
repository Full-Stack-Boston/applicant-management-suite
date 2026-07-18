/** Reusable layout tokens for stacked admin tool forms (manual upload, maintenance dialogs, etc.). */

import type { SxProps, Theme } from '@mui/material';

export const adminFormStackSx: SxProps<Theme> = {
	display: 'flex',
	flexDirection: 'column',
	gap: 2,
	width: '100%',
	minWidth: 0,
};

/** Two-column field grid for compact tool forms on large screens. */
export const adminFormGridSx: SxProps<Theme> = {
	display: 'grid',
	gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
	gap: 2,
	width: '100%',
	minWidth: 0,
	alignItems: 'start',
};

export const adminFormFieldSx: SxProps<Theme> = {
	width: '100%',
	minWidth: 0,
};

export const adminFormLabelSx: SxProps<Theme> = {
	display: 'block',
	fontSize: '0.875rem',
	fontWeight: 600,
	color: 'text.primary',
	lineHeight: 1.4,
	'&.Mui-focused': { color: 'text.primary' },
};

export const adminFormHelperSx: SxProps<Theme> = {
	mx: 0,
	mt: 0.5,
	color: 'text.secondary',
	fontSize: '0.8125rem',
	lineHeight: 1.45,
};

/** Outlined inputs/autocompletes — full width, stable height, theme-aware text. */
export const adminFormInputSx: SxProps<Theme> = {
	width: '100%',
	'& .MuiOutlinedInput-root': {
		bgcolor: 'background.main',
	},
	'& .MuiInputBase-input': {
		color: 'text.primary',
	},
	'& .MuiSelect-select': {
		color: 'text.primary',
	},
};

export const adminFormActionsSx: SxProps<Theme> = {
	display: 'flex',
	justifyContent: 'flex-end',
	alignItems: 'center',
	flexWrap: 'wrap',
	gap: 2,
	pt: 2,
	mt: 2,
	borderTop: '1px solid',
	borderColor: 'divider',
	gridColumn: '1 / -1',
};

export const adminFormFilePreviewSx: SxProps<Theme> = {
	display: 'flex',
	alignItems: 'center',
	gap: 1.5,
	px: 2,
	py: 1.5,
	borderRadius: 1,
	border: '1px solid',
	borderColor: 'divider',
	bgcolor: 'action.hover',
};
