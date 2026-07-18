/**
 * Sidebar Navigation
 * The primary side navigation menu for the Admin Dashboard.
 */

import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip, Box, List, Typography, ListItemIcon, ListItemText, ListItemButton, Menu, useMediaQuery, useTheme as useMuiTheme } from '@mui/material';
import { MenuOpen, Menu as MenuIcon, LightMode, DarkMode } from '@mui/icons-material';

// Context
import { useTheme } from '../../context/ThemeContext';
import { useSidebar } from '../../context/SidebarContext';

// Config
import { useSidebarMenu } from '../../config/navigation/sidebarConfig';
import { Assets } from '../../config/Constants';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { colors } from '../../config/ui/theme';
import { accentColorOptions, accentColorPickerTooltip } from '../../config/ui/accentColors';
import {
	SIDEBAR_DURATION_MS,
	SIDEBAR_EASING,
	SIDEBAR_FADE_TRANSITION,
	SIDEBAR_WIDTH_COLLAPSED,
	SIDEBAR_WIDTH_EXPANDED,
	SIDEBAR_WIDTH_TRANSITION,
} from './sidebarLayout';

// --- Sub-Components ---

interface SidebarPageItem {
	icon: ReactNode;
	link: string;
	text: string;
	disable?: boolean;
}

interface SidebarItemProps {
	page: SidebarPageItem;
	collapsed: boolean;
	isActive: boolean;
}

const SidebarItem = ({ page, collapsed, isActive }: SidebarItemProps) => {
	const { darkMode } = useTheme();
	const linkTo = page.disable ? '#' : page.link;

	return (
		<Link to={linkTo} style={{ textDecoration: 'none' }}>
			<Tooltip title={collapsed ? page.text : ''} placement='right' enterDelay={400} leaveDelay={100}>
				<ListItemButton
					disabled={page.disable}
					selected={isActive}
					sx={{
						bgcolor: isActive ? 'action.selected' : 'transparent',
						borderRadius: '4px',
						justifyContent: collapsed ? 'center' : 'flex-start',
						paddingX: collapsed ? 0 : '16px',
						minHeight: 0,
						// Halfway between the inflated py:0.5 and fully tight py:0
						py: 0.25,
						overflow: 'hidden',
						transition: `padding ${SIDEBAR_DURATION_MS}ms ${SIDEBAR_EASING}`,
						'& .MuiListItemIcon-root': {
							color: darkMode ? 'text.secondary' : 'text.primary',
						},
						'&:hover': {
							'& .MuiListItemIcon-root, & .MuiListItemText-root .MuiTypography-root': {
								color: 'common.white',
							},
						},
						'&.Mui-selected .MuiListItemIcon-root': {
							color: 'primary.main',
						},
					}}>
					<ListItemIcon
						sx={{
							minWidth: 'unset',
							mr: collapsed ? 0 : 1,
							transition: `margin ${SIDEBAR_DURATION_MS}ms ${SIDEBAR_EASING}`,
						}}>
						{page.icon}
					</ListItemIcon>
					{/* Keep ListItemText so theme MuiListItemText.secondary (Lexend bold 14px) still applies. */}
					<ListItemText
						secondary={page.text}
						sx={{
							m: 0,
							my: 0,
							flex: '0 1 auto',
							opacity: collapsed ? 0 : 1,
							maxWidth: collapsed ? 0 : 140,
							overflow: 'hidden',
							pointerEvents: collapsed ? 'none' : 'auto',
							transition: `${SIDEBAR_FADE_TRANSITION}, max-width ${SIDEBAR_DURATION_MS}ms ${SIDEBAR_EASING}`,
							'& .MuiListItemText-secondary': {
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								lineHeight: 1.25,
							},
						}}
					/>
				</ListItemButton>
			</Tooltip>
		</Link>
	);
};

// --- Main Component ---

const Sidebar = () => {
	const { darkMode, primaryColor, dispatch } = useTheme();
	const { collapsed, setCollapsed } = useSidebar();
	const sidebarMenu = useSidebarMenu();
	const location = useLocation();
	const muiTheme = useMuiTheme();
	const isSmallScreen = useMediaQuery(muiTheme.breakpoints.down('sm'));
	const isCompact = collapsed || isSmallScreen;

	// Defer row↔column control layout so it doesn't snap mid-width animation.
	const [stackedControls, setStackedControls] = useState(isCompact);
	useEffect(() => {
		if (isCompact) {
			setStackedControls(true);
			return undefined;
		}
		const timer = window.setTimeout(() => setStackedControls(false), SIDEBAR_DURATION_MS);
		return () => window.clearTimeout(timer);
	}, [isCompact]);

	// Menu State for Color Picker
	const [colorMenuAnchor, setColorMenuAnchor] = useState<HTMLElement | null>(null);
	const isMenuOpen = Boolean(colorMenuAnchor);

	const handleColorClick = (event: MouseEvent<HTMLElement>) => {
		setColorMenuAnchor(event.currentTarget);
	};

	const handleColorClose = () => {
		setColorMenuAnchor(null);
	};

	const handleColorSelect = (colorKey: string) => {
		dispatch({ type: 'SET_COLOR', payload: colorKey });
		handleColorClose();
	};

	const availableColors = accentColorOptions.map((option) => ({
		id: option.key,
		label: option.brandName,
		tooltip: option.tooltip,
		color: option.hex,
	}));

	// Bottom Action Buttons Configuration
	const mainControls = [
		{
			id: 'theme',
			tip: accentColorPickerTooltip,
			content: <Box sx={{ width: '20px', height: '20px', borderRadius: '5px', bgcolor: colors[primaryColor as keyof typeof colors] || colors.green, border: '1px solid', borderColor: 'text.primary' }} />,
			action: handleColorClick,
		},
		{
			id: 'mode',
			tip: darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
			content: darkMode ? <LightMode fontSize='small' /> : <DarkMode fontSize='small' />,
			action: () => dispatch({ type: 'TOGGLE' }),
		},
		{
			id: 'toggle',
			tip: collapsed ? 'Expand Sidebar' : 'Collapse Sidebar',
			content: collapsed ? <MenuIcon fontSize='small' /> : <MenuOpen fontSize='small' />,
			action: () => setCollapsed(!collapsed),
		},
	];

	const markLogo = Assets.logo;
	const wordmarkLogo = darkMode ? Assets.logoDM : Assets.logoLM;

	return (
		<Box
			sx={{
				position: 'fixed',
				top: 0,
				left: 0,
				height: '100vh',
				width: isCompact ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
				bgcolor: 'background.paper',
				transition: SIDEBAR_WIDTH_TRANSITION,
				display: 'flex',
				flexDirection: 'column',
				borderRight: '1px solid',
				borderColor: 'background.paper',
				zIndex: 1200,
				overflow: 'hidden',
				boxSizing: 'border-box',
			}}>
			{/* Logo Area — crossfade mark ↔ wordmark */}
			<Box
				sx={{
					position: 'relative',
					height: '50px',
					width: '100%',
					flexShrink: 0,
					overflow: 'hidden',
				}}>
				<Link
					to={generatePath(paths.home)}
					style={{
						textDecoration: 'none',
						display: 'block',
						position: 'relative',
						width: '100%',
						height: '100%',
					}}>
					<Box
						component='img'
						src={markLogo}
						alt='AMS'
						sx={{
							position: 'absolute',
							left: '50%',
							top: '50%',
							transform: 'translate(-50%, -50%)',
							height: 44,
							width: 44,
							objectFit: 'contain',
							opacity: isCompact ? 1 : 0,
							pointerEvents: isCompact ? 'auto' : 'none',
							transition: SIDEBAR_FADE_TRANSITION,
						}}
					/>
					<Box
						component='img'
						src={wordmarkLogo}
						alt='AMS'
						sx={{
							position: 'absolute',
							left: '50%',
							top: '50%',
							transform: 'translate(-50%, -50%)',
							height: 45,
							width: 160,
							maxWidth: 'calc(100% - 16px)',
							objectFit: 'contain',
							opacity: isCompact ? 0 : 1,
							pointerEvents: isCompact ? 'none' : 'auto',
							transition: SIDEBAR_FADE_TRANSITION,
						}}
					/>
				</Link>
			</Box>

			{/* Navigation Items */}
			<Box sx={{ flexGrow: 1, overflowX: 'hidden', overflowY: 'auto', paddingX: isCompact ? '4px' : 1, transition: `padding ${SIDEBAR_DURATION_MS}ms ${SIDEBAR_EASING}` }}>
				<List disablePadding>
					{sidebarMenu?.map((section, sectionIndex) => (
						<Box key={`section-${section.title || sectionIndex}`} sx={{ color: 'text.highlight', my: 0.5 }}>
							<Typography
								sx={{
									fontSize: '10px',
									fontWeight: 'bold',
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									opacity: isCompact ? 0 : 1,
									maxHeight: isCompact ? 0 : '1.2em',
									pointerEvents: isCompact ? 'none' : 'auto',
									transition: `${SIDEBAR_FADE_TRANSITION}, max-height ${SIDEBAR_DURATION_MS}ms ${SIDEBAR_EASING}`,
								}}>
								{section.title}
							</Typography>
							{section.pages.map((page) => (
								<SidebarItem key={page.text} page={page} collapsed={isCompact} isActive={location.pathname === page.link} />
							))}
						</Box>
					))}
				</List>
			</Box>

			{/* Bottom Controls Area */}
			<Box
				sx={{
					display: 'flex',
					flexDirection: stackedControls ? 'column' : 'row',
					alignItems: 'center',
					justifyContent: 'space-around',
					p: 1,
					gap: 1,
					flexShrink: 0,
					transition: `flex-direction 0s linear ${isCompact ? '0ms' : `${SIDEBAR_DURATION_MS}ms`}`,
				}}>
				{mainControls.map((ctrl) => (
					<Tooltip key={ctrl.id} title={ctrl.tip} placement='right'>
						<Box
							onClick={ctrl.action}
							sx={{
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								width: '30px',
								height: '30px',
								borderRadius: '4px',
								flexShrink: 0,
								'&:hover': { bgcolor: 'action.hover' },
								color: 'text.primary',
							}}>
							{ctrl.content}
						</Box>
					</Tooltip>
				))}
			</Box>

			{/* Color Selection Menu */}
			<Menu
				anchorEl={colorMenuAnchor}
				open={isMenuOpen}
				onClose={handleColorClose}
				anchorOrigin={{
					vertical: 'center',
					horizontal: 'right',
				}}
				transformOrigin={{
					vertical: 'center',
					horizontal: 'left',
				}}>
				<Box sx={{ display: 'flex', p: 1, gap: 1 }}>
					{availableColors.map((c) => (
						<Tooltip key={c.id} title={c.tooltip}>
							<Box
								onClick={() => handleColorSelect(c.id)}
								sx={{
									width: '24px',
									height: '24px',
									borderRadius: '4px',
									bgcolor: c.color,
									cursor: 'pointer',
									border: primaryColor === c.id ? '2px solid black' : '1px solid transparent',
									boxShadow: primaryColor === c.id ? 3 : 1,
									'&:hover': { transform: 'scale(1.1)' },
									transition: 'transform 0.1s',
								}}
							/>
						</Tooltip>
					))}
				</Box>
			</Menu>
		</Box>
	);
};

export default Sidebar;
