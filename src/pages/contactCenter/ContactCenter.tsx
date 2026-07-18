/**
 * CONTACT CENTER (Bulk Messaging)
 * ---------------------------------------------------------------------------
 * This page allows Admins (Members) to send Emails and SMS to various user groups.
 *
 * * FEATURES:
 * 1. Audience Segmentation: Automatically groups users by Application Type (New vs. Returning).
 * 2. Template System: Renders buttons for pre-defined messages (Acceptance, Rejection, Nudges).
 * 3. Custom Blasts: Allows writing free-form HTML emails to ad-hoc lists.
 * 4. Preset Loaders: "Add Preset" buttons quickly populate the recipient list with bulk groups.
 */

import { useEffect, useCallback, useReducer, useState, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { doc, collection, writeBatch, serverTimestamp, type DocumentData } from 'firebase/firestore';
import type { SelectChangeEvent } from '@mui/material';

// UI Components
import { Alert, Box, Button, Typography, TextField, Autocomplete, Chip, Select, MenuItem, FormControl, InputLabel, FormControlLabel, Switch, Grid, Menu } from '@mui/material';
import { adminPageHeaderSx, adminPagePanelSx, adminPageTitleSx, getAdminPageTitleColor } from '../../config/ui/adminPageStyles';
import { FiberNewOutlined as NewIcon, KeyboardReturnOutlined as ReturningIcon, SchoolOutlined as SchoolIcon, GroupAddOutlined as GroupAddIcon, CloseOutlined, AlternateEmail as AliasIcon, ArrowDropDown as ArrowDropDownIcon } from '@mui/icons-material';
import EmailLogsDialog from '../../components/dialogs/EmailLogsDialog';
import TemplateManagerDialog from '../../components/dialogs/TemplateManagerDialog';
import { DEMO_EMAIL_BANNER, isDemoEmailMode, withSimulatedDelivery } from '../../config/content/emailDelivery';

// Contexts
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { useConfig } from '../../context/ConfigContext';
import { useAlert } from '../../context/AlertContext';
import { useDialog } from '../../context/DialogContext';
import { useAuth } from '../../context/AuthContext';
import { useMailbox } from '../../context/MailboxContext';

// Backend & Config
import { send, templates as staticTemplateGroups } from '../../config/content/push';
import { useEmailTemplates } from '../../context/EmailTemplateContext';
import { getRealTimeApplicationsByWindow, getRealTimeCollection, getRealTimeApplicantsByApplicationID, db } from '../../config/data/firebase';
import { brand, emailHeader, staticEmailFooter, senders as staticSenders } from '../../config/Constants';
import { ApplicationType, collections } from '../../config/data/collections';
import '../memberDash/memberDash.scss';

// =============================================================================
//  STATE MANAGEMENT (Reducer)
// =============================================================================

/** A selectable contact (recipient, CC, sender, or SMS target). */
type ContactUser = {
	id: string;
	name?: string;
	email?: string;
	cell?: string;
	alias?: string;
	isSystem?: boolean;
};

interface ContactCenterState {
	recipients: ContactUser[];
	sender: ContactUser | '';
	cc: ContactUser[];
	smsRecipients: ContactUser[];
	override: boolean;
	applicantEmails: ContactUser[];
	applicantCells: ContactUser[];
	newApplicantEmails: ContactUser[];
	newApplicantCells: ContactUser[];
	returningApplicantEmails: ContactUser[];
	returningApplicantCells: ContactUser[];
	scholarshipApplicantEmails: ContactUser[];
	scholarshipApplicantCells: ContactUser[];
	memberEmails: ContactUser[];
	memberCells: ContactUser[];
	memberAliases: ContactUser[];
	allUserEmails: ContactUser[];
	allCC: ContactUser[];
	allUserCells: ContactUser[];
	availableSenders: ContactUser[];
}

/** State keys holding ContactUser lists that presets/removals operate on. */
type ContactListField = 'recipients' | 'cc' | 'smsRecipients' | 'newApplicantEmails' | 'newApplicantCells' | 'returningApplicantEmails' | 'returningApplicantCells' | 'scholarshipApplicantEmails' | 'scholarshipApplicantCells';

type ContactCenterAction =
	| { type: 'SET_FIELD'; field: ContactListField | 'override' | 'sender'; payload: unknown }
	| { type: 'SET_DATA_LISTS'; payload: { applicants?: ContactUser[]; members?: ContactUser[]; prefilled?: ContactUser[] } }
	| { type: 'PREFILL_DATA'; payload: { prefilledRecipients?: ContactUser[]; prefilledSms?: ContactUser[] } }
	| { type: 'INITIALIZE_SENDERS'; payload: ContactUser[] }
	| { type: 'RESET_FORM' };

const initialState: ContactCenterState = {
	recipients: [], // Selected To: list
	sender: '', // Selected From: address
	cc: [], // Selected CC: list
	smsRecipients: [], // Selected SMS list
	override: false, // If true, ignores user's "Unsubscribe" preferences

	// Calculated Lists (Available for Presets)
	applicantEmails: [],
	applicantCells: [],
	newApplicantEmails: [],
	newApplicantCells: [],
	returningApplicantEmails: [],
	returningApplicantCells: [],
	scholarshipApplicantEmails: [],
	scholarshipApplicantCells: [],
	memberEmails: [],
	memberCells: [],
	memberAliases: [],

	// Combined Lists (For Autocomplete Options)
	allUserEmails: [],
	allCC: [],
	allUserCells: [],
	availableSenders: [],
};

/**
 * Merges two lists of user objects, removing duplicates based on ID or Email.
 */
const combineUnique = (list1: ContactUser[] = [], list2: ContactUser[] = []): ContactUser[] => {
	const map = new Map<string, ContactUser>();
	for (const item of [...list1, ...list2]) {
		if (item && (item.id || item.email)) {
			map.set(item.email || item.id, item);
		}
	}
	return Array.from(map.values());
};

function reducer(state: ContactCenterState, action: ContactCenterAction): ContactCenterState {
	switch (action.type) {
		case 'SET_FIELD':
			return { ...state, [action.field]: action.payload } as ContactCenterState;

		case 'SET_DATA_LISTS': {
			// updates the "pool" of available users when Firestore data changes
			const { applicants = state.applicantEmails, members = state.memberEmails, prefilled = [] } = action.payload;

			const applicantCells = applicants.map((u) => ({ id: u.id, name: u.name, cell: u.cell })).filter((u) => u.cell);
			const memberCells = members.map((u) => ({ id: u.id, name: u.name, cell: u.cell })).filter((u) => u.cell);
			const memberAliases = members.map((u) => ({ id: u.id, name: u.name, email: u.alias })).filter((u) => u.email);

			return {
				...state,
				applicantEmails: applicants,
				memberEmails: members,
				applicantCells,
				memberCells,
				memberAliases,
				allUserEmails: combineUnique(combineUnique(applicants, members), prefilled),
				allUserCells: combineUnique(
					combineUnique(applicantCells, memberCells),
					prefilled.filter((p) => p.cell)
				),
				allCC: combineUnique(
					members,
					state.availableSenders.filter((s) => !s.isSystem)
				),
			};
		}

		case 'PREFILL_DATA': {
			// Called when navigating from another page (e.g., "Email This User" button)
			const { prefilledRecipients = [], prefilledSms = [] } = action.payload;
			return {
				...state,
				recipients: prefilledRecipients,
				smsRecipients: prefilledSms,
				allUserEmails: combineUnique(state.allUserEmails, prefilledRecipients),
				allUserCells: combineUnique(state.allUserCells, prefilledSms),
			};
		}

		case 'INITIALIZE_SENDERS':
			return {
				...state,
				availableSenders: action.payload,
				allCC: combineUnique(
					state.memberEmails,
					action.payload.filter((s) => !s.isSystem)
				),
			};

		case 'RESET_FORM':
			return { ...state, recipients: [], cc: [], smsRecipients: [], sender: '' };

		default:
			throw new Error(`Unhandled action type: ${(action as { type: string }).type}`);
	}
}

// =============================================================================
//  HELPER LOGIC
// =============================================================================

/**
 * Groups active applications by type (New vs. Returning) to populate the preset lists.
 */
interface AppTypeBucket {
	ids: Set<string>;
	handler: (applicants: DocumentData[]) => void;
}

interface TemplateOption {
	name: string;
	label: string;
	requiredFields?: { name: string; label: string; type: string }[];
}

interface TemplateGroup {
	title: string;
	options: TemplateOption[];
}

/** freeSolo Autocomplete entries may be raw strings until normalized on change. */
const contactId = (entry: string | ContactUser): string => (typeof entry === 'string' ? entry : entry.id);

const processApplications = (currentApplications: DocumentData[], appTypeMap: Record<string, AppTypeBucket>) => {
	// 1. Buckets IDs into Sets based on application type
	for (const app of currentApplications) {
		if (appTypeMap[app.type]?.ids && app.completedBy) {
			appTypeMap[app.type].ids.add(app.completedBy);
		}
	}

	// 2. Fetches the actual applicant profiles for those IDs
	const innerUnsubs = Object.values(appTypeMap)
		.map((typeInfo) => {
			if (typeInfo.ids.size > 0) {
				return getRealTimeApplicantsByApplicationID(Array.from(typeInfo.ids), typeInfo.handler);
			}
			typeInfo.handler([]);
			return null;
		})
		.filter(Boolean);

	return () => {
		for (const unsub of innerUnsubs) {
			unsub?.();
		}
	};
};

// =============================================================================
//  MAIN COMPONENT
// =============================================================================

const ContactCenter = () => {
	// --- Contexts ---
	const { darkMode, boxShadow } = useTheme();
	const { showAlert, handleError } = useAlert();
	const { showDialog } = useDialog();
	const { member } = useAuth();
	const { permittedAliases } = useMailbox();
	const config = useConfig();

	// --- Navigation & State ---
	const location = useLocation();
	const navigate = useNavigate();
	const [state, dispatch] = useReducer(reducer, initialState);

	// Local state for Presets Dropdown Menus
	const [allMembersData, setAllMembersData] = useState<DocumentData[]>([]);
	const [recipientPresetAnchorEl, setRecipientPresetAnchorEl] = useState<HTMLElement | null>(null);
	const [ccPresetAnchorEl, setCcPresetAnchorEl] = useState<HTMLElement | null>(null);
	const [smsPresetAnchorEl, setSmsPresetAnchorEl] = useState<HTMLElement | null>(null);

	useTitle({ title: 'Contact Center', appear: false });
	const { templates: emailTemplates } = useEmailTemplates();

	const groupedTemplates = (emailTemplates || []).reduce<Record<string, TemplateGroup>>((acc, config) => {
		const group = (config.group as string) || 'Canned Notifications';
		if (!acc[group]) acc[group] = { title: group, options: [] };
		acc[group].options.push({ name: (config.id || config.key) as string, label: config.label as string, requiredFields: config.requiredFields as TemplateOption['requiredFields'] });
		return acc;
	}, {});
	const groupOrder = ['Canned Notifications', 'Reminders', 'Deadline', 'Application Status'];
	const dynamicGroups = groupOrder.map((title) => groupedTemplates[title]).filter(Boolean);
	const templates = dynamicGroups.length > 0 ? dynamicGroups : staticTemplateGroups;


	// --- Data Transformers ---

	const createHandler = useCallback(
		(filter: 'email' | 'sms') =>
			(data: DocumentData[]): ContactUser[] => {
				return data
					.filter((u) => {
						if (state.override) return true;
						const notifications = u.notifications as { email?: boolean; sms?: boolean } | undefined;
						return filter === 'email' ? notifications?.email : notifications?.sms;
					})
					.map((u) => ({
						id: u.id,
						name: `${u.firstName} ${u.lastName}`,
						email: u.email,
						cell: u.cell,
						alias: u.alias,
					}));
			},
		[state.override]
	);

	// --- Effect 1: Handle Pre-filled Data (from Navigation State) ---
	useEffect(() => {
		const prefilledState = location.state as { prefilledRecipients?: ContactUser[]; prefilledSms?: ContactUser[] } | null;
		if (prefilledState && (prefilledState.prefilledRecipients || prefilledState.prefilledSms)) {
			dispatch({ type: 'PREFILL_DATA', payload: prefilledState });
			// Clear state so refresh doesn't re-trigger
			navigate(location.pathname, { replace: true, state: {} });
		}
	}, [location.state, navigate, location.pathname]);

	// --- Effect 2: Initialize "From" Senders ---
	useEffect(() => {
		const dynamicSenders: ContactUser[] = staticSenders.map((s) => ({ ...s, isSystem: true }));

		// Add User's Personal Alias
		if (member?.alias) {
			dynamicSenders.push({
				id: member.id,
				name: `${member.firstName} | ${brand.organizationShortName}`,
				email: member.alias as string,
				isSystem: false,
			});
		}

		// Add Permitted Group Aliases (e.g. admin@)
		for (const alias of permittedAliases) {
			const groupEmail = `${alias}@${brand.emailDomain}`;
			if (!dynamicSenders.some((s) => s.email === groupEmail)) {
				dynamicSenders.push({
					id: alias,
					name: brand.organizationShortName,
					email: groupEmail,
					isSystem: false,
				});
			}
		}

		dispatch({ type: 'INITIALIZE_SENDERS', payload: dynamicSenders });
	}, [member, permittedAliases]);

	// --- Effect 3: Fetch Real-Time User Lists ---
	useEffect(() => {
		const unsubApplicants = getRealTimeCollection(collections.applicants, (data) => {
			dispatch({ type: 'SET_DATA_LISTS', payload: { applicants: createHandler('email')(data) } });
		});

		const unsubMembers = getRealTimeCollection(collections.members, (data) => {
			setAllMembersData(data);
			dispatch({ type: 'SET_DATA_LISTS', payload: { members: createHandler('email')(data) } });
		});

		return () => {
			unsubApplicants?.();
			unsubMembers?.();
		};
	}, [state.override, createHandler, dispatch]);

	// --- Effect 4: Segment Applicants by Type (New vs Returning) ---
	const createApplicantUpdateHandler = useCallback(
		(emailField: ContactListField, cellField: ContactListField) => (applicants: DocumentData[]) => {
			const emails = applicants.filter((u) => state.override || (u.notifications as { email?: boolean } | undefined)?.email).map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, email: u.email }));

			const cells = applicants.filter((u) => state.override || (u.notifications as { sms?: boolean } | undefined)?.sms).map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, cell: u.cell }));

			dispatch({ type: 'SET_FIELD', field: emailField, payload: emails });
			dispatch({ type: 'SET_FIELD', field: cellField, payload: cells });
		},
		[state.override]
	);

	useEffect(() => {
		const cycleYear = typeof config?.CYCLE_YEAR === 'number' ? config.CYCLE_YEAR : config?.APPLICATION_DEADLINE ? new Date(config.APPLICATION_DEADLINE as string).getFullYear() : null;
		if (!cycleYear) return;

		const appTypeMap: Record<string, AppTypeBucket> = {
			[ApplicationType.newApplication]: { ids: new Set(), handler: createApplicantUpdateHandler('newApplicantEmails', 'newApplicantCells') },
			[ApplicationType.returningGrant]: { ids: new Set(), handler: createApplicantUpdateHandler('returningApplicantEmails', 'returningApplicantCells') },
			[ApplicationType.scholarship]: { ids: new Set(), handler: createApplicantUpdateHandler('scholarshipApplicantEmails', 'scholarshipApplicantCells') },
		};

		const unsub = getRealTimeApplicationsByWindow(cycleYear, true, (currentApplications) => {
			return processApplications(currentApplications, appTypeMap);
		});
		return () => unsub?.();
	}, [config, state.override, createApplicantUpdateHandler]);

	// --- Actions ---

	const handleSend = useCallback(
		async (templateKey: string, data: Record<string, unknown> = {}) => {
			const { recipients, smsRecipients, sender, cc } = state;
			if (!recipients.length && !smsRecipients.length) {
				showAlert({ message: 'Please add at least one recipient.', type: 'warning' });
				return { success: false };
			}
			if (!sender || !sender.email) {
				showAlert({ message: 'Please select a sender.', type: 'warning' });
				return { success: false };
			}
			try {
				const result = await send(templateKey, recipients, sender, cc, smsRecipients, data);
				if (result.success) {
					showAlert({ message: 'Message queued for sending!', type: 'success' });
					dispatch({ type: 'RESET_FORM' });
				} else {
					throw result.error;
				}
				return result;
			} catch (error) {
				handleError(error, 'contact-center-send');
				return { success: false, error: error };
			}
		},
		[state, showAlert, handleError]
	);

	const handleCustomMessageSend = async (formData: unknown) => {
		if (!formData) return;
		const { recipients, sender, cc, smsRecipients } = state;
		const { subject = '', emailBody = '', smsBody = '' } = formData as { subject?: string; emailBody?: string; smsBody?: string };

		if (!recipients.length && !smsRecipients.length) {
			showAlert({ message: 'Please add at least one recipient.', type: 'warning' });
			return;
		}
		if (!sender || !sender.email) {
			showAlert({ message: 'Please select a sender.', type: 'warning' });
			return;
		}

		try {
			const formatEmail = (name?: string, email?: string): string | null => {
				const cleanName = name?.trim() || '';
				const cleanEmail = email?.trim() || '';
				if (!cleanEmail) return null;
				return cleanName && cleanName !== 'undefined undefined' ? `${cleanName} <${cleanEmail}>` : cleanEmail;
			};

			const ccRecipients = cc
				.map((c) => formatEmail(c.name, c.email))
				.filter((entry): entry is string => Boolean(entry));

			const batch = writeBatch(db);
			let emailCount = 0;
			let smsCount = 0;

			// 1. Send Emails
			if (recipients.length > 0) {
				const parser = new DOMParser();
				const htmlDoc = parser.parseFromString(emailBody, 'text/html');
				const text = htmlDoc.body.textContent || '';

				for (const recipient of recipients) {
					const emailPayload = {
						to: formatEmail(recipient.name, recipient.email),
						from: formatEmail(sender.name, sender.email),
						replyTo: config.SYSTEM_REPLY_TO,
						cc: ccRecipients,
						message: {
							subject,
							text,
							html: emailHeader + emailBody + staticEmailFooter,
						},
						createdAt: serverTimestamp(),
					};
					const email = isDemoEmailMode(config) ? withSimulatedDelivery(emailPayload) : emailPayload;
					batch.set(doc(collection(db, collections.emails), uuid()), email);
					emailCount++;
				}
			}

			// 2. Send SMS
			if (smsRecipients.length > 0) {
				for (const recipient of smsRecipients) {
					const sms = {
						to: `+1${recipient.cell}`,
						body: smsBody || subject,
						createdAt: serverTimestamp(),
					};
					batch.set(doc(collection(db, collections.sms), uuid()), sms);
					smsCount++;
				}
			}
			
			if (emailCount > 0 || smsCount > 0) {
				await batch.commit();
			}
			
			showAlert({ message: 'Custom message queued for sending!', type: 'success' });
			dispatch({ type: 'RESET_FORM' });
		} catch (error) {
			handleError(error, 'contact-center-custom-send');
		}
	};

	const handleOpenTemplateDialog = (template: TemplateOption) => {
		if (template.requiredFields && template.requiredFields.length > 0) {
			// If template requires variables (e.g. rejection reason), ask for them
			showDialog({
				id: 'templatedMessage',
				data: { title: `Enter Required Data for ${template.label}`, inputs: template.requiredFields },
				callback: (formData: unknown) => {
					if (formData) {
						handleSend(template.name, formData as Record<string, unknown>);
					}
				},
			});
		} else {
			// Otherwise just send immediately
			handleSend(template.name, {});
		}
	};

	// --- List Management Handlers ---

	const handleListChange = useCallback(
		(fieldName: ContactListField) =>
			(event: unknown, newValue: (ContactUser | string)[] = []) => {
				const isEmailField = fieldName === 'recipients' || fieldName === 'cc';
				const property = isEmailField ? 'email' : 'cell';

				// Handle "Free Text" entries (user typed an email manually)
				const updated = newValue.map((item) => (typeof item === 'string' ? { id: uuid(), name: '', [property]: item } : item));
				dispatch({ type: 'SET_FIELD', field: fieldName, payload: updated });
			},
		[]
	);
	const handleRecipientsChange = handleListChange('recipients');
	const handleCCChange = handleListChange('cc');
	const handleCellChange = handleListChange('smsRecipients');

	const removeFromList = useCallback(
		(fieldName: ContactListField, itemToRemove: ContactUser) => {
			const currentList = state[fieldName] || [];
			const updatedList = currentList.filter((item) => item.id !== itemToRemove.id);
			dispatch({ type: 'SET_FIELD', field: fieldName, payload: updatedList });
		},
		[state]
	);
	const removeRecipient = (item: ContactUser) => removeFromList('recipients', item);
	const removeCC = (item: ContactUser) => removeFromList('cc', item);
	const removeCell = (item: ContactUser) => removeFromList('smsRecipients', item);

	// --- Preset Handlers ---

	const addPresetToList = useCallback(
		(fieldName: ContactListField, presetList: ContactUser[]) => {
			const currentList = state[fieldName] || [];
			const existingIds = new Set(currentList.map((item) => item.id));
			const newItems = presetList.filter((item) => (item.email || item.cell) && !existingIds.has(item.id));
			dispatch({ type: 'SET_FIELD', field: fieldName, payload: [...currentList, ...newItems] });
		},
		[state]
	);
	const addPresetRecipients = (list: ContactUser[]) => addPresetToList('recipients', list);
	const addPresetCCs = (list: ContactUser[]) => addPresetToList('cc', list);
	const addPresetCells = (list: ContactUser[]) => addPresetToList('smsRecipients', list);

	const addPresetMemberAliases = useCallback(() => {
		const aliasRecipients = allMembersData
			.filter((m) => m.alias)
			.map((m) => ({
				id: m.id + '-alias',
				name: `${m.firstName} ${m.lastName}`,
				email: m.alias as string,
			}));
		addPresetToList('recipients', aliasRecipients);
	}, [allMembersData, addPresetToList]);

	const handlePresetMenuOpen = (setter: (el: HTMLElement | null) => void) => (event: MouseEvent<HTMLElement>) => setter(event.currentTarget);
	const handlePresetMenuClose = (setter: (el: HTMLElement | null) => void) => () => setter(null);
	const handlePresetAction = (actionFn: (value: ContactUser[]) => void, value: ContactUser[], menuCloser: () => void) => {
		actionFn(value);
		menuCloser();
	};

	return (
		<Box sx={{ p: 2, pb: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
			<Box sx={{ ...adminPageHeaderSx(boxShadow), justifyContent: 'space-between' }}>
				<Typography color={getAdminPageTitleColor(darkMode)} sx={adminPageTitleSx}>
					Contact Center
				</Typography>
				{member?.permissions?.email && (
					<Box sx={{ display: 'flex', gap: 1 }}>
						<Button variant='outlined' onClick={() => showDialog({ id: 'templateManager', data: { component: TemplateManagerDialog, maxWidth: 'md' } })}>
							Manage Templates
						</Button>
						<Button variant='outlined' color='info' onClick={() => showDialog({ id: 'emailLogs', data: { component: EmailLogsDialog, maxWidth: 'md' } })}>
							View Sent Logs
						</Button>
					</Box>
				)}
			</Box>

			{isDemoEmailMode(config) && (
				<Alert severity='info' sx={{ mx: 0 }}>
					{DEMO_EMAIL_BANNER}
				</Alert>
			)}

			<Grid container spacing={3}>
				<Grid size={12}>
					<Box sx={{ ...adminPagePanelSx(boxShadow), p: 2, display: 'flex', flexDirection: 'column', gap: '10px' }}>
						<Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'space-between', alignItems: 'center' }}>
							<Typography component='h2' variant='subtitle1'>
								Headers
							</Typography>
							<FormControlLabel control={<Switch checked={state.override} onChange={() => dispatch({ type: 'SET_FIELD', field: 'override', payload: !state.override })} />} label='Ignore Preferences?' />
						</Box>

						<Autocomplete
							multiple
							freeSolo
							options={state.allUserEmails}
							value={state.recipients}
							getOptionLabel={(option) => (typeof option === 'string' ? option : `${option.name} <${option.email}>`)}
							isOptionEqualToValue={(option, value) => contactId(option) === contactId(value)}
							renderValue={(value, getItemProps) =>
								value.map((option, index) => {
									const { key, ...itemProps } = getItemProps({ index });
									const user = option as ContactUser;
									return <Chip key={user.id || key} label={`${user.name} <${user.email}>`} {...itemProps} onDelete={() => removeRecipient(user)} deleteIcon={<CloseOutlined />} sx={{ backgroundColor: darkMode ? 'primary.main' : 'highlight.main' }} color={'secondary'} />;
								})
							}
							onChange={handleRecipientsChange}
							renderInput={(params) => (
								<Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: 1 }}>
									<TextField {...params} label='Recipients (email@example.com)' variant='outlined' fullWidth slotProps={{ ...params.slotProps, input: { ...params.slotProps?.input, sx: { flexWrap: 'wrap' } } }} />
									<Button variant='outlined' size='small' onClick={handlePresetMenuOpen(setRecipientPresetAnchorEl)} endIcon={<ArrowDropDownIcon />} sx={{ whiteSpace: 'nowrap', height: '56px', p: 3 }}>
										Add Preset
									</Button>
									<Menu anchorEl={recipientPresetAnchorEl} open={Boolean(recipientPresetAnchorEl)} onClose={handlePresetMenuClose(setRecipientPresetAnchorEl)}>
										<MenuItem onClick={() => handlePresetAction(addPresetRecipients, state.memberEmails, handlePresetMenuClose(setRecipientPresetAnchorEl))}>
											<GroupAddIcon sx={{ mr: 1 }} /> Members (Email)
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetMemberAliases, [], handlePresetMenuClose(setRecipientPresetAnchorEl))}>
											<AliasIcon sx={{ mr: 1 }} /> Members (Alias)
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetRecipients, state.applicantEmails, handlePresetMenuClose(setRecipientPresetAnchorEl))}>
											<GroupAddIcon sx={{ mr: 1 }} /> Applicants
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetRecipients, state.newApplicantEmails, handlePresetMenuClose(setRecipientPresetAnchorEl))}>
											<NewIcon sx={{ mr: 1 }} /> New Apps
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetRecipients, state.returningApplicantEmails, handlePresetMenuClose(setRecipientPresetAnchorEl))}>
											<ReturningIcon sx={{ mr: 1 }} /> Returning Apps
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetRecipients, state.scholarshipApplicantEmails, handlePresetMenuClose(setRecipientPresetAnchorEl))}>
											<SchoolIcon sx={{ mr: 1 }} /> 4-Year Apps
										</MenuItem>
									</Menu>
								</Box>
							)}
						/>

						<FormControl fullWidth variant='outlined'>
							<InputLabel id='sender-select-label'>Sender</InputLabel>
							<Select
								labelId='sender-select-label'
								value={state.sender ? state.sender.email || '' : ''}
								onChange={(e: SelectChangeEvent) => {
									const selected = state.availableSenders.find((s) => s.email === e.target.value) || '';
									dispatch({ type: 'SET_FIELD', field: 'sender', payload: selected });
								}}
								label='Sender'
								renderValue={(selectedEmail) => {
									const selected = state.availableSenders.find((s) => s.email === selectedEmail);
									return selected ? `${selected.name} <${selected.email}>` : '';
								}}>
								{state.availableSenders.map((s) => (
									<MenuItem key={s.id || s.email} value={s.email}>{`${s.name} <${s.email}>`}</MenuItem>
								))}
							</Select>
						</FormControl>

						<Autocomplete
							multiple
							freeSolo
							options={state.allCC}
							value={state.cc}
							getOptionLabel={(option) => (typeof option === 'string' ? option : `${option.name} <${option.email}>`)}
							isOptionEqualToValue={(option, value) => contactId(option) === contactId(value)}
							renderValue={(value, getItemProps) =>
								value.map((option, index) => {
									const { key, ...itemProps } = getItemProps({ index });
									const user = option as ContactUser;
									return <Chip key={user.id || key} label={`${user.name} <${user.email}>`} {...itemProps} onDelete={() => removeCC(user)} deleteIcon={<CloseOutlined />} sx={{ backgroundColor: darkMode ? 'primary.main' : 'highlight.main' }} color={'secondary'} />;
								})
							}
							onChange={handleCCChange}
							renderInput={(params) => (
								<Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: 1 }}>
									<TextField {...params} label='CCs (email@example.com)' variant='outlined' fullWidth slotProps={{ ...params.slotProps, input: { ...params.slotProps?.input, sx: { flexWrap: 'wrap' } } }} />
									<Button variant='outlined' size='small' onClick={handlePresetMenuOpen(setCcPresetAnchorEl)} endIcon={<ArrowDropDownIcon />} sx={{ whiteSpace: 'nowrap', height: '56px', p: 3 }}>
										Add Preset
									</Button>
									<Menu anchorEl={ccPresetAnchorEl} open={Boolean(ccPresetAnchorEl)} onClose={handlePresetMenuClose(setCcPresetAnchorEl)}>
										<MenuItem onClick={() => handlePresetAction(addPresetCCs, state.memberEmails, handlePresetMenuClose(setCcPresetAnchorEl))}>
											<GroupAddIcon sx={{ mr: 1 }} /> Members (Email)
										</MenuItem>
									</Menu>
								</Box>
							)}
						/>

						<Autocomplete
							multiple
							freeSolo
							options={state.allUserCells}
							value={state.smsRecipients}
							getOptionLabel={(option) => (typeof option === 'string' ? option : `${option.name} <+1${option.cell}>`)}
							isOptionEqualToValue={(option, value) => contactId(option) === contactId(value)}
							renderValue={(value, getItemProps) =>
								value.map((option, index) => {
									const { key, ...itemProps } = getItemProps({ index });
									const user = option as ContactUser;
									return <Chip key={user.id || key} label={`${user.name} <+1${user.cell}>`} {...itemProps} onDelete={() => removeCell(user)} deleteIcon={<CloseOutlined />} sx={{ backgroundColor: darkMode ? 'primary.main' : 'highlight.main' }} color={'secondary'} />;
								})
							}
							onChange={handleCellChange}
							renderInput={(params) => (
								<Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: 1 }}>
									<TextField {...params} label='Cell Numbers (9781230456)' variant='outlined' fullWidth slotProps={{ ...params.slotProps, input: { ...params.slotProps?.input, sx: { flexWrap: 'wrap' } } }} />
									<Button variant='outlined' size='small' onClick={handlePresetMenuOpen(setSmsPresetAnchorEl)} endIcon={<ArrowDropDownIcon />} sx={{ whiteSpace: 'nowrap', height: '56px', p: 3 }}>
										Add Preset
									</Button>
									<Menu anchorEl={smsPresetAnchorEl} open={Boolean(smsPresetAnchorEl)} onClose={handlePresetMenuClose(setSmsPresetAnchorEl)}>
										<MenuItem onClick={() => handlePresetAction(addPresetCells, state.memberCells, handlePresetMenuClose(setSmsPresetAnchorEl))}>
											<GroupAddIcon sx={{ mr: 1 }} /> Members
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetCells, state.applicantCells, handlePresetMenuClose(setSmsPresetAnchorEl))}>
											<GroupAddIcon sx={{ mr: 1 }} /> Applicants
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetCells, state.newApplicantCells, handlePresetMenuClose(setSmsPresetAnchorEl))}>
											<NewIcon sx={{ mr: 1 }} /> New Apps
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetCells, state.returningApplicantCells, handlePresetMenuClose(setSmsPresetAnchorEl))}>
											<ReturningIcon sx={{ mr: 1 }} /> Returning Apps
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetCells, state.scholarshipApplicantCells, handlePresetMenuClose(setSmsPresetAnchorEl))}>
											<SchoolIcon sx={{ mr: 1 }} /> 4-Year Apps
										</MenuItem>
									</Menu>
								</Box>
							)}
						/>
					</Box>
				</Grid>

				{templates.map((template) => (
					<Grid size={{ xs: 12, sm: 6, md: template.title === 'Application Status' ? 8 : 4 }} key={template.title} sx={{ display: 'flex' }}>
						<Box
							sx={{
								...adminPagePanelSx(boxShadow),
								p: '20px',
								display: 'flex',
								flexDirection: 'column',
								gap: '10px',
								minHeight: 310,
								height: 'auto',
								width: '100%',
								minWidth: 0,
								// Do not use overflow:hidden here — in a CSS grid/flex item it
								// caps height at minHeight and clips template buttons.
								overflow: 'visible',
								boxSizing: 'border-box',
								color: darkMode ? 'text.primary' : 'secondary.main',
							}}>
							<Typography component='h2' variant='subtitle1'>
								{template.title}
							</Typography>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0, width: '100%' }}>
								{template.options.map((option) => (
									<Button
										key={option.name}
										variant='contained'
										fullWidth
										sx={{
											backgroundColor: darkMode ? 'primary.main' : 'highlight.main',
											whiteSpace: 'normal',
											lineHeight: 1.3,
											py: 1,
											px: 1.5,
											textAlign: 'center',
											flexShrink: 0,
											maxWidth: '100%',
										}}
										onClick={() => handleOpenTemplateDialog(option)}>
										{option.label}
									</Button>
								))}
							</Box>
						</Box>
					</Grid>
				))}

				<Grid size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
					<Box
						sx={{
							...adminPagePanelSx(boxShadow),
							p: '20px',
							display: 'flex',
							flexDirection: 'column',
							minHeight: 310,
							height: 'auto',
							width: '100%',
							minWidth: 0,
							overflow: 'visible',
							boxSizing: 'border-box',
							color: darkMode ? 'text.primary' : 'secondary.main',
						}}>
						<Typography component='h2' variant='subtitle1'>
							Send a Custom Message
						</Typography>
						<Box sx={{ mt: 'auto', pt: 2 }}>
							<Button variant='contained' fullWidth sx={{ backgroundColor: darkMode ? 'primary.main' : 'highlight.main' }} onClick={() => showDialog({ id: 'customMessage', callback: handleCustomMessageSend })}>
								Compose Message
							</Button>
						</Box>
					</Box>
				</Grid>
			</Grid>
		</Box>
	);
};

export default ContactCenter;
