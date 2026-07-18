/**
 * Last-seen + last-login activity strip for applicant/member profile footers.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { LoginOutlined as LoginIcon, VisibilityOutlined as SeenIcon } from '@mui/icons-material';
import { UserLastLogin, UserLastSeen } from '../../config/ui/tableConfig';
import type { UserActivityFooterProps } from './types';

const metaTextSx = {
	fontSize: '0.8125rem',
	color: 'text.secondary',
	fontWeight: 500,
};

const UserActivityFooter = ({ userId }: UserActivityFooterProps) => {
	if (!userId) return null;

	return (
		<Box
			sx={{
				display: 'flex',
				flexWrap: 'wrap',
				alignItems: 'center',
				justifyContent: { xs: 'center', sm: 'flex-end' },
				gap: { xs: 0.75, sm: 2 },
			}}>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
				<SeenIcon sx={{ fontSize: 16, color: 'text.secondary' }} aria-hidden />
				<Typography component='span' sx={metaTextSx}>
					Last seen <UserLastSeen userId={userId} />
				</Typography>
			</Box>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
				<LoginIcon sx={{ fontSize: 16, color: 'text.secondary' }} aria-hidden />
				<Typography component='span' sx={metaTextSx}>
					Last login <UserLastLogin userId={userId} />
				</Typography>
			</Box>
		</Box>
	);
};

UserActivityFooter.propTypes = {
	userId: PropTypes.string,
};

export default UserActivityFooter;
