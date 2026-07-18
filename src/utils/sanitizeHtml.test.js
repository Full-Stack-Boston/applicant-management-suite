import { sanitizeHtml, sanitizeHtmlConfig } from './sanitizeHtml';

describe('sanitizeHtml', () => {
	it('returns empty string for nullish input', () => {
		expect(sanitizeHtml(null)).toBe('');
		expect(sanitizeHtml(undefined)).toBe('');
		expect(sanitizeHtml('')).toBe('');
	});

	it('keeps safe formatting tags and strips scripts', () => {
		const dirty = '<p>Hello <strong>world</strong></p><script>alert(1)</script><img src="x" onerror="alert(1)">';
		const clean = sanitizeHtml(dirty);
		expect(clean).toContain('<p>');
		expect(clean).toContain('<strong>');
		expect(clean).not.toContain('<script>');
		expect(clean).not.toContain('onerror');
	});

	it('exports a restrictive config', () => {
		expect(sanitizeHtmlConfig.ALLOWED_TAGS).toContain('a');
		expect(sanitizeHtmlConfig.FORBID_TAGS).toContain('script');
		expect(sanitizeHtmlConfig.ALLOW_DATA_ATTR).toBe(false);
	});
});
