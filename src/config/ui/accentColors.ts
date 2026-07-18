import { colors } from './theme';

/** Theme primary keys users can pick as site accent colors. */
export type AccentColorKey = 'green' | 'blue' | 'teal' | 'brown' | 'yellow2';

export interface AccentColorOption {
	key: AccentColorKey;
	/** Friendly name shown in the accent picker. */
	brandName: string;
	hex: string;
	/** Tooltip for swatch / icon controls. */
	tooltip: string;
	/** Menu item label shown when picking an accent. */
	menuLabel: string;
}

/** Map retired picker keys so saved preferences still resolve. */
const LEGACY_ACCENT_KEY_MAP: Record<string, AccentColorKey> = {
	red: 'teal',
	yellow: 'yellow2',
};

/**
 * Institutional AMS accent set: cool greens/blues/teal/slate + warm amber for contrast CTAs.
 * Crimson was removed — too alarm-like next to status/error red.
 */
export const accentColorOptions: AccentColorOption[] = [
	{
		key: 'green',
		brandName: 'Forest Green',
		hex: colors.green,
		tooltip: 'Forest Green',
		menuLabel: 'Forest Green',
	},
	{
		key: 'blue',
		brandName: 'Ocean Blue',
		hex: colors.blue,
		tooltip: 'Ocean Blue',
		menuLabel: 'Ocean Blue',
	},
	{
		key: 'teal',
		brandName: 'Deep Teal',
		hex: colors.teal,
		tooltip: 'Deep Teal',
		menuLabel: 'Deep Teal',
	},
	{
		key: 'brown',
		brandName: 'Slate',
		hex: colors.brown,
		tooltip: 'Slate',
		menuLabel: 'Slate',
	},
	{
		key: 'yellow2',
		brandName: 'Amber',
		hex: colors.yellow2 ?? colors.yellow,
		tooltip: 'Amber',
		menuLabel: 'Amber',
	},
];

export const accentColorPickerTooltip = 'Choose theme color';

export const getAccentColorOption = (key: string): AccentColorOption | undefined =>
	accentColorOptions.find((option) => option.key === key);

/** Normalize saved / legacy accent keys to a current picker option. */
export const normalizeAccentColorKey = (key: string | undefined | null): AccentColorKey => {
	if (!key) return 'green';
	const mapped = LEGACY_ACCENT_KEY_MAP[key] ?? key;
	return getAccentColorOption(mapped)?.key ?? 'green';
};
