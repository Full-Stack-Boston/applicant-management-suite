import type { templateApp, blankApplicant } from '../../config/data/Validation';

export type TemplateApplication = typeof templateApp;
export type TemplateApplicant = typeof blankApplicant;

export interface AttachmentMeta {
	refLoc?: string;
	displayName?: string;
}

export interface AttachmentPreview {
	displayName: string;
	pages: string[];
}

export interface AwardRecord {
	awardID?: string;
	type?: string;
	awardAmount?: string | number;
	deadline?: string;
}

export interface FamilyMemberRow {
	fullName?: string;
	occupation?: string;
	age?: string | number;
	relation?: string;
}

export interface ExpenseLineItem {
	title?: string;
	amount?: string | number;
}

export interface ExperiencePositionRow {
	type?: string;
	organization?: string;
	location?: string;
	role?: string;
}

export interface PDFPreviewProps {
	displayName: string;
	pages: string[];
}
