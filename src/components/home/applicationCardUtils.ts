import { ApplicationStatus } from '../../config/data/collections';
import {
	areApplicationAttachmentsComplete,
	getRequiredAttachmentKeys,
	type AttachmentRecord,
} from '../../config/data/applicationAttachments';

export interface ApplicantApplicationCardData {
	id: string;
	type: string;
	status: string;
	submittedOn: string;
	completedBy?: string;
	attachments?: string;
}

export interface ApplicationAttachmentProgress {
	uploaded: number;
	required: number;
	complete: boolean;
}

export const formatApplicationYear = (input: string) => {
	if (!input) return 'Draft';
	const date = new Date(input);
	return Number.isNaN(date.getTime()) ? 'Draft' : String(date.getFullYear());
};

export const formatApplicationTitle = (type: string, submittedOn: string) => `${type} (${formatApplicationYear(submittedOn)})`;

export const formatApplicationSubmittedOn = (input: string, compact = false) => {
	if (!input) return 'Not submitted yet';
	const date = new Date(input);
	if (Number.isNaN(date.getTime())) return 'Date unavailable';
	return compact
		? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
		: date.toLocaleString();
};

const ATTACHMENT_AWARE_STATUSES = new Set<string>([
	ApplicationStatus.started,
	ApplicationStatus.submitted,
	ApplicationStatus.incomplete,
	ApplicationStatus.completed,
]);

export const showsAttachmentProgress = (status: string) => ATTACHMENT_AWARE_STATUSES.has(status);

export const getApplicationAttachmentProgress = (
	application: Pick<ApplicantApplicationCardData, 'type' | 'status'>,
	attachments?: AttachmentRecord | null,
): ApplicationAttachmentProgress | null => {
	if (!showsAttachmentProgress(application.status)) return null;

	const requiredKeys = getRequiredAttachmentKeys(application.type);
	if (requiredKeys.length === 0) return null;

	const uploaded = requiredKeys.filter((key) => {
		const attachment = attachments?.[key];
		return Boolean(attachment?.home || attachment?.requestID || attachment?.displayName);
	}).length;

	return {
		uploaded,
		required: requiredKeys.length,
		complete: areApplicationAttachmentsComplete(attachments, application.type),
	};
};

export const formatAttachmentProgress = (progress: ApplicationAttachmentProgress) =>
	progress.complete
		? 'Documents complete'
		: `Documents: ${progress.uploaded} of ${progress.required} uploaded`;

export const getApplicationNextStep = (status: string, progress: ApplicationAttachmentProgress | null) => {
	if (progress && !progress.complete) {
		return progress.uploaded === 0
			? 'Upload your required documents to move this application forward.'
			: 'Finish uploading the remaining required documents.';
	}

	switch (status) {
		case ApplicationStatus.started:
			return 'Continue your application. You can save and return anytime.';
		case ApplicationStatus.submitted:
			return 'Submitted. You can still review or update your answers.';
		case ApplicationStatus.incomplete:
			return 'Some required items are still missing.';
		case ApplicationStatus.completed:
			return 'All required documents received. Awaiting review.';
		case ApplicationStatus.eligible:
		case ApplicationStatus.invited:
			return 'Your application is under review.';
		case ApplicationStatus.awarded:
			return 'View your award details and next steps.';
		case ApplicationStatus.denied:
			return 'View the decision on your application.';
		case ApplicationStatus.ineligible:
			return 'This application is not eligible for funding this cycle.';
		case ApplicationStatus.deferred:
			return 'Your application has been deferred. We will be in touch.';
		default:
			return 'Open this application to view details.';
	}
};

const NEXT_STEP_SKIP_STATUSES = new Set<string>([ApplicationStatus.ineligible, ApplicationStatus.denied]);

/** Hide redundant guidance when status already tells the story. */
export const shouldShowApplicationNextStep = (status: string, progress: ApplicationAttachmentProgress | null) => {
	if (progress && !progress.complete) return true;
	return !NEXT_STEP_SKIP_STATUSES.has(status);
};

const EDITABLE_APPLICATION_STATUSES = new Set<string>([ApplicationStatus.started]);

export const isApplicationEditable = (status: string) => EDITABLE_APPLICATION_STATUSES.has(status);
