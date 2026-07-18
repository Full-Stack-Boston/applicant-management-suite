/**
 * Standard section header for asset view cards (Application, Notes, Family, etc.).
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Box, Divider, IconButton, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import type { AssetSectionHeaderProps } from './types';

const AssetSectionHeader = ({ title, endAdornment, showDivider = true, showBackButton = false, onBack, sx }: AssetSectionHeaderProps) => {
	const navigate = useNavigate();

	const handleBack = () => {
		if (onBack) {
			onBack();
			return;
		}
		navigate(-1);
	};

	return (
		<Box sx={sx}>
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: 1.5,
					minHeight: 32,
				}}>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, minWidth: 0, flex: 1 }}>
					{showBackButton && (
						<IconButton onClick={handleBack} aria-label='Go back' sx={{ mr: 0.25, color: 'text.heading', flexShrink: 0 }}>
							<ArrowBackIcon />
						</IconButton>
					)}
					<Typography component='h2' variant='subtitle1' sx={{ m: 0 }}>
						{title}
					</Typography>
				</Box>
				{endAdornment}
			</Box>
			{showDivider && <Divider sx={{ mt: 0.75, mb: 1.25, borderColor: 'divider' }} />}
		</Box>
	);
};

AssetSectionHeader.propTypes = {
	title: PropTypes.string.isRequired,
	endAdornment: PropTypes.node,
	showDivider: PropTypes.bool,
	showBackButton: PropTypes.bool,
	onBack: PropTypes.func,
	sx: PropTypes.object,
};

export default AssetSectionHeader;
