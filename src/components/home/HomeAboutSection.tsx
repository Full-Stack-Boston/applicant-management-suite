import React from 'react';
import { Box, Container, Link, Paper, Typography } from '@mui/material';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import { homePageContent } from '../../config/content';
import { brand } from '../../config/Constants';
import { useTheme } from '../../context/ThemeContext';
import SectionHeading from './SectionHeading';
import { homeSectionAltBg, homeSectionPadding, homeCardBorder, homeProseBlock } from './homePageStyles';

interface HomeAboutSectionProps {
	sectionId: string;
}

export default function HomeAboutSection({ sectionId }: HomeAboutSectionProps) {
	const { darkMode } = useTheme();
	const aboutTab = homePageContent.information.tabs[0];
	const paragraphs = (aboutTab.content as { title: string; paragraphs: string[] }).paragraphs;

	const introParagraphs = paragraphs.slice(0, 3);
	const provisionsIntro = paragraphs[3];
	const quoteParagraphs = paragraphs.filter((paragraph) => paragraph.startsWith('"'));
	const closingParagraph = paragraphs[paragraphs.length - 1];

	return (
		<Box
			id={sectionId}
			component='section'
			sx={{
				py: homeSectionPadding,
				pt: 0,
				bgcolor: homeSectionAltBg(darkMode),
				scrollMarginTop: { xs: 80, md: 88 },
			}}>
			<Container maxWidth='lg'>
				<SectionHeading eyebrow='The Product' title={(aboutTab.content as { title: string }).title} />

				<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%' }}>
					<Box sx={{ ...homeProseBlock, mb: { xs: 3, md: 3.5 } }}>
						{introParagraphs.map((paragraph) => (
							<Typography key={paragraph.slice(0, 40)} variant='body1' sx={{ mb: 2.5, lineHeight: 1.8 }}>
								{paragraph}
							</Typography>
						))}
						<Typography variant='body1' sx={{ lineHeight: 1.8, fontWeight: 600 }}>
							{provisionsIntro}
						</Typography>
					</Box>

					<Paper
						elevation={0}
						sx={{
							...homeProseBlock,
							p: { xs: 2.5, md: 3 },
							mb: { xs: 4, md: 5 },
							borderRadius: 3,
							border: '1px solid',
							borderColor: homeCardBorder(darkMode),
							borderLeft: '4px solid',
							borderLeftColor: 'custom.blue',
							bgcolor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(2,136,209,0.04)',
						}}>
						<FormatQuoteIcon sx={{ color: 'custom.yellow2', fontSize: 36, mb: 1 }} />
						<Typography variant='overline' sx={{ letterSpacing: '0.14em', color: 'text.secondary', display: 'block', mb: 1 }}>
							Platform highlights
						</Typography>
						{quoteParagraphs.map((paragraph) => (
							<Typography
								key={paragraph.slice(0, 40)}
								variant='body1'
								sx={{
									mt: 2,
									fontStyle: 'italic',
									lineHeight: 1.75,
									overflowWrap: 'break-word',
									wordBreak: 'break-word',
								}}>
								{paragraph}
							</Typography>
						))}
					</Paper>

					<Typography component='div' variant='body1' sx={{ ...homeProseBlock, lineHeight: 1.8 }}>
						{closingParagraph}{' '}
						{brand.githubUrl && (
							<>
								Explore or self-host from{' '}
								<Link href={brand.githubUrl} target='_blank' rel='noopener noreferrer' underline='hover' sx={{ fontWeight: 600 }}>
									full-stack-boston/applicant-management-suite
								</Link>
								.
							</>
						)}
					</Typography>
				</Box>
			</Container>
		</Box>
	);
}
