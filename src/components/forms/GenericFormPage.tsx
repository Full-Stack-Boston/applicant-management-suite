/**
 * Generic Form Page Component
 * Renders a complete form section, including standard fields, lists (arrays), and file management.
 * Contains internal definitions for ArrayFieldForm and ArrayFieldList to handle list data.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Box, Typography, Grid, Button, IconButton } from '@mui/material';
import { homeApplicantSectionTitleSx, homeDashboardIntroBodySx } from '../home/homePageStyles';
import { DeleteForever as DeleteForeverIcon } from '@mui/icons-material';

// Config & Context
import { appFormConfig } from '../../config/ui/formConfig';
import { UploadType } from '../../config/data/collections';
import { blankAttachment } from '../../config/data/Validation';
import { saveFile, getDownloadLinkForFile, deleteFile, invalidateRequest } from '../../config/data/firebase';
import { useAlert } from '../../context/AlertContext';

// Components
import DynamicField from './DynamicField';
import Loader from '../loader/Loader';

import type { ApplicationRecord, ArrayFieldConfig, FieldConfig, FormSectionConfig, GenericFormPageProps } from './types';

// --- Local Types ---

type ShowAlertFn = (category: string, key: string) => void;

type ArrayItem = Record<string, unknown> | string;

interface ValidationOutcomeArgs {
	hasFieldErrors: boolean;
	isArrayError: boolean;
	attemptRef: React.MutableRefObject<{ success: boolean; failure: boolean }>;
	onValidationSuccess?: () => void;
	onValidationFailure?: () => void;
	showAlert: ShowAlertFn;
}

interface FormValidationArgs {
	submissionAttempted: boolean;
	fieldErrors: Record<string, boolean>;
	application: ApplicationRecord;
	sectionConfig: FormSectionConfig;
	onValidationSuccess?: () => void;
	onValidationFailure?: () => void;
	showAlert: ShowAlertFn;
}

// --- Internal Helper Functions ---

const getNestedValue = (obj: ApplicationRecord, path: string): unknown => path?.split('.').reduce<unknown>((acc, part) => (acc as ApplicationRecord | undefined)?.[part], obj);

const setNestedValue = (obj: ApplicationRecord, path: string, value: unknown): ApplicationRecord => {
	const newObj = structuredClone(obj);
	const keys = path.split('.');

	let current: Record<string, unknown> = newObj;
	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		if (current[key] === undefined || current[key] === null) current[key] = {};
		current = current[key] as Record<string, unknown>;
	}
	current[keys[keys.length - 1]] = value;
	return newObj;
};

const checkArrayError = (sectionConfig: FormSectionConfig, application: ApplicationRecord, sectionName: string) => {
	const arrayField = sectionConfig.arrayField;
	if (arrayField?.required) {
		const currentArray = (getNestedValue(application, `${sectionName}.${arrayField.name}`) as unknown[] | undefined) || [];
		if (currentArray.length === 0) return true;
	}
	return false;
};

const processValidationOutcome = ({ hasFieldErrors, isArrayError, attemptRef, onValidationSuccess, onValidationFailure, showAlert }: ValidationOutcomeArgs) => {
	if (!hasFieldErrors && !isArrayError) {
		if (!attemptRef.current.success) {
			onValidationSuccess?.();
			attemptRef.current.success = true;
		}
	} else if (!attemptRef.current.failure) {
		if (isArrayError) showAlert('validation', 'missing');
		else onValidationFailure?.();
		attemptRef.current.failure = true;
	}
};

const useFormValidation = ({ submissionAttempted, fieldErrors, application, sectionConfig, onValidationSuccess, onValidationFailure, showAlert }: FormValidationArgs) => {
	const attemptRef = useRef({ success: false, failure: false });

	useEffect(() => {
		if (!submissionAttempted) {
			attemptRef.current = { success: false, failure: false };
		}
	}, [submissionAttempted]);

	useEffect(() => {
		if (submissionAttempted) {
			const hasFieldErrors = Object.values(fieldErrors).some(Boolean);
			const isArrayError = checkArrayError(sectionConfig, application, sectionConfig?.name);

			processValidationOutcome({
				hasFieldErrors,
				isArrayError,
				attemptRef,
				onValidationSuccess,
				onValidationFailure,
				showAlert,
			});
		}
	}, [submissionAttempted, fieldErrors, onValidationSuccess, onValidationFailure, sectionConfig, application, showAlert]);
};

// --- Internal Helper Components ---

interface ArrayFieldFormProps {
	arrayFieldConfig: ArrayFieldConfig;
	onAdd: (item: Record<string, unknown>) => void;
	onFileAction?: (action: string, fieldPath: string, payload?: unknown) => void;
}

const ArrayFieldForm = ({ arrayFieldConfig, onAdd, onFileAction }: ArrayFieldFormProps) => {
	const [arrayItemInput, setArrayItemInput] = useState<Record<string, unknown>>({});
	const [arrayInputKey, setArrayInputKey] = useState(0);

	const handleInputChange = (fieldName: string, value: unknown) => setArrayItemInput((prev) => ({ ...prev, [fieldName]: value }));

	const handleAddItem = () => {
		onAdd(arrayItemInput);
		setArrayItemInput({});
		setArrayInputKey((prev) => prev + 1);
	};

	return (
		<Box key='array-form' sx={{ width: '100%' }}>
			<Typography component='h3' sx={{ ...homeApplicantSectionTitleSx, fontSize: { xs: '0.9rem', sm: '1rem' }, mb: 1 }}>
				{arrayFieldConfig.label}
			</Typography>
			<Grid container spacing={{ xs: 1, sm: 1.5 }} key={arrayInputKey}>
				{arrayFieldConfig.fields.map((field) => (
					<Grid key={field.name} size={field.grid || { xs: 12 }}>
						<DynamicField
							fieldConfig={field}
							application={{ temp: arrayItemInput }}
							onFieldUpdate={(_path, value) => handleInputChange(field.name ?? '', value)}
							onErrorUpdate={() => {}}
							sectionName='temp'
							forceValidate={false}
							onFileAction={onFileAction}
						/>
					</Grid>
				))}
			</Grid>
			<Button variant='contained' color='secondary' size='small' onClick={handleAddItem} sx={{ mt: 1.5, textTransform: 'none' }}>
				Add
			</Button>
		</Box>
	);
};

const formatCardDetailValue = (value: unknown): string => {
	if (value === null || value === undefined || value === '') return '';
	if (typeof value === 'object') {
		const objectValue = value as { description?: string; structured_formatting?: { main_text?: string } };
		return objectValue.description || objectValue.structured_formatting?.main_text || '';
	}
	return String(value);
};

interface ArrayFieldListProps {
	arrayFieldConfig: ArrayFieldConfig;
	arrayData: ArrayItem[];
	onRemove: (index: number) => void;
}

const ArrayFieldList = ({ arrayFieldConfig, arrayData, onRemove }: ArrayFieldListProps) => (
	<Box
		key='array-list'
		sx={{
			mt: { xs: 1.5, md: 0 },
			maxHeight: '40vh',
			overflowY: 'auto',
			width: '100%',
			minWidth: 0,
		}}>
		{arrayData.length > 0 ? (
			arrayData.map((item, index) => {
				const cardDisplay = arrayFieldConfig.cardDisplay;
				const title = typeof item === 'string' ? item : formatCardDetailValue((cardDisplay?.title ? item[cardDisplay.title] : undefined) || item.title || item.fullName || item.school);
				const subtitle = typeof item === 'string' ? '' : formatCardDetailValue((cardDisplay?.subtitle ? item[cardDisplay.subtitle] : undefined) || item.relation || '');
				const detailParts =
					typeof item === 'string'
						? []
						: (cardDisplay?.details || [])
								.map((detailKey) => formatCardDetailValue(item[detailKey]))
								.filter(Boolean);
				const metaLine = [subtitle, ...detailParts].filter(Boolean).join(' · ');

				return (
					<Box
						key={typeof item === 'object' && item.id ? String(item.id) : index}
						sx={{
							px: 1.5,
							py: 1.25,
							mb: 1,
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							gap: 1,
							borderRadius: 1,
							border: '1px solid',
							borderColor: 'divider',
							bgcolor: 'background.paper',
							minWidth: 0,
						}}>
						<Box sx={{ minWidth: 0, flex: 1, pr: 0.5 }}>
							<Typography variant='body2' sx={{ fontWeight: 600 }} noWrap>
								{title}
							</Typography>
							{metaLine ? (
								<Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }} noWrap>
									{metaLine}
								</Typography>
							) : null}
						</Box>
						<IconButton size='small' onClick={() => onRemove(index)} aria-label='Remove item' sx={{ flexShrink: 0 }}>
							<DeleteForeverIcon fontSize='small' />
						</IconButton>
					</Box>
				);
			})
		) : (
			<Box
				sx={{
					px: 1.5,
					py: 2,
					textAlign: 'center',
					borderRadius: 1,
					border: '1px dashed',
					borderColor: 'divider',
					bgcolor: 'action.hover',
				}}>
				<Typography variant='body2' sx={{ color: 'text.secondary' }}>
					Nothing added yet
				</Typography>
				<Typography variant='caption' sx={{ color: 'text.secondary' }}>
					{arrayFieldConfig.prompt || 'Use the form to add new entries.'}
				</Typography>
			</Box>
		)}
	</Box>
);

// --- Main Component ---

const GenericFormPage = ({ sectionName, application, setApplication, setHasErrors, submissionAttempted, onValidationSuccess, onValidationFailure, applicationType }: GenericFormPageProps) => {
	const sectionConfig = useMemo<FormSectionConfig>(
		() => ({ ...(appFormConfig as unknown as Record<string, Omit<FormSectionConfig, 'name'>>)[sectionName], name: sectionName }),
		[sectionName]
	);
	const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
	const [uploading, setUploading] = useState(false);
	const { showAlert, handleError } = useAlert();

	useFormValidation({ submissionAttempted, fieldErrors, application, sectionConfig, onValidationSuccess, onValidationFailure, showAlert });

	const fields = useMemo<FieldConfig[]>(() => {
		if (!sectionConfig?.fields) return [];
		return typeof sectionConfig.fields === 'function' ? sectionConfig.fields(applicationType, application) : sectionConfig.fields;
	}, [sectionConfig, applicationType, application]);

	const memoizedFields = useMemo(
		() =>
			fields.map((field) => {
				if (!field.optionsSource) return field;
				const sourceArray = (getNestedValue(application, `${sectionConfig.name}.${field.optionsSource}`) as Array<Record<string, unknown>> | undefined) || [];
				const dynamicOptions = sourceArray.map((item, idx) => ({ label: `${item.type} | ${item.organization} (${item.role})`, value: idx.toString() }));
				dynamicOptions.unshift({ label: 'Not Active', value: 'undefined' });
				return { ...field, options: dynamicOptions };
			}),
		[application, sectionConfig.name, fields]
	);

	const handleErrorUpdate = useCallback((fieldName: string, isError: boolean) => {
		setFieldErrors((prev) => ({ ...prev, [fieldName]: isError }));
	}, []);

	useEffect(() => {
		setHasErrors(Object.values(fieldErrors).some(Boolean));
	}, [fieldErrors, setHasErrors]);

	const handleFieldUpdate = useCallback(
		(fieldPath: string, value: unknown) => {
			setApplication(setNestedValue(application, fieldPath, value));
		},
		[application, setApplication]
	);

	const handleFileAction = useCallback(
		async (action: string, fieldPath: string, payload?: unknown) => {
			const fieldName = fieldPath.split('.').pop() ?? fieldPath;
			setUploading(true);
			try {
				if (action === 'upload') {
					const file = payload as File | undefined;
					if (!file) return;
					if (!file.type.match('application/pdf')) {
						showAlert('upload', 'type');
						return;
					}
					if (file.size > 25 * 1024 * 1024) {
						showAlert('upload', 'size');
						return;
					}
					const savedFileRef = await saveFile(UploadType.applicationAttachment, String(application.id), fieldName, file);
					const downloadLink = await getDownloadLinkForFile(savedFileRef);
					const newAttachmentData = { displayName: file.name, home: downloadLink, refLoc: savedFileRef, uploadedBy: 'applicant' };
					handleFieldUpdate(fieldPath, newAttachmentData);
					showAlert('upload', 'success');
				} else if (action === 'delete') {
					const attachment = (payload ?? {}) as { refLoc?: string; requestID?: string };
					if (attachment.refLoc) await deleteFile(attachment.refLoc);
					else if (attachment.requestID) await invalidateRequest(attachment.requestID);
					handleFieldUpdate(fieldPath, blankAttachment);
					showAlert('upload', 'deleted');
				} else if (action === 'request') {
					handleFieldUpdate(fieldPath, payload);
					showAlert('upload', 'requested');
				}
			} catch (error) {
				handleError(error, `handleFileAction:${action}`);
			} finally {
				setUploading(false);
			}
		},
		[application.id, handleError, showAlert, handleFieldUpdate]
	);

	const handleAddArrayItem = useCallback(
		(arrayItemInput: Record<string, unknown>) => {
			const { arrayField } = sectionConfig;
			if (!arrayField) return;

			const isNewItemValid = arrayField.fields.every((field) => !field.required || arrayItemInput[field.name ?? '']);
			if (!isNewItemValid) {
				showAlert('validation', 'fields');
				return;
			}
			const currentArray = (getNestedValue(application, `${sectionName}.${arrayField.name}`) as unknown[] | undefined) || [];
			const newItem = arrayField.fields.length > 1 ? { ...arrayItemInput, id: uuidv4() } : arrayItemInput[arrayField.fields[0]?.name ?? ''];
			setApplication(setNestedValue(application, `${sectionName}.${arrayField.name}`, [...currentArray, newItem]));
		},
		[sectionConfig, application, sectionName, setApplication, showAlert]
	);

	const handleRemoveArrayItem = useCallback(
		(indexToRemove: number) => {
			const { arrayField } = sectionConfig;
			if (!arrayField) return;
			const currentArray = (getNestedValue(application, `${sectionName}.${arrayField.name}`) as unknown[] | undefined) || [];
			setApplication(
				setNestedValue(
					application,
					`${sectionName}.${arrayField.name}`,
					currentArray.filter((_, i) => i !== indexToRemove)
				)
			);
		},
		[sectionConfig, application, sectionName, setApplication]
	);

	if (!sectionConfig) return <Typography color='error'>Config not found for: {sectionName}</Typography>;
	if (uploading) return <Loader />;

	const layout = sectionConfig.layout || {};
	const arrayData: ArrayItem[] = sectionConfig.arrayField ? (getNestedValue(application, `${sectionName}.${sectionConfig.arrayField.name}`) as ArrayItem[] | undefined) || [] : [];

	const hasRightContent = layout.fields === 'right' || layout.arrayForm === 'right' || layout.arrayList === 'right';

	const formFields = memoizedFields.map((field) => (
		<Grid key={field.name || field.label} size={field.grid || { xs: 12 }}>
			<DynamicField
				fieldConfig={field}
				application={application}
				onFieldUpdate={handleFieldUpdate}
				onErrorUpdate={handleErrorUpdate}
				sectionName={sectionName}
				forceValidate={submissionAttempted}
				onFileAction={handleFileAction}
			/>
		</Grid>
	));

	const arrayFormComponent = sectionConfig.arrayField ? <ArrayFieldForm arrayFieldConfig={sectionConfig.arrayField} onAdd={handleAddArrayItem} onFileAction={handleFileAction} /> : null;

	const arrayListComponent = sectionConfig.arrayField ? <ArrayFieldList arrayFieldConfig={sectionConfig.arrayField} arrayData={arrayData} onRemove={handleRemoveArrayItem} /> : null;

	return (
		<Box sx={{ width: '100%', minWidth: 0, px: { xs: 0, sm: 0.5 } }}>
			<Box sx={{ mb: 2.5, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
				<Typography component='h2' sx={homeApplicantSectionTitleSx}>
					{sectionConfig.intro.title}
				</Typography>
				<Typography variant='body2' color='text.secondary' sx={homeDashboardIntroBodySx}>
					{sectionConfig.intro.description}
				</Typography>
			</Box>

			<Grid container spacing={{ xs: 1, sm: 1.5 }} sx={{ justifyContent: 'flex-start' }}>
				<Grid
					size={{
						xs: 12,
						md: hasRightContent ? 6 : 12,
					}}
					container
					spacing={{ xs: 1, sm: 1.5 }}
					sx={{ minWidth: 0, alignContent: 'flex-start' }}>
					{layout.fields !== 'right' && formFields}
					{layout.arrayForm !== 'right' && arrayFormComponent}
					{layout.arrayList !== 'right' && arrayListComponent}
				</Grid>

				{hasRightContent && (
					<Grid
						size={{
							xs: 12,
							md: 6,
						}}
						container
						spacing={{ xs: 1, sm: 1.5 }}
						sx={{ minWidth: 0, alignContent: 'flex-start' }}>
						{layout.fields === 'right' && formFields}
						{layout.arrayForm === 'right' && arrayFormComponent}
						{layout.arrayList === 'right' && arrayListComponent}
					</Grid>
				)}
			</Grid>
		</Box>
	);
};

export default GenericFormPage;
