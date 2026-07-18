/**
 * REAL-TIME LIST DATA HOOK
 * ---------------------------------------------------------------------------
 * This hook powers the Admin Tables. It subscribes to a Firestore collection
 * and performs client-side "joins" to enrich the data.
 *
 * * ARCHITECTURE:
 * 1. Subscription: Connects to a real-time stream using the 'fetcher' defined in 'lists.js'.
 * 2. Enrichment: Detects if the data needs extra info (e.g., looking up a Name from a Profile ID).
 * 3. Caching: Uses a Map() to store fetched profiles so we don't re-fetch the same person twice.
 * 4. Stability: Implements a "Keep Previous Data" pattern to prevent UI flickering during updates.
 *
 * * USAGE:
 * const { data, loading } = useRealTimeList('applications');
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import type { DocumentData } from 'firebase/firestore';

// Config & Data
import { collections } from '../config/data/collections';
import { getCollectionData } from '../config/data/firebase';
import { adminLists } from '../config/admin';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';

export interface ListRecord {
	id: string;
	profile?: string;
	completedBy?: string;
	applicantName?: string;
	[key: string]: unknown;
}

interface ProfileData {
	applicantFirstName?: string;
	applicantLastName?: string;
	[key: string]: unknown;
}

type ProfileEntry = ProfileData | 'loading' | 'not_found';

type ListConfigEntry = (typeof adminLists)[string];

interface UseRealTimeListResult {
	data: ListRecord[];
	loading: boolean;
	window: Window | undefined;
	year: string | undefined;
}

const listConfig: Record<string, ListConfigEntry | undefined> = adminLists;

/**
 * @param type - The key matching an entry in 'adminLists' (e.g., 'applications').
 * @param enabled - If false, pauses fetching.
 */
export const useRealTimeList = (type: string, enabled = true): UseRealTimeListResult => {
	// --- State ---
	const [rawApplications, setRawApplications] = useState<ListRecord[]>([]); // Raw data from main collection
	const [profiles, setProfiles] = useState<Map<string, ProfileEntry>>(new Map()); // Cache of related profile docs
	const [loading, setLoading] = useState(true);

	// Persist data during re-fetches to prevent "flash of empty table"
	const previousDataRef = useRef<ListRecord[]>([]);

	// --- Contexts ---
	const { user, member } = useAuth();
	const { year } = useParams<{ year?: string }>(); // URL Param (e.g., /admin/applications/2023)
	const config = useConfig();

	// Cycle year scope (URL :year, else site CYCLE_YEAR, else deadline year)
	const cycleYear = useMemo(() => {
		if (year) {
			const parsedYear = Number(year);
			return Number.isFinite(parsedYear) ? parsedYear : undefined;
		}
		const cy = config.CYCLE_YEAR;
		if (typeof cy === 'number' && Number.isFinite(cy)) return cy;
		const deadline = config.APPLICATION_DEADLINE as string | undefined;
		return deadline ? new Date(deadline).getFullYear() : undefined;
	}, [config, year]);

	// --- Effect 1: Primary Subscription ---
	useEffect(() => {
		if (!enabled) {
			setLoading(false);
			setRawApplications([]);
			return;
		}

		const currentConfig = listConfig[type];
		if (!currentConfig) {
			setLoading(false);
			return;
		}
		setLoading(true);

		const handler = (rawData: DocumentData[] | null | undefined) => {
			setRawApplications((rawData as ListRecord[]) || []);
			setLoading(false);
		};

		let unsubscribe: (() => void) | undefined;
		// Special Case: Interviews are user-specific
		if (type === 'interviews' && user && currentConfig.fetcher) {
			unsubscribe = currentConfig.fetcher(handler, user.uid, !!member) as (() => void) | undefined;
		}
		// Standard Case: Fetch based on window/deadline
		else if (typeof currentConfig.fetcher === 'function') {
			const scopeOptionalTypes = new Set(['archives', 'inbox', 'legacyFinances', 'Member', 'Applicant']);
			if (Number.isFinite(cycleYear) || scopeOptionalTypes.has(type)) {
				unsubscribe = currentConfig.fetcher(handler, cycleYear, type) as (() => void) | undefined;
			} else {
				console.error(`useRealTimeList: Missing cycleYear for type "${type}"`);
				setLoading(false);
			}
		} else {
			console.error(`useRealTimeList: No fetcher function found for type "${type}"`);
			setLoading(false);
		}

		return () => {
			if (typeof unsubscribe === 'function') unsubscribe();
		};
	}, [type, cycleYear, year, member, user, enabled]);

	// --- Effect 2: Data Enrichment (The Join) ---
	useEffect(() => {
		const currentConfig = listConfig[type];
		// Only run if enrichment is enabled in config and we have raw data
		if (!enabled || !currentConfig?.enrich) {
			return;
		}

		const controller = new AbortController();
		const signal = controller.signal;

		const fetchMissingProfiles = async () => {
			const newProfilesMap = new Map(profiles);
			const profilesToFetch: { profileId: string; completedBy: string | undefined }[] = [];

			// Scan raw data for missing profiles
			for (const app of rawApplications) {
				if (app.profile && !newProfilesMap.has(app.profile)) {
					// Mark as loading immediately to prevent duplicate fetches
					newProfilesMap.set(app.profile, 'loading');
					profilesToFetch.push({ profileId: app.profile, completedBy: app.completedBy });
				}
			}

			if (profilesToFetch.length === 0) {
				return;
			}

			// Parallel Fetch
			const promises = profilesToFetch.map(async ({ profileId, completedBy }): Promise<{ id: string; data: ProfileEntry }> => {
				try {
					const profileData = await getCollectionData(completedBy ?? '', collections.profiles, profileId);
					return { id: profileId, data: (profileData as ProfileData | null) || 'not_found' };
				} catch (error) {
					console.error(`Failed to fetch profile ${profileId}`, error);
					return { id: profileId, data: 'not_found' };
				}
			});

			const results = await Promise.all(promises);

			if (!signal.aborted) {
				const updatedProfilesMap = new Map(profiles);
				for (const { id, data } of results) {
					updatedProfilesMap.set(id, data);
				}
				setProfiles(updatedProfilesMap);
			}
		};

		fetchMissingProfiles();

		return () => {
			controller.abort();
		};
	}, [rawApplications, type, profiles, enabled]);

	// --- 3. Compute Final Table Data ---
	const dataForTable = useMemo(() => {
		if (!enabled) return [] as ListRecord[];

		const currentConfig = listConfig[type];
		if (!currentConfig?.enrich) return rawApplications;

		return rawApplications.map((app) => {
			if (!app.profile) return { ...app, applicantName: 'Unknown Applicant' };

			const profile = profiles.get(app.profile);

			// If still loading or missing, return raw app (will update later)
			if (!profile || profile === 'not_found' || profile === 'loading') {
				return app;
			}

			// Join successful: Add name to the row
			return { ...app, applicantName: `${profile.applicantFirstName} ${profile.applicantLastName}` };
		});
	}, [rawApplications, profiles, type, enabled]);

	// --- 4. Loading State & Stabilization ---
	const currentConfig = listConfig[type];

	// We are "still enriching" if we have rows but haven't fetched their names yet
	const isStillEnriching = Boolean(enabled && currentConfig?.enrich && dataForTable.some((app) => app.profile && !app.applicantName));

	// True Loading = Initial fetch OR (Enriching AND No previous data to show)
	const isInitialLoading = (enabled && loading) || (isStillEnriching && previousDataRef.current.length === 0);

	let finalData: ListRecord[];
	if (isStillEnriching) {
		// Show stale data while enriching to prevent flicker
		finalData = previousDataRef.current;
	} else {
		finalData = dataForTable;
		previousDataRef.current = dataForTable;
	}

	if (!enabled) {
		return { data: [], loading: false, window: undefined, year: undefined };
	}

	return { data: finalData, loading: isInitialLoading, window, year };
};
