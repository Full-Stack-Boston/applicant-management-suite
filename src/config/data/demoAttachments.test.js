import { createDemoPdfFile, getDemoAttachmentFilename, resolveAttachmentKey } from './demoAttachments';

describe('demoAttachments', () => {
	it('resolves nested attachment keys', () => {
		expect(resolveAttachmentKey('attachments.academicRecommendationLetter')).toBe('academicRecommendationLetter');
		expect(resolveAttachmentKey('academicTranscript')).toBe('academicTranscript');
	});

	it('maps seeded demo filenames', () => {
		expect(getDemoAttachmentFilename('attachments.applicantPersonalLetter')).toBe('Personal_Statement.pdf');
		expect(getDemoAttachmentFilename('communityRecommendationLetter')).toBe('Community_Rec.pdf');
	});

	it('creates a small application/pdf File', () => {
		const file = createDemoPdfFile('academicRecommendationLetter');
		expect(file).toBeInstanceOf(File);
		expect(file.name).toBe('Academic_Rec.pdf');
		expect(file.type).toBe('application/pdf');
		expect(file.size).toBeGreaterThan(0);
	});
});
