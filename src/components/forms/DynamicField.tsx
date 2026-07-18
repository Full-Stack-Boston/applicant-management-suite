/**
 * Dynamic Field Component
 * Renders various form inputs and display fields based on configuration.
 * Includes specialized sub-components for headers, labels, file uploads, and lists.
 */

import React, { useState, useEffect, useContext, memo } from 'react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { v4 as uuidv4 } from 'uuid';
import { Autocomplete, Stack, Avatar, TextField, FormLabel, FormGroup, Checkbox, FormControl, FormControlLabel, FormHelperText, Switch, Select, MenuItem, InputLabel, Box, Typography, Divider, Chip, Grid, Card, Button, InputAdornment } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
	Camera,
	FileUploadOutlined as FileUploadIcon,
	SendOutlined,
	InsertDriveFileOutlined,
	HourglassTopOutlined,
	ScienceOutlined,
	BadgeOutlined,
	CakeOutlined,
	HomeOutlined,
	PhoneOutlined,
	SmartphoneOutlined,
	EmailOutlined,
	SchoolOutlined,
	WorkOutlined,
	PlaceOutlined,
	NumbersOutlined,
	AttachMoneyOutlined,
	FamilyRestroomOutlined,
	GroupsOutlined,
	PersonOutlined,
} from '@mui/icons-material';

// Config & Context
import * as Validators from '../../config/data/Validation';
import { saveCollectionData } from '../../config/data/firebase';
import { collections } from '../../config/data/collections';
import { generateUploadLink, generateSecurePin, generate6DigitNumber } from '../../config/Constants';
import { createDemoPdfFile, resolveAttachmentKey } from '../../config/data/demoAttachments';
import { sendRequest } from '../../config/content/push';
import { formatPlaceAddress } from '../../config/ui/displayFormat';
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { ApplicationContext } from '../../context/ApplicationContext';

// Components
import { VisuallyHiddenInput } from '../visuallyHiddenInput/VisuallyHiddenInput';
import GoogleMaps from '../autocomplete/GoogleAutoComplete';
import type { PlacePrediction } from '../autocomplete/GoogleAutoComplete';
import { homeApplicantDetailLabelSx, homeApplicantSectionTitleSx } from '../home/homePageStyles';

import type { ApplicationContextValue, ApplicationRecord, DynamicFieldProps, FieldConfig, FieldOption, PermissionsMap } from './types';

dayjs.extend(customParseFormat);

const fieldIconSx = { fontSize: 18, color: 'text.secondary' };

const getFieldStartIcon = (name: string | undefined, type: string | undefined) => {
	if (!name) return null;
	const key = name.split('.').pop() || name;
	switch (key) {
		case 'applicantFirstName':
		case 'applicantLastName':
		case 'fullName':
		case 'firstName':
		case 'lastName':
			return <PersonOutlined sx={fieldIconSx} />;
		case 'applicantMiddleInitial':
			return <BadgeOutlined sx={fieldIconSx} />;
		case 'applicantDOB':
			return <CakeOutlined sx={fieldIconSx} />;
		case 'expectedGraduationDate':
			return <SchoolOutlined sx={fieldIconSx} />;
		case 'applicantMailingAddress':
			return <HomeOutlined sx={fieldIconSx} />;
		case 'location':
			return <PlaceOutlined sx={fieldIconSx} />;
		case 'applicantHomePhone':
		case 'homePhone':
			return <PhoneOutlined sx={fieldIconSx} />;
		case 'applicantCellPhone':
		case 'cell':
			return <SmartphoneOutlined sx={fieldIconSx} />;
		case 'applicantEmailAddress':
		case 'email':
			return <EmailOutlined sx={fieldIconSx} />;
		case 'schoolName':
		case 'school':
		case 'major':
		case 'currentGPA':
			return <SchoolOutlined sx={fieldIconSx} />;
		case 'occupation':
		case 'role':
			return <WorkOutlined sx={fieldIconSx} />;
		case 'type':
		case 'organization':
		case 'currentOrganization':
		case 'positions':
			return <GroupsOutlined sx={fieldIconSx} />;
		case 'number':
		case 'age':
			return <NumbersOutlined sx={fieldIconSx} />;
		case 'tuitionCost':
		case 'roomAndBoardCost':
		case 'bookCost':
		case 'commutingCost':
		case 'summerEarnings':
		case 'fallEarnings':
		case 'winterEarnings':
		case 'springEarnings':
		case 'earningsAppliedToEducation':
		case 'savingsAppliedToEducation':
		case 'collegeAward':
		case 'loansAmount':
		case 'p1ExpectedAnnualIncome':
		case 'p2ExpectedAnnualIncome':
		case 'parentInvestmentIncome':
		case 'applicantFamily':
		case 'request':
		case 'amount':
		case 'cost':
			return <AttachMoneyOutlined sx={fieldIconSx} />;
		case 'relation':
			return <FamilyRestroomOutlined sx={fieldIconSx} />;
		default:
			if (type === 'email') return <EmailOutlined sx={fieldIconSx} />;
			if (type === 'address') return <HomeOutlined sx={fieldIconSx} />;
			return null;
	}
};

// --- Helper Functions ---

const getNestedValue = (obj: ApplicationRecord | undefined, path: string | undefined): unknown => {
	if (!path) return undefined;
	return path.split('.').reduce<unknown>((acc, part) => (acc as ApplicationRecord | undefined)?.[part], obj);
};

const interpolateString = (template: string | undefined, data: ApplicationRecord): string => {
	if (!template?.includes('${')) return template ?? '';
	return template.replace(/\$\{(.*?)}/g, (_match: string, path: string) => {
		const value = getNestedValue(data, path.trim());
		if (typeof value === 'number') {
			return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
		}
		return value !== undefined && value !== null ? String(value) : '...';
	});
};

const formatCurrency = (num: string | number | null | undefined) => {
	const number = Number.parseFloat(String(num ?? ''));
	if (Number.isNaN(number)) return '$0.00';
	return `$${number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const sumArray = (application: ApplicationRecord, arrayPath: string, property: string) => {
	const arr = (getNestedValue(application, arrayPath) as Array<Record<string, unknown>> | undefined) || [];
	return arr.reduce((acc: number, item) => acc + (Number.parseFloat(String(item[property])) || 0), 0);
};

const resolveVariable = (application: ApplicationRecord, variable: string): number => {
	const trimmedVar = variable.trim();

	if (!Number.isNaN(Number(trimmedVar)) && trimmedVar !== '') {
		return Number.parseFloat(trimmedVar);
	}

	if (trimmedVar.startsWith('sumArray')) {
		const match = trimmedVar.match(/sumArray\(([\w.]+),\s*['"]?(\w+)['"]?\)/);
		if (match) return sumArray(application, match[1].trim(), match[2].trim());
	}

	// Common formulas
	const specialFormulas: Record<string, string> = {
		otherTotalExpenses: "sumArray(expenses.otherExpenses, 'amount')",
		otherIncomeSources: "sumArray(incomes.otherIncomeSources, 'amount')",
		totalExpenses: "expenses.tuitionCost + expenses.roomAndBoardCost + expenses.bookCost + expenses.commutingCost + sumArray(expenses.otherExpenses, 'amount')",
		totalIncome: "incomes.earningsAppliedToEducation + incomes.savingsAppliedToEducation + incomes.collegeAward + incomes.loansAmount + sumArray(incomes.otherIncomeSources, 'amount')",
		totalProjections: 'projections.applicantFamily + projections.request + totalIncome',
	};

	if (specialFormulas[trimmedVar]) {
		const nested = processFormula(application, specialFormulas[trimmedVar], false);
		return typeof nested === 'number' ? nested : Number(nested) || 0;
	}
	return Number.parseFloat(String(getNestedValue(application, trimmedVar))) || 0;
};

const executeCalculation = (parts: string[], application: ApplicationRecord): number => {
	let total = resolveVariable(application, parts[0]);
	for (let i = 1; i < parts.length; i += 2) {
		const operator = parts[i];
		const value = resolveVariable(application, parts[i + 1]);
		if (operator === '+') total += value;
		else if (operator === '-') total -= value;
		else if (operator === '*') total *= value;
		else if (operator === '/') total /= value;
	}
	return total;
};

const processFormula = (application: ApplicationRecord, formula: string | undefined, formatAsCurrency = true): string | number => {
	if (!formula) return formatAsCurrency ? '$0.00' : 0;

	try {
		if (formula.includes('===')) {
			const [left, right] = formula.split('===').map((part) => resolveVariable(application, part.trim()));
			return Math.abs(left - right) < 0.01 ? 'Yes' : 'No';
		}

		const parts = formula.split(/([+\-*/])/).filter((p: string) => p.trim());
		const total = executeCalculation(parts, application);

		if (Number.isNaN(total)) return formatAsCurrency ? '$0.00' : 0;
		return formatAsCurrency ? formatCurrency(total) : total;
	} catch (e) {
		console.error('Calculation Error:', e, 'Original Formula:', formula);
		return 'Error';
	}
};

// --- Sub-Components ---

const HeaderField = memo(({ interpolatedLabel }: { interpolatedLabel: string }) => (
	<Box sx={{ width: '100%', mt: { xs: 1.25, sm: 1.75 }, mb: 0.25 }}>
		<Typography component='h3' sx={{ ...homeApplicantSectionTitleSx, fontSize: { xs: '0.9rem', sm: '1rem' }, mb: 0.5, letterSpacing: '0.02em' }}>
			{interpolatedLabel}
		</Typography>
		<Divider sx={{ borderColor: 'divider', opacity: 0.7 }} />
	</Box>
));
HeaderField.displayName = 'HeaderField';

const LabelField = memo(({ fieldConfig, value, interpolatedLabel }: { fieldConfig: FieldConfig; value: unknown; interpolatedLabel: string }) => {
	const { name, valueFormatter, dateFormat } = fieldConfig;
	let displayValue = value;

	if (valueFormatter === 'attachmentChip') {
		const attachment = (value || {}) as Record<string, unknown>;
		const chipLabel = String(attachment.displayName || (attachment.requestID ? 'Request Sent' : 'Not Uploaded'));
		return (
			<Box sx={{ width: '100%', my: 0.5, minWidth: 0 }}>
				<Typography component='span' sx={homeApplicantDetailLabelSx}>
					{interpolatedLabel}
				</Typography>
				<Chip sx={{ mt: 0.5 }} label={chipLabel} clickable={Boolean(attachment.home)} onClick={() => attachment.home && window.open(String(attachment.home), '_blank')} color={attachment.home ? 'primary' : 'default'} />
			</Box>
		);
	}

	if (valueFormatter === 'currency') displayValue = formatCurrency(value as string | number | null | undefined);
	else if (typeof value === 'boolean') displayValue = value ? 'Yes' : 'No';
	else if (name?.includes('DOB') || name?.includes('Date')) displayValue = value ? dayjs(value as string).format(dateFormat || 'MM/DD/YYYY') : 'N/A';
	else if (name?.includes('MailingAddress')) displayValue = formatPlaceAddress(value as Parameters<typeof formatPlaceAddress>[0]) || 'N/A';

	return (
		<Box sx={{ width: '100%', my: 0.5, minWidth: 0 }}>
			<Typography component='span' sx={homeApplicantDetailLabelSx}>
				{interpolatedLabel}
			</Typography>
			<Typography variant='body2' sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.45 }}>
				{displayValue !== undefined && displayValue !== null && displayValue !== '' ? String(displayValue) : 'Not Provided'}
			</Typography>
		</Box>
	);
});
LabelField.displayName = 'LabelField';

const CalculatedLabelField = memo(({ interpolatedLabel, value }: { interpolatedLabel: string; value: unknown }) => (
	<Box sx={{ width: '100%', my: 0.5, minWidth: 0 }}>
		<Typography component='span' sx={homeApplicantDetailLabelSx}>
			{interpolatedLabel}
		</Typography>
		<Typography variant='body2' sx={{ fontWeight: 600, wordBreak: 'break-word', lineHeight: 1.45 }}>
			{value === undefined || value === null ? '' : String(value)}
		</Typography>
	</Box>
));
CalculatedLabelField.displayName = 'CalculatedLabelField';

const SummaryListField = memo(({ application, fieldConfig, interpolatedLabel }: { application: ApplicationRecord; fieldConfig: FieldConfig; interpolatedLabel: string }) => {
	const { name = '', cardDisplay = {} } = fieldConfig;
	const listData = (getNestedValue(application, name) as Array<Record<string, unknown> | string>) || [];
	const currentOrgIndex = getNestedValue(application, 'experience.currentOrganization');
	const hasCurrentOrg = currentOrgIndex !== undefined && currentOrgIndex !== null && currentOrgIndex !== 'undefined';

	if (listData.length === 0) {
		return (
			<Box sx={{ width: '100%', my: 1.5 }}>
				<Typography component='span' sx={homeApplicantDetailLabelSx}>
					{interpolatedLabel}
				</Typography>
				<Typography variant='body2' color='text.secondary'>
					No items listed.
				</Typography>
			</Box>
		);
	}

	return (
		<Box sx={{ width: '100%', my: 1.5 }}>
			<Typography component='span' sx={homeApplicantDetailLabelSx}>
				{interpolatedLabel}
			</Typography>
			<Grid container spacing={2} sx={{ mt: 0.25 }}>
				{listData.map((item: Record<string, unknown> | string, index: number) => {
					const key = typeof item === 'object' && item !== null && item.id ? String(item.id) : `summary-item-${index}`;
					if (typeof item === 'string' || (typeof item === 'object' && item !== null && 'school' in item)) {
						const record = item as Record<string, unknown> | string;
						return (
							<Grid key={key} size='auto'>
								<Chip label={typeof record === 'string' ? record : String(record.school ?? '')} />
							</Grid>
						);
					}
					const isCurrentOrg = name === 'experience.positions' && hasCurrentOrg && index === Number.parseInt(String(currentOrgIndex), 10);
					const record = item as Record<string, unknown>;
					return (
						<Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
							<Card variant='outlined' sx={{ p: 2, height: '100%', border: isCurrentOrg ? '3px solid black' : undefined, boxShadow: isCurrentOrg ? 4 : 1 }}>
								{cardDisplay.title && (
									<Typography variant='subtitle1' sx={{ fontWeight: 'bold' }}>
										{String(record[cardDisplay.title] ?? '')}
									</Typography>
								)}
								{cardDisplay.subtitle && (
									<Typography variant='body2' color='text.secondary'>
										{fieldConfig.subtitleFormatter === 'currency' ? formatCurrency(record[cardDisplay.subtitle] as string | number) : String(record[cardDisplay.subtitle] ?? '')}
									</Typography>
								)}
								{cardDisplay.details?.map((detailKey: string) => (
									<Typography key={detailKey} variant='caption' sx={{ display: 'block' }}>
										{`${detailKey.charAt(0).toUpperCase() + detailKey.slice(1)}: ${String(record[detailKey] ?? '')}`}
									</Typography>
								))}
							</Card>
						</Grid>
					);
				})}
			</Grid>
		</Box>
	);
});
SummaryListField.displayName = 'SummaryListField';

const FileField = memo(({ fieldConfig, valuePath, onFieldUpdate, application, onFileAction }: { fieldConfig: FieldConfig; valuePath: string; onFieldUpdate: DynamicFieldProps['onFieldUpdate']; application: ApplicationRecord; onFileAction: (action: string, payload?: unknown) => void }) => {
	const { showDialog } = useDialog();
	const { showAlert } = useAlert();
	const value = getNestedValue(application, valuePath) as Record<string, unknown> | undefined;
	const attachmentType = resolveAttachmentKey(fieldConfig.name ?? '');
	const applicantFirstName = getNestedValue(application, 'profile.applicantFirstName') || '';
	const applicantLastName = getNestedValue(application, 'profile.applicantLastName') || '';
	const fromName = `${applicantFirstName} ${applicantLastName}`.trim();
	const hasUploadedFile = Boolean(value?.displayName);
	const hasPendingRequest = Boolean(value?.requestID) && !hasUploadedFile;

	const handleRequestRecommendation = () => {
		showDialog({
			id: 'requestRecommendation',
			data: {
				fromName,
				attachmentType,
			},
			callback: async (value: unknown) => {
				const result = value as Record<string, unknown> | null;
				if (result) {
					try {
						const requestId = uuidv4();
						const pin = generate6DigitNumber();
						const securePin = await generateSecurePin(pin);
						const uploadLink = await generateUploadLink(requestId);
						const attachmentsField = application.attachments as string | { attachmentsID?: string } | undefined;
						const attachmentsID =
							(typeof attachmentsField === 'string' ? attachmentsField : undefined) ||
							(typeof attachmentsField === 'object' ? attachmentsField?.attachmentsID : undefined) ||
							(application.attachmentsID as string | undefined);

						const requestData = {
							id: requestId,
							...result,
							fromName: result.fromName || fromName,
							fromId: getNestedValue(application, 'profile.applicantID'),
							applicationID: application.id,
							attachmentType,
							attachmentsID,
							status: 'Pending',
							expiryDate: dayjs().add(14, 'day').format('MM/DD/YYYY'),
							pinCode: securePin,
							attempts: 0,
							completed: false,
						};

						await saveCollectionData(collections.requests, requestId, requestData);
						await sendRequest(requestData, uploadLink, pin);
						onFieldUpdate(valuePath, { ...((value ?? {}) as Record<string, unknown>), requestID: requestId });

						showAlert({ message: 'Recommendation request sent!', type: 'success' });
					} catch (err) {
						console.error('Failed to send recommendation request:', err);
						showAlert({ message: 'Failed to send request. Please try again.', type: 'error' });
					}
				}
			},
		});
	};

	const handleSimulateUpload = () => {
		onFileAction('upload', createDemoPdfFile(fieldConfig.name ?? ''));
	};

	return (
		<Box
			sx={{
				my: 1,
				px: { xs: 1.5, sm: 2 },
				py: 1.5,
				borderRadius: 1.5,
				border: '1px solid',
				borderColor: 'divider',
				bgcolor: 'background.paper',
			}}>
			<Typography
				component='h3'
				sx={{
					...homeApplicantSectionTitleSx,
					fontSize: { xs: '0.9rem', sm: '0.95rem' },
					mb: 1.25,
					letterSpacing: '0.01em',
				}}>
				{fieldConfig.label}
				{fieldConfig.required ? ' *' : ''}
			</Typography>

			<Stack
				direction={{ xs: 'column', sm: 'row' }}
				spacing={1.25}
				sx={{
					alignItems: { xs: 'stretch', sm: 'center' },
					justifyContent: 'space-between',
				}}>
				<Stack direction='row' spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
					<Button component='label' variant='contained' size='small' color='secondary' disabled={fieldConfig.readOnly} startIcon={<FileUploadIcon />} sx={{ textTransform: 'none' }}>
						{hasUploadedFile ? 'Replace file' : 'Upload file'}
						<VisuallyHiddenInput type='file' accept='.pdf' onChange={(e) => e.target.files?.[0] && onFileAction('upload', e.target.files[0])} />
					</Button>
					{!hasUploadedFile && (
						<Button variant='outlined' size='small' disabled={fieldConfig.readOnly} startIcon={<ScienceOutlined />} onClick={handleSimulateUpload} sx={{ textTransform: 'none' }}>
							Simulate upload
						</Button>
					)}
					{fieldConfig.allowRequest && !hasUploadedFile && (
						<Button variant='outlined' size='small' disabled={fieldConfig.readOnly || hasPendingRequest} startIcon={<SendOutlined />} onClick={handleRequestRecommendation} sx={{ textTransform: 'none' }}>
							{hasPendingRequest ? 'Request pending' : 'Request letter'}
						</Button>
					)}
				</Stack>

				{hasUploadedFile ? (
					<Chip
						icon={<InsertDriveFileOutlined />}
						label={String(value?.displayName ?? '')}
						onClick={value?.home ? () => window.open(String(value.home), '_blank') : undefined}
						onDelete={fieldConfig.readOnly ? undefined : () => onFileAction('delete', value)}
						variant='outlined'
						sx={{
							maxWidth: { xs: '100%', sm: 320 },
							justifyContent: 'flex-start',
							'& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
						}}
					/>
				) : hasPendingRequest ? (
					<Chip icon={<HourglassTopOutlined />} label='Request sent' color='secondary' onDelete={fieldConfig.readOnly ? undefined : () => onFileAction('delete', value)} sx={{ maxWidth: { xs: '100%', sm: 320 } }} />
				) : null}
			</Stack>
		</Box>
	);
});
FileField.displayName = 'FileField';

const PictureUploadField = memo(({ fieldConfig, value, onFileAction }: { fieldConfig: FieldConfig; value?: { home?: string }; onFileAction: (action: string, payload?: unknown) => void }) => {
	const config = useConfig() as { DEFAULT_AVATAR?: string };
	return (
		<Stack direction='row' spacing={4} sx={{ alignItems: 'center' }}>
			<Avatar sx={{ width: 75, height: 75 }} src={value?.home || config.DEFAULT_AVATAR} />
			<Button size='small' component='label' variant='contained' color='secondary' startIcon={<Camera />}>
				{value?.home ? 'Change Picture' : 'Upload Picture'}
				<VisuallyHiddenInput name={fieldConfig.name} onChange={(e) => e.target.files?.[0] && onFileAction('upload', e.target.files[0])} type='file' accept='image/*' />
			</Button>
		</Stack>
	);
});
PictureUploadField.displayName = 'PictureUploadField';

const SingleFileField = memo(({ fieldConfig, value, onFieldUpdate }: { fieldConfig: FieldConfig; value?: File | null; onFieldUpdate: DynamicFieldProps['onFieldUpdate'] }) => {
	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) onFieldUpdate(fieldConfig.name ?? '', file);
	};

	return (
		<Stack direction='row' spacing={2} sx={{ mt: 2, alignItems: 'center' }}>
			<Button component='label' variant='outlined' startIcon={<FileUploadIcon />} sx={{ textTransform: 'none', height: '55px', width: '100%' }}>
				{value ? 'Change File' : 'Select File'}
				<VisuallyHiddenInput type='file' onChange={handleFileChange} />
			</Button>
			{value && (
				<Typography variant='body2' noWrap sx={{ width: '100%' }}>
					{value.name}
				</Typography>
			)}
		</Stack>
	);
});
SingleFileField.displayName = 'SingleFileField';

const PermissionGroupField = memo(({ fieldConfig, value, onFieldUpdate }: { fieldConfig: FieldConfig; value?: PermissionsMap; onFieldUpdate: DynamicFieldProps['onFieldUpdate'] }) => {
	const handlePermissionChange = (path: string, checked: boolean) => {
		onFieldUpdate(path, checked);
	};

	const getNestedPermission = (obj: PermissionsMap | undefined, path: string) => path.split('.').reduce<unknown>((acc, part) => (acc as PermissionsMap | undefined)?.[part], obj);

	const formatPermissionLabel = (key: string) => {
		let label = key.split('.').pop() ?? key;
		if (label.startsWith('can') && label.length > 3) label = label.substring(3);
		return label.charAt(0).toUpperCase() + label.slice(1);
	};

	return (
		<Box sx={{ color: 'text.active', width: '100%' }}>
			{Object.entries(fieldConfig.groups ?? {}).map(([groupLabel, groupPermissions]) => (
				<FormControl key={groupLabel} component='fieldset' sx={{ mb: 2, width: '100%' }}>
					<FormLabel component='legend'>{groupLabel}</FormLabel>
					<FormGroup row>
						{groupPermissions.map((permissionKey: string) => {
							const path = `${fieldConfig.name}.${permissionKey}`;
							const isChecked = Boolean(getNestedPermission(value, permissionKey));
							const label = formatPermissionLabel(permissionKey);
							return <FormControlLabel key={permissionKey} control={<Checkbox checked={isChecked} onChange={(e) => handlePermissionChange(path, e.target.checked)} />} label={label} />;
						})}
					</FormGroup>
				</FormControl>
			))}
		</Box>
	);
});
PermissionGroupField.displayName = 'PermissionGroupField';

// --- Main Component ---

const DynamicField = ({ fieldConfig, application, onFieldUpdate, sectionName, onErrorUpdate, forceValidate, onFileAction, permissions }: DynamicFieldProps) => {
	const { name = '', type, required, validator, helperText, calculatedValue } = fieldConfig;
	const { allowEditing } = (useContext(ApplicationContext) as ApplicationContextValue | null) ?? { allowEditing: true };

	const isSpecialType = ['header', 'label', 'summaryList', 'calculatedLabel'].includes(type);
	const valuePath = isSpecialType || sectionName === 'attachments' ? name : `${sectionName}.${name}`;
	const value = calculatedValue ? processFormula(application, calculatedValue) : getNestedValue(application, valuePath);
	const interpolatedLabel = interpolateString(fieldConfig.label, application);

	const [touched, setTouched] = useState(false);
	const [error, setError] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const isDynamicallyDisabled = fieldConfig.disableOn ? fieldConfig.disableOn(permissions) : false;

	useEffect(() => {
		if (['header', 'label', 'calculatedLabel', 'summaryList', 'file'].includes(type)) {
			onErrorUpdate(name, false);
			return;
		}

		let isInvalid = false;
		let msg = '';
		const addressDescription = type === 'address' && value && typeof value === 'object' ? String((value as Record<string, unknown>).description || '').trim() : '';
		const isEmpty =
			value === null ||
			value === undefined ||
			value === '' ||
			(type === 'address' && !addressDescription);

		if (required && isEmpty) {
			isInvalid = true;
			msg = 'This field is required.';
		} else if (!isEmpty && validator) {
			const validatorFunc = Validators[validator as keyof typeof Validators] as ((input: unknown) => boolean) | undefined;
			if (typeof validatorFunc === 'function' && !validatorFunc(value)) {
				isInvalid = true;
				msg = helperText || `Invalid input.`;
			}
		}

		const shouldShowError = Boolean((touched || forceValidate) && isInvalid);
		setError(shouldShowError);
		setErrorMessage(shouldShowError ? msg : '');
		onErrorUpdate(name, isInvalid);
	}, [value, required, validator, name, onErrorUpdate, touched, forceValidate, helperText, type]);

	const handleChange = (eventOrValue: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string | null) => {
		onFieldUpdate(valuePath, eventOrValue && typeof eventOrValue === 'object' && 'target' in eventOrValue ? eventOrValue.target.value : eventOrValue);
	};

	const handleBlur = () => setTouched(true);

	const handleFileAction = (action: string, payload?: unknown) => {
		if (onFileAction) onFileAction(action, valuePath, payload);
	};

	const commonTextFieldProps = {
		fullWidth: true,
		margin: 'normal' as const,
		required,
		error,
		helperText: error ? errorMessage : helperText,
		onBlur: handleBlur,
		disabled: !allowEditing || fieldConfig.readOnly || isDynamicallyDisabled,
	};

	const startIcon = getFieldStartIcon(name, type);
	const startAdornment = startIcon ? <InputAdornment position='start'>{startIcon}</InputAdornment> : undefined;

	const fieldProps = {
		fieldConfig,
		application,
		value,
		interpolatedLabel,
		allowEditing,
		commonTextFieldProps,
		handleChange,
		handleBlur,
		valuePath,
		onFieldUpdate,
		onFileAction: handleFileAction,
	};

	switch (type) {
		case 'header':
			return <HeaderField {...fieldProps} />;
		case 'label':
			return <LabelField {...fieldProps} />;
		case 'calculatedLabel':
			return <CalculatedLabelField {...fieldProps} />;
		case 'summaryList':
			return <SummaryListField {...fieldProps} />;
		case 'file':
			return <FileField {...fieldProps} />;
		case 'singleFile':
			return <SingleFileField fieldConfig={fieldConfig} value={value as File | null | undefined} onFieldUpdate={onFieldUpdate} />;
		case 'pictureUpload':
			return <PictureUploadField fieldConfig={fieldConfig} value={value as { home?: string } | undefined} onFileAction={handleFileAction} />;
		case 'permissionGroup':
			return <PermissionGroupField fieldConfig={fieldConfig} value={value as PermissionsMap | undefined} onFieldUpdate={onFieldUpdate} />;

		case 'text':
		case 'email':
			return (
				<TextField
					{...commonTextFieldProps}
					label={interpolatedLabel}
					name={name}
					value={value || ''}
					onChange={handleChange}
					multiline={fieldConfig.multiline}
					rows={fieldConfig.rows}
					slotProps={startAdornment ? { input: { startAdornment } } : undefined}
				/>
			);
		case 'number':
			return (
				<TextField
					{...commonTextFieldProps}
					type='text'
					label={interpolatedLabel}
					name={name}
					value={value || ''}
					onChange={handleChange}
					slotProps={startAdornment ? { input: { startAdornment } } : undefined}
				/>
			);
		case 'autocomplete': {
			const autocompleteOptions = (fieldConfig.options || []).filter((opt): opt is FieldOption => typeof opt === 'object');
			return (
				<Autocomplete
					options={autocompleteOptions}
					getOptionLabel={(option) => option.label || ''}
					value={autocompleteOptions.find((opt) => opt.id === value) || null}
					onChange={(_event, newValue) => handleChange(newValue?.id || '')}
					isOptionEqualToValue={(option, optionValue) => option.id === optionValue.id}
					renderInput={(params) => (
						<TextField
							{...params}
							label={interpolatedLabel}
							{...commonTextFieldProps}
							slotProps={{
								...params.slotProps,
								input: {
									...params.slotProps?.input,
									...(startAdornment ? { startAdornment } : {}),
								},
							}}
						/>
					)}
					disabled={!allowEditing || fieldConfig.readOnly}
				/>
			);
		}
		case 'date':
			return (
				<LocalizationProvider dateAdapter={AdapterDayjs}>
					<DatePicker
						label={interpolatedLabel}
						value={value ? dayjs(value as string | number | Date) : null}
						onChange={(newValue) => handleChange(newValue?.isValid() ? newValue.format('YYYY-MM-DD') : null)}
						onClose={handleBlur}
						slotProps={{
							textField: {
								...commonTextFieldProps,
								...(startAdornment ? { slotProps: { input: { startAdornment } } } : {}),
							},
						}}
						disabled={!allowEditing || fieldConfig.readOnly}
						views={fieldConfig.dateFormat === 'MM/YYYY' ? ['month', 'year'] : ['year', 'month', 'day']}
					/>
				</LocalizationProvider>
			);
		case 'address':
			return (
				<GoogleMaps
					label={interpolatedLabel}
					location={(value ?? null) as PlacePrediction | null}
					changeLocation={(addressObject) => {
						setTouched(true);
						onFieldUpdate(valuePath, addressObject);
					}}
					disabled={!allowEditing || fieldConfig.readOnly}
					error={error}
					helperText={error ? errorMessage : undefined}
				/>
			);
		case 'switch':
			return <FormControlLabel control={<Switch checked={!!value} onChange={(e) => onFieldUpdate(valuePath, e.target.checked)} name={name} disabled={!allowEditing || fieldConfig.readOnly} />} label={interpolatedLabel} sx={{ mt: 2 }} />;
		case 'dropdown': {
			const { helperText: fieldHelperText, error: isError, required: isRequired, onBlur: onFieldBlur, disabled: isDisabled, fullWidth: isFullWidth, margin: fieldMargin } = commonTextFieldProps;
			return (
				<FormControl fullWidth={isFullWidth} margin={fieldMargin} required={isRequired} error={isError} disabled={isDisabled}>
					<InputLabel>{interpolatedLabel}</InputLabel>
					<Select name={name} value={(value as string) || ''} onChange={(event) => onFieldUpdate(valuePath, event.target.value)} onBlur={onFieldBlur} label={interpolatedLabel}>
						{(fieldConfig.options || []).map((opt) => (
							<MenuItem key={typeof opt === 'object' ? (opt.value ?? opt.id) : opt} value={typeof opt === 'object' ? (opt.value ?? opt.id) : opt}>
								{typeof opt === 'object' ? opt.label : opt}
							</MenuItem>
						))}
					</Select>
					{fieldHelperText && <FormHelperText>{fieldHelperText}</FormHelperText>}
				</FormControl>
			);
		}
		default:
			return <p>Unsupported field type: {type}</p>;
	}
};


export default DynamicField;
