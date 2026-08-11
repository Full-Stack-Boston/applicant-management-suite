/**
 * Compact, icon-backed detail grid for application profile headers.
 * Full-width mode packs fields into many columns to minimize wrapping.
 */

import React, { type ElementType } from 'react';
import { Box, Typography } from '@mui/material';

export interface ApplicationDetailItem {
	label: string;
	value?: string | number | React.ReactNode;
	icon: ElementType;
}

interface ApplicationDetailGridProps {
	items: ApplicationDetailItem[];
	fullWidth?: boolean;
	/** Single-column stacked rows — better for lengthy values (email headers). */
	stacked?: boolean;
}

const ApplicationDetailGrid: React.FC<ApplicationDetailGridProps> = ({ items, fullWidth = false, stacked = false }) => {
	const visibleItems = items.filter((item) => item.value);

	if (visibleItems.length === 0) return null;

	return (
		<Box
			sx={{
				display: 'grid',
				gridTemplateColumns: stacked
					? '1fr'
					: fullWidth
						? {
								xs: 'repeat(2, minmax(0, 1fr))',
								sm: 'repeat(3, minmax(0, 1fr))',
								md: 'repeat(4, minmax(0, 1fr))',
								lg: 'repeat(5, minmax(0, 1fr))',
							}
						: {
								xs: '1fr',
								md: '1fr 1fr',
								xl: '1fr 1fr 1fr',
							},
				columnGap: stacked ? 0 : fullWidth ? { xs: 0.75, md: 1 } : { xs: 1.5, md: 2 },
				rowGap: stacked ? { xs: 1, md: 1.25 } : fullWidth ? { xs: 0.5, md: 0.75 } : { xs: 0.75, md: 1 },
				width: '100%',
				minWidth: 0,
			}}>
			{visibleItems.map(({ label, value, icon: Icon }) => (
				<Box
					key={label}
					sx={{
						display: 'flex',
						alignItems: 'flex-start',
						gap: stacked ? 1.25 : fullWidth ? 0.75 : 1,
						minWidth: 0,
						py: stacked ? 0.5 : fullWidth ? 0.15 : 0.25,
						...(stacked
							? {
									borderBottom: '1px solid',
									borderColor: 'divider',
									'&:last-of-type': { borderBottom: 'none' },
								}
							: {}),
					}}>
					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: stacked ? 34 : fullWidth ? 30 : 34,
							height: stacked ? 34 : fullWidth ? 30 : 34,
							borderRadius: 1,
							bgcolor: 'action.hover',
							color: 'secondary.main',
							flexShrink: 0,
							mt: 0.1,
						}}>
						<Icon sx={{ fontSize: stacked || !fullWidth ? 20 : 17 }} aria-hidden />
					</Box>
					<Box sx={{ minWidth: 0, flex: 1 }}>
						<Typography
							component='span'
							sx={{
								display: 'block',
								fontSize: '0.7rem',
								fontWeight: 700,
								letterSpacing: '0.05em',
								textTransform: 'uppercase',
								color: 'text.secondary',
								lineHeight: 1.15,
								mb: 0.1,
							}}>
							{label}
						</Typography>
						<Typography
							component='div'
							sx={{
								fontSize: stacked ? { xs: '0.95rem', md: '1rem' } : { xs: '1.05rem', md: '1.15rem' },
								fontWeight: 500,
								color: 'text.primary',
								lineHeight: 1.45,
								wordBreak: 'break-word',
								overflowWrap: 'anywhere',
								whiteSpace: 'normal',
							}}>
							{value}
						</Typography>
					</Box>
				</Box>
			))}
		</Box>
	);
};

export default ApplicationDetailGrid;
