import React from 'react';
import { Box, Container, Grid, Paper, Typography } from '@mui/material';
import {
	History as HistoryIcon,
	Savings as SavingsIcon,
	Groups as GroupsIcon,
	School as SchoolIcon,
} from '@mui/icons-material';
import { homePageContent } from '../../config/content';
import { useTheme } from '../../context/ThemeContext';
import { displayFont, homeCardBorder, homeSectionAltBg } from './homePageStyles';

const statIcons = [HistoryIcon, SavingsIcon, GroupsIcon, SchoolIcon];

export default function HomeTrustStats() {
	const { darkMode } = useTheme();
	const { trustStats } = homePageContent;
	const sectionBg = homeSectionAltBg(darkMode);

	if (!trustStats.enabled) {
		return null;
	}

	return (
		<Box
			component='section'
			sx={{
				position: 'relative',
				zIndex: 2,
				mt: { xs: -5, md: -8 },
				pt: 0,
				pb: { xs: 3, md: 4 },
				background: `linear-gradient(180deg, transparent 0%, transparent 2.75rem, ${sectionBg} 2.75rem, ${sectionBg} 100%)`,
			}}>
			<Container maxWidth='lg'>
				<Grid container rowSpacing={{ xs: 6, md: 2 }} columnSpacing={2}>
					{trustStats.items.map((stat, index) => {
						const Icon = statIcons[index] ?? HistoryIcon;
						return (
							<Grid key={stat.label} size={{ xs: 6, md: 3 }}>
								<Paper
									elevation={darkMode ? 6 : 8}
									sx={{
										p: { xs: 2, md: 2.75 },
										height: '100%',
										textAlign: 'center',
										borderRadius: 3,
										border: '1px solid',
										borderColor: homeCardBorder(darkMode),
										borderTop: '4px solid',
										borderTopColor: index % 2 === 0 ? 'custom.green' : 'custom.blue',
										bgcolor: darkMode ? 'custom.stblack' : 'custom.brightWhite',
										boxShadow: darkMode
											? '0 12px 28px rgba(0,0,0,0.45)'
											: '0 12px 28px rgba(2,136,209,0.18)',
									}}>
									<Icon sx={{ fontSize: 32, color: (theme) => theme.palette.contentAccent.main, mb: 1 }} />
									<Typography sx={{ fontFamily: displayFont, fontSize: { xs: '1.5rem', md: '1.85rem' }, lineHeight: 1.1 }}>
										{stat.value}
									</Typography>
									<Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
										{stat.label}
									</Typography>
								</Paper>
							</Grid>
						);
					})}
				</Grid>
			</Container>
		</Box>
	);
}
