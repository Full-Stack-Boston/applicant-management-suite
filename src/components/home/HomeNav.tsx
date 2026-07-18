import React, { useState } from 'react';
import {
	AppBar,
	Box,
	Button,
	Container,
	Divider,
	IconButton,
	Menu,
	MenuItem,
	Toolbar,
	Tooltip,
	Typography,
	useMediaQuery,
	useTheme as useMuiTheme,
} from '@mui/material';
import {
	Apps as BrandIcon,
	DarkModeOutlined as DarkModeIcon,
	GitHub as GitHubIcon,
	LightModeOutlined as LightModeIcon,
	Lock as LockIcon,
	LockOpen as LockOpenIcon,
	LogoutOutlined as LogoutIcon,
	Menu as MenuIcon,
	PaletteOutlined as PaletteIcon,
	SettingsOutlined as SettingsIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { homePageContent } from '../../config/content';
import { brand } from '../../config/Constants';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { logoutUser } from '../../config/data/firebase';
import {
	homeNavActiveBorderColor,
	homeNavBrandLinkSx,
	homeNavForeground,
	homeNavLinkButtonSx,
	homeNavToolbarIconSx,
	homeYellowButtonSx,
} from './homePageStyles';
import AccentColorPicker from '../theme/AccentColorPicker';
import ApplicantSettingsButton, { useApplicantSettingsDialog } from '../auth/ApplicantSettingsButton';

interface NavPage {
	label: string;
	shortLabel?: string;
	type: 'scroll' | 'navigate';
	sectionId?: string;
	path?: string;
}

export type HomeNavVariant = 'public' | 'applicant' | 'utility';

interface HomeNavProps {
	navSolid: boolean;
	activeSection: string;
	onNavigateSection: (sectionId: string) => void;
	variant?: HomeNavVariant;
}

function navLabel(page: NavPage, compact: boolean) {
	return compact && page.shortLabel ? page.shortLabel : page.label;
}

function burgerBreakpoint(variant: HomeNavVariant): 'sm' | 'md' | 'lg' {
	if (variant === 'public') return 'lg';
	if (variant === 'applicant') return 'md';
	return 'sm';
}

export default function HomeNav({ navSolid, activeSection, onNavigateSection, variant = 'public' }: HomeNavProps) {
	const muiTheme = useMuiTheme();
	const isBurger = useMediaQuery(muiTheme.breakpoints.down(burgerBreakpoint(variant)));
	const useCompactLabels = useMediaQuery(muiTheme.breakpoints.down('xl'));

	const [anchorElNav, setAnchorElNav] = useState<HTMLElement | null>(null);
	const [anchorElInfo, setAnchorElInfo] = useState<HTMLElement | null>(null);
	const { user, applicant } = useAuth();
	const navigate = useNavigate();
	const { pathname, hash } = useLocation();
	const { darkMode, dispatch, primaryColor } = useTheme();
	const openApplicantSettings = useApplicantSettingsDialog(applicant);
	const { appBar: content } = homePageContent;
	const navForeground = homeNavForeground(primaryColor);

	const isApplicantNav = variant === 'applicant';
	const isUtilityNav = variant === 'utility';
	const isPublicNav = variant === 'public';

	const publicLinks = content.navLinks as NavPage[];
	const utilityLinks = content.utilityNavLinks as NavPage[];
	const applicantPrimaryLinks = content.applicantNavLinks as NavPage[];
	const applicantInfoLinks = content.applicantInfoLinks as NavPage[];

	const scrollLinks = isPublicNav ? publicLinks.filter((page) => page.type === 'scroll') : [];
	const getStartedLink = isPublicNav ? publicLinks.find((page) => page.label === 'Get Started') : undefined;
	const utilityGetStarted = isUtilityNav ? { type: 'navigate' as const, label: 'Get Started', path: paths.registerApplicant } : undefined;

	const homePath = generatePath(paths.home);
	const showLongBrand = isPublicNav && !useCompactLabels && !isBurger;
	const brandText = showLongBrand ? content.organizationName.long : content.organizationName.short;

	const goToHomeTop = (event: React.MouseEvent) => {
		event.preventDefault();
		setAnchorElNav(null);
		setAnchorElInfo(null);
		const onHome = pathname === homePath || pathname === '/';
		if (onHome) {
			if (hash) {
				navigate(homePath, { replace: true });
			}
			window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
			return;
		}
		navigate(homePath);
	};

	const handleNavClick = (page: NavPage) => {
		setAnchorElNav(null);
		setAnchorElInfo(null);
		if (page.type === 'scroll' && page.sectionId) {
			onNavigateSection(page.sectionId);
			return;
		}
		if (page.type === 'navigate' && page.path) {
			navigate(page.path);
		}
	};

	const handleLogout = () => {
		setAnchorElNav(null);
		logoutUser();
		navigate(generatePath(paths.home));
	};

	const openSettingsFromMenu = () => {
		setAnchorElNav(null);
		openApplicantSettings();
	};

	const navButtonSx = (sectionId?: string) => ({
		...homeNavLinkButtonSx(primaryColor),
		fontWeight: sectionId && activeSection === sectionId ? 700 : 500,
		borderBottom: sectionId && activeSection === sectionId ? '2px solid' : '2px solid transparent',
		borderColor: sectionId && activeSection === sectionId ? homeNavActiveBorderColor(primaryColor) : 'transparent',
	});

	const burgerLinks: NavPage[] = isApplicantNav
		? [...applicantPrimaryLinks, ...applicantInfoLinks]
		: isUtilityNav
			? [...utilityLinks, ...(utilityGetStarted ? [utilityGetStarted] : [])]
			: publicLinks;

	const renderThemeToggle = (menuOnly = false) => {
		if (!content.themeToggle.enabled) return null;
		const icon = darkMode ? <LightModeIcon fontSize='small' /> : <DarkModeIcon fontSize='small' />;
		if (menuOnly) {
			return (
				<MenuItem
					onClick={() => {
						setAnchorElNav(null);
						dispatch({ type: 'TOGGLE' });
					}}>
					{icon}
					<Typography sx={{ ml: 1 }}>{darkMode ? 'Light Mode' : 'Dark Mode'}</Typography>
				</MenuItem>
			);
		}
		return (
			<Tooltip title={darkMode ? 'Light mode' : 'Dark mode'}>
				<IconButton aria-label='Toggle theme' onClick={() => dispatch({ type: 'TOGGLE' })} sx={homeNavToolbarIconSx}>
					{icon}
				</IconButton>
			</Tooltip>
		);
	};

	const renderAuthAction = (menuOnly = false) => {
		if (!content.authLink.enabled || isApplicantNav) return null;
		if (user) {
			if (menuOnly) {
				return (
					<MenuItem
						onClick={() => {
							setAnchorElNav(null);
							navigate(generatePath(paths.redirect));
						}}>
						<LockOpenIcon fontSize='small' sx={{ mr: 1 }} />
						My Account
					</MenuItem>
				);
			}
			return (
				<Tooltip title='My account'>
					<IconButton aria-label='My account' onClick={() => navigate(generatePath(paths.redirect))} sx={homeNavToolbarIconSx}>
						<LockOpenIcon fontSize='small' />
					</IconButton>
				</Tooltip>
			);
		}
		if (menuOnly) {
			return (
				<MenuItem
					onClick={() => {
						setAnchorElNav(null);
						navigate(generatePath(paths.login));
					}}>
					<LockIcon fontSize='small' sx={{ mr: 1 }} />
					Sign In
				</MenuItem>
			);
		}
		return (
			<Tooltip title='Sign in'>
				<IconButton aria-label='Sign in' onClick={() => navigate(generatePath(paths.login))} sx={homeNavToolbarIconSx}>
					<LockIcon fontSize='small' />
				</IconButton>
			</Tooltip>
		);
	};

	const renderAccentPicker = (menuOnly = false) => {
		if (menuOnly) {
			return (
				<AccentColorPicker
					iconColor={navForeground}
					renderTrigger={({ onClick }) => (
						<MenuItem
							onClick={(event) => {
								setAnchorElNav(null);
								onClick(event);
							}}>
							<PaletteIcon fontSize='small' sx={{ mr: 1 }} />
							Theme Color
						</MenuItem>
					)}
				/>
			);
		}
		return <AccentColorPicker iconColor={navForeground} />;
	};

	const renderGitHubLink = (menuOnly = false) => {
		if (!brand.githubUrl) return null;
		if (menuOnly) {
			return (
				<MenuItem
					component='a'
					href={brand.githubUrl}
					target='_blank'
					rel='noopener noreferrer'
					onClick={() => setAnchorElNav(null)}>
					<GitHubIcon fontSize='small' sx={{ mr: 1 }} />
					{brand.githubLabel}
				</MenuItem>
			);
		}
		return (
			<Tooltip title={brand.githubLabel}>
				<IconButton
					aria-label={brand.githubLabel}
					component='a'
					href={brand.githubUrl}
					target='_blank'
					rel='noopener noreferrer'
					sx={homeNavToolbarIconSx}>
					<GitHubIcon fontSize='small' />
				</IconButton>
			</Tooltip>
		);
	};

	const renderExpandedLinks = () => {
		if (isApplicantNav) {
			return (
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, minWidth: 0 }}>
					{applicantPrimaryLinks.map((page) => (
						<Button key={page.label} onClick={() => handleNavClick(page)} variant='text' sx={navButtonSx()}>
							{page.label}
						</Button>
					))}
					<Button
						variant='text'
						aria-haspopup='true'
						aria-expanded={Boolean(anchorElInfo)}
						aria-controls={anchorElInfo ? 'platform-info-menu' : undefined}
						onClick={(event) => setAnchorElInfo(event.currentTarget)}
						sx={navButtonSx()}>
						Platform Info
					</Button>
					<Menu id='platform-info-menu' anchorEl={anchorElInfo} open={Boolean(anchorElInfo)} onClose={() => setAnchorElInfo(null)}>
						{applicantInfoLinks.map((page) => (
							<MenuItem key={page.label} onClick={() => handleNavClick(page)}>
								{page.label}
							</MenuItem>
						))}
					</Menu>
				</Box>
			);
		}

		if (isUtilityNav) {
			return (
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, minWidth: 0 }}>
					{utilityLinks.map((page) => (
						<Button key={page.label} onClick={() => handleNavClick(page)} variant='text' sx={navButtonSx()}>
							{page.label}
						</Button>
					))}
				</Box>
			);
		}

		return (
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, minWidth: 0, flexWrap: 'nowrap' }}>
				{scrollLinks.map((page) => (
					<Button key={page.label} onClick={() => handleNavClick(page)} variant='text' sx={navButtonSx(page.sectionId)}>
						{navLabel(page, useCompactLabels)}
					</Button>
				))}
			</Box>
		);
	};

	const renderExpandedActions = () => (
		<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
			{isPublicNav && getStartedLink && (
				<Button size='small' variant='contained' onClick={() => handleNavClick(getStartedLink)} sx={{ ...homeYellowButtonSx, ml: 0.5, flexShrink: 0 }}>
					{getStartedLink.label}
				</Button>
			)}
			{isUtilityNav && utilityGetStarted && (
				<Button size='small' variant='contained' onClick={() => handleNavClick(utilityGetStarted)} sx={{ ...homeYellowButtonSx, ml: 0.5, flexShrink: 0 }}>
					{utilityGetStarted.label}
				</Button>
			)}
			{renderThemeToggle()}
			{renderAccentPicker()}
			{renderGitHubLink()}
			{isApplicantNav && applicant && (
				<>
					<ApplicantSettingsButton applicant={applicant} iconColor={navForeground} />
					<Tooltip title='Logout'>
						<IconButton aria-label='Logout' onClick={handleLogout} sx={homeNavToolbarIconSx}>
							<LogoutIcon fontSize='small' />
						</IconButton>
					</Tooltip>
				</>
			)}
			{renderAuthAction()}
		</Box>
	);

	return (
		<AppBar
			position='fixed'
			elevation={navSolid ? 4 : 0}
			sx={{
				backgroundColor: navSolid ? 'primary.main' : 'transparent',
				backgroundImage: 'none',
				color: navForeground,
				transition: 'background-color 0.25s ease, box-shadow 0.25s ease',
			}}>
			<Container maxWidth={false} sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
				<Toolbar disableGutters sx={{ minHeight: { xs: 56, md: 64 }, gap: { xs: 0.5, md: 1 } }}>
					{isBurger ? (
						<>
							<IconButton aria-label='Open menu' onClick={(event) => setAnchorElNav(event.currentTarget)} color='inherit' sx={homeNavToolbarIconSx}>
								<MenuIcon />
							</IconButton>
							<Menu anchorEl={anchorElNav} open={Boolean(anchorElNav)} onClose={() => setAnchorElNav(null)} keepMounted>
								{burgerLinks.map((page) => (
									<MenuItem key={page.label} onClick={() => handleNavClick(page)}>
										{page.label}
									</MenuItem>
								))}
								<Divider />
								{renderThemeToggle(true)}
								{renderAccentPicker(true)}
								{renderGitHubLink(true)}
								{isApplicantNav && applicant && (
									<MenuItem onClick={openSettingsFromMenu}>
										<SettingsIcon fontSize='small' sx={{ mr: 1 }} />
										Settings
									</MenuItem>
								)}
							</Menu>
							<Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0, px: 0.5 }}>
								<Typography
									component='a'
									href={homePath}
									onClick={goToHomeTop}
									noWrap
									sx={{ ...homeNavBrandLinkSx, fontSize: '0.95rem' }}>
									{content.organizationName.short}
								</Typography>
							</Box>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
								{renderThemeToggle()}
								{renderGitHubLink()}
								{isApplicantNav && applicant && (
									<Tooltip title='Logout'>
										<IconButton aria-label='Logout' onClick={handleLogout} sx={homeNavToolbarIconSx}>
											<LogoutIcon fontSize='small' />
										</IconButton>
									</Tooltip>
								)}
								{renderAuthAction()}
							</Box>
						</>
					) : (
						<>
							<Box sx={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0, gap: 0.5 }}>
								<Box
									component='a'
									href={homePath}
									onClick={goToHomeTop}
									aria-label='Go to home page'
									sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, color: 'inherit', textDecoration: 'none' }}>
									<BrandIcon sx={{ display: { xs: 'none', sm: 'flex' }, color: navForeground, flexShrink: 0 }} />
									<Typography
										sx={{
											...homeNavBrandLinkSx,
											display: { xs: 'none', sm: 'block' },
											fontSize: { sm: '0.85rem', lg: '0.95rem', xl: '1rem' },
										}}>
										{brandText}
									</Typography>
								</Box>
							</Box>
							<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, px: { md: 1, lg: 2 } }}>
								{renderExpandedLinks()}
							</Box>
							<Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minWidth: 0, gap: 0.25 }}>
								{renderExpandedActions()}
							</Box>
						</>
					)}
				</Toolbar>
			</Container>
		</AppBar>
	);
}
