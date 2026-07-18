import type { DocumentData } from 'firebase/firestore';
import type { ReactNode } from 'react';

export interface ApplicationDataBundle {
	app: DocumentData | null;
	profile: DocumentData | null;
	family: DocumentData | null;
	education: DocumentData | null;
	experience: DocumentData | null;
	expenses: DocumentData | null;
	incomes: DocumentData | null;
	contributions: DocumentData | null;
	projections: DocumentData | null;
	attachments: DocumentData | null;
	awards: DocumentData[];
}

export interface DetailSectionProps {
	title: string;
	children: ReactNode;
}

export interface SimpleApplicantRow {
	id: string;
	name?: string;
	email?: string;
	cell?: string;
	accountCreated?: { seconds: number };
}
