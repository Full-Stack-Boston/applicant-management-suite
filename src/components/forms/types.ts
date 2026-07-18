import type { TextFieldProps } from '@mui/material';

export type ApplicationRecord = Record<string, unknown>;

export interface FieldOption {
	id?: string;
	label: string;
	value?: string;
}

export interface FieldConfig {
	name?: string;
	type: string;
	label?: string;
	required?: boolean;
	validator?: string;
	helperText?: string;
	calculatedValue?: string;
	multiline?: boolean;
	rows?: number;
	readOnly?: boolean;
	disabled?: boolean;
	options?: ReadonlyArray<FieldOption | string>;
	optionsSource?: string;
	grid?: { xs?: number; sm?: number; md?: number; lg?: number };
	width?: string;
	dateFormat?: string;
	valueFormatter?: string;
	subtitleFormatter?: string;
	cardDisplay?: { title?: string; subtitle?: string; details?: string[] };
	disableOn?: (permissions: PermissionsMap | undefined) => boolean;
	groups?: Record<string, string[]>;
	fields?: FieldConfig[];
	arrayField?: ArrayFieldConfig;
	allowRequest?: boolean;
}

export interface ArrayFieldConfig {
	name: string;
	label?: string;
	required?: boolean;
	prompt?: string;
	cardDisplay?: { title?: string; subtitle?: string; details?: string[] };
	fields: FieldConfig[];
}

export interface SectionLayoutConfig {
	fields?: string;
	arrayForm?: string;
	arrayList?: string;
}

export interface FormSectionConfig {
	name: string;
	intro: { title: string; description: string };
	fields?: FieldConfig[] | ((applicationType: string | undefined, application: ApplicationRecord) => FieldConfig[]);
	arrayField?: ArrayFieldConfig;
	layout?: SectionLayoutConfig;
}

export type PermissionsMap = Record<string, unknown>;

export interface ApplicationContextValue {
	allowEditing?: boolean;
	loading?: boolean;
	setLoading?: (loading: boolean) => void;
	setAllowEditing?: (allowEditing: boolean) => void;
}

export interface DynamicFieldProps {
	fieldConfig: FieldConfig;
	application: ApplicationRecord;
	onFieldUpdate: (path: string, value: unknown) => void;
	sectionName: string;
	onErrorUpdate: (field: string, hasError: boolean) => void;
	forceValidate?: boolean;
	onFileAction?: (action: string, fieldPath: string, payload?: unknown) => void;
	permissions?: PermissionsMap;
}

export type CommonTextFieldProps = Pick<
	TextFieldProps,
	'fullWidth' | 'margin' | 'required' | 'error' | 'helperText' | 'onBlur' | 'disabled'
>;

export interface GenericFormPageProps {
	sectionName: string;
	application: ApplicationRecord;
	setApplication: React.Dispatch<React.SetStateAction<ApplicationRecord>>;
	setHasErrors: (hasErrors: boolean) => void;
	submissionAttempted: boolean;
	onValidationSuccess?: () => void;
	onValidationFailure?: () => void;
	applicationType?: string;
}

export interface GenericAdminFormProps {
	formConfig: { name: string; fields: FieldConfig[] };
	initialData: ApplicationRecord;
	onSubmit: (formData: ApplicationRecord) => void;
	onFileUpload?: (action: string, fieldPath: string, file: unknown) => void;
	onFieldChange?: (path: string, value: unknown) => void;
	permissions?: PermissionsMap;
}
