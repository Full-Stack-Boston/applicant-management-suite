/**
 * Section Component
 * Standardized title, divider, and content spacing for detail view segments.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import AssetSectionHeader from './AssetSectionHeader';
import type { SectionProps } from './types';

const Section = ({ title, children }: SectionProps) => {
	if (!children) return null;

	return (
		<Box sx={{ mt: 0 }}>
			{title && <AssetSectionHeader title={title} />}
			<Box>{children}</Box>
		</Box>
	);
};

Section.propTypes = {
	title: PropTypes.string,
	children: PropTypes.node.isRequired,
};

export default Section;
