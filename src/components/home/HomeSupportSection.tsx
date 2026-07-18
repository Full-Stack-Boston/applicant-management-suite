import React from 'react';
import { Box, Button, Container, Link, Stack, Paper, Typography } from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useConfig } from '../../context/ConfigContext';
import { homePageContent } from '../../config/content';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import SectionHeading from './SectionHeading';
import { homeSectionPadding, homePrimaryPanelSx, homeOutlinedOnDarkButtonSx, homeYellowButtonSx } from './homePageStyles';

interface HomeSupportSectionProps {
	sectionId: string;
}

const cardHeaderSx = {
	display: 'flex',
	flexDirection: 'column',
	alignItems: 'center',
	textAlign: 'center',
	mb: 2,
} as const;

const plainWebLinkSx = {
	color: 'inherit',
	fontWeight: 'inherit',
	fontSize: 'inherit',
	fontFamily: 'inherit',
	letterSpacing: 'inherit',
	lineHeight: 'inherit',
	textDecoration: 'none',
	'&:hover': { textDecoration: 'underline' },
} as const;

function renderMailToLine(line: string) {
	const webMatch = /^Web:\s*(.+)$/i.exec(line);
	if (webMatch) {
		const host = webMatch[1].trim();
		const href = /^https?:\/\//i.test(host) ? host : `https://${host}`;
		return (
			<span key={line}>
				Web:{' '}
				<Link href={href} target='_blank' rel='noopener noreferrer' underline='none' sx={plainWebLinkSx}>
					{host.replace(/^https?:\/\//i, '')}
				</Link>
				<br />
			</span>
		);
	}

	return (
		<span key={line}>
			{line}
			<br />
		</span>
	);
}

export default function HomeSupportSection({ sectionId }: HomeSupportSectionProps) {
	const navigate = useNavigate();
	const config = useConfig();
	const { primaryColor } = useTheme();
	const { bottomSections } = homePageContent.information;
	const showBoardAccess = Boolean(config.MEMBER_ONBOARDING_PAGE_ENABLED);
	const boardButton = bottomSections.applyNow.boardButton;

	if (!bottomSections.enabled) {
		return null;
	}

	const [supportIntro, supportThanks] = bottomSections.supportUs.paragraphs;

	return (
		<Box
			id={sectionId}
			component='section'
			sx={{
				pt: homeSectionPadding,
				pb: { xs: 10, md: 12 },
				scrollMarginTop: { xs: 80, md: 88 },
				overflowX: 'hidden',
			}}>
			<Container maxWidth='lg' sx={{ minWidth: 0 }}>
				<SectionHeading eyebrow='Take Action' title='Explore AMS & Get Started' align='center' />

				<Stack spacing={3} sx={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
					{bottomSections.supportUs.enabled && (
						<Paper
							variant='outlined'
							sx={{
								p: { xs: 3, md: 4 },
								borderRadius: 3,
								textAlign: 'center',
								width: '100%',
								minWidth: 0,
								maxWidth: '100%',
								boxSizing: 'border-box',
								overflow: 'hidden',
								overflowWrap: 'anywhere',
							}}>
							<Box sx={cardHeaderSx}>
								<VolunteerActivismIcon sx={{ color: (theme) => theme.palette.contentAccent.main, fontSize: 32, mb: 1 }} />
								<Typography variant='h5' component='h3'>
									{bottomSections.supportUs.title}
								</Typography>
							</Box>

							{supportIntro && (
								<Typography variant='body1' sx={{ mb: 3, lineHeight: 1.75 }}>
									{supportIntro}
								</Typography>
							)}

							<Typography variant='body1' sx={{ fontWeight: 700, lineHeight: 1.7, mb: 3 }}>
								{bottomSections.supportUs.mailTo.title}
								<br />
								<br />
								{bottomSections.supportUs.mailTo.lines.map((line) => renderMailToLine(line))}
							</Typography>

							{supportThanks && (
								<Typography variant='body1' sx={{ lineHeight: 1.75 }}>
									{supportThanks}
								</Typography>
							)}
						</Paper>
					)}

					{bottomSections.applyNow.enabled && (
						<Paper
							sx={{
								p: { xs: 3, md: 4 },
								borderRadius: 3,
								textAlign: 'center',
								width: '100%',
								minWidth: 0,
								maxWidth: '100%',
								boxSizing: 'border-box',
								overflow: 'hidden',
								...homePrimaryPanelSx(primaryColor),
							}}>
							<Box sx={cardHeaderSx}>
								<RocketLaunchIcon sx={{ fontSize: 32, mb: 1 }} />
								<Typography variant='h5' component='h3'>
									{bottomSections.applyNow.title}
								</Typography>
							</Box>

							<Typography variant='body1' sx={{ mb: 3, lineHeight: 1.75, opacity: 0.95 }}>
								{bottomSections.applyNow.paragraph}
							</Typography>

							<Stack
								direction={{ xs: 'column', sm: 'row' }}
								spacing={1.5}
								sx={{ justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
								<Button
									size='large'
									variant='contained'
									onClick={() => navigate(generatePath(bottomSections.applyNow.button.path || paths.login))}
									sx={homeYellowButtonSx}>
									{bottomSections.applyNow.button.label}
								</Button>
								{showBoardAccess && boardButton?.path && (
									<Button
										size='large'
										variant='outlined'
										onClick={() => navigate(generatePath(boardButton.path))}
										sx={{ ...homeOutlinedOnDarkButtonSx, borderColor: 'rgba(255,255,255,0.7)' }}>
										{boardButton.label}
									</Button>
								)}
							</Stack>
						</Paper>
					)}
				</Stack>
			</Container>
		</Box>
	);
}
