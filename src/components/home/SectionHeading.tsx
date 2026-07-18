import React from 'react';
import { Box, Typography } from '@mui/material';
import { displayFont, homeAccentStripe } from './homePageStyles';

interface SectionHeadingProps {
	eyebrow?: string;
	title: string;
	subtitle?: string;
	align?: 'left' | 'center';
}

export default function SectionHeading({ eyebrow, title, subtitle, align = 'center' }: SectionHeadingProps) {
	return (
		<Box sx={{ textAlign: align, mb: { xs: 4, md: 5 } }}>
			{eyebrow && (
				<Typography
					variant='overline'
					sx={{
						display: 'block',
						letterSpacing: '0.18em',
						fontWeight: 700,
						color: (theme) => theme.palette.contentAccent.main,
						mb: 1,
					}}>
					{eyebrow}
				</Typography>
			)}
			{align === 'center' && <Box sx={{ ...homeAccentStripe, mx: 'auto' }} />}
			{align === 'left' && <Box sx={homeAccentStripe} />}
			<Typography
				component='h2'
				sx={{
					fontFamily: displayFont,
					fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
					lineHeight: 1.15,
					fontWeight: 400,
				}}>
				{title}
			</Typography>
			{subtitle && (
				<Typography
					variant='h6'
					component='p'
					color='text.secondary'
					sx={{ mt: 2, maxWidth: 720, mx: align === 'center' ? 'auto' : 0, fontWeight: 400, lineHeight: 1.65 }}>
					{subtitle}
				</Typography>
			)}
		</Box>
	);
}
