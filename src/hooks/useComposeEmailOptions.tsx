/**
 * EMAIL COMPOSER OPTIONS HOOK
 * ---------------------------------------------------------------------------
 * This hook calculates the available "From" addresses and "Signatures"
 * for the email composition form based on the user's permissions.
 *
 * * LOGIC:
 * 1. From Addresses: Derived from `member.permissions.emails.aliases`.
 * If user has { admin: true }, they get 'admin@domain.com'.
 * 2. Signatures: Combines the user's personal signature with global signatures
 * found in the Site Config (keys starting with 'SIGNATURE_').
 * Global signatures are only hidden if the user lacks access to that alias.
 */

import { useMemo } from 'react';
import { brand } from '../config/Constants';
import type { Member } from '../types/domain';
import type { ConfigContextValue } from '../context/ConfigContext';

const DOMAIN = brand.emailDomain;

interface SelectOption {
	label: string;
	value: string;
}

interface ComposeEmailOptionsParams {
	member: (Member & { alias?: string; personalSignature?: string }) | null | undefined;
	config: ConfigContextValue | null | undefined;
	fromAddress?: string;
}

interface ComposeEmailOptionsResult {
	fromOptions: SelectOption[];
	signatureOptions: SelectOption[];
	defaultFrom: string;
	permittedAliases: string[];
}

export const useComposeEmailOptions = ({ member, config, fromAddress }: ComposeEmailOptionsParams): ComposeEmailOptionsResult => {
	// --- 1. Calculate Permitted Aliases ---
	// Returns a list of strings: ['admin', 'info', 'john.doe']
	const permittedAliases = useMemo(() => {
		const aliases: string[] = [];

		// Check explicit permission grants (e.g. Committee roles)
		if (member?.permissions?.emails?.aliases) {
			for (const [alias, hasAccess] of Object.entries(member.permissions.emails.aliases)) {
				if (hasAccess) aliases.push(alias);
			}
		}

		// Always include their personal alias if assigned
		if (member?.alias) {
			const personalAlias = member.alias.split('@')[0].toLowerCase();
			if (!aliases.includes(personalAlias)) {
				aliases.push(personalAlias);
			}
		}
		return aliases;
	}, [member]);

	// --- 2. Generate "From" Dropdown Options ---
	const fromOptions = useMemo<SelectOption[]>(() => {
		return permittedAliases.map((alias) => ({
			label: `${alias}@${DOMAIN}`,
			value: `${alias}@${DOMAIN}`,
		}));
	}, [permittedAliases]);

	// --- 3. Generate "Signature" Dropdown Options ---
	const signatureOptions = useMemo<SelectOption[]>(() => {
		const sigOpts: SelectOption[] = [{ label: 'None', value: 'none' }];

		// A. Personal Signature (from Member Profile)
		if (member?.personalSignature) {
			sigOpts.push({ label: 'Personal Signature', value: member.personalSignature });
		}

		// B. Role-Based Signatures (from Global Config)
		// Looks for config keys like "SIGNATURE_ADMIN" or "SIGNATURE_SCHOLARSHIP"
		if (config) {
			for (const key in config) {
				if (key.startsWith('SIGNATURE_')) {
					const aliasName = key.replace('SIGNATURE_', '').toLowerCase();

					// Only show this signature if the user is allowed to send as this alias
					if (permittedAliases.includes(aliasName)) {
						// Format Label: "admin" -> "Admin Signature"
						const label = aliasName.charAt(0).toUpperCase() + aliasName.slice(1) + ' Signature';
						sigOpts.push({ label: label, value: String(config[key]) });
					}
				}
			}
		}
		return sigOpts;
	}, [member, config, permittedAliases]);

	// --- 4. Determine Default "From" Address ---
	const defaultFrom = useMemo(() => {
		return fromAddress || member?.alias || (permittedAliases.length > 0 ? `${permittedAliases[0]}@${DOMAIN}` : '');
	}, [fromAddress, member, permittedAliases]);

	return {
		fromOptions,
		signatureOptions,
		defaultFrom,
		permittedAliases,
	};
};