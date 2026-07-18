/**
 * Single Asset Page Layout
 * Outer wrapper + card shell for admin detail views (applicant, application, member, email).
 * Layout tokens match PF adminPageStyles for contrast and responsivity.
 */

import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

import { useTheme } from '../../context/ThemeContext';
import { assetCardContentSx, assetCardShellSx, singleAssetPageSx } from '../../config/ui/adminPageStyles';

/**
 * Outer layout for single-asset admin detail views.
 * Back navigation lives in AssetProfileSection (Information header).
 */
const SingleAssetPage = ({ children }: { children: ReactNode }) => <Box sx={singleAssetPageSx}>{children}</Box>;

interface AssetCardProps {
	children: ReactNode;
	flex?: string | number;
	sx?: SxProps<Theme>;
	contentSx?: SxProps<Theme>;
}

/**
 * Paper card shell used on detail views — always background.paper so text contrast
 * tracks light/dark mode (do not use background.main here).
 */
export const AssetCard = ({ children, flex = 1, sx, contentSx }: AssetCardProps) => {
	const { boxShadow } = useTheme();

	return (
		<Box
			sx={[
				{
					flex: { xs: '1 1 auto', md: flex },
					width: { xs: '100%', md: 'auto' },
					maxWidth: '100%',
					...assetCardShellSx(boxShadow),
				},
				...(Array.isArray(sx) ? sx : [sx]),
			]}>
			<Box sx={[assetCardContentSx, ...(Array.isArray(contentSx) ? contentSx : [contentSx])]}>{children}</Box>
		</Box>
	);
};

export default SingleAssetPage;
