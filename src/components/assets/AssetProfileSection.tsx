/**
 * Shared profile header for admin detail views (applications, applicants, members, emails).
 * Back arrow + Information title, identity strip, detail grid, optional footer, inline functions.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Button, Typography } from '@mui/material';
import AssetSectionHeader from './AssetSectionHeader';
import ApplicationDetailGrid from './ApplicationDetailGrid';
import DynamicActionGroup from '../dynamicButtons/DynamicButtons';
import { getStatusCapsuleSx } from '../../config/ui/statusCapsuleStyles';
import type { AssetProfileSectionProps } from './types';

const AssetProfileSection = ({
	sectionTitle = 'Information',
	showBackButton = true,
	onBack,
	image,
	displayName,
	status,
	config = {},
	details,
	footerMeta,
	actions,
	asset,
	onAction,
	functionsTitle = 'Functions',
	functions,
	editPath,
}: AssetProfileSectionProps) => {
	const navigate = useNavigate();
	const showIdentity = Boolean(image || displayName);
	const hasActionButtons = Boolean(actions?.some((action) => !action.hide));
	const showFunctions = Boolean(functions || (hasActionButtons && actions && asset && onAction));

	const headerEndAdornment = (
		<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
			{editPath && (
				<Button variant='text' size='small' onClick={() => navigate(editPath)} sx={{ minWidth: 0, px: 1 }}>
					Edit
				</Button>
			)}
			{status && (
				<Typography component='span' sx={getStatusCapsuleSx(status)}>
					{status}
				</Typography>
			)}
		</Box>
	);

	return (
		<Box sx={{ width: '100%', minWidth: 0 }}>
			<AssetSectionHeader title={sectionTitle} showBackButton={showBackButton} onBack={onBack} endAdornment={editPath || status ? headerEndAdornment : undefined} />

			{showIdentity && (
				<Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mb: 1.5 }}>
					<Box
						sx={{
							display: 'inline-flex',
							flexDirection: { xs: 'column', sm: 'row' },
							alignItems: 'center',
							justifyContent: 'center',
							gap: { xs: 0.75, sm: 1.25 },
							py: 1,
							px: 1.5,
							borderRadius: 2,
							bgcolor: 'action.hover',
							textAlign: { xs: 'center', sm: 'left' },
							maxWidth: '100%',
						}}>
						{image && (
							<Avatar
								src={image || config.DEFAULT_AVATAR}
								alt='Profile'
								sx={{
									width: { xs: 56, sm: 64 },
									height: { xs: 56, sm: 64 },
									flexShrink: 0,
									objectFit: 'cover',
									border: '2px solid',
									borderColor: 'background.paper',
									boxShadow: 1,
								}}
							/>
						)}
						{displayName && (
							<Typography
								component='p'
								sx={{
									fontSize: { xs: '1.35rem', md: '1.5rem' },
									fontWeight: 700,
									lineHeight: 1.2,
									wordBreak: 'break-word',
									overflowWrap: 'anywhere',
									m: 0,
									color: 'text.primary',
								}}>
								{displayName}
							</Typography>
						)}
					</Box>
				</Box>
			)}

			<ApplicationDetailGrid items={details} fullWidth />

			{footerMeta && (
				<Box
					sx={{
						mt: 1.25,
						pt: 1,
						borderTop: '1px solid',
						borderColor: 'divider',
					}}>
					{footerMeta}
				</Box>
			)}

			{showFunctions && (
				<>
					<AssetSectionHeader title={functionsTitle} showDivider={false} sx={{ mt: 1.75, mb: 1 }} />
					{functions ?? <DynamicActionGroup actions={actions ?? []} asset={asset} onAction={onAction} layout='inline' />}
				</>
			)}
		</Box>
	);
};

AssetProfileSection.propTypes = {
	sectionTitle: PropTypes.string,
	showBackButton: PropTypes.bool,
	onBack: PropTypes.func,
	image: PropTypes.string,
	displayName: PropTypes.string,
	status: PropTypes.string,
	config: PropTypes.object,
	details: PropTypes.array.isRequired,
	footerMeta: PropTypes.node,
	actions: PropTypes.array,
	asset: PropTypes.object,
	onAction: PropTypes.func,
	functionsTitle: PropTypes.string,
	functions: PropTypes.node,
	editPath: PropTypes.string,
};

export default AssetProfileSection;
