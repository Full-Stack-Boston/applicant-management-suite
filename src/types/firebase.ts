import type { CollectionId } from '../config/data/collections';
import type { Applicant, Application, Member } from './domain';

export type FirestoreUnsubscribe = () => void;
export type RealtimeCallback<T = unknown> = (data: T) => void;
export type CollectionName = CollectionId | string;

export type FirestoreDoc<T extends Record<string, unknown> = Record<string, unknown>> = T & {
	id: string;
};

export type SiteConfig = Record<string, unknown>;

export interface PurgeUserRecordsParams {
	userId: string;
	expel?: boolean;
}

export type ApplicantData = Applicant | Record<string, unknown> | null;
export type MemberData = Member | Record<string, unknown> | null;
export type ApplicationData = Application | Record<string, unknown> | null;

export type InterviewRecord = FirestoreDoc<{
	applicantId?: string;
	applicantName?: string;
	displayName?: string;
	applicationId?: string;
	window?: string;
	deadline?: string;
	startTime?: unknown;
	endTime?: unknown;
	title?: string;
	description?: string;
	[key: string]: unknown;
}>;

export type MeetingRecord = FirestoreDoc<{
	applicantId?: string;
	displayName?: string;
	deliberation?: boolean;
	[key: string]: unknown;
}>;
