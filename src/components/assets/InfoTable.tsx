/**
 * InfoTable Component
 * Renders a simple key-value list for displaying read-only data.
 * Uses sx colors (not Typography color prop) so palette paths resolve in MUI 9.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import type { InfoTableProps } from './types';

const InfoTable = ({ data }: InfoTableProps) => {
	if (!data || data.length === 0) return null;

	return (
		<Box
			sx={{
				display: 'grid',
				gridTemplateColumns: { xs: '1fr', sm: 'minmax(96px, 8.75rem) minmax(0, 1fr)' },
				columnGap: 1.5,
				rowGap: 0.65,
				width: '100%',
				minWidth: 0,
			}}>
			{data.map(
				(row) =>
					row.value && (
						<React.Fragment key={row.label}>
							<Typography
								component='div'
								sx={{
									fontWeight: 600,
									color: 'text.secondary',
									fontSize: '0.72rem',
									letterSpacing: '0.04em',
									textTransform: 'uppercase',
									lineHeight: 1.35,
								}}>
								{row.label}
							</Typography>
							<Typography
								component='div'
								sx={{
									fontWeight: 400,
									color: 'text.primary',
									fontSize: '0.9375rem',
									lineHeight: 1.35,
									wordBreak: 'break-word',
									overflowWrap: 'anywhere',
									minWidth: 0,
								}}>
								{row.value}
							</Typography>
						</React.Fragment>
					)
			)}
		</Box>
	);
};

InfoTable.propTypes = {
	data: PropTypes.arrayOf(
		PropTypes.shape({
			label: PropTypes.string.isRequired,
			value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.node]),
		})
	).isRequired,
};

export default InfoTable;
