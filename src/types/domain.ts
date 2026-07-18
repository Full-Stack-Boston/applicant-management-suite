import type { ApplicationStatusValue, ApplicationTypeValue } from '../config/data/collections';

/** Applicant profile stored in Firestore (`applicants` collection). */
export interface Applicant {
	id: string;
	firstName: string;
	lastName: string;
	callMe: string;
	picture: Record<string, unknown>;
	school: string;
	major: string;
	gradYear: string | number;
	organization: string;
	applications: string[];
	email: string;
	cell: string;
	auth: string;
	accountCreated?: { seconds: number } | Date | string;
	[key: string]: unknown;
}

/** Committee member permissions — extended at runtime per role. */
export interface MemberPermissions {
	admin?: boolean;
	email?: boolean;
	emails?: {
		aliases?: Record<string, boolean>;
		folders?: Record<string, boolean>;
	};
	interviews?: {
		canAccess?: boolean;
		canSchedule?: boolean;
		canHost?: boolean;
	};
	[key: string]: unknown;
}

/** Committee member stored in Firestore (`members` collection). */
export interface Member {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	cell?: string;
	permissions: MemberPermissions;
	picture?: Record<string, unknown>;
	[key: string]: unknown;
}

/** Application document (`applications` collection). Linked section IDs are string refs. */
export interface Application {
	id: string;
	profile: string;
	family?: string;
	education?: string;
	experience?: string;
	expenses?: string;
	incomes?: string;
	contributions?: string;
	projections?: string;
	attachments: string;
	awards?: string[];
	completedBy: string;
	type: ApplicationTypeValue | string;
	status: ApplicationStatusValue | string;
	submittedOn?: string;
	window?: string;
	cycleYear?: number | string;
	deadline?: Date | string;
	deletedOn?: Date | string;
	lastUpdated?: string;
	[key: string]: unknown;
}
