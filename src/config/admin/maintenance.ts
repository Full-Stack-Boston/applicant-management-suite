/**
 * ADMIN MAINTENANCE FUNCTIONS
 * ---------------------------------------------------------------------------
 * Defines the system maintenance tools and database scripts available to Admins.
 * Maps UI definitions to backend Firebase functions.
 */

import {
	purgeUserRecords,
	sendToTestDB,
	wipeCollections,
	backfillLastUpdated,
	backfillSentEmailTags,
	backfillSearchableTerms,
	backfillEmailContent,
	migrateEmailTemplates,
	backfillApplicantCreationDates,
	migrateDeadlinesToCycleYear,
	backfillApplicantGradYears,
	purgeDeletedApplications,
	findUnownedRecords,
	purgeUnownedRecords,
	cleanupOrphanedStorage,
	purgeLogs,
} from '../data/firebase';
import type { PurgeUserRecordsParams } from '../../types/firebase';

/** Common shape for admin maintenance actions invoked from the Settings UI. */
type AdminAction = (params?: Record<string, unknown>) => Promise<unknown>;

interface ActionParameter {
	name: string;
	label: string;
	type: 'select' | 'switch' | 'text';
	required?: boolean;
	defaultValue?: unknown;
	options?: { value: string; label: string }[];
}

interface AdminFunction {
	id: string;
	label: string;
	description: string;
	action: AdminAction;
	parameters: ActionParameter[];
}

const asCallableResult = async (callable: (data?: unknown) => Promise<unknown>, params?: Record<string, unknown>) => {
	const result = await callable(params ?? {});
	if (result && typeof result === 'object' && 'data' in result) {
		return (result as { data: unknown }).data;
	}
	return result;
};

export const adminActions: Record<string, AdminAction> = {
	purgeUserData: (params) => purgeUserRecords({ userId: params?.userId as string, expel: Boolean(params?.expel) } satisfies PurgeUserRecordsParams),
	sendToTestDB: sendToTestDB,
	wipeCollections: (params) => wipeCollections(params as { conn?: string } | undefined),
	backfillLastUpdated: backfillLastUpdated,
	backfillSentEmailTags: backfillSentEmailTags,
	backfillSearchableTerms: backfillSearchableTerms,
	backfillEmailContent: backfillEmailContent,
	migrateEmailTemplates: migrateEmailTemplates,
	backfillApplicantCreationDates: backfillApplicantCreationDates,
	migrateDeadlinesToCycleYear: migrateDeadlinesToCycleYear,
	backfillApplicantGradYears: backfillApplicantGradYears,
	purgeDeletedApplications: (params) => asCallableResult(purgeDeletedApplications, params),
	findUnownedRecords: () => asCallableResult(findUnownedRecords, {}),
	purgeUnownedRecords: (params) => asCallableResult(purgeUnownedRecords, params),
	cleanupOrphanedStorage: (params) => asCallableResult(cleanupOrphanedStorage, params),
	purgeLogs: (params) => asCallableResult(purgeLogs, params),
};

export const adminFunctions: AdminFunction[] = [
	{
		id: 'purgeUserData',
		label: 'Purge All User Data',
		description: 'PERMANENTLY deletes a user and all associated records (profiles, applications, attachments, etc.) from the database. This action is irreversible.',
		action: adminActions.purgeUserData,
		parameters: [
			{ name: 'userId', label: 'Select Applicant to Purge', type: 'select', required: true },
			{ name: 'expel', label: 'Remove user from system (deletes login)', type: 'switch', defaultValue: false },
		],
	},
	{
		id: 'wipeCollections',
		label: 'Wipe Collections',
		description: 'Deletes all collections in the selected database. This action is irreversible. USE WITH EXTREME CAUTION.',
		action: adminActions.wipeCollections,
		parameters: [
			{
				name: 'conn',
				label: 'Which database should be wiped?',
				type: 'select',
				options: [
					{ value: '(default)', label: 'Production DB' },
					{ value: 'ams-test', label: 'Test DB' },
				],
				required: true,
			},
		],
	},
	{
		id: 'purgeDeletedApplications',
		label: 'Purge All Deleted Applications',
		description: 'Permanently deletes every application currently marked Deleted, including linked component docs, notes, awards, interviews, requests, array ID cleanup, and related Storage files. Use Dry Run first.',
		action: adminActions.purgeDeletedApplications,
		parameters: [{ name: 'dryRun', label: 'Dry run (report counts only, do not delete)', type: 'switch', defaultValue: true }],
	},
	{
		id: 'findUnownedRecords',
		label: 'Find Unowned Records',
		description: 'Scan for applications not listed on any applicant.applications array, and for orphaned component records (profiles/families/etc.) that no application references.',
		action: adminActions.findUnownedRecords,
		parameters: [],
	},
	{
		id: 'purgeUnownedRecords',
		label: 'Purge Unowned Records',
		description: 'Permanently delete unowned applications (and their related records/files) plus orphaned component documents that are not referenced by any application. Use Dry Run first.',
		action: adminActions.purgeUnownedRecords,
		parameters: [{ name: 'dryRun', label: 'Dry run (report counts only, do not delete)', type: 'switch', defaultValue: true }],
	},
	{
		id: 'cleanupOrphanedStorage',
		label: 'Cleanup Orphaned Storage',
		description: 'Delete Firebase Storage objects that no longer belong to a living application/applicant/member (attachments under applications/, applicant and member avatars). Use Dry Run first.',
		action: adminActions.cleanupOrphanedStorage,
		parameters: [{ name: 'dryRun', label: 'Dry run (report counts only, do not delete)', type: 'switch', defaultValue: true }],
	},
	{
		id: 'purgeLogs',
		label: 'Purge Logs',
		description: 'Delete sitelog and/or dblog entries. Leave Log Document ID blank for bulk purge. Set Older Than Days to limit bulk deletes (0 = all). For a single entry, choose one collection and provide its document ID.',
		action: adminActions.purgeLogs,
		parameters: [
			{
				name: 'logCollection',
				label: 'Log collection',
				type: 'select',
				required: true,
				defaultValue: 'both',
				options: [
					{ value: 'both', label: 'Both sitelog + dblog' },
					{ value: 'sitelog', label: 'sitelog only' },
					{ value: 'dblog', label: 'dblog only' },
				],
			},
			{ name: 'olderThanDays', label: 'Older than days (0 = all / ignore for single ID)', type: 'text', defaultValue: '90' },
			{ name: 'logId', label: 'Single log document ID (optional)', type: 'text', defaultValue: '' },
		],
	},
	{
		id: 'send-to-test-db',
		label: 'Copy Data to Test DB',
		description: 'Overwrites the Test Database with a snapshot of current Production data for safe testing.',
		action: adminActions.sendToTestDB,
		parameters: [],
	},
	{
		id: 'backfill-last-updated',
		label: 'Backfill "Last Updated"',
		description: 'Scans application records. If "lastUpdated" is missing, it populates it using the legacy "dated" field.',
		action: adminActions.backfillLastUpdated,
		parameters: [],
	},
	{
		id: 'backfill-sent-email-tags',
		label: 'Backfill Sent Email Tags',
		description: 'Scans the "sent_emails" collection and applies categorization tags (e.g. "To Applicant", "System") based on recipient aliases.',
		action: adminActions.backfillSentEmailTags,
		parameters: [],
	},
	{
		id: 'backfill-searchable-terms',
		label: 'Backfill Searchable Terms',
		description: 'Regenerates the "searchableTerms" array for all records. Run this if Search is failing to find known records.',
		action: adminActions.backfillSearchableTerms,
		parameters: [],
	},
	{
		id: 'backfill-email-content',
		label: 'Backfill Email Content',
		description: 'Fetches full HTML content for stored emails that may have only cached headers. Useful after importing external email logs.',
		action: adminActions.backfillEmailContent,
		parameters: [],
	},
	{
		id: 'migrate-email-templates',
		label: 'Migrate Email Templates',
		description: 'Reads static email templates from code and uploads them to the database. Run this once after deploying the dynamic template feature.',
		action: adminActions.migrateEmailTemplates,
		parameters: [],
	},
	{
		id: 'backfill-applicant-creation-dates',
		label: 'Backfill Applicant Creation Dates',
		description: 'Queries Firebase Auth to find the exact creation date for all existing users, and populates the accountCreated field for each applicant record.',
		action: adminActions.backfillApplicantCreationDates,
		parameters: [],
	},
	{
		id: 'migrate-deadlines-to-cycle-year',
		label: 'Migrate Deadlines to Cycle Year',
		description: 'Backfills cycleYear and converts deadline strings to Timestamps on all applications, awards, and interviews. Also adds CYCLE_YEAR to siteConfiguration. Safe to run multiple times.',
		action: adminActions.migrateDeadlinesToCycleYear,
		parameters: [],
	},
	{
		id: 'backfill-applicant-grad-years',
		label: 'Backfill Applicant Grad Years',
		description: 'Normalizes applicant gradYear values to a plain 4-digit year. Fixes legacy date strings and Timestamps using education records when needed. Safe to run multiple times.',
		action: adminActions.backfillApplicantGradYears,
		parameters: [],
	},
];
