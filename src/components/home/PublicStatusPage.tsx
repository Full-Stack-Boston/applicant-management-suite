import React from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import PublicPageLayout from './PublicPageLayout';
import AuthFormCard from '../auth/AuthFormCard';

interface PublicStatusPageProps {
	title: React.ReactNode;
	icon?: React.ReactNode;
	eyebrow?: string;
	subtitle?: string;
	children: React.ReactNode;
	/** Render inside admin shell without public nav/footer. */
	embedded?: boolean;
	embeddedSx?: SxProps<Theme>;
	/** Match register/apply card width when set to dashboard. */
	cardSize?: 'narrow' | 'wide' | 'dashboard';
	/** Fit nav + card + footer within one viewport without scrolling. */
	fitViewport?: boolean;
}

export default function PublicStatusPage({
	title,
	icon,
	eyebrow,
	subtitle,
	children,
	embedded = false,
	embeddedSx,
	cardSize = 'dashboard',
	fitViewport = false,
}: PublicStatusPageProps) {
	const card = (
		<AuthFormCard title={title} icon={icon} eyebrow={eyebrow} subtitle={subtitle} size={cardSize} compact={fitViewport}>
			{children}
		</AuthFormCard>
	);

	if (embedded) {
		return (
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					height: '100%',
					width: '100%',
					boxSizing: 'border-box',
					p: { xs: 2, sm: 3 },
					...embeddedSx,
				}}>
				{card}
			</Box>
		);
	}

	return <PublicPageLayout maxWidth='lg' compact fitViewport={fitViewport}>{card}</PublicPageLayout>;
}
