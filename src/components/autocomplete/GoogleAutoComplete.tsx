/**
 * Google Maps Autocomplete Component
 * Wraps the Google Maps Places API to provide address suggestions in a MUI Autocomplete input.
 * When no API key is configured (or Places fails to load / is denied), falls back to free-text
 * entry that still saves a Places-compatible { description, structured_formatting } object.
 */

import { useState, useEffect, useCallback } from 'react';
import { TextField, Autocomplete } from '@mui/material';

const PLACEHOLDER_KEYS = new Set(['', 'NO_KEY_GIVEN', 'REPLACE_WITH_YOUR_KEY']);

export interface PlacePrediction {
	description: string;
	place_id?: string;
	structured_formatting?: {
		main_text: string;
		secondary_text: string;
	};
	matched_substrings?: unknown[];
	terms?: unknown[];
	types?: string[];
	[key: string]: unknown;
}

interface GoogleMapsProps {
	label: string;
	location: PlacePrediction | null;
	changeLocation: (value: PlacePrediction | null) => void;
	disabled?: boolean;
	error?: boolean;
	helperText?: string;
}

/** Window globals set by the Google Maps loader (not part of `typeof globalThis`). */
type GoogleGlobal = {
	google?: typeof google;
	gm_authFailure?: () => void;
};

const globalScope = globalThis as typeof globalThis & GoogleGlobal;

export const hasGooglePlacesApiKey = (): boolean => {
	const key = String(process.env.REACT_APP_googleApiKey || '').trim();
	return Boolean(key) && !PLACEHOLDER_KEYS.has(key);
};

/** Build a Places-prediction-shaped object from free-typed text so downstream formatters keep working. */
export const buildManualPlace = (description: unknown): PlacePrediction | null => {
	const trimmed = String(description || '').trim();
	if (!trimmed) return null;
	return {
		description: trimmed,
		place_id: `manual:${trimmed}`,
		structured_formatting: {
			main_text: trimmed,
			secondary_text: '',
		},
		matched_substrings: [],
		terms: [],
		types: ['manual_entry'],
	};
};

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_googleApiKey || 'NO_KEY_GIVEN';

function loadScript(src: string, position: HTMLElement | null, id: string, { onLoad, onError }: { onLoad?: () => void; onError?: () => void } = {}): void {
	if (!position) return;
	const existing = document.getElementById(id);
	if (existing) return;
	const script = document.createElement('script');
	script.async = true;
	script.defer = true;
	script.id = id;
	script.src = src;
	script.onload = () => onLoad?.();
	script.onerror = () => {
		console.error('Google Maps script failed to load');
		onError?.();
	};
	position.appendChild(script);
}

const autocompleteService: { current: google.maps.places.AutocompleteService | null } = { current: null };

export default function GoogleMaps({ label, location, changeLocation, disabled, error, helperText: helperTextProp }: GoogleMapsProps) {
	const [inputValue, setInputValue] = useState(location?.description || '');
	const [options, setOptions] = useState<PlacePrediction[]>([]);
	const [scriptLoaded, setScriptLoaded] = useState(false);
	const [placesAvailable, setPlacesAvailable] = useState(() => hasGooglePlacesApiKey());

	const commitManualValue = useCallback(
		(raw: unknown) => {
			const next = buildManualPlace(raw);
			changeLocation(next);
			setInputValue(next?.description || '');
			setOptions(next ? [next] : []);
		},
		[changeLocation]
	);

	// Keep input in sync when parent location changes (e.g. loaded draft)
	useEffect(() => {
		const next = location?.description || '';
		setInputValue((current) => (current === next ? current : next));
	}, [location?.description]);

	// Effect 1: Load Places script only when a real key is present
	useEffect(() => {
		if (!hasGooglePlacesApiKey()) {
			setPlacesAvailable(false);
			return undefined;
		}

		const previousAuthFailure = globalScope.gm_authFailure;
		globalScope.gm_authFailure = () => {
			setPlacesAvailable(false);
			previousAuthFailure?.();
		};

		if (typeof globalThis !== 'undefined' && !document.querySelector('#google-maps')) {
			loadScript(
				`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`,
				document.querySelector('head'),
				'google-maps',
				{
					onLoad: () => setScriptLoaded(true),
					onError: () => setPlacesAvailable(false),
				}
			);
		} else if (globalScope.google?.maps?.places) {
			setScriptLoaded(true);
		}

		return () => {
			globalScope.gm_authFailure = previousAuthFailure;
		};
	}, []);

	// Effect 2: Fetch Places predictions when available
	useEffect(() => {
		if (!placesAvailable) return;
		const googleApi = globalScope.google;
		if (!googleApi?.maps?.places) return;

		if (!scriptLoaded) {
			setScriptLoaded(true);
			return;
		}

		try {
			if (!autocompleteService.current) {
				autocompleteService.current = new googleApi.maps.places.AutocompleteService();
			}
		} catch {
			setPlacesAvailable(false);
			return;
		}

		if (inputValue === '') {
			setOptions(location ? [location] : []);
			return;
		}

		if (location && inputValue === location.description) {
			setOptions([location]);
			return;
		}

		autocompleteService.current.getPlacePredictions({ input: inputValue }, (results, status) => {
			const ok = status === googleApi.maps.places.PlacesServiceStatus.OK;
			if (ok && results) {
				setOptions(results as unknown as PlacePrediction[]);
				return;
			}
			// Billing / key / quota failures should drop to manual entry, not leave a dead field.
			if (
				(status as string) === 'REQUEST_DENIED' ||
				(status as string) === 'OVER_QUERY_LIMIT' ||
				status === googleApi.maps.places.PlacesServiceStatus?.REQUEST_DENIED ||
				status === googleApi.maps.places.PlacesServiceStatus?.OVER_QUERY_LIMIT
			) {
				setPlacesAvailable(false);
			}
			setOptions([]);
		});
	}, [scriptLoaded, inputValue, location, placesAvailable]);

	const helperText =
		helperTextProp ||
		(placesAvailable
			? undefined
			: 'Google Places is not configured. Type your full mailing address, then press Enter or leave the field to save.');

	return (
		<Autocomplete
			id='google-autocomplete'
			fullWidth
			freeSolo
			sx={{ height: 'auto', my: 2 }}
			getOptionLabel={(option) => (typeof option === 'string' ? option : option?.description || '')}
			options={placesAvailable ? options : []}
			disabled={disabled}
			value={location || null}
			inputValue={inputValue}
			isOptionEqualToValue={(option, value) => {
				const left = typeof option === 'string' ? option : option?.description || '';
				const right = typeof value === 'string' ? value : (value as PlacePrediction | null)?.description || '';
				return left === right;
			}}
			onChange={(event, newValue) => {
				if (typeof newValue === 'string') {
					commitManualValue(newValue);
					return;
				}
				if (!newValue) {
					changeLocation(null);
					setInputValue('');
					setOptions([]);
					return;
				}
				setOptions([newValue, ...options.filter((opt) => opt?.description !== newValue.description)]);
				changeLocation(newValue);
				setInputValue(newValue.description || '');
			}}
			onInputChange={(event, newInputValue, reason) => {
				if (reason === 'input' || reason === 'clear') {
					setInputValue(newInputValue);
				}
			}}
			onBlur={() => {
				const trimmed = inputValue.trim();
				if (!trimmed) {
					if (location?.description) changeLocation(null);
					return;
				}
				if (trimmed !== (location?.description || '')) {
					commitManualValue(trimmed);
				}
			}}
			renderInput={(params) => (
				<TextField
					{...params}
					label={label}
					error={Boolean(error)}
					placeholder={placesAvailable ? 'Start typing address...' : 'Enter full mailing address'}
					helperText={helperText}
					onKeyDown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							const trimmed = inputValue.trim();
							if (trimmed) commitManualValue(trimmed);
						}
					}}
				/>
			)}
		/>
	);
}
