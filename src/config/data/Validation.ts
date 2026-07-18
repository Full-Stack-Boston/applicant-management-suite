/**
 * VALIDATION HELPERS & DATA MODELS
 * ---------------------------------------------------------------------------
 * This file serves two main purposes:
 * 1. Exports validation functions used by the Form Engine to check user input.
 * 2. Exports "Blank" data objects (Schemas) used to initialize new records
 * in Firestore. This ensures every new document has the correct structure.
 */

import { v4 as uuid } from 'uuid';
import { ApplicationStatus, ApplicationType } from './collections';
import type {
	ApplicationStub,
	ApplicationTemplate,
	ApplicationTemplateShort,
	AttachmentRequest,
	AttachmentSlot,
	AttachmentsForm,
	AttachmentsFormShort,
	AwardForm,
	ContributionsForm,
	EducationForm,
	ExperienceForm,
	ExpensesForm,
	FamilyForm,
	IncomesForm,
	ProfileForm,
	ProjectionsForm,
} from '../../types/forms';
import type { Applicant } from '../../types/domain';

// =============================================================================
//  1. INPUT VALIDATORS (RegEx Helpers)
// =============================================================================

/**
 * Checks if value contains only letters (no spaces or numbers).
 */
export function lettersOnly(value: string): boolean {
	return /^[a-zA-Z]*$/.test(value);
}

/**
 * Checks if value contains only letters and spaces (e.g. "New York").
 */
export function lettersAndSpacesOnly(value: string): boolean {
	return /^[a-zA-Z\s]*$/.test(value);
}

/**
 * Checks if value contains only digits.
 */
export function numbersOnly(value: string): boolean {
	return /^\d*$/.test(value);
}

/**
 * Basic email format validation.
 */
export function emailsOnly(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Checks for valid decimal numbers (money/GPA).
 */
export function decimalsOnly(value: string): boolean {
	return /^\d*\.?\d*$/.test(value);
}

/**
 * Validates "City, State" format (e.g. "Boston, MA").
 */
export function locationOnly(value: string): boolean {
	return /^[a-zA-Z]+(?:-[a-zA-Z]+)?,\s*[a-zA-Z]+(?:-[a-zA-Z]+)?$/.test(value);
}

/**
 * Generic check to ensure value is not null, undefined, or the string 'undefined'.
 */
export function notUndefined(value: unknown): boolean {
	return value !== 'undefined' && value !== undefined && value !== null && value !== '';
}

// =============================================================================
//  2. DATA MODELS (Initial State Templates)
// =============================================================================

// --- Section 1: Personal Info ---
export const blankProfile: ProfileForm = {
	applicantID: uuid(),
	applicantFirstName: '',
	applicantMiddleInitial: '',
	applicantLastName: '',
	applicantDOB: null,
	applicantMailingAddress: null,
	applicantHomePhone: '',
	applicantCellPhone: '',
	applicantEmailAddress: '',
	completedBy: '',
};

// --- Section 2: Family ---
export const blankFamily: FamilyForm = {
	familyID: uuid(),
	familyMembers: [], // Array of objects
	completedBy: '',
};

// --- Section 3: Education ---
export const blankEducation: EducationForm = {
	educationRecordID: uuid(),
	schoolName: '',
	expectedGraduationDate: null,
	major: '',
	currentGPA: '',
	previousSchools: [],
	completedBy: '',
};

// --- Section 4: Experience ---
export const blankExperience: ExperienceForm = {
	experienceRecordID: uuid(),
	positions: [],
	activeMemberFlag: false,
	currentOrganization: 'undefined',
	completedBy: '',
};

// --- Section 5: Expenses ---
export const blankExpenses: ExpensesForm = {
	expensesID: uuid(),
	tuitionCost: '',
	roomAndBoardCost: '',
	bookCost: '',
	commutingCost: '',
	otherExpenses: [],
	completedBy: '',
};

// --- Section 6: Incomes ---
export const blankIncomes: IncomesForm = {
	incomesReportID: uuid(),
	summerEarnings: '',
	fallEarnings: '',
	winterEarnings: '',
	springEarnings: '',
	earningsAppliedToEducation: '',
	savingsAppliedToEducation: '',
	collegeAward: '',
	loansAmount: '',
	otherIncomeSources: [],
	completedBy: '',
};

// --- Section 7: Contributions ---
export const blankContributions: ContributionsForm = {
	contributionsID: uuid(),
	p1ExpectedAnnualIncome: '',
	p2ExpectedAnnualIncome: '',
	parentInvestmentIncome: '',
	parentsOwnOrRentHome: '',
	parentsMaritalStatus: '',
	siblingSchools: [],
	anyExtraordinaryExpenses: '',
	completedBy: '',
};

// --- Section 8: Projections ---
export const blankProjections: ProjectionsForm = {
	projectionsID: uuid(),
	applicantEarnings: '',
	applicantSavings: '',
	applicantFamily: '',
	request: '',
	completedBy: '',
};

// --- Section 9: Attachments ---
export const blankAttachment: AttachmentSlot = {
	displayName: '',
	home: '', // Download URL
	refLoc: '', // Storage Path
	uploadedBy: '',
	requestID: '', // If uploaded via external request
};

export const blankAttachments: AttachmentsForm = {
	attachmentsID: uuid(),
	applicantPersonalLetter: blankAttachment,
	academicRecommendationLetter: blankAttachment,
	communityRecommendationLetter: blankAttachment,
	experienceRecommendationLetter: blankAttachment,
	studentAidReport: blankAttachment,
	academicTranscript: blankAttachment,
	acceptanceLetter: blankAttachment,
	completedBy: '',
};

// Simplified attachment set for Returning/Scholarship applicants
export const blankAttachments2: AttachmentsFormShort = {
	attachmentsID: uuid(),
	applicantPersonalLetter: blankAttachment,
	academicTranscript: blankAttachment,
	completedBy: '',
};

// --- Awards ---
export const blankAward: AwardForm = {
	awardID: uuid(),
	awardAmount: '',
	applicantID: '',
	applicationID: '',
	completedBy: '',
	createdOn: '',
	deadline: '', // For renewable grants
	message: '',
	type: '',
};

// =============================================================================
//  3. APPLICATION TEMPLATES (Aggregates)
// =============================================================================

/**
 * Full Template for a "New Applicant" (Standard Grant).
 * Pre-fills all sub-objects (Profile, Family, etc.) with UUIDs.
 */
export const templateApp: ApplicationTemplate = {
	id: uuid(),
	profile: blankProfile,
	family: blankFamily,
	education: blankEducation,
	experience: blankExperience,
	expenses: blankExpenses,
	incomes: blankIncomes,
	contributions: blankContributions,
	projections: blankProjections,
	attachments: blankAttachments,
	awards: [blankAward],
	completedBy: '',
	type: '',
	status: ApplicationStatus.started,
	submittedOn: new Date().toLocaleString(),
	window: '5/15/2024, 11:59:59 PM', // Legacy/Default Window
};

/**
 * Lightweight Template for "Scholarship Check-In".
 * Requires fewer sections (Profile, Education, Attachments only).
 */
export const templateApp2: ApplicationTemplateShort = {
	id: uuid(),
	profile: blankProfile,
	education: blankEducation,
	attachments: blankAttachments2,
	awards: [blankAward],
	completedBy: '',
	type: ApplicationType.scholarship,
	status: ApplicationStatus.started,
	submittedOn: new Date().toLocaleString(),
	window: '5/15/2024, 11:59:59 PM',
};

/**
 * Skeleton Application (ID Structure Only).
 * Used when we just need the IDs to perform a cascading delete or fetch.
 */
export const blankApp: ApplicationStub = {
	id: uuid(),
	profile: uuid(),
	family: uuid(),
	education: uuid(),
	experience: uuid(),
	expenses: uuid(),
	incomes: uuid(),
	contributions: uuid(),
	projections: uuid(),
	attachments: uuid(),
	awards: [uuid()],
	completedBy: uuid(),
	type: '',
	status: '',
	submittedOn: new Date().toLocaleString(),
	window: '5/15/2024, 11:59:59 PM',
};

export const blankApp2: ApplicationStub = {
	id: uuid(),
	profile: uuid(),
	education: uuid(),
	attachments: uuid(),
	awards: [uuid()],
	completedBy: uuid(),
	type: '',
	status: '',
	submittedOn: new Date().toLocaleString(),
	window: '5/15/2024, 11:59:59 PM',
};

// =============================================================================
//  4. EXTERNAL REQUESTS & USERS
// =============================================================================

export const blankRequest: AttachmentRequest = {
	id: uuid(),
	applicationID: uuid(),
	attachmentType: '',
	attachmentsID: uuid(),
	attempts: 0,
	completed: false,
	email: '',
	expiryDate: '',
	fromName: '',
	name: '',
	pinCode: '',
	relation: '',
};

export const blankApplicant: Applicant = {
	id: uuid(),
	firstName: '',
	lastName: '',
	callMe: '',
	picture: {},
	school: '',
	major: '',
	gradYear: '',
	organization: '',
	applications: [], // Array of App IDs
	email: '',
	cell: '',
	auth: '', // Firebase Auth UID
};
