import type { HTMLAttributes } from 'react';
import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

interface DatatableEmptyOverlayProps extends HTMLAttributes<HTMLDivElement> {
	message?: string;
	sx?: SxProps<Theme>;
}

export default function DatatableEmptyOverlay({ message = 'No items to display', sx, ...rest }: DatatableEmptyOverlayProps) {
	return (
		<Box
			{...rest}
			sx={[
				{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 1,
					height: '100%',
					minHeight: 200,
					px: 2,
					py: 4,
				},
				...(Array.isArray(sx) ? sx : [sx]),
			]}>
			<InboxOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.7 }} />
			<Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center' }}>
				{message}
			</Typography>
		</Box>
	);
}
