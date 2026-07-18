declare module 'he' {
	export function decode(html: string): string;
	export function encode(text: string): string;
	export function escape(text: string): string;
	export function unescape(text: string): string;
	const he: {
		decode: typeof decode;
		encode: typeof encode;
		escape: typeof escape;
		unescape: typeof unescape;
	};
	export default he;
}

declare module 'crypto-js' {
	interface WordArray {
		toString(encoder?: unknown): string;
	}
	const CryptoJS: {
		HmacSHA256(message: string, key: string): WordArray;
		[key: string]: unknown;
	};
	export default CryptoJS;
}

declare module 'ua-parser-js' {
	class UAParser {
		constructor(userAgent?: string);
		getResult(): {
			ua?: string;
			browser?: { name?: string; version?: string };
			os?: { name?: string; version?: string };
			device?: { vendor?: string; model?: string; type?: string };
		};
	}
	export { UAParser };
}

declare module 'pdfjs-dist/webpack.mjs' {
	export const getDocument: (src: string) => {
		promise: Promise<{
			numPages: number;
			getPage: (pageNumber: number) => Promise<{
				getViewport: (params: { scale: number }) => { width: number; height: number };
				render: (params: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => {
					promise: Promise<void>;
				};
			}>;
		}>;
	};
}
