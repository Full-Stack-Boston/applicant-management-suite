import type { ApplicationStatusValue, ApplicationTypeValue } from '../config/data/collections';

export interface ProfileForm {
	applicantID: string;
	applicantFirstName: string;
	applicantMiddleInitial: string;
	applicantLastName: string;
	applicantDOB: Date | null;
	applicantMailingAddress: string | { description: string } | null;
	applicantHomePhone: string;
	applicantCellPhone: string;
	applicantEmailAddress: string;
	completedBy: string;
}

export interface FamilyMemberInput {
	fullName?: string;
	occupation?: string;
	age?: string;
	relation?: string;
}

export interface FamilyForm {
	familyID: string;
	familyMembers: FamilyMemberInput[];
	completedBy: string;
}

export interface PreviousSchoolInput {
	school?: string;
}

export interface EducationForm {
	educationRecordID: string;
	schoolName: string;
	expectedGraduationDate: Date | null;
	major: string;
	currentGPA: string;
	previousSchools: PreviousSchoolInput[];
	completedBy: string;
}

export interface ExperiencePositionInput {
	type?: string;
	number?: string;
	location?: string;
	highestRank?: string;
}

export interface ExperienceForm {
	experienceRecordID: string;
	positions: ExperiencePositionInput[];
	activeMemberFlag: boolean;
	currentOrganization: string;
	completedBy: string;
}

export interface LineItemInput {
	title?: string;
	amount?: string;
}

export interface ExpensesForm {
	expensesID: string;
	tuitionCost: string;
	roomAndBoardCost: string;
	bookCost: string;
	commutingCost: string;
	otherExpenses: LineItemInput[];
	completedBy: string;
}

export interface IncomesForm {
	incomesReportID: string;
	summerEarnings: string;
	fallEarnings: string;
	winterEarnings: string;
	springEarnings: string;
	earningsAppliedToEducation: string;
	savingsAppliedToEducation: string;
	collegeAward: string;
	loansAmount: string;
	otherIncomeSources: LineItemInput[];
	completedBy: string;
}

export interface SiblingSchoolInput {
	title?: string;
	cost?: string;
}

export interface ContributionsForm {
	contributionsID: string;
	p1ExpectedAnnualIncome: string;
	p2ExpectedAnnualIncome: string;
	parentInvestmentIncome: string;
	parentsOwnOrRentHome: string;
	parentsMaritalStatus: string;
	siblingSchools: SiblingSchoolInput[];
	anyExtraordinaryExpenses: string;
	completedBy: string;
}

export interface ProjectionsForm {
	projectionsID: string;
	applicantEarnings: string;
	applicantSavings: string;
	applicantFamily: string;
	request: string;
	completedBy: string;
}

export interface AttachmentSlot {
	displayName: string;
	home: string;
	refLoc: string;
	uploadedBy: string;
	requestID: string;
}

export interface AttachmentsForm {
	attachmentsID: string;
	applicantPersonalLetter: AttachmentSlot;
	academicRecommendationLetter: AttachmentSlot;
	communityRecommendationLetter: AttachmentSlot;
	experienceRecommendationLetter: AttachmentSlot;
	studentAidReport: AttachmentSlot;
	academicTranscript: AttachmentSlot;
	acceptanceLetter: AttachmentSlot;
	completedBy: string;
}

export interface AttachmentsFormShort {
	attachmentsID: string;
	applicantPersonalLetter: AttachmentSlot;
	academicTranscript: AttachmentSlot;
	completedBy: string;
}

export interface AwardForm {
	awardID: string;
	awardAmount: string;
	applicantID: string;
	applicationID: string;
	completedBy: string;
	createdOn: string;
	deadline: string;
	message: string;
	type: string;
}

export interface ApplicationTemplate {
	id: string;
	profile: ProfileForm;
	family: FamilyForm;
	education: EducationForm;
	experience: ExperienceForm;
	expenses: ExpensesForm;
	incomes: IncomesForm;
	contributions: ContributionsForm;
	projections: ProjectionsForm;
	attachments: AttachmentsForm;
	awards: AwardForm[];
	completedBy: string;
	type: ApplicationTypeValue | string;
	status: ApplicationStatusValue | string;
	submittedOn: string;
	window: string;
}

export interface ApplicationTemplateShort {
	id: string;
	profile: ProfileForm;
	education: EducationForm;
	attachments: AttachmentsFormShort;
	awards: AwardForm[];
	completedBy: string;
	type: ApplicationTypeValue | string;
	status: ApplicationStatusValue | string;
	submittedOn: string;
	window: string;
}

/** Application stub with Firestore document id refs (form context default). */
export interface ApplicationStub {
	id: string;
	profile: string;
	family?: string;
	education: string;
	experience?: string;
	expenses?: string;
	incomes?: string;
	contributions?: string;
	projections?: string;
	attachments: string;
	awards: string[];
	completedBy: string;
	type: ApplicationTypeValue | string;
	status: ApplicationStatusValue | string;
	submittedOn: string;
	window: string;
}

export interface AttachmentRequest {
	applicationID: string;
	attachmentType: string;
	attachmentsID: string;
	attempts: number;
	completed: boolean;
	email: string;
	expiryDate: string;
	fromName: string;
	id: string;
	name: string;
	pinCode: string;
	relation: string;
}
