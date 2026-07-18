import React from 'react';
import type { ReactNode } from 'react';
import { PersonOutlined, DescriptionOutlined, HelpOutlined, MailOutlined, AttachFileOutlined } from '@mui/icons-material';

import { generatePath } from '../navigation/routeUtils';
import { paths } from '../navigation/paths';
import { capitalize } from '../Constants';
import { highlightMatch, sanitizeEmailString, findRelevantFamilyMember, findRelevantExperience } from './utils';
import type { ExperienceEntry } from './utils';
import type { FamilyMemberInput } from '../../types/forms';

interface SearchResultText {
	primary: ReactNode;
	secondary: ReactNode;
}

interface SearchCategoryConfig {
	icon: ReactNode;
	title: string;
	getPath: (item: Record<string, unknown>) => string | null;
	getText: (item: Record<string, unknown>, term: string) => SearchResultText;
}

export const searchConfig: Record<string, SearchCategoryConfig> = {
	members: {
		icon: <PersonOutlined fontSize='small' />,
		title: 'Administrators',
		getPath: (item) => generatePath(paths.viewMember, { id: item.id as string }),
		getText: (item, term) => ({
			primary: highlightMatch(`${item.firstName} ${item.lastName}`, term),
			secondary: highlightMatch(`${item.position} | ${item.since}`, term),
		}),
	},
	applicants: {
		icon: <PersonOutlined fontSize='small' />,
		title: 'Applicants',
		getPath: (item) => generatePath(paths.viewApplicant, { id: item.id as string }),
		getText: (item, term) => ({
			primary: highlightMatch(`${item.firstName} ${item.lastName}`, term),
			secondary: highlightMatch(`${item.email} | ${item.cell}`, term),
		}),
	},
	profiles: {
		icon: <PersonOutlined fontSize='small' />,
		title: 'Applicant Profiles',
		getPath: (item) => generatePath(paths.viewApplicant, { id: item.id as string }),
		getText: (item, term) => {
			const mailingAddress = item.applicantMailingAddress as { structured_formatting?: { secondary_text?: string; main_text?: string }; description?: string } | undefined;
			return {
				primary: highlightMatch(`${item.applicantFirstName} ${item.applicantLastName}`, term),
				secondary: highlightMatch(
					mailingAddress?.structured_formatting?.secondary_text ||
						mailingAddress?.structured_formatting?.main_text ||
						mailingAddress?.description ||
						'',
					term
				),
			};
		},
	},
	applications: {
		icon: <DescriptionOutlined fontSize='small' />,
		title: 'Applications',
		getPath: (item) => generatePath(paths.viewApp, { id: item.id as string }),
		getText: (item, term) => ({
			primary: highlightMatch(`${(item.status as string) || 'N/A'} ${(item.type as string) || 'App'}`, term),
			secondary: highlightMatch(new Date(item.window as string).getFullYear(), term),
		}),
	},
	requests: {
		icon: <HelpOutlined fontSize='small' />,
		title: 'Reference Requests',
		getPath: (item) => (item.applicationID ? generatePath(paths.viewApp, { id: item.applicationID as string }) : null),
		getText: (item, term) => ({
			primary: highlightMatch(`${capitalize(item.attachmentType as string)} for ${item.fromName}`, term),
			secondary: highlightMatch(`${item.name} <${item.email}>`, term),
		}),
	},
	mail: {
		icon: <MailOutlined fontSize='small' />,
		title: 'Mail',
		getPath: (item) => (item.id ? generatePath(paths.viewEmail, { id: item.id as string }) : null),
		getText: (item, term) => ({
			primary: highlightMatch((item.subject as string) || '(No Subject)', term),
			secondary: highlightMatch(`In: ${capitalize(item.folderName as string)} | From: ${sanitizeEmailString(item.sender as string) || 'Unknown'} | To: ${sanitizeEmailString(item.to as string) || 'Unknown'}`, term),
		}),
	},
	attachments: {
		icon: <AttachFileOutlined fontSize='small' />,
		title: 'Attachments',
		getPath: (item) => {
			if (!item.completedBy || typeof item.completedBy !== 'string') {
				return null;
			}
			return generatePath(paths.viewApplicant, { id: item.completedBy });
		},
		getText: (item, term) => {
			let relevantDisplayName = 'Attachment Record';
			const utilityKeys = new Set(['attachmentsID', 'completedBy', 'id', 'searchableTerms']);

			for (const key in item) {
				if (utilityKeys.has(key) || typeof item[key] !== 'object' || item[key] === null) {
					continue;
				}
				const attachmentData = item[key] as { displayName?: string };
				if (attachmentData?.displayName) {
					if (term && attachmentData.displayName.toLowerCase().includes(term.toLowerCase())) {
						relevantDisplayName = attachmentData.displayName;
						break;
					}
				}
			}
			return {
				primary: highlightMatch(relevantDisplayName, term),
				secondary: `Applicant: ${(item.completedBy as string) || 'Unknown'}`,
			};
		},
	},
	education: {
		icon: <DescriptionOutlined fontSize='small' />,
		title: 'Education Records',
		getPath: (item) => (item.completedBy ? generatePath(paths.viewApplicant, { id: item.completedBy as string }) : null),
		getText: (item, term) => ({
			primary: highlightMatch((item.schoolName as string) || 'Unknown School', term),
			secondary: `Major: ${highlightMatch((item.major as string) || 'N/A', term)} | Grad Year: ${(item.searchableTerms as string[])?.find((t) => /^\d{4}$/.test(t)) || 'N/A'}`,
		}),
	},
	families: {
		icon: <DescriptionOutlined fontSize='small' />,
		title: 'Family Records',
		getPath: (item) => (item.completedBy ? generatePath(paths.viewApplicant, { id: item.completedBy as string }) : null),
		getText: (item, term) => {
			const relevantMember = findRelevantFamilyMember(item.familyMembers as FamilyMemberInput[], term);
			return {
				primary: highlightMatch(relevantMember?.fullName || 'Family Record', term),
				secondary: highlightMatch(relevantMember?.occupation || `Record ID: ${item.id}`, term),
			};
		},
	},
	experience: {
		icon: <DescriptionOutlined fontSize='small' />,
		title: 'Experience Records',
		getPath: (item) => (item.completedBy ? generatePath(paths.viewApplicant, { id: item.completedBy as string }) : null),
		getText: (item, term) => {
			const relevantExp = findRelevantExperience(item.positions as ExperienceEntry[], term);
			return {
				primary: highlightMatch(relevantExp?.organization || 'Experience Record', term),
				secondary: relevantExp ? `${highlightMatch(relevantExp.role, term)} | ${highlightMatch(relevantExp.location, term)}` : `Record ID: ${item.id}`,
			};
		},
	},
};
