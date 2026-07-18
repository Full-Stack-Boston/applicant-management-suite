/**
 * Demo attachment helpers for local/portfolio rides without a real PDF picker.
 * Filenames match the seeded mock attachment labels used in AMS seed scripts.
 */

export const DEMO_ATTACHMENT_FILENAMES: Record<string, string> = {
	applicantPersonalLetter: 'Personal_Statement.pdf',
	academicRecommendationLetter: 'Academic_Rec.pdf',
	communityRecommendationLetter: 'Community_Rec.pdf',
	experienceRecommendationLetter: 'Experience_Rec.pdf',
	academicTranscript: 'Transcript.pdf',
	studentAidReport: 'SAR_Summary.pdf',
	acceptanceLetter: 'Acceptance_Letter.pdf',
};

/** Minimal PDF bytes accepted by the upload path (`application/pdf`). */
const MINIMAL_PDF = '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n';

export const resolveAttachmentKey = (fieldNameOrKey: string): string => {
	const parts = String(fieldNameOrKey || '').split('.');
	return parts[parts.length - 1] || fieldNameOrKey;
};

export const getDemoAttachmentFilename = (fieldNameOrKey: string): string => {
	const key = resolveAttachmentKey(fieldNameOrKey);
	return DEMO_ATTACHMENT_FILENAMES[key] || `${key || 'Demo_Document'}.pdf`;
};

/** Build a tiny PDF File suitable for demo uploads through the normal saveFile path. */
export const createDemoPdfFile = (fieldNameOrKey: string): File => {
	const filename = getDemoAttachmentFilename(fieldNameOrKey);
	return new File([MINIMAL_PDF], filename, { type: 'application/pdf' });
};
