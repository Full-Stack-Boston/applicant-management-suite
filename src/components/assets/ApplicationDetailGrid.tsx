/**
 * Compact, icon-backed detail grid for asset profile headers.
 * Full-width mode packs fields into many columns to minimize wrapping.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import type { ApplicationDetailGridProps } from './types';

const ApplicationDetailGrid = ({ items, fullWidth = false }: ApplicationDetailGridProps) => {
	const visibleItems = items.filter((item) => item.value);

	if (visibleItems.length === 0) return null;

	return (
		<Box
			sx={{
				display: 'grid',
				gridTemplateColumns: fullWidth
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
				columnGap: fullWidth ? { xs: 0.75, md: 1 } : { xs: 1.5, md: 2 },
				rowGap: fullWidth ? { xs: 0.5, md: 0.75 } : { xs: 0.75, md: 1 },
				width: '100%',
				minWidth: 0,
			}}>
			{visibleItems.map(({ label, value, icon: Icon }) => (
				<Box
					key={label}
					sx={{
						display: 'flex',
						alignItems: 'flex-start',
						gap: fullWidth ? 0.75 : 1,
						minWidth: 0,
						py: fullWidth ? 0.15 : 0.25,
					}}>
					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: fullWidth ? 30 : 34,
							height: fullWidth ? 30 : 34,
							borderRadius: 1,
							bgcolor: 'action.hover',
							color: 'secondary.main',
							flexShrink: 0,
							mt: 0.1,
						}}>
						<Icon sx={{ fontSize: fullWidth ? 17 : 20 }} aria-hidden />
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
								fontSize: { xs: '1.05rem', md: '1.15rem' },
								fontWeight: 500,
								color: 'text.primary',
								lineHeight: 1.25,
								wordBreak: 'break-word',
								overflowWrap: 'anywhere',
							}}>
							{value}
						</Typography>
					</Box>
				</Box>
			))}
		</Box>
	);
};

ApplicationDetailGrid.propTypes = {
	items: PropTypes.arrayOf(
		PropTypes.shape({
			label: PropTypes.string.isRequired,
			value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.node]),
			icon: PropTypes.elementType.isRequired,
		})
	).isRequired,
	fullWidth: PropTypes.bool,
};

export default ApplicationDetailGrid;
