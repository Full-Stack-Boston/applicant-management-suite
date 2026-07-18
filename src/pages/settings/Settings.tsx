/**
 * SITE SETTINGS DASHBOARD
 * ---------------------------------------------------------------------------
 * This page allows Admins to configure global application variables.
 *
 * * ARCHITECTURE:
 * 1. Configuration Source: Reads from 'src/context/ConfigContext' (Firestore 'site_content').
 * 2. Dynamic Grouping: Uses 'groupSettings' to categorize variables based on their
 * key name (e.g. 'SIGNATURE_...') or data type (Boolean -> Toggles).
 * 3. Automations: Specialized UI for configuring backend scheduled tasks.
 * 4. Admin Actions: Triggers for cloud functions defined in 'src/config/admin/index.js'.
 */

import { useEffect, useState, useCallback, type ChangeEvent, type ReactNode } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import type { DocumentData } from 'firebase/firestore';
import type { SelectChangeEvent } from '@mui/material';

// UI Components
import { Alert, Box, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, FormGroup, Button, Typography, Divider, Switch, Chip, Stack } from '@mui/material';
import { adminPageHeaderSx, adminPagePanelSx, adminPageTitleSx, getAdminPageTitleColor } from '../../config/ui/adminPageStyles';
import { DateTimeField, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Contexts & Hooks
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';

// Backend & Config
import { saveCollectionData, getCollection } from '../../config/data/firebase';
import { collections } from '../../config/data/collections';
import { adminFunctions } from '../../config/admin';
import { brand, capitalize } from '../../config/Constants';
import TemplateManagerDialog from '../../components/dialogs/TemplateManagerDialog';
import Loader from '../../components/loader/Loader';
import { VIDEO_BUDGET_MODES, ensureVideoBudgetDefaults, allowedVideoMinutes, percentVideoUsed, normalizeVideoBudget, type VideoBudget, type VideoBudgetMode } from '../../config/ui/videoBudget';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/data/firebase';

// =============================================================================
//  HELPER: Settings Categorization
// =============================================================================

/**
 * Categorizes settings based on key prefixes and value types.
 * This allows the UI to present a flat JSON object in organized sections.
 */
const LEAD_KEYS = new Set(['OWNER_LEAD_EMAIL', 'OWNER_LEAD_CC']);
const IDENTITY_KEYS = new Set(['SYSTEM_EMAIL', 'SYSTEM_REPLY_TO', 'SYSTEM_CC_EMAILS']);
const PUBLIC_LINK_KEYS = new Set(['MAIL_TO_GENERAL_EMAIL', 'MAIL_TO_WEBMASTER', 'MAIL_TO_CHAIRMAN', 'TEL_GENERAL', 'TEL_WEBMASTER']);
const DELIVERY_KEYS = new Set(['emailDeliveryMode']);

type SettingsMap = Record<string, unknown>;
type SettingEntry = [string, unknown];
type SettingsGroups = Record<string, SettingEntry[]>;
type AutomationConfig = Record<string, unknown> & { recipients?: string[] };
type AutomationsMap = Record<string, AutomationConfig>;

interface WalkResult {
	next: unknown;
	changed: boolean;
}

const ensureMailDefaults = (settings: SettingsMap | null | undefined): SettingsMap => {
	if (!settings || typeof settings !== 'object') return {};
	return ensureVideoBudgetDefaults({
		...settings,
		emailDeliveryMode: settings.emailDeliveryMode === 'connected' ? 'connected' : 'demo',
		OWNER_LEAD_EMAIL: settings.OWNER_LEAD_EMAIL ?? brand.contactEmail,
		OWNER_LEAD_CC: settings.OWNER_LEAD_CC ?? '',
	}) as SettingsMap;
};

/**
 * Categorizes settings based on key prefixes and value types.
 * Mail is split into Delivery / Leads / Identity / Public links / Signatures.
 */
const groupSettings = (settings: SettingsMap): SettingsGroups => {
	const groups: SettingsGroups = {
		'Feature Toggles': [],
		'Important Dates': [],
		'Shared Signatures': [],
		'Email Delivery': [],
		'Lead Capture': [],
		'System Identity': [],
		'Public Site Links': [],
		'System Configuration': [],
		'Defaults & Messages': [],
	};

	for (const [key, value] of Object.entries(settings)) {
		if (key === 'automations') continue; // Handled separately
		if (key === 'videoBudget') continue; // Handled in Video / Daily section

		if (DELIVERY_KEYS.has(key)) {
			groups['Email Delivery'].push([key, value]);
		} else if (LEAD_KEYS.has(key)) {
			groups['Lead Capture'].push([key, value]);
		} else if (IDENTITY_KEYS.has(key)) {
			groups['System Identity'].push([key, value]);
		} else if (PUBLIC_LINK_KEYS.has(key)) {
			groups['Public Site Links'].push([key, value]);
		} else if (key.startsWith('SIGNATURE_')) {
			groups['Shared Signatures'].push([key, value]);
		} else if (typeof value === 'boolean') {
			groups['Feature Toggles'].push([key, value]);
		} else if (value instanceof Date) {
			groups['Important Dates'].push([key, value]);
		} else if (key.includes('EMAIL') || key.includes('MAIL') || key.includes('TEL')) {
			groups['Public Site Links'].push([key, value]);
		} else if (key.includes('KEY') || key.includes('ID') || key.includes('PIN')) {
			groups['System Configuration'].push([key, value]);
		} else {
			groups['Defaults & Messages'].push([key, value]);
		}
	}
	return groups;
};


const PARKER_REBRAND_REPLACEMENTS = [
	[/Parker Memorial Fund/g, brand.organizationName],
	[/The Parker Fund/g, brand.theOrganizationName],
	[/Parker Fund/g, brand.organizationShortName],
	[/revparkermemorialfund\.org/g, brand.domain],
	[/applications@revparkermemorialfund\.org/g, brand.contactEmail],
	[/noreply@revparkermemorialfund\.org/g, `noreply@${brand.emailDomain}`],
	[/committee@revparkermemorialfund\.org/g, `committee@${brand.emailDomain}`],
	[/webmaster@revparkermemorialfund\.org/g, `webmaster@${brand.emailDomain}`],
	[/chairman@revparkermemorialfund\.org/g, brand.contactEmail],
];

const rebrandParkerString = (value: string): string => {
	let updated = value;
	for (const [pattern, replacement] of PARKER_REBRAND_REPLACEMENTS) {
		updated = updated.replace(pattern, replacement as string);
	}
	return updated;
};

/** Deep-rebrand Parker strings in site config (top-level fields + nested automations recipients). */
const rebrandParkerConfigValues = (settings: SettingsMap | null | undefined): WalkResult => {
	if (!settings || typeof settings !== 'object') return { next: settings, changed: false };

	const walk = (value: unknown): WalkResult => {
		if (typeof value === 'string') {
			const updated = rebrandParkerString(value);
			return { next: updated, changed: updated !== value };
		}
		if (Array.isArray(value)) {
			let changed = false;
			const next = value.map((item) => {
				const result = walk(item);
				if (result.changed) changed = true;
				return result.next;
			});
			return { next, changed };
		}
		if (value && typeof value === 'object') {
			let changed = false;
			const next: SettingsMap = {};
			for (const [key, child] of Object.entries(value as SettingsMap)) {
				const result = walk(child);
				next[key] = result.next;
				if (result.changed) changed = true;
			}
			return { next, changed };
		}
		return { next: value, changed: false };
	};

	return walk(settings);
};

// =============================================================================
//  MAIN COMPONENT
// =============================================================================

const SiteSettings = () => {
	// --- Contexts ---
	const config = useConfig();
	const { showAlert, handleError } = useAlert();
	const { showDialog } = useDialog();
	const { member } = useAuth();
	const { darkMode, boxShadow } = useTheme();

	useTitle({ title: 'Site Settings', appear: false });

	// --- State ---
	const [settings, setSettings] = useState<SettingsMap | null>(null); // Local mutable copy of settings
	const [groupedSettings, setGroupedSettings] = useState<SettingsGroups | null>(null);
	const [allApplicants, setAllApplicants] = useState<DocumentData[]>([]); // Cache for Admin Action dropdowns
	const [automations, setAutomations] = useState<AutomationsMap>({});
	const [videoStatus, setVideoStatus] = useState<DocumentData | null>(null);

	const memoizedGroupSettings = useCallback(groupSettings, []);

	// --- Effect: Initialization ---
	useEffect(() => {
		if (config) {
			const { next: rebranded, changed } = rebrandParkerConfigValues(config as SettingsMap);
			const next = ensureMailDefaults(rebranded as SettingsMap);
			setSettings(next);
			setGroupedSettings(memoizedGroupSettings(next));
			if (changed && next?.CONFIG_ID) {
				void saveCollectionData(collections.siteConfig, String(next.CONFIG_ID), next)
					.then(() => showAlert({ message: 'Parker branding in site settings was updated to AMS.', type: 'info' }))
					.catch((error) => handleError(error, 'rebrand-settings'));
			}

			// Ensure automation arrays are initialized (use rebranded config)
			const initialAutomations: AutomationsMap = { ...((next.automations as AutomationsMap | undefined) || {}) };
			for (const key in initialAutomations) {
				if (!Array.isArray(initialAutomations[key].recipients)) {
					initialAutomations[key] = { ...initialAutomations[key], recipients: [] };
				}
			}
			setAutomations(initialAutomations);
		}

		// Fetch applicants in background for potential use in Admin Actions
		const fetchApplicants = async () => {
			try {
				const applicants = await getCollection(collections.applicants);
				setAllApplicants(applicants || []);
			} catch (error) {
				handleError(error, 'fetchApplicants-settings');
			}
		};
		fetchApplicants();
	}, [config, handleError, memoizedGroupSettings, showAlert]);

	// Live video budget status for Settings readout (future FSB dash uses same doc)
	useEffect(() => {
		const statusRef = doc(db, collections.videoBudget, 'status');
		const unsubscribe = onSnapshot(
			statusRef,
			(snap) => {
				setVideoStatus(snap.exists() ? snap.data() : null);
			},
			(error) => {
				console.warn('videoBudget/status listen failed', error);
			}
		);
		return () => unsubscribe();
	}, []);

	// --- Handler: Value Updates ---
	const handleSettingChange = (key: string, value: unknown) => {
		// A. Automation Settings (Nested)
		if (key.startsWith('automations.')) {
			const keys = key.split('.');
			const automationName = keys[1];
			const settingName = keys[2];

			setAutomations((prev) => {
				const newAutomations: AutomationsMap = { ...prev };
				if (!newAutomations[automationName]) {
					newAutomations[automationName] = {};
				}

				// Handle CSV string to Array conversion for recipients
				if (settingName === 'recipients' && typeof value === 'string') {
					newAutomations[automationName][settingName] = value
						.split(',')
						.map((email) => email.trim())
						.filter(Boolean);
				} else {
					newAutomations[automationName][settingName] = value;
				}

				setSettings((prevSettings) => ({ ...(prevSettings || {}), automations: newAutomations }));
				return newAutomations;
			});
		} else if (key === 'videoBudget.mode') {
			setSettings((prev) => {
				const videoBudget = normalizeVideoBudget({ ...((prev?.videoBudget as Partial<VideoBudget> | undefined) || {}), mode: value as VideoBudgetMode });
				const newSettings = { ...(prev || {}), videoBudget };
				setGroupedSettings(memoizedGroupSettings(newSettings));
				return newSettings;
			});
		}
		// B. Standard Settings (Flat)
		else {
			setSettings((prev) => {
				const newSettings = { ...(prev || {}), [key]: value };
				setGroupedSettings(memoizedGroupSettings(newSettings));
				return newSettings;
			});
		}
	};

	const handleSave = async () => {
		try {
			await saveCollectionData(collections.siteConfig, String(config.CONFIG_ID), settings || {});
			showAlert({ message: 'Settings saved successfully!', type: 'success' });
		} catch (error) {
			handleError(error, 'saveSettings');
		}
	};

	// --- Handler: Admin Maintenance Functions ---
	const handleAdminAction = (func: (typeof adminFunctions)[number]) => {
		if (func.parameters && func.parameters.length > 0) {
			// 1. Prepare Parameters (Hydrate Select Options)
			const preparedParameters = func.parameters.map((param) => {
				if (param.name === 'userId' && param.type === 'select') {
					return {
						...param,
						options: allApplicants.map((app) => ({
							value: app.id,
							label: `${app.firstName} ${app.lastName} (${app.email})`,
						})),
					};
				}
				return param;
			});

			// 2. Open Dialog to collect inputs
			showDialog({
				id: func.id,
				data: { inputs: preparedParameters },
				callback: async (result: unknown) => {
					if (result) {
						try {
							await func.action(result as Record<string, unknown>);
							showAlert({ message: `${func.label} executed successfully!`, type: 'success' });
						} catch (err) {
							handleError(err, `adminAction-${func.id}`);
						}
					}
				},
			});
		} else {
			// 3. Simple Confirmation for no-param actions
			showDialog({
				id: 'adminActionConfirmation',
				messageOverride: func.description,
				callback: async (confirmed: unknown) => {
					if (confirmed) {
						try {
							await func.action();
							showAlert({ message: `${func.label} executed successfully!`, type: 'success' });
						} catch (err) {
							handleError(err, `adminAction-${func.id}`);
						}
					}
				},
			});
		}
	};

	// --- Render Helpers ---

	const renderControl = (key: string, value: unknown): ReactNode => {
		const commonProps = {
			label: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
		};
		if (key === 'emailDeliveryMode') {
			return (
				<FormControl key={key} fullWidth>
					<InputLabel>Email Delivery Mode</InputLabel>
					<Select
						label='Email Delivery Mode'
						value={value === 'connected' ? 'connected' : 'demo'}
						onChange={(e: SelectChangeEvent) => handleSettingChange(key, e.target.value)}>
						<MenuItem value='demo'>Demo (simulate Contact Center & mailbox)</MenuItem>
						<MenuItem value='connected'>Connected (real Trigger Email + Zoho)</MenuItem>
					</Select>
				</FormControl>
			);
		}
		if (typeof value === 'boolean') {
			return <FormControlLabel key={key} control={<Checkbox checked={value} onChange={(e) => handleSettingChange(key, e.target.checked)} />} {...commonProps} />;
		}
		if (value instanceof Date) {
			return (
				<LocalizationProvider dateAdapter={AdapterDayjs}>
					<DateTimeField key={key} value={dayjs(value)} onChange={(newValue: Dayjs | null) => handleSettingChange(key, newValue ? newValue.toDate() : value)} {...commonProps} fullWidth />
				</LocalizationProvider>
			);
		}
		if (Array.isArray(value)) {
			return (
				<TextField
					key={key}
					value={value.join(', ')}
					onChange={(e: ChangeEvent<HTMLInputElement>) =>
						handleSettingChange(
							key,
							e.target.value
								.split(',')
								.map((part) => part.trim())
								.filter(Boolean)
						)
					}
					{...commonProps}
					fullWidth
					helperText='Comma-separated list'
				/>
			);
		}
		return <TextField key={key} value={(value as string | number | undefined) ?? ''} onChange={(e: ChangeEvent<HTMLInputElement>) => handleSettingChange(key, e.target.value)} {...commonProps} fullWidth />;
	};

	const renderKeyedGroup = (title: string, _keys: string[] | null | undefined, helper?: string): ReactNode => {
		const items = groupedSettings?.[title] || [];
		if (items.length === 0 && !helper) return null;
		return (
			<Grid size={{ xs: 12, md: 6 }}>
				<Typography variant='h6' sx={{ mb: 1, color: 'text.primary' }}>
					{title}
				</Typography>
				{helper && (
					<Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
						{helper}
					</Typography>
				)}
				<FormGroup>
					{items.map(([key, value]) => (
						<Box key={key} sx={{ my: 1 }}>
							{renderControl(key, value)}
						</Box>
					))}
				</FormGroup>
			</Grid>
		);
	};

	interface AutomationFieldDef {
		name: string;
		label: string;
		type: string;
		options?: string[];
	}

	const renderAutomationField = (automationKey: string, field: AutomationFieldDef, config: AutomationConfig) => {
		const value = config[field.name];

		const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
			const newValue = event.target.value;
			const fullKey = `automations.${automationKey}.${field.name}`;

			if (field.type === 'number') {
				handleSettingChange(fullKey, Number.parseInt(String(newValue), 10) || 0);
			} else {
				handleSettingChange(fullKey, newValue);
			}
		};

		return (
			<Grid size={{ xs: 12, sm: field.type === 'select' ? 6 : 12 }} key={field.name}>
				{field.type === 'select' && (
					<FormControl fullWidth size='small'>
						<InputLabel>{field.label}</InputLabel>
						<Select value={(value as string) || field.options?.[0] || ''} label={field.label} onChange={handleChange}>
							{(field.options || []).map((opt) => (
								<MenuItem key={opt} value={opt}>
									{capitalize(opt)}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				)}
				{field.type === 'text' && <TextField fullWidth size='small' label={field.label} value={Array.isArray(value) ? value.join(', ') : ''} onChange={handleChange} placeholder={field.name === 'recipients' ? 'Name <email1@example.com>, Name <email2@example.com>' : ''} />}
				{field.type === 'number' && <TextField fullWidth size='small' type='number' label={field.label} value={(value as number) || 0} onChange={handleChange} slotProps={{ htmlInput: { min: 0 } }} />}
			</Grid>
		);
	};

	const renderAutomationControls = () => {
		const automationDetails: Record<string, { label: string; fields: AutomationFieldDef[] }> = {
			memberActivitySummary: {
				label: 'Member Activity Summary',
				fields: [
					{ name: 'schedule', label: 'Frequency', type: 'select', options: ['daily', 'weekly'] },
					{ name: 'recipients', label: 'Recipients (comma-separated)', type: 'text' },
				],
			},
			incompleteCountAlert: {
				label: 'Incomplete Count Alert',
				fields: [
					{ name: 'schedule', label: 'Frequency', type: 'select', options: ['daily', 'weekly'] },
					{ name: 'threshold', label: 'Alert Threshold (Count)', type: 'number' },
					{ name: 'recipients', label: 'Recipients (comma-separated)', type: 'text' },
				],
			},
		};

		return Object.keys(automationDetails).map((key) => {
			const config = automations[key] || {};
			const details = automationDetails[key];

			return (
				<Box key={key} sx={{ my: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: darkMode ? 'background.passive' : 'grey.50' }}>
					<FormControlLabel
						control={<Switch checked={Boolean(config.enabled)} onChange={(e) => handleSettingChange(`automations.${key}.enabled`, e.target.checked)} />}
						label={
							<Typography variant='h6' color='text.primary'>
								{details.label}
							</Typography>
						}
					/>
					{Boolean(config.enabled) && (
						<Grid container spacing={2} sx={{ pl: 4, pt: 1 }}>
							{details.fields.map((field) => renderAutomationField(key, field, config))}
						</Grid>
					)}
				</Box>
			);
		});
	};

	if (!settings || !groupedSettings) {
		return <Loader />;
	}

	return (
		<Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
			<Box sx={{ ...adminPageHeaderSx(boxShadow), justifyContent: 'space-between' }}>
				<Typography color={getAdminPageTitleColor(darkMode)} sx={adminPageTitleSx}>
					Site Settings
				</Typography>
				<Button variant='contained' onClick={handleSave}>
					Save Settings
				</Button>
			</Box>

			<Box sx={{ ...adminPagePanelSx(boxShadow), display: 'flex', flexDirection: 'column' }}>
				<Box sx={{ p: 2 }}>
					<Grid container spacing={4}>
						<Grid size={{ xs: 12, md: 6 }}>
							<FormGroup>
								{groupedSettings['Feature Toggles']?.map(([key, value]) => (
									<Box key={key} sx={{ my: 0.5 }}>
										{renderControl(key, value)}
									</Box>
								))}
							</FormGroup>
						</Grid>
						<Grid size={{ xs: 12, md: 6 }}>
							<FormGroup>
								{groupedSettings['Important Dates']?.map(([key, value]) => (
									<Box key={key} sx={{ my: 1 }}>
										{renderControl(key, value)}
									</Box>
								))}
								{groupedSettings['Defaults & Messages']?.map(([key, value]) => (
									<Box key={key} sx={{ my: 1 }}>
										{renderControl(key, value)}
									</Box>
								))}
							</FormGroup>
						</Grid>
						<Grid size={12}>
							<Divider sx={{ my: 2 }} />
						</Grid>
						{renderKeyedGroup(
							'Email Delivery',
							null,
							'Demo keeps Contact Center and mailbox inside AMS. Connected requires Trigger Email (outbound) and ZOHO_* Functions env (inbox). The public contact form always notifies the owner.'
						)}
						{settings.emailDeliveryMode === 'connected' && (
							<Grid size={12}>
								<Alert severity='warning'>
									Connected mode is on. Outbound mail uses the Firebase Trigger Email extension. Inbox uses Zoho only when ZOHO_* secrets are set on Functions; otherwise mailbox actions will error with a clear message.
								</Alert>
							</Grid>
						)}
						{settings.emailDeliveryMode !== 'connected' && (
							<Grid size={12}>
								<Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
									<Chip size='small' label='Outbound: Simulated' color='info' variant='outlined' />
									<Chip size='small' label='Inbox: Seeded / mock' color='info' variant='outlined' />
									<Chip size='small' label='Contact form leads: Real → owner' color='success' variant='outlined' />
								</Stack>
							</Grid>
						)}
						{renderKeyedGroup('Lead Capture', null, 'Real destination for website contact-form leads (always delivered).')}
						{renderKeyedGroup('System Identity', null, 'From / Reply-To labels for system mail. Not shared FSB department inboxes.')}
						{renderKeyedGroup(
							'Public Site Links',
							null,
							'Public-site mailto/tel links (real FSB contacts). Separate from Contact Center delivery; the contact form always uses Owner Lead Email.'
						)}
						<Grid size={{ xs: 12, md: 6 }}>
							<Typography variant='h6' sx={{ mb: 1, color: 'text.primary' }}>
								System Configuration
							</Typography>
							<FormGroup>
								{groupedSettings['System Configuration']?.map(([key, value]) => (
									<Box key={key} sx={{ my: 1 }}>
										{renderControl(key, value)}
									</Box>
								))}
							</FormGroup>
						</Grid>
						<Grid size={12}>
							<Divider sx={{ my: 2 }} />
							<Typography variant='h6' sx={{ mb: 1, color: 'text.primary' }}>
								Video / Daily
							</Typography>
							<Typography variant='body2' color='text.secondary' sx={{ mb: 2, maxWidth: 720 }}>
								Hard cap on AMS live video (Daily.co) as a percentage of the 10,000 free participant-minutes each month. Off blocks all joins and room creates. Owner alerts go to Lead Capture for real. Daily may still require a payment method on file; this AMS budget is what stops PAYG burn.
							</Typography>
							<FormControl fullWidth size='small' sx={{ maxWidth: 480, mb: 2 }}>
								<InputLabel id='video-budget-mode-label'>Video budget</InputLabel>
								<Select
									labelId='video-budget-mode-label'
									label='Video budget'
									value={normalizeVideoBudget(settings.videoBudget as Partial<VideoBudget> | undefined).mode}
									onChange={(e) => handleSettingChange('videoBudget.mode', e.target.value)}>
									{VIDEO_BUDGET_MODES.map((opt) => (
										<MenuItem key={opt.value} value={opt.value}>
											{opt.label}
										</MenuItem>
									))}
								</Select>
							</FormControl>
							{(() => {
								const budget = normalizeVideoBudget(settings.videoBudget as Partial<VideoBudget> | undefined);
								const allowed = allowedVideoMinutes(budget);
								const used = Number(videoStatus?.used ?? videoStatus?.usedParticipantMinutes ?? 0);
								const pct = percentVideoUsed(used, allowed || Number(videoStatus?.allowed) || 0);
								const period = videoStatus?.period || '—';
								return (
									<Stack spacing={1} sx={{ maxWidth: 720 }}>
										<Typography variant='body2'>
											Allowance this month: <strong>{allowed}</strong> participant-minutes
											{budget.mode !== 'off' ? ` (${budget.mode}% of ${budget.monthlyBaseMinutes})` : ''}
										</Typography>
										<Typography variant='body2'>
											Usage ({period}): <strong>{used}</strong>
											{allowed > 0 ? ` / ${allowed} (${pct}%)` : ' (video off)'}
											{videoStatus?.blocked ? ' — blocked' : ''}
										</Typography>
										<Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
											<Chip size='small' label={budget.mode === 'off' ? 'Video: Off' : `Video: ${budget.mode}%`} color={budget.mode === 'off' ? 'default' : 'success'} variant='outlined' />
											<Chip size='small' label='Owner alerts: Real → Lead Capture' color='success' variant='outlined' />
										</Stack>
									</Stack>
								);
							})()}
						</Grid>
						<Grid size={12}>
							<Divider sx={{ my: 2 }} />
							<Typography variant='h6' sx={{ mb: 1, color: 'text.primary' }}>
								Automated Tasks
							</Typography>
							{renderAutomationControls()}
						</Grid>
						<Grid size={12}>
							<Divider sx={{ my: 2 }} />
							<Typography variant='h6' sx={{ mb: 1, color: 'text.primary' }}>
								Email Templates
							</Typography>
							{member?.permissions?.email && (
								<Button variant='outlined' onClick={() => showDialog({ id: 'templateManager', data: { component: TemplateManagerDialog, maxWidth: 'md' } })}>
									Manage Email Templates
								</Button>
							)}
						</Grid>
						<Grid size={12}>
							<Divider sx={{ my: 2 }} />
							<Typography variant='h6' sx={{ mb: 1, color: 'text.primary' }}>
								Shared Signatures
							</Typography>
						</Grid>
						<Grid size={12}>
							<FormGroup>
								{groupedSettings['Shared Signatures']?.map(([key, value]) => (
									<Box key={key} sx={{ my: 1 }}>
										{renderControl(key, value)}
									</Box>
								))}
							</FormGroup>
						</Grid>
					</Grid>
				</Box>
			</Box>

			<Box sx={{ color: 'text.primary' }}>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
					{adminFunctions.map((func) => (
						<Box key={func.id} sx={{ ...adminPagePanelSx(boxShadow), p: 2 }}>
							<Typography variant='h6'>{func.label}</Typography>
							<Typography variant='body2' sx={{ my: 1 }}>
								{func.description}
							</Typography>
							<Button variant='outlined' onClick={() => handleAdminAction(func)}>
								Execute
							</Button>
						</Box>
					))}
				</Box>
			</Box>
		</Box>
	);
};

export default SiteSettings;
