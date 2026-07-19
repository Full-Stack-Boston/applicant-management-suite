/**
 * GLOBAL CONFIGURATION CONTEXT
 * ---------------------------------------------------------------------------
 * This context provides real-time access to the 'siteConfiguration' document.
 * * * RESPONSIBILITIES:
 * 1. Fetch global settings (Deadlines, Maintenance Mode, Colors, Current Year).
 * 2. Block application rendering until settings are loaded (prevents UI flickering).
 * 3. Expose these settings via the 'useConfig()' hook.
 *
 * * USAGE:
 * const config = useConfig();
 * if (config.MAINTENANCE_MODE) return <MaintenancePage />;
 */

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';

// Backend
import { getRealTimeConfigFromDb } from '../config/data/firebase';
import { normalizeSiteConfigDates, toJsDate } from '../config/data/dateValue';
import type { SiteConfig } from '../types/firebase';

// Components
import Loader from '../components/loader/Loader';

export type ConfigContextValue = SiteConfig;

export const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
	const [config, setConfig] = useState<ConfigContextValue>({});

	// We start with an empty object, effectively blocking the UI
	// until the first successful fetch from Firestore.

	useEffect(() => {
		// Subscribe to real-time updates for the Site Config
		const unsubscribe = getRealTimeConfigFromDb((data) => {
			try {
				const raw: ConfigContextValue = normalizeSiteConfigDates({ ...(data || {}) }) as ConfigContextValue;
				if (
					raw.APPLICATION_DEADLINE &&
					(raw.CYCLE_YEAR === undefined || raw.CYCLE_YEAR === null || raw.CYCLE_YEAR === '')
				) {
					const deadline = toJsDate(raw.APPLICATION_DEADLINE);
					if (deadline) raw.CYCLE_YEAR = deadline.getFullYear();
				}
				setConfig(raw);
			} catch (error) {
				console.error('Error setting config:', error);
			}
		});

		return () => {
			unsubscribe();
		};
	}, []);

	const value = useMemo<ConfigContextValue>(() => config, [config]);

	// --- Blocking Loader ---
	// Critical: Do not render the app until we know the configuration.
	// This prevents users from accessing features that might be disabled
	// (e.g. submitting an app after the deadline).
	if (!Object.keys(config).length) {
		return <Loader />;
	}

	return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};

/**
 * Hook to access Global Configuration.
 * Usage: const { APPLICATION_DEADLINE } = useConfig();
 */
export const useConfig = (): ConfigContextValue => {
	const context = useContext(ConfigContext);
	if (context === undefined) {
		throw new Error('useConfig must be used within a ConfigProvider');
	}
	return context;
};
