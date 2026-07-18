import { attachmentFields } from '../Constants';
import { ApplicationStatus, collections } from './collections';
import { getCollectionData, saveCollectionData } from './firebase';

export type AttachmentRecord = Record<string, { home?: string; requestID?: string; displayName?: string } | undefined>;

const PROMOTABLE_STATUSES = new Set<string>([
	ApplicationStatus.started,
	ApplicationStatus.submitted,
	ApplicationStatus.incomplete,
]);

export const getRequiredAttachmentKeys = (appType: string): string[] =>
	attachmentFields.filter((field) => (field.requiredBy as string[]).includes(appType)).map((field) => field.key);

export const areApplicationAttachmentsComplete = (
	attachments: AttachmentRecord | null | undefined,
	appType: string,
): boolean => {
	const requiredKeys = getRequiredAttachmentKeys(appType);
	if (requiredKeys.length === 0) return false;

	return requiredKeys.every((key) => {
		const attachment = attachments?.[key];
		return Boolean(attachment?.home || attachment?.requestID || attachment?.displayName);
	});
};

/** After an attachment upload, promote Incomplete/Started/Submitted apps to Completed when requirements are met. */
export const maybePromoteApplicationToCompleted = async (applicationId: string): Promise<boolean> => {
	const application = (await getCollectionData(applicationId, collections.applications, applicationId)) as Record<string, unknown> | null;
	if (!application?.type || !application.completedBy || !application.attachments) return false;

	const currentStatus = application.status as string;
	if (!PROMOTABLE_STATUSES.has(currentStatus)) return false;

	const attachments = (await getCollectionData(
		application.completedBy as string,
		collections.attachments,
		application.attachments as string,
	)) as AttachmentRecord | null;

	if (!areApplicationAttachmentsComplete(attachments, application.type as string)) return false;

	await saveCollectionData(collections.applications, applicationId, { status: ApplicationStatus.completed });
	return true;
};
