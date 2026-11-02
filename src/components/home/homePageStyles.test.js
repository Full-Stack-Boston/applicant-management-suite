import { describe, expect, it } from 'vitest';
import {
	homeContainedPrimaryButtonSx,
	homeApplicantDetailIconSx,
	homePrimaryForeground,
	homeNavActiveBorderColor,
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

		const greenBtn = homeContainedPrimaryButtonSx('green');
		expect(greenBtn['--variant-containedColor']).toBe('#FFFFFF');
		expect(greenBtn['&:hover']['--variant-containedBg']({ palette: { custom: { black: '#000' } } })).toBe('#000');
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
});
