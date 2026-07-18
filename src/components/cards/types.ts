import type { DocumentData } from 'firebase/firestore';
import type { DetailGridItem, DynamicAction } from '../assets/types';
import type { RawEmail } from '../../hooks/useEmailActions';

export interface ApplicantRecord extends DocumentData {
	id?: string;
	firstName?: string;
	lastName?: string;
	callMe?: string;
	picture?: { home?: string };
	school?: string;
	gradYear?: string | number;
	major?: string;
	organization?: string;
	email?: string;
	cell?: string;
}

export interface MemberRecord extends DocumentData {
	id?: string;
	firstName?: string;
	lastName?: string;
	displayName?: string;
	callMe?: string;
	picture?: { home?: string };
	email?: string;
	alias?: string;
	cell?: string;
	position?: string;
	since?: string;
	personalSignature?: string;
	permissions?: Record<string, unknown>;
}

export interface ApplicationCardProps {
	application: DocumentData & {
		id: string;
		completedBy?: string;
		type?: string;
		status?: string;
		family?: string;
		education?: string;
		experience?: string;
		incomes?: string;
		expenses?: string;
		projections?: string;
		contributions?: string;
		attachments?: string;
		awards?: string[];
		lastUpdated?: unknown;
		submittedOn?: unknown;
	};
}

// Type alias (not interface) so it picks up an implicit index signature and stays
// assignable to the index-signature-based email types in hooks/messaging components.
export type EmailRecord = {
	id: string;
	isRead?: boolean;
	content?: string;
	headerContent?: RawEmail['headerContent'];
	folderId?: string;
	folderName?: string;
	attachments?: Array<{ attachmentId: string; attachmentName: string }>;
	inlineAttachments?: unknown[];
	tags?: string[];
	subject?: string;
};

export interface FamilyMember {
	relation?: string;
	fullName?: string;
	age?: string | number;
	occupation?: string;
}

export interface ExperiencePosition {
	type?: string;
	organization?: string;
	location?: unknown;
	role?: string;
}

export type { DetailGridItem, DynamicAction };
