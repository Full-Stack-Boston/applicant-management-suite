/**
 * SIDEBAR NAVIGATION CONTEXT
 * ---------------------------------------------------------------------------
 * This context manages the visual state (Collapsed vs. Expanded) of the
 * Admin Dashboard Sidebar.
 *
 * * PERSISTENCE STRATEGY (DUAL-SYNC):
 * 1. LocalStorage: Used for immediate initialization to prevent UI flicker
 * on page reload.
 * 2. Firestore: Used for long-term persistence across devices.
 *
 * * USAGE:
 * const { collapsed, setCollapsed } = useSidebar();
 * <Sidebar collapsed={collapsed} />
 */

import { createContext, useContext, useState, useMemo, useEffect, useCallback, type ReactNode } from 'react';

// Context & Backend
import { useAuth } from './AuthContext';
import { updateUserPreferences } from '../config/data/firebase';
import { collections } from '../config/data/collections';

export interface SidebarContextValue {
	collapsed: boolean;
	setCollapsed: (newState?: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
	// --- 1. Initialization (Local Storage) ---
	// Initialize state from local storage immediately to ensure the UI
	// renders correctly on the first paint (avoids "Layout Shift").
	const [collapsed, setCollapsed] = useState<boolean>(() => {
		const savedState = localStorage.getItem('pf_sidebar_collapsed');
		return savedState === 'true'; // Converts string 'true' to boolean true
	});

	const { member, user } = useAuth();

	// --- 2. Background Sync (From Database) ---
	// If the user's profile loads and has a preference saved, update our local state.
	// This handles the case where a user changes settings on a different device.
	useEffect(() => {
		const preferences = member?.preferences as { sidebarCollapsed?: boolean } | undefined;
		if (preferences?.sidebarCollapsed !== undefined) {
			const remoteState = Boolean(preferences.sidebarCollapsed);

			// Only update if different to avoid unnecessary re-renders
			if (remoteState !== collapsed) {
				setCollapsed(remoteState);
				localStorage.setItem('pf_sidebar_collapsed', String(remoteState));
			}
		}
	}, [member, collapsed]);

	// --- 3. Toggle Action ---
	const toggleSidebar = useCallback(
		(newState?: boolean) => {
			// Allow passing a specific boolean or just toggling current state
			const valueToSet = typeof newState === 'boolean' ? newState : !collapsed;

			setCollapsed(valueToSet);

			// A. Save to Local Storage immediately (Fast)
			localStorage.setItem('pf_sidebar_collapsed', String(valueToSet));

			// B. Save to Firestore in background (Persistent)
			if (member && user) {
				updateUserPreferences(user.uid, collections.members, { sidebarCollapsed: valueToSet });
			}
		},
		[collapsed, user, member]
	);

	const value = useMemo<SidebarContextValue>(
		() => ({
			collapsed,
			setCollapsed: toggleSidebar,
		}),
		[collapsed, toggleSidebar]
	);

	return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};

/**
 * Hook to control the Sidebar state.
 */
export const useSidebar = (): SidebarContextValue => {
	const context = useContext(SidebarContext);
	if (context === undefined) {
		throw new Error('useSidebar must be used within a SidebarProvider');
	}
	return context;
};