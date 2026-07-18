import React, { useRef } from 'react';
import { Box, Container, type Theme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { homePageContent } from '../../config/content';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import HomeNav from './HomeNav';
import HomeFooter from './HomeFooter';

const navHeights = { xs: 56, md: 64 } as const;

const publicPageOuterGap = (compact: boolean, tightMobile = false): { xs: number; md: number } =>
	compact ? { xs: tightMobile ? 1 : 3, md: 4 } : { xs: 4, md: 5 };

const publicPageMainSx = (compact: boolean, tightMobile = false) => (theme: Theme) => {
	const gap = publicPageOuterGap(compact, tightMobile);

	return {
		flex: 1,
		display: 'flex',
		flexDirection: 'column',
		pt: {
			xs: `calc(${navHeights.xs}px + ${theme.spacing(gap.xs)})`,
			md: `calc(${navHeights.md}px + ${theme.spacing(gap.md)})`,
		},
		px: gap,
		pb: gap,
	};
};

const publicPageMainFitViewportSx = (compact: boolean, tightMobile = false) => (theme: Theme) => {
	const gap = publicPageOuterGap(compact, tightMobile);

	return {
		flex: 1,
		display: 'flex',
		flexDirection: 'column',
		justifyContent: { xs: 'flex-start', md: 'center' },
		minHeight: 0,
		pt: {
			xs: `calc(${navHeights.xs}px + ${theme.spacing(gap.xs)})`,
			md: `calc(${navHeights.md}px + ${theme.spacing(1.5)})`,
		},
		px: gap,
		pb: { xs: gap.xs, md: 1.5 },
	};
};

interface PublicPageLayoutProps {
	children: React.ReactNode;
	maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
	/** Equal-margin layout for auth forms (gap below nav matches sides and footer). */
	compact?: boolean;
	/** Narrower horizontal padding on xs for data-heavy pages. */
	tightMobile?: boolean;
	/** Applicant dashboard nav links, settings, and logout in the site header. */
	applicantNav?: boolean;
	/** Keep utility/status pages within one viewport height on desktop; mobile scrolls normally. */
	fitViewport?: boolean;
}

export default function PublicPageLayout({ children, maxWidth = 'sm', compact = false, tightMobile = false, applicantNav = false, fitViewport = false }: PublicPageLayoutProps) {
	const topRef = useRef<HTMLElement>(null) as React.RefObject<HTMLElement>;
	const navigate = useNavigate();
	const { darkMode } = useTheme();

	const handleNavigateSection = (sectionId: string) => {
		navigate(`${generatePath(paths.home)}#${sectionId}`);
	};

	return (
		<Box
			sx={{
				bgcolor: darkMode ? 'custom.black' : 'custom.white',
				color: 'text.primary',
				minHeight: '100dvh',
				...(fitViewport
					? {
							height: { md: '100dvh' },
							maxHeight: { md: '100dvh' },
							overflow: { xs: 'visible', md: 'hidden' },
						}
					: {}),
				display: 'flex',
				flexDirection: 'column',
			}}>
			<Box ref={topRef} />
			{homePageContent.appBar.enabled && (
				<HomeNav
					navSolid
					activeSection=''
					onNavigateSection={handleNavigateSection}
					variant={applicantNav ? 'applicant' : 'utility'}
				/>
			)}
			<Box component='main' sx={fitViewport ? publicPageMainFitViewportSx(compact, tightMobile) : publicPageMainSx(compact, tightMobile)}>
				<Container maxWidth={maxWidth} disableGutters={tightMobile} sx={{ minWidth: 0, width: '100%' }}>
					{children}
				</Container>
			</Box>
			{homePageContent.footer.enabled && (
				<HomeFooter topRef={topRef} onNavigateSection={handleNavigateSection} />
			)}
		</Box>
	);
}
