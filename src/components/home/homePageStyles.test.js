import { describe, expect, it } from 'vitest';
import {
	homeContainedPrimaryButtonSx,
	homeAuthSubmitButtonSx,
	homeApplicantDetailIconSx,
	homePrimaryForeground,
	homeNavActiveBorderColor,
	homeNavLinkButtonSx,
	homePrimaryPanelSx,
	homeYellowButtonSx,
	homeOutlinedOnPrimaryButtonSx,
	homeFooterAccentLinkSx,
	homeFooterIconButtonSx,
	homeDashboardIntroLabelSx,
	homeSectionAltBg,
	homeHeroOverlay,
	homeCardBorder,
} from './homePageStyles';

describe('homePageStyles', () => {
	it('switches primary contrast tokens for yellow2 vs other accents', () => {
		expect(homePrimaryForeground('yellow2')).toBe('custom.black');
		expect(homePrimaryForeground('green')).toBe('common.white');
		expect(homeNavActiveBorderColor('yellow2')).toBe('custom.black');
		expect(homeNavActiveBorderColor('green')).toBe('custom.yellow2');

		const yellowBtn = homeContainedPrimaryButtonSx('yellow2');
		expect(yellowBtn.color).toBe('custom.black');
		expect(yellowBtn['--variant-containedBg']({ palette: { primary: { main: '#ff0' } } })).toBe('#ff0');
		expect(yellowBtn['--variant-containedColor']({ palette: { custom: { black: '#111' } } })).toBe('#111');
		expect(yellowBtn['&:hover']['--variant-containedBg']({ palette: { custom: { yellow: '#fc0' } } })).toBe('#fc0');
		expect(yellowBtn['&:hover']['--variant-containedColor']({ palette: { custom: { black: '#111' } } })).toBe('#111');

		const greenBtn = homeContainedPrimaryButtonSx('green');
		expect(greenBtn['--variant-containedColor']).toBe('#FFFFFF');
		expect(greenBtn['&:hover']['--variant-containedBg']({ palette: { custom: { black: '#000' } } })).toBe('#000');

		// Auth submit shares the dark-on-primary hover token paths.
		const yellowAuth = homeAuthSubmitButtonSx('yellow2');
		expect(yellowAuth).toBeTruthy();
		const greenAuth = homeAuthSubmitButtonSx('green');
		expect(greenAuth).toBeTruthy();
	});

	it('covers section/hero helpers and applicant icon color fallback', () => {
		expect(homeSectionAltBg(true)).toMatch(/255/);
		expect(homeSectionAltBg(false)).toMatch(/136/);
		expect(homeHeroOverlay(true)).toMatch(/linear-gradient/);
		expect(homeHeroOverlay(false)).toMatch(/linear-gradient/);
		expect(homeCardBorder(true)).toMatch(/255/);
		expect(homeCardBorder(false)).toMatch(/136/);

		const withAccent = homeApplicantDetailIconSx.color({
			palette: { contentAccent: { main: '#abc' }, primary: { main: '#123' } },
		});
		expect(withAccent).toBe('#abc');
		const withoutAccent = homeApplicantDetailIconSx.color({
			palette: { primary: { main: '#123' } },
		});
		expect(withoutAccent).toBe('#123');
	});

	it('covers on-primary hover washes, yellow CTA tokens, and footer/dashboard accents', () => {
		expect(homeNavLinkButtonSx('yellow2')['&:hover'].bgcolor).toBe('rgba(0,0,0,0.1)');
		expect(homeNavLinkButtonSx('green')['&:hover'].bgcolor).toBe('rgba(255,255,255,0.14)');
		expect(homePrimaryPanelSx('yellow2').color).toBe('custom.black');
		expect(homeYellowButtonSx['--variant-containedBg']({ palette: { custom: { yellow2: '#ff0' } } })).toBe('#ff0');
		expect(homeYellowButtonSx['--variant-containedColor']({ palette: { custom: { black: '#111' } } })).toBe('#111');
		expect(homeYellowButtonSx['&:hover']['--variant-containedBg']({ palette: { custom: { yellow: '#fc0' } } })).toBe('#fc0');
		expect(homeYellowButtonSx['&:hover']['--variant-containedColor']({ palette: { custom: { black: '#111' } } })).toBe('#111');

		expect(homeOutlinedOnPrimaryButtonSx('yellow2').borderColor).toBe('custom.black');
		expect(homeOutlinedOnPrimaryButtonSx('green').borderColor).toBe('common.white');

		expect(homeFooterAccentLinkSx('yellow2').color).toBe('custom.black');
		expect(homeFooterAccentLinkSx('green').color).toBe('custom.yellow2');
		expect(homeFooterIconButtonSx('yellow2').bgcolor).toMatch(/0\.08/);
		expect(homeFooterIconButtonSx('green').bgcolor).toMatch(/0\.12/);

		expect(
			homeDashboardIntroLabelSx.color({
				palette: { contentAccent: { main: '#abc' }, primary: { main: '#123' } },
			})
		).toBe('#abc');
		expect(homeDashboardIntroLabelSx.color({ palette: { primary: { main: '#123' } } })).toBe('#123');
	});
});
