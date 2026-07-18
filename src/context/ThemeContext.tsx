/**
 * THEME CONTEXT & STATE MANAGER
 * ---------------------------------------------------------------------------
 * This context controls the visual theme (Light/Dark Mode & Primary Color).
 *
 * * PERSISTENCE STRATEGY (DUAL-SYNC):
 * 1. LocalStorage: Checked first for immediate rendering (prevents UI flicker).
 * 2. Firestore: Checked second. Persists user preferences across devices.
 * 3. System Prefs: Fallback if no user preference exists.
 *
 * * ARCHITECTURE:
 * - ThemeProvider: Wraps MUI's ThemeProvider.
 * - ThemeReducer: Handles state transitions and LocalStorage writes.
 * - dispatchWithSave: Middleware that also triggers Firestore updates.
 */

import { createContext, useReducer, useEffect, useMemo, useContext, useCallback, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Config & Backend
import muiTheme from '../config/ui/theme';
import { normalizeAccentColorKey } from '../config/ui/accentColors';
import { useAuth } from './AuthContext';
import { updateUserPreferences } from '../config/data/firebase';
import { collections } from '../config/data/collections';

interface ThemeState {
	darkMode: boolean;
	primaryColor: string;
}

type ThemeAction =
	| { type: 'LIGHT' }
	| { type: 'DARK' }
	| { type: 'TOGGLE' }
	| { type: 'SET_COLOR'; payload: string }
	| { type: 'LOAD_PREFERENCES'; payload: { darkMode?: boolean; primaryColor?: string } };

export interface ThemeContextValue {
	darkMode: boolean;
	primaryColor: string;
	dispatch: (action: ThemeAction) => void;
	boxShadow: string;
}

// --- 1. Initialization Helper ---
// Reads from LocalStorage or falls back to OS System Preference
const getInitialState = (): ThemeState => {
	const savedPrefs = localStorage.getItem('pf_theme_prefs');
	if (savedPrefs) {
		const parsed = JSON.parse(savedPrefs) as ThemeState;
		return {
			...parsed,
			primaryColor: normalizeAccentColorKey(parsed.primaryColor),
		};
	}
	// Fallback: Check if the user's OS is in Dark Mode
	return {
		darkMode: globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false,
		primaryColor: 'green',
	};
};

// --- 2. State Reducer ---
// Handles local state updates and LocalStorage synchronization
const ThemeReducer = (state: ThemeState, action: ThemeAction): ThemeState => {
	const newState = { ...state };
	let hasChanges = false;

	switch (action.type) {
		case 'LIGHT':
			newState.darkMode = false;
			hasChanges = true;
			break;
		case 'DARK':
			newState.darkMode = true;
			hasChanges = true;
			break;
		case 'TOGGLE':
			newState.darkMode = !state.darkMode;
			hasChanges = true;
			break;
		case 'SET_COLOR':
			newState.primaryColor = normalizeAccentColorKey(action.payload);
			hasChanges = true;
			break;
		case 'LOAD_PREFERENCES':
			// Overwrite local state with data fetched from Firestore
			newState.darkMode = action.payload.darkMode ?? state.darkMode;
			newState.primaryColor = normalizeAccentColorKey(action.payload.primaryColor ?? state.primaryColor);
			hasChanges = true;
			break;
		default:
			return state;
	}

	// Persist to LocalStorage immediately
	if (hasChanges) {
		localStorage.setItem('pf_theme_prefs', JSON.stringify(newState));
	}

	return newState;
};

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
	const [state, dispatch] = useReducer(ThemeReducer, undefined, getInitialState);
	const { member, applicant, user } = useAuth();

	// Identify which collection to update (Member or Applicant)
	const currentUserProfile = member || applicant;
	let currentCollection: string | null = null;
	if (member) {
		currentCollection = collections.members;
	} else if (applicant) {
		currentCollection = collections.applicants;
	}

	// --- Effect 1: Sync FROM Database ---
	// If the user logs in and has cloud preferences, load them (overwriting local).
	useEffect(() => {
		const preferences = currentUserProfile?.preferences as { darkMode?: boolean; primaryColor?: string } | undefined;
		if (preferences) {
			dispatch({
				type: 'LOAD_PREFERENCES',
				payload: {
					darkMode: preferences.darkMode,
					primaryColor: preferences.primaryColor,
				},
			});
		}
	}, [currentUserProfile]);

	// --- Effect 2: Sync FROM System ---
	// If the user has NO preferences saved, follow their OS changes live.
	useEffect(() => {
		if (!globalThis.matchMedia) return;
		const mediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)');
		const hasLocalSave = localStorage.getItem('pf_theme_prefs');

		const handleChange = (e: MediaQueryListEvent) => {
			const preferences = currentUserProfile?.preferences as { darkMode?: boolean } | undefined;
			// Only auto-switch if we don't have a saved preference/override
			if (!preferences?.darkMode && !hasLocalSave) {
				dispatch({ type: e.matches ? 'DARK' : 'LIGHT' });
			}
		};

		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	}, [currentUserProfile]);

	// --- Action Wrapper: Sync TO Database ---
	// Wraps the reducer dispatch to push changes to Firestore
	const dispatchWithSave = useCallback(
		(action: ThemeAction) => {
			// 1. Update Local State (Immediate UI change)
			dispatch(action);

			// 2. Prepare Firestore Update (Background)
			const updates: { darkMode?: boolean; primaryColor?: string } = {};

			// We calculate the *expected* next state here because 'state' inside
			// this callback is the *current* (pre-update) state.
			if (action.type === 'TOGGLE') updates.darkMode = !state.darkMode;
			if (action.type === 'LIGHT') updates.darkMode = false;
			if (action.type === 'DARK') updates.darkMode = true;
			if (action.type === 'SET_COLOR') updates.primaryColor = action.payload;

			if (Object.keys(updates).length > 0 && user && currentCollection) {
				updateUserPreferences(user.uid, currentCollection, updates);
			}
		},
		[currentCollection, state.darkMode, user]
	);

	// Re-generate the MUI Theme object whenever settings change
	const theme = useMemo(() => muiTheme(state.darkMode, state.primaryColor), [state.darkMode, state.primaryColor]);

	// AMS stores a custom `boxShadow` token on the palette (see config/ui/theme.ts),
	// which is not part of MUI's Palette type.
	const paletteBoxShadow = (theme.palette as unknown as { boxShadow?: string }).boxShadow ?? '';

	const value = useMemo<ThemeContextValue>(
		() => ({
			darkMode: state.darkMode,
			primaryColor: state.primaryColor,
			dispatch: dispatchWithSave,
			boxShadow: paletteBoxShadow,
		}),
		[state.darkMode, state.primaryColor, paletteBoxShadow, dispatchWithSave]
	);

	return (
		<ThemeContext.Provider value={value}>
			<MuiThemeProvider theme={theme}>
				<CssBaseline />
				{children}
			</MuiThemeProvider>
		</ThemeContext.Provider>
	);
};

export const useTheme = (): ThemeContextValue => {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
};
