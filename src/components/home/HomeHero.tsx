import React from 'react';
import { Box, Button, Container, Link, Stack, Typography } from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useNavigate } from 'react-router-dom';
import WindowInfo from '../timer/WindowInfo';
import { useTheme } from '../../context/ThemeContext';
import { useConfig } from '../../context/ConfigContext';
import { homePageContent } from '../../config/content';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { displayFont, homeHeroOverlay, homeOutlinedOnDarkButtonSx, homeYellowButtonSx } from './homePageStyles';

interface HomeHeroProps {
	topRef: React.RefObject<HTMLElement>;
	onLearnMore: () => void;
}

const heroSecondaryLinkSx = {
	alignSelf: 'flex-start',
	color: 'custom.yellow2',
	fontWeight: 600,
	textDecoration: 'none',
	'&:hover': { textDecoration: 'underline' },
} as const;

export default function HomeHero({ topRef, onLearnMore }: HomeHeroProps) {
	const { darkMode } = useTheme();
	const config = useConfig();
	const navigate = useNavigate();
	const { intro: content, missionLine, demoBoardAccess } = homePageContent;
	const heroImage = darkMode ? content.backgroundImages.dark : content.backgroundImages.light;
	const showBoardAccess = Boolean(config.MEMBER_ONBOARDING_PAGE_ENABLED);

	return (
		<Box
			ref={topRef as React.RefObject<HTMLDivElement>}
			component='section'
			sx={{
				position: 'relative',
				minHeight: { xs: 'min(92vh, 920px)', md: '92vh' },
				display: 'flex',
				alignItems: 'stretch',
				backgroundImage: `${homeHeroOverlay(darkMode)}, url(${heroImage})`,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
				color: 'common.white',
				pt: { xs: 9, md: 11 },
			}}>
			<Container maxWidth='lg' sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pb: { xs: 5, md: 6 } }}>
				<Box
					sx={{
						display: 'flex',
						flexDirection: { xs: 'column', md: 'row' },
						justifyContent: { xs: 'flex-start', md: 'space-between' },
						alignItems: { xs: 'stretch', md: 'flex-start' },
						gap: { xs: 1.5, md: 0 },
						width: '100%',
						maxWidth: { xs: 450, md: 'none' },
						mx: { xs: 'auto', md: 0 },
					}}>
					{content.windowInfo.enabled && (
						<Box
							sx={{
								order: { xs: 1, md: 2 },
								width: { xs: '100%', md: 'auto' },
								maxWidth: 450,
								minWidth: 0,
								flexShrink: 0,
							}}>
							<WindowInfo bg='rgba(0,0,0,0.35)' tone='onDark' />
						</Box>
					)}
					{content.externalLink.enabled && (
						<Button
							href={content.externalLink.url}
							variant='outlined'
							size='small'
							fullWidth
							sx={{
								order: { xs: 2, md: 1 },
								width: { md: 'auto' },
								alignSelf: { md: 'flex-start' },
								flexShrink: 0,
								...homeOutlinedOnDarkButtonSx,
								borderColor: 'rgba(255,255,255,0.65)',
							}}>
							{content.externalLink.label}
						</Button>
					)}
				</Box>

				<Stack spacing={{ xs: 2.5, md: 3 }} sx={{ maxWidth: 760, py: { xs: 5, md: 7 } }}>
					{content.welcomeText.enabled && (
						<>
							<Typography variant='overline' sx={{ letterSpacing: '0.2em', fontWeight: 700, opacity: 0.9 }}>
								{content.welcomeText.line1}
							</Typography>
							<Typography
								component='h1'
								sx={{
									fontFamily: displayFont,
									fontSize: { xs: '2.35rem', sm: '3rem', md: '3.75rem' },
									lineHeight: 1.1,
									fontWeight: 400,
								}}>
								{content.welcomeText.line2}
							</Typography>
						</>
					)}
					<Typography variant='h6' component='p' sx={{ fontWeight: 400, maxWidth: 640, opacity: 0.95, lineHeight: 1.65, fontSize: { xs: '1rem', md: '1.15rem' } }}>
						{missionLine}
					</Typography>
					<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 0.5 }}>
						<Button
							size='large'
							variant='contained'
							onClick={() => navigate(generatePath(paths.registerApplicant))}
							sx={{ ...homeYellowButtonSx, px: 3 }}>
							Get Started
						</Button>
						<Button
							size='large'
							variant='outlined'
							onClick={onLearnMore}
							endIcon={<ArrowDownwardIcon />}
							sx={homeOutlinedOnDarkButtonSx}>
							Explore the Platform
						</Button>
					</Stack>
					<Stack spacing={0.75} sx={{ pt: 0.25 }}>
						<Link component='button' type='button' onClick={() => navigate(generatePath(paths.login))} sx={heroSecondaryLinkSx}>
							Returning applicant? Sign in
						</Link>
						{showBoardAccess && (
							<Link
								component='button'
								type='button'
								onClick={() => navigate(generatePath(demoBoardAccess.path || paths.registerMember))}
								sx={heroSecondaryLinkSx}>
								{demoBoardAccess.heroLinkLabel}
							</Link>
						)}
					</Stack>
				</Stack>
			</Container>
		</Box>
	);
}
