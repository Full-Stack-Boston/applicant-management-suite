import { ApplicationStatus } from '../../config/data/collections';
import {
	formatApplicationTitle,
	formatAttachmentProgress,
	getApplicationAttachmentProgress,
	getApplicationNextStep,
	shouldShowApplicationNextStep,
	isApplicationEditable,
	showsAttachmentProgress,
} from './applicationCardUtils';

describe('applicationCardUtils', () => {
	it('formats application titles with year or Draft', () => {
		expect(formatApplicationTitle('New Applicant', '2025-08-30T12:00:00Z')).toBe('New Applicant (2025)');
		expect(formatApplicationTitle('Returning Grant', '')).toBe('Returning Grant (Draft)');
	});

	it('computes attachment progress for editable statuses', () => {
		const progress = getApplicationAttachmentProgress(
			{ type: 'New Applicant', status: ApplicationStatus.started },
			{
				applicantPersonalLetter: { home: 'https://example.com/letter.pdf' },
			},
		);

		expect(progress).not.toBeNull();
		expect(progress?.uploaded).toBeGreaterThan(0);
		expect(progress?.required).toBeGreaterThan(progress?.uploaded ?? 0);
		expect(showsAttachmentProgress(ApplicationStatus.started)).toBe(true);
		expect(showsAttachmentProgress(ApplicationStatus.awarded)).toBe(false);
	});

	it('builds next-step guidance from status and attachment progress', () => {
		expect(
			getApplicationNextStep(ApplicationStatus.started, { uploaded: 0, required: 5, complete: false }),
		).toContain('Upload your required documents');

		expect(formatAttachmentProgress({ uploaded: 2, required: 5, complete: false })).toBe('Documents: 2 of 5 uploaded');
		expect(formatAttachmentProgress({ uploaded: 5, required: 5, complete: true })).toBe('Documents complete');
		expect(shouldShowApplicationNextStep(ApplicationStatus.ineligible, null)).toBe(false);
		expect(shouldShowApplicationNextStep(ApplicationStatus.started, null)).toBe(true);
		expect(isApplicationEditable(ApplicationStatus.started)).toBe(true);
		expect(isApplicationEditable(ApplicationStatus.submitted)).toBe(false);
		expect(isApplicationEditable(ApplicationStatus.incomplete)).toBe(false);
		expect(isApplicationEditable(ApplicationStatus.awarded)).toBe(false);
	});
});
