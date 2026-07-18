import { useCallback, useEffect, useState } from 'react';

export function useHomeSectionNav(sectionIds: readonly string[]) {
	const [activeSection, setActiveSection] = useState(sectionIds[0] ?? '');
	const [navSolid, setNavSolid] = useState(false);

	const scrollToSection = useCallback((id: string) => {
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}, []);

	useEffect(() => {
		const onScroll = () => setNavSolid(window.scrollY > 48);
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();

		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((entry) => entry.isIntersecting)
					.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
				const nextId = visible[0]?.target.id;
				if (nextId) {
					setActiveSection(nextId);
				}
			},
			{ rootMargin: '-35% 0px -50% 0px', threshold: [0, 0.15, 0.35] },
		);

		sectionIds.forEach((id) => {
			const element = document.getElementById(id);
			if (element) {
				observer.observe(element);
			}
		});

		return () => {
			window.removeEventListener('scroll', onScroll);
			observer.disconnect();
		};
	}, [sectionIds]);

	return { activeSection, navSolid, scrollToSection };
}
