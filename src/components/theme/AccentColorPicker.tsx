import { useState, type ReactNode } from 'react';
import { Box, IconButton, Menu, MenuItem, Tooltip, Typography, type SxProps, type Theme } from '@mui/material';
import { PaletteOutlined as ColorIcon } from '@mui/icons-material';
import { useTheme } from '../../context/ThemeContext';
import { accentColorOptions, accentColorPickerTooltip } from '../../config/ui/accentColors';
import { homeCardBorder, homeFooterIconButtonSx, homePrimaryForeground } from '../home/homePageStyles';

type AccentColorPickerTone = 'nav' | 'surface' | 'footer';

interface AccentColorPickerProps {
	/** Icon color on primary nav bars; defaults to inherit. */
	iconColor?: string;
	tone?: AccentColorPickerTone;
	iconButtonSx?: SxProps<Theme>;
	/** Optional wrapper for layout-specific placement. */
	renderTrigger?: (props: { onClick: (event: React.MouseEvent<HTMLElement>) => void; icon: ReactNode }) => ReactNode;
}

export default function AccentColorPicker({ iconColor, tone = 'nav', iconButtonSx, renderTrigger }: AccentColorPickerProps) {
	const { darkMode, primaryColor, dispatch } = useTheme();
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const menuOpen = Boolean(anchorEl);

	const handleOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
	const handleClose = () => setAnchorEl(null);

	const handleSelect = (key: string) => {
		dispatch({ type: 'SET_COLOR', payload: key });
		handleClose();
	};

	const icon = (
		<ColorIcon
			sx={{
				color: iconColor ?? (tone === 'nav' || tone === 'footer' ? homePrimaryForeground(primaryColor) : darkMode ? 'custom.black' : 'primary.main'),
				fontSize: 20,
			}}
		/>
	);

	const trigger =
		renderTrigger?.({ onClick: handleOpen, icon }) ?? (
			<Tooltip title={accentColorPickerTooltip}>
				<IconButton
					aria-label={accentColorPickerTooltip}
					size='small'
					onClick={handleOpen}
					sx={{
						...(tone === 'surface'
							? {
									width: 40,
									height: 40,
									border: '1px solid',
									borderColor: homeCardBorder(darkMode),
									bgcolor: darkMode ? 'primary.main' : 'background.paper',
									'&:hover': { bgcolor: darkMode ? 'primary.dark' : 'action.hover' },
								}
							: {}),
						...(tone === 'footer' ? homeFooterIconButtonSx(primaryColor) : {}),
						...iconButtonSx,
					}}>
					{icon}
				</IconButton>
			</Tooltip>
		);

	return (
		<>
			{trigger}
			<Menu
				sx={{ mt: tone === 'nav' ? 1 : 0 }}
				anchorEl={anchorEl}
				open={menuOpen}
				onClose={handleClose}
				anchorOrigin={tone === 'footer' ? { vertical: 'top', horizontal: 'center' } : undefined}
				transformOrigin={tone === 'footer' ? { vertical: 'bottom', horizontal: 'center' } : undefined}>
				{accentColorOptions.map((option) => (
					<MenuItem
						key={option.key}
						selected={option.key === primaryColor}
						onClick={() => handleSelect(option.key)}
						sx={{ bgcolor: darkMode ? 'custom.black' : 'background.paper', gap: 1.5, minWidth: 200 }}>
						<Box
							aria-hidden
							sx={{
								width: 18,
								height: 18,
								borderRadius: 0.75,
								bgcolor: option.hex,
								border: '1px solid',
								borderColor: homeCardBorder(darkMode),
								flexShrink: 0,
							}}
						/>
					<Typography variant='body2' sx={{ fontWeight: 600 }}>
						{option.menuLabel}
					</Typography>
					</MenuItem>
				))}
			</Menu>
		</>
	);
}
