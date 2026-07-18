import {
	areApplicationAttachmentsComplete,
	getRequiredAttachmentKeys,
	maybePromoteApplicationToCompleted,
} from './applicationAttachments';
import { getCollectionData, saveCollectionData } from './firebase';
import { ApplicationStatus, ApplicationType, collections } from './collections';

vi.mock('./firebase', () => ({
	getCollectionData: jest.fn(),
	saveCollectionData: jest.fn(),
}));

describe('applicationAttachments', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns required keys for scholarship check in', () => {
		const keys = getRequiredAttachmentKeys(ApplicationType.scholarship);
		expect(keys).toContain('applicantPersonalLetter');
		expect(keys).toContain('academicTranscript');
	});

	it('detects complete attachments when files are present', () => {
		const complete = areApplicationAttachmentsComplete(
			{
				applicantPersonalLetter: { displayName: 'letter.pdf', home: 'https://example.com/letter.pdf' },
				academicTranscript: { displayName: 'transcript.pdf', home: 'https://example.com/transcript.pdf' },
			},
			ApplicationType.scholarship,
		);
		expect(complete).toBe(true);
	});

	it('detects incomplete attachments when a required file is missing', () => {
		const complete = areApplicationAttachmentsComplete(
			{
				applicantPersonalLetter: { displayName: 'letter.pdf', home: 'https://example.com/letter.pdf' },
			},
			ApplicationType.scholarship,
		);
		expect(complete).toBe(false);
	});

	it('promotes incomplete applications to completed when attachments are ready', async () => {
		getCollectionData
			.mockResolvedValueOnce({
				id: 'app1',
				status: ApplicationStatus.incomplete,
				type: ApplicationType.scholarship,
				attachments: 'att1',
				completedBy: 'user1',
			})
			.mockResolvedValueOnce({
				applicantPersonalLetter: { displayName: 'letter.pdf', home: 'https://example.com/letter.pdf' },
				academicTranscript: { displayName: 'transcript.pdf', home: 'https://example.com/transcript.pdf' },
			});
		saveCollectionData.mockResolvedValue(true);

		const result = await maybePromoteApplicationToCompleted('app1');

		expect(result).toBe(true);
		expect(getCollectionData).toHaveBeenNthCalledWith(1, 'app1', collections.applications, 'app1');
		expect(getCollectionData).toHaveBeenNthCalledWith(2, 'user1', collections.attachments, 'att1');
		expect(saveCollectionData).toHaveBeenCalledWith(
			collections.applications,
			'app1',
			expect.objectContaining({ status: ApplicationStatus.completed }),
		);
	});

	it('does not promote when attachments are incomplete', async () => {
		getCollectionData
			.mockResolvedValueOnce({
				id: 'app1',
				status: ApplicationStatus.incomplete,
				type: ApplicationType.scholarship,
				attachments: 'att1',
				completedBy: 'user1',
			})
			.mockResolvedValueOnce({
				applicantPersonalLetter: { displayName: 'letter.pdf', home: 'https://example.com/letter.pdf' },
			});

		const result = await maybePromoteApplicationToCompleted('app1');

		expect(result).toBe(false);
		expect(saveCollectionData).not.toHaveBeenCalled();
	});

	it('skips promotion for non-promotable statuses', async () => {
		getCollectionData.mockResolvedValueOnce({
			id: 'app1',
			status: ApplicationStatus.completed,
			type: ApplicationType.scholarship,
			attachments: 'att1',
			completedBy: 'user1',
		});

		const result = await maybePromoteApplicationToCompleted('app1');

		expect(result).toBe(false);
		expect(getCollectionData).toHaveBeenCalledTimes(1);
		expect(saveCollectionData).not.toHaveBeenCalled();
	});
});
