import React from 'react';
import { Box, Button, Container, Divider, IconButton, Link, Stack, Tooltip, Typography } from '@mui/material';
import {
	ArrowUpward as ArrowUpwardIcon,
	Apps as BrandIcon,
	DarkModeOutlined as DarkModeIcon,
	GitHub as GitHubIcon,
	LightModeOutlined as LightModeIcon,
	Lock as LockIcon,
	LockOpen as LockOpenIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useConfig } from '../../context/ConfigContext';
import { homePageContent } from '../../config/content';
import { brand } from '../../config/Constants';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { displayFont, homeFooterAccentLinkSx, homeFooterDividerSx, homeFooterIconButtonSx, homeFooterNavButtonSx, homePrimaryPanelSx } from './homePageStyles';
import AccentColorPicker from '../theme/AccentColorPicker';

interface NavPage {
	label: string;
	type: 'scroll' | 'navigate';
	sectionId?: string;
	path?: string;
}

interface HomeFooterProps {
	topRef: React.RefObject<HTMLElement>;
	onNavigateSection: (sectionId: string) => void;
}

export default function HomeFooter({ topRef, onNavigateSection }: HomeFooterProps) {
	const { user } = useAuth();
	const navigate = useNavigate();
	const config = useConfig();
	const { darkMode, dispatch, primaryColor } = useTheme();
	const { footer: content, appBar, demoBoardAccess } = homePageContent;
	const currYear = new Date().getFullYear();
	const showBoardAccess = Boolean(config.MEMBER_ONBOARDING_PAGE_ENABLED);

	const scrollToTop = () => {
		topRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	const handleNavClick = (page: NavPage) => {
		if (page.type === 'scroll' && page.sectionId) {
			onNavigateSection(page.sectionId);
			return;
		}
		if (page.type === 'navigate' && page.path) {
			navigate(page.path);
		}
	};

	return (
		<Box component='footer' sx={{ ...homePrimaryPanelSx(primaryColor), pt: 6, pb: 3, overflowX: 'hidden' }}>
			<Container maxWidth='lg' sx={{ minWidth: 0 }}>
				<Box
					sx={{
						display: 'flex',
						flexDirection: { xs: 'column', md: 'row' },
						alignItems: { xs: 'stretch', md: 'flex-start' },
						gap: { xs: 3, md: 4 },
					}}>
					<Box sx={{ minWidth: 0, flexShrink: 0 }}>
						<Stack direction='row' spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
							<BrandIcon sx={{ flexShrink: 0 }} />
							<Typography sx={{ fontFamily: displayFont, fontSize: '1.35rem' }}>{content.organizationName.long}</Typography>
						</Stack>
						<Typography variant='body2' sx={{ opacity: 0.85, maxWidth: 420, lineHeight: 1.7 }}>
							{brand.tagline}
						</Typography>
					</Box>

					<Box
						sx={{
							flex: { md: 1 },
							display: 'flex',
							justifyContent: { xs: 'flex-start', md: 'center' },
							minWidth: 0,
						}}>
						<Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
							{appBar.navLinks.slice(0, 3).map((page) => (
								<Button
									key={page.label}
									variant='text'
									onClick={() => handleNavClick(page as NavPage)}
									sx={homeFooterNavButtonSx(primaryColor)}>
									{page.label}
								</Button>
							))}
						</Stack>
					</Box>

					<Stack direction='row' spacing={0.75} sx={{ alignItems: 'center', flexShrink: 0, alignSelf: 'flex-start' }}>
						{content.scrollToTopButton.enabled && (
							<Tooltip title={content.scrollToTopButton.labels.long}>
								<IconButton onClick={scrollToTop} aria-label={content.scrollToTopButton.labels.long} sx={homeFooterIconButtonSx(primaryColor)}>
									<ArrowUpwardIcon fontSize='small' />
								</IconButton>
							</Tooltip>
						)}
						{content.themeToggle.enabled && (
							<Tooltip title={darkMode ? 'Light mode' : 'Dark mode'}>
								<IconButton
									onClick={() => dispatch({ type: 'TOGGLE' })}
									aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
									sx={homeFooterIconButtonSx(primaryColor)}>
									{darkMode ? <LightModeIcon fontSize='small' /> : <DarkModeIcon fontSize='small' />}
								</IconButton>
							</Tooltip>
						)}
						<AccentColorPicker tone='footer' />
						{content.githubLink?.enabled && content.githubLink.url && (
							<Tooltip title={brand.githubLabel}>
								<IconButton
									component='a'
									href={content.githubLink.url}
									target='_blank'
									rel='noopener noreferrer'
									aria-label={brand.githubLabel}
									sx={homeFooterIconButtonSx(primaryColor)}>
									<GitHubIcon fontSize='small' />
								</IconButton>
							</Tooltip>
						)}
						{content.authLink.enabled && (
							<Tooltip title={user ? 'Go to dashboard' : 'Sign in'}>
								<IconButton
									onClick={() => navigate(generatePath(user ? paths.redirect : paths.login))}
									aria-label={user ? 'Go to dashboard' : 'Sign in'}
									sx={homeFooterIconButtonSx(primaryColor)}>
									{user ? <LockOpenIcon fontSize='small' /> : <LockIcon fontSize='small' />}
								</IconButton>
							</Tooltip>
						)}
					</Stack>
				</Box>

				<Divider sx={{ ...homeFooterDividerSx(primaryColor), my: 3 }} />

				<Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}>
					{content.copyright.enabled && (
						<Typography variant='caption' sx={{ opacity: 0.85 }}>
							&copy; {content.copyright.line1} | {content.copyright.startYear} - {currYear}
						</Typography>
					)}
					<Stack direction='row' spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
						{showBoardAccess && (
							<Link
								component='button'
								type='button'
								onClick={() => navigate(generatePath(demoBoardAccess.path || paths.registerMember))}
								sx={{ ...homeFooterAccentLinkSx(primaryColor), background: 'none', border: 'none', cursor: 'pointer', p: 0, font: 'inherit' }}>
								{demoBoardAccess.footerLinkLabel}
							</Link>
						)}
						{content.githubLink?.enabled && content.githubLink.url && (
							<Link href={content.githubLink.url} target='_blank' rel='noopener noreferrer' sx={homeFooterAccentLinkSx(primaryColor)}>
								{content.githubLink.label}
							</Link>
						)}
						<Link href={homePageContent.intro.externalLink.url} target='_blank' rel='noopener noreferrer' sx={homeFooterAccentLinkSx(primaryColor)}>
							{homePageContent.intro.externalLink.label}
						</Link>
					</Stack>
				</Stack>
			</Container>
		</Box>
	);
}
