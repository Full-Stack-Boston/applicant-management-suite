import React from 'react';
import { Typography } from '@mui/material';
import { getRsvpCapsuleSx, getStatusCapsuleSx } from '../../config/ui/statusCapsuleStyles';

interface StatusCapsuleProps {
	status?: string;
	children?: React.ReactNode;
}

export const StatusCapsule = ({ status, children }: StatusCapsuleProps) => (
	<Typography variant='body2' component='span' sx={getStatusCapsuleSx(status ?? '')}>
		{children ?? status}
	</Typography>
);

interface RsvpCapsuleProps {
	rsvpStatus?: string;
}

export const RsvpCapsule = ({ rsvpStatus }: RsvpCapsuleProps) => {
	let label = '❓ Unknown';
	if (rsvpStatus === 'yes') label = '✅ Yes';
	else if (rsvpStatus === 'no') label = '❌ No';

	return (
		<Typography variant='body2' component='span' sx={getRsvpCapsuleSx(rsvpStatus ?? '')}>
			RSVP: {label}
		</Typography>
	);
};
