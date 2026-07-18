/**
 * Display formatting helpers for admin detail views.
 * Keeps dates and place/address values readable in local (US-oriented) form.
 */

import dayjs from 'dayjs';

/** Format ISO / Date / dayjs-parsable values for local reading. */
export const formatDateTimeLocal = (value?: string | number | Date | null): string => {
	if (value === undefined || value === null || value === '') return '';
	const parsed = dayjs(value);
	return parsed.isValid() ? parsed.format('MMM D, YYYY · h:mm A') : String(value);
};

type PlaceLike = {
	description?: string;
	structured_formatting?: {
		main_text?: string;
		secondary_text?: string;
	};
};

/** Strip trailing country noise common in Google Places US results. */
const stripTrailingCountry = (text: string): string => text.replace(/,\s*USA$/i, '').replace(/,\s*United States$/i, '').trim();

/**
 * Format a mailing/place value for display.
 * Accepts plain strings or Google Places prediction objects.
 */
export const formatPlaceAddress = (value?: string | PlaceLike | null): string => {
	if (value === undefined || value === null || value === '') return '';
	if (typeof value === 'string') return stripTrailingCountry(value);

	const main = value.structured_formatting?.main_text?.trim();
	const secondary = value.structured_formatting?.secondary_text?.trim();
	if (main && secondary) return stripTrailingCountry(`${main}, ${secondary}`);
	if (main) return stripTrailingCountry(main);
	if (value.description) return stripTrailingCountry(String(value.description));

	return '';
};
