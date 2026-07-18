import '@mui/material/styles';

declare module '@mui/material/styles' {
	interface Palette {
		contentAccent: { main: string };
		contentLink: { main: string };
		custom: Record<string, string>;
		highlight: { main: string };
		boxShadow: string;
		DataGrid: { bg?: string; headerBg?: string; pinnedBg?: string };
	}
	interface PaletteOptions {
		contentAccent?: { main: string };
		contentLink?: { main: string };
		custom?: Record<string, string>;
		highlight?: { main: string };
		boxShadow?: string;
		DataGrid?: { bg?: string; headerBg?: string; pinnedBg?: string };
	}
	interface TypeText {
		main?: string;
		light?: string;
		dark?: string;
		active?: string;
		heading?: string;
		highlight?: string;
	}
	interface TypeBackground {
		main?: string;
		canvas?: string;
		passive?: string;
		seethru?: string;
	}
	interface PaletteColor {
		soft?: string;
	}
	interface SimplePaletteColorOptions {
		soft?: string;
	}
}
