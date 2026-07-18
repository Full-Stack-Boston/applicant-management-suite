import React from 'react';
import he from 'he';
import type { FamilyMemberInput } from '../../types/forms';

/** Experience entry shape used by admin search (legacy records use organization/location/role). */
export interface ExperienceEntry {
	organization?: string;
	location?: string;
	role?: string;
	[key: string]: unknown;
}

/**
 * Highlights search terms within a string.
 */
export const highlightMatch = (text: unknown, searchTerm: string): React.ReactNode => {
    if (!text || !searchTerm) return text as React.ReactNode;
    const strText = String(text);
    const escapedSearchTerm = searchTerm.replace(/[-^$*+?.()|[\]{}/]/g, String.raw`\$&`);
    const regex = new RegExp('(' + escapedSearchTerm + ')', 'gi');
    const parts = strText.split(regex);
    return <span>{parts.map((part) => (regex.test(part) ? <strong key={part}>{part}</strong> : part))}</span>;
};

export const sanitizeEmailString = (str: string | null | undefined): string => {
    if (!str) return '';
    return he.decode(str).replace(/[<>"]/g, ' ').trim();
};

export const findRelevantFamilyMember = (familyMembers: FamilyMemberInput[] | null | undefined, term: string | null | undefined): FamilyMemberInput | null => {
    const defaultMember = familyMembers?.[0] || null;
    if (!term || !Array.isArray(familyMembers)) return defaultMember;

    const termLower = term.toLowerCase();
    const matchedMember = familyMembers.find((member) => 
        member?.fullName?.toLowerCase().includes(termLower) || 
        member?.occupation?.toLowerCase().includes(termLower)
    );
    return matchedMember || defaultMember;
};

export const findRelevantExperience = (positions: ExperienceEntry[] | null | undefined, term: string | null | undefined): ExperienceEntry | null => {
    const defaultExp = positions?.[0] || null;
    if (!term || !Array.isArray(positions)) return defaultExp;

    const termLower = term.toLowerCase();
    const matched = positions.find((pos) => 
        pos?.organization?.toLowerCase().includes(termLower) || 
        pos?.location?.toLowerCase().includes(termLower) || 
        pos?.role?.toLowerCase().includes(termLower)
    );
    return matched || defaultExp;
};