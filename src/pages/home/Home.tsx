import React, { useMemo, useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import HomeNav from '../../components/home/HomeNav';
import HomeHero from '../../components/home/HomeHero';
import HomeTrustStats from '../../components/home/HomeTrustStats';
import HomeAboutSection from '../../components/home/HomeAboutSection';
import HomeRequirementsSection from '../../components/home/HomeRequirementsSection';
import HomeContactSection from '../../components/home/HomeContactSection';
import HomeSupportSection from '../../components/home/HomeSupportSection';
import HomeFooter from '../../components/home/HomeFooter';
import { useHomeSectionNav } from '../../components/home/useHomeSectionNav';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { homePageContent } from '../../config/content';

export default function Home() {
	const topRef = useRef<HTMLElement>(null) as React.RefObject<HTMLElement>;
	const { darkMode } = useTheme();
	const { sectionIds } = homePageContent;

	const sectionIdList = useMemo(
		() => [sectionIds.about, sectionIds.apply, sectionIds.contact, sectionIds.support],
		[sectionIds.about, sectionIds.apply, sectionIds.contact, sectionIds.support],
	);

	const { activeSection, navSolid, scrollToSection } = useHomeSectionNav(sectionIdList);

	useEffect(() => {
		const hash = window.location.hash.replace('#', '');
		if (hash && sectionIdList.includes(hash)) {
			scrollToSection(hash);
		}
	}, [scrollToSection, sectionIdList]);

	useTitle({ title: 'Home', appear: true });

	return (
		<Box sx={{ bgcolor: darkMode ? 'custom.black' : 'custom.white', color: 'text.primary', minHeight: '100vh' }}>
			{homePageContent.appBar.enabled && (
				<HomeNav navSolid={navSolid} activeSection={activeSection} onNavigateSection={scrollToSection} />
			)}

			{homePageContent.intro.enabled && (
				<HomeHero topRef={topRef} onLearnMore={() => scrollToSection(sectionIds.about)} />
			)}

			<HomeTrustStats />

			{homePageContent.information.enabled && (
				<>
					<HomeAboutSection sectionId={sectionIds.about} />
					<HomeRequirementsSection sectionId={sectionIds.apply} />
					<HomeContactSection sectionId={sectionIds.contact} />
					<HomeSupportSection sectionId={sectionIds.support} />
				</>
			)}

			{homePageContent.footer.enabled && (
				<HomeFooter topRef={topRef} onNavigateSection={scrollToSection} />
			)}
		</Box>
	);
}
