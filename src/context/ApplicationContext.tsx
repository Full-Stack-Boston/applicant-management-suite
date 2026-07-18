/**
 * APPLICATION FORM CONTEXT & STATE MANAGER
 * ---------------------------------------------------------------------------
 * This file manages the state, validation, and logic for the multi-step
 * Application Wizard.
 *
 * * ARCHITECTURE:
 * 1. ApplicationContextProvider: Wraps the form pages to provide global flags (loading, editing).
 * 2. useApplicationForm: A custom hook that acts as the "Controller". It:
 * - Initializes state (Blank vs. Existing Data).
 * - Handles Field Updates (Deeply nested objects).
 * - Performs Validation (Comparing data against 'formConfig.js').
 */

import { createContext, useState, useCallback, useMemo, useContext, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import { v4 as uuid } from 'uuid';

// Config & Validation
import { lettersOnly, lettersAndSpacesOnly, numbersOnly, emailsOnly, decimalsOnly, locationOnly, notUndefined, blankApp } from '../config/data/Validation';
import { appFormConfig } from '../config/ui/formConfig';

export interface ApplicationContextValue {
	loading: boolean;
	setLoading: Dispatch<SetStateAction<boolean>>;
	allowEditing: boolean;
	setAllowEditing: Dispatch<SetStateAction<boolean>>;
	applicationID: string | null;
	setApplicationID: Dispatch<SetStateAction<string | null>>;
}

export const ApplicationContext = createContext<ApplicationContextValue | undefined>(undefined);

// --- Helper Utilities ---

/**
 * Safely retrieves a nested value from an object using a dot-notation string.
 * e.g., getNestedValue(formData, 'profileData.applicantFirstName')
 */
const getNestedValue = (obj: Record<string, unknown>, path: string, defaultValue: unknown = ''): unknown => {
	const value = path.split('.').reduce<unknown>((acc, part) => (acc ? (acc as Record<string, unknown>)[part] : undefined), obj);
	return value === null || value === undefined ? defaultValue : value;
};

/**
 * Safely sets a nested value in an object, creating intermediate objects if needed.
 * returns the mutated object (intended for use inside state setters).
 */
const setNestedValue = (obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> => {
	const keys = path.split('.');
	let current: Record<string, unknown> = obj;
	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		if (current[key] === undefined || current[key] === null) {
			current[key] = {};
		}
		current = current[key] as Record<string, unknown>;
	}
	current[keys[keys.length - 1]] = value;
	return obj;
};

// --- Default Inputs for Array Fields ---
// These are used when a user clicks "Add Member" or "Add School" to reset the sub-form.
const defaultFamilyInput = { fullName: '', relation: '', age: '', occupation: '' };
const defaultSchoolInput = { school: '' };
const defaultexperienceInput = { type: '', number: '', location: '', highestRank: '' };
const defaultExpenseInput = { title: '', amount: '' };
const defaultIncomeInput = { title: '', amount: '' };
const defaultSiblingSchoolInput = { title: '', cost: '' };

// =============================================================================
//  1. CONTEXT PROVIDER
// =============================================================================

/**
 * Provides global state for the Application Controller (Loading status, Edit Mode).
 */
export const ApplicationContextProvider = ({ children }: { children: ReactNode }) => {
	const [loading, setLoading] = useState(true);
	const [allowEditing, setAllowEditing] = useState(false);
	const [applicationID, setApplicationID] = useState<string | null>(null);

	const values = useMemo<ApplicationContextValue>(
		() => ({
			loading,
			setLoading,
			allowEditing,
			setAllowEditing,
			applicationID,
			setApplicationID,
		}),
		[loading, allowEditing, applicationID]
	);

	return <ApplicationContext.Provider value={values}>{children}</ApplicationContext.Provider>;
};

// =============================================================================
//  2. VALIDATION ENGINE
// =============================================================================

interface FieldConfig {
	name: string;
	required?: boolean;
	type?: string;
	validator?: string;
}

interface ArrayFieldConfig {
	name: string;
	required?: boolean;
	fields?: FieldConfig[];
}

type ValidatorFn = (value: string) => boolean;

const validators: Record<string, ValidatorFn> = {
	lettersOnly,
	lettersAndSpacesOnly,
	numbersOnly,
	emailsOnly,
	decimalsOnly,
	locationOnly,
	notUndefined: (value: string) => notUndefined(value),
};

/**
 * Validates flat fields in a section (e.g. Profile Name, DOB).
 */
const validateRegularFields = (sectionData: Record<string, unknown>, sectionDataKey: string, fields: FieldConfig[] = []) => {
	const errors: Record<string, boolean> = {};
	let allValid = true;

	for (const field of fields) {
		if (!field.required) continue;

		const value = getNestedValue(sectionData, field.name, field.type === 'date' ? null : '');
		const validator = field.validator ? validators[field.validator] : null;
		const isFieldValid = value !== '' && value !== null && (!validator || validator(value as string));

		errors[`${sectionDataKey}.${field.name}`] = !isFieldValid;
		if (!isFieldValid) allValid = false;
	}
	return { errors, isValid: allValid };
};

/**
 * Validates a single item within an array (e.g., one family member).
 */
const validateArrayItem = (item: Record<string, unknown>, subFields: FieldConfig[] | undefined, errorPathPrefix: string) => {
	const itemErrors: Record<string, boolean> = {};
	let isItemValid = true;

	for (const subField of subFields || []) {
		if (!subField.required) continue;

		const value = item[subField.name];
		const validator = subField.validator ? validators[subField.validator] : null;
		const isSubFieldValid = value !== '' && value !== null && value !== undefined && (!validator || validator(value as string));

		itemErrors[`${errorPathPrefix}.${subField.name}`] = !isSubFieldValid;
		if (!isSubFieldValid) {
			isItemValid = false;
		}
	}
	return { errors: itemErrors, isValid: isItemValid };
};

/**
 * Validates an entire array section (e.g. The list of all family members).
 */
const validateArrayField = (
	arrayFieldConfig: ArrayFieldConfig | undefined,
	sectionData: Record<string, unknown>,
	sectionDataKey: string,
	_sectionKey: string
) => {
	if (!arrayFieldConfig) return { errors: {} as Record<string, boolean>, isValid: true };

	const errors: Record<string, boolean> = {};
	let allValid = true;
	const arrayName = arrayFieldConfig.name;
	const arrayData = (sectionData[arrayName] as Record<string, unknown>[]) || [];

	if (arrayFieldConfig.required && arrayData.length === 0) {
		errors[`${sectionDataKey}.${arrayName}`] = true;
		allValid = false;
	} else {
		errors[`${sectionDataKey}.${arrayName}`] = false;
	}

	for (const [index, item] of arrayData.entries()) {
		const errorPathPrefix = `${sectionDataKey}.${arrayName}.${index}`;
		const { errors: itemErrors, isValid: isItemValid } = validateArrayItem(item, arrayFieldConfig.fields, errorPathPrefix);

		Object.assign(errors, itemErrors);
		if (!isItemValid) {
			allValid = false;
		}
	}

	return { errors, isValid: allValid };
};

// =============================================================================
//  3. THE HOOK (Form Controller)
// =============================================================================

/**
 * The brain of the form. Manages state, updates, and validation.
 * @param initialData - The application object from Firebase (or a blank template).
 */
export const useApplicationForm = (initialData: Record<string, unknown> = blankApp as unknown as Record<string, unknown>) => {
	const [formData, setFormData] = useState<Record<string, unknown>>(() => {
		const initialProfileID = (initialData.profile as string) || uuid();
		const initialFamilyID = (initialData.family as string) || uuid();
		const initialEducationID = (initialData.education as string) || uuid();
		const initialexperienceID = (initialData.experience as string) || uuid();
		const initialExpensesID = (initialData.expenses as string) || uuid();
		const initialIncomesID = (initialData.incomes as string) || uuid();
		const initialContributionsID = (initialData.contributions as string) || uuid();
		const initialProjectionsID = (initialData.projections as string) || uuid();
		const initialAttachmentsID = (initialData.attachments as string) || uuid();

		const profileData = initialData.profileData as Record<string, unknown> | undefined;
		const familyData = initialData.familyData as Record<string, unknown> | undefined;
		const educationData = initialData.educationData as Record<string, unknown> | undefined;
		const experienceData = initialData.experienceData as Record<string, unknown> | undefined;
		const expensesData = initialData.expensesData as Record<string, unknown> | undefined;
		const incomesData = initialData.incomesData as Record<string, unknown> | undefined;
		const contributionsData = initialData.contributionsData as Record<string, unknown> | undefined;
		const projectionsData = initialData.projectionsData as Record<string, unknown> | undefined;
		const attachmentsData = initialData.attachmentsData as Record<string, unknown> | undefined;

		return {
			id: (initialData.id as string) || uuid(),
			profile: initialProfileID,
			family: initialFamilyID,
			education: initialEducationID,
			experience: initialexperienceID,
			expenses: initialExpensesID,
			incomes: initialIncomesID,
			contributions: initialContributionsID,
			projections: initialProjectionsID,
			attachments: initialAttachmentsID,
			profileData: {
				applicantFirstName: profileData?.applicantFirstName || '',
				applicantMiddleInitial: profileData?.applicantMiddleInitial || '',
				applicantLastName: profileData?.applicantLastName || '',
				applicantDOB: profileData?.applicantDOB || null,
				applicantMailingAddress: profileData?.applicantMailingAddress || { description: '' },
				applicantHomePhone: profileData?.applicantHomePhone || '',
				applicantCellPhone: profileData?.applicantCellPhone || '',
				applicantEmailAddress: profileData?.applicantEmailAddress || '',
			},
			familyData: {
				familyMembers: familyData?.familyMembers || [],
				familyMembersInput: { ...defaultFamilyInput, ...(familyData?.familyMembersInput as Record<string, unknown> | undefined) },
			},
			educationData: {
				schoolName: educationData?.schoolName || '',
				major: educationData?.major || '',
				expectedGraduationDate: educationData?.expectedGraduationDate || null,
				currentGPA: educationData?.currentGPA || '',
				previousSchools: educationData?.previousSchools || [],
				previousSchoolsInput: { ...defaultSchoolInput, ...(educationData?.previousSchoolsInput as Record<string, unknown> | undefined) },
			},
			experienceData: {
				experiences: experienceData?.experiences || [],
				collegeReservesFlag: experienceData?.collegeReservesFlag || false,
				currentUnit: experienceData?.currentUnit ?? 'undefined',
				experiencesInput: { ...defaultexperienceInput, ...(experienceData?.experiencesInput as Record<string, unknown> | undefined) },
			},
			expensesData: {
				tuitionCost: expensesData?.tuitionCost || '',
				roomAndBoardCost: expensesData?.roomAndBoardCost || '',
				bookCost: expensesData?.bookCost || '',
				commutingCost: expensesData?.commutingCost || '',
				otherExpenses: expensesData?.otherExpenses || [],
				otherExpensesInput: { ...defaultExpenseInput, ...(expensesData?.otherExpensesInput as Record<string, unknown> | undefined) },
			},
			incomesData: {
				summerEarnings: incomesData?.summerEarnings || '',
				fallEarnings: incomesData?.fallEarnings || '',
				winterEarnings: incomesData?.winterEarnings || '',
				springEarnings: incomesData?.springEarnings || '',
				earningsAppliedToEducation: incomesData?.earningsAppliedToEducation || '',
				savingsAppliedToEducation: incomesData?.savingsAppliedToEducation || '',
				collegeAward: incomesData?.collegeAward || '',
				loansAmount: incomesData?.loansAmount || '',
				otherIncomeSources: incomesData?.otherIncomeSources || [],
				otherIncomeSourcesInput: { ...defaultIncomeInput, ...(incomesData?.otherIncomeSourcesInput as Record<string, unknown> | undefined) },
			},
			contributionsData: {
				p1ExpectedAnnualIncome: contributionsData?.p1ExpectedAnnualIncome || '',
				p2ExpectedAnnualIncome: contributionsData?.p2ExpectedAnnualIncome || '',
				parentInvestmentIncome: contributionsData?.parentInvestmentIncome || '',
				parentsOwnOrRentHome: contributionsData?.parentsOwnOrRentHome || '',
				parentsMaritalStatus: contributionsData?.parentsMaritalStatus || '',
				siblingSchools: contributionsData?.siblingSchools || [],
				anyExtraordinaryExpenses: contributionsData?.anyExtraordinaryExpenses || '',
				siblingSchoolsInput: { ...defaultSiblingSchoolInput, ...(contributionsData?.siblingSchoolsInput as Record<string, unknown> | undefined) },
			},
			projectionsData: {
				applicantEarnings: projectionsData?.applicantEarnings || '',
				applicantSavings: projectionsData?.applicantSavings || '',
				applicantFamily: projectionsData?.applicantFamily || '',
				request: projectionsData?.request || '',
			},
			attachmentsData: {
				attachmentsID: initialAttachmentsID,
				applicantPersonalLetter: attachmentsData?.applicantPersonalLetter || '',
				academicRecommendationLetter: attachmentsData?.academicRecommendationLetter || '',
				communityRecommendationLetter: attachmentsData?.communityRecommendationLetter || '',
				experienceRecommendationLetter: attachmentsData?.experienceRecommendationLetter || '',
				studentAidReport: attachmentsData?.studentAidReport || '',
				academicTranscript: attachmentsData?.academicTranscript || '',
				acceptanceLetter: attachmentsData?.acceptanceLetter || '',
			},
		};
	});

	const [errors, setErrors] = useState<Record<string, boolean>>({});

	const updateField = useCallback((sectionDataKey: string, fieldPath: string, value: unknown) => {
		setFormData((prev) => {
			const newData = { ...prev };
			const section = { ...(newData[sectionDataKey] as Record<string, unknown>) };

			setNestedValue(section, fieldPath, value);

			newData[sectionDataKey] = section;
			return newData;
		});

		const sectionKey = sectionDataKey.replace('Data', '');
		const sectionConfig = (appFormConfig as Record<string, unknown>)[sectionKey] as Record<string, unknown> | undefined;
		const fields = (Array.isArray(sectionConfig?.fields) ? sectionConfig.fields : []) as FieldConfig[];
		const arrayFields = ((sectionConfig?.arrayField as Record<string, unknown> | undefined)?.fields || []) as FieldConfig[];
		const fieldConfig =
			fields.find((f) => f.name === fieldPath) ||
			arrayFields.find((f) => fieldPath.endsWith(`.${f.name}`));

		if (fieldConfig?.validator) {
			const validator = validators[fieldConfig.validator];
			const isValid = !value || validator?.(value as string);
			setErrors((prevErrors) => ({
				...prevErrors,
				[`${sectionDataKey}.${fieldPath}`]: !isValid,
			}));
		} else {
			setErrors((prevErrors) => ({
				...prevErrors,
				[`${sectionDataKey}.${fieldPath}`]: false,
			}));
		}
	}, []);

	const updateSection = useCallback((sectionDataKey: string, data: Record<string, unknown>) => {
		setFormData((prev) => ({
			...prev,
			[sectionDataKey]: { ...(prev[sectionDataKey] as Record<string, unknown>), ...data },
		}));
	}, []);

	const validateStep = useCallback(
		(stepIndex: number, steps: string[]) => {
			const sectionKey = steps[stepIndex].toLowerCase();
			const sectionDataKey = `${sectionKey}Data`;
			const sectionConfig = (appFormConfig as Record<string, unknown>)[sectionKey] as Record<string, unknown> | undefined;

			if (!sectionConfig) {
				console.error(`No form configuration found for section: ${sectionKey}`);
				return false;
			}

			const currentSectionData = (formData[sectionDataKey] as Record<string, unknown>) || {};

			const sectionFields = (Array.isArray(sectionConfig.fields) ? sectionConfig.fields : []) as FieldConfig[];
			const regularFieldsResult = validateRegularFields(currentSectionData, sectionDataKey, sectionFields);
			const arrayFieldResult = validateArrayField(sectionConfig.arrayField as ArrayFieldConfig | undefined, currentSectionData, sectionDataKey, sectionKey);

			const newErrors = { ...regularFieldsResult.errors, ...arrayFieldResult.errors };
			const isStepValid = regularFieldsResult.isValid && arrayFieldResult.isValid;

			setErrors((prevErrors) => ({ ...prevErrors, ...newErrors }));

			return isStepValid;
		},
		[formData]
	);

	const hasErrors = useMemo(() => Object.values(errors).some(Boolean), [errors]);

	return {
		formData,
		errors,
		updateField,
		updateSection,
		validateStep,
		hasErrors,
		setFormData,
	};
};

export const useApplicationContext = (): ApplicationContextValue => {
	const context = useContext(ApplicationContext);
	if (context === undefined) {
		throw new Error('useApplicationContext must be used within an ApplicationContextProvider');
	}
	return context;
};
