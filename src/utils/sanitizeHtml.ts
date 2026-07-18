/** Shared HTML sanitization config for user- and third-party-authored HTML (email bodies, signatures, static copy). */

import DOMPurify from 'dompurify';
import type { Config } from 'dompurify';

const ALLOWED_TAGS = [
	'a',
	'b',
	'blockquote',
	'br',
	'caption',
	'div',
	'em',
	'font',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'hr',
	'i',
	'img',
	'li',
	'ol',
	'p',
	'pre',
	'small',
	'span',
	'strong',
	'sub',
	'sup',
	'table',
	'tbody',
	'td',
	'tfoot',
	'th',
	'thead',
	'tr',
	'u',
	'ul',
];

const ALLOWED_ATTR = ['align', 'alt', 'class', 'color', 'colspan', 'height', 'href', 'rel', 'rowspan', 'src', 'style', 'target', 'title', 'width'];

/** DOMPurify config for email/signature HTML: keeps common formatting/layout tags, strips script/on* handlers and other active content. */
export const sanitizeHtmlConfig: Config = {
	ALLOWED_TAGS,
	ALLOWED_ATTR,
	ALLOW_DATA_ATTR: false,
	FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'link', 'meta'],
	FORBID_ATTR: ['srcdoc'],
};

/** Convenience wrapper around `DOMPurify.sanitize` using `sanitizeHtmlConfig`. */
export const sanitizeHtml = (dirty: string | null | undefined): string => {
	if (!dirty) return '';
	return DOMPurify.sanitize(dirty, sanitizeHtmlConfig);
};
