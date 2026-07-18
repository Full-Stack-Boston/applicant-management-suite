import { useEffect, useMemo, useState } from 'react';
import {
	Alert,
	Box,
	Button,
	Checkbox,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	Radio,
	RadioGroup,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Typography,
} from '@mui/material';
import { SwapHorizOutlined } from '@mui/icons-material';
import { getApplicantsForMerge, mergeApplicantAccounts } from '../../config/data/firebase';
import { useAlert } from '../../context/AlertContext';

export const MERGEABLE_APPLICANT_FIELDS = [
	{ key: 'firstName', label: 'First name' },
	{ key: 'lastName', label: 'Last name' },
	{ key: 'callMe', label: 'Call me' },
	{ key: 'school', label: 'School' },
	{ key: 'gradYear', label: 'Grad year' },
	{ key: 'major', label: 'Major' },
	{ key: 'organization', label: 'Organization' },
	{ key: 'cell', label: 'Cell' },
	{ key: 'homePhone', label: 'Home phone' },
	{ key: 'email', label: 'Email' },
	{ key: 'picture', label: 'Profile picture' },
	{ key: 'notifications', label: 'Notifications' },
] as const;

type MergeableField = (typeof MERGEABLE_APPLICANT_FIELDS)[number]['key'];
type FieldSource = 'primary' | 'secondary';

export interface MergeApplicationDetail {
	id: string;
	type?: string;
	status?: string;
	cycleYear?: string | number;
	completedBy?: string;
	missing?: boolean;
}

export interface MergeApplicantRecord {
	id: string;
	firstName?: string;
	lastName?: string;
	callMe?: string;
	name?: string;
	school?: string;
	gradYear?: string | number;
	major?: string;
	unit?: string;
	cell?: string;
	homePhone?: string;
	email?: string;
	picture?: { displayName?: string };
	applications?: string[];
	applicationsDetail?: MergeApplicationDetail[];
	accountCreated?: unknown;
	hasAuth?: boolean;
	authEmail?: string | null;
	[key: string]: unknown;
}

interface MergeApplicantAccountsDialogProps {
	applicants: MergeApplicantRecord[];
	onClose: () => void;
	onSuccess?: () => void;
	title?: string;
}

const formatFieldValue = (field: MergeableField, value: unknown): string => {
	if (value === undefined || value === null || value === '') return '(empty)';
	if (field === 'picture' && typeof value === 'object' && value !== null) {
		return (value as { displayName?: string }).displayName || 'Uploaded image';
	}
	if (field === 'notifications' && typeof value === 'object' && value !== null) {
		const prefs = value as { email?: boolean; sms?: boolean };
		return `Email: ${prefs.email ? 'on' : 'off'}, SMS: ${prefs.sms ? 'on' : 'off'}`;
	}
	return String(value);
};

const defaultFieldSource = (
	field: MergeableField,
	primary: MergeApplicantRecord,
	secondary: MergeApplicantRecord,
): FieldSource => {
	const primaryValue = primary[field];
	const secondaryValue = secondary[field];
	const primaryHas = primaryValue !== undefined && primaryValue !== null && primaryValue !== '';
	const secondaryHas = secondaryValue !== undefined && secondaryValue !== null && secondaryValue !== '';
	if (primaryHas) return 'primary';
	if (secondaryHas) return 'secondary';
	return 'primary';
};

const buildInitialFieldSelections = (
	primary: MergeApplicantRecord,
	secondary: MergeApplicantRecord,
): Record<MergeableField, FieldSource> =>
	MERGEABLE_APPLICANT_FIELDS.reduce(
		(acc, { key }) => {
			acc[key] = defaultFieldSource(key, primary, secondary);
			return acc;
		},
		{} as Record<MergeableField, FieldSource>,
	);

const accountLabel = (applicant: MergeApplicantRecord): string => {
	const name = applicant.name || `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim() || 'Unnamed';
	const email = applicant.email ? ` · ${applicant.email}` : '';
	return `${name} (${applicant.id.slice(0, 8)}…)${email}`;
};

const formatApplicationLabel = (app: MergeApplicationDetail): string => {
	const year = app.cycleYear ? String(app.cycleYear).slice(0, 4) : '—';
	const type = app.type || 'Application';
	const status = app.status || 'Unknown';
	return `${type} (${year}) — ${status}`;
};

const collectApplicationDetails = (applicant?: MergeApplicantRecord): MergeApplicationDetail[] => {
	if (!applicant) return [];
	if (Array.isArray(applicant.applicationsDetail) && applicant.applicationsDetail.length > 0) {
		return applicant.applicationsDetail;
	}
	return (applicant.applications || []).map((id) => ({ id, type: '', status: '', cycleYear: '' }));
};

const MergeApplicantAccountsDialog = ({
	applicants,
	onClose,
	onSuccess,
	title,
}: MergeApplicantAccountsDialogProps) => {
	const { showAlert, handleError } = useAlert();
	const [loading, setLoading] = useState(true);
	const [resolvedApplicants, setResolvedApplicants] = useState<MergeApplicantRecord[]>(applicants);
	const [primaryId, setPrimaryId] = useState(applicants[0]?.id || '');
	const [secondaryId, setSecondaryId] = useState(applicants[1]?.id || '');
	const primary = resolvedApplicants.find((a) => a.id === primaryId) || resolvedApplicants[0];
	const secondary = resolvedApplicants.find((a) => a.id === secondaryId) || resolvedApplicants[1];
	const [fieldSelections, setFieldSelections] = useState<Record<MergeableField, FieldSource>>(() =>
		buildInitialFieldSelections(primary, secondary),
	);
	const [keptApplicationIds, setKeptApplicationIds] = useState<string[]>(() =>
		[...new Set(applicants.flatMap((applicant) => applicant.applications || []))],
	);
	const [keptAuthSource, setKeptAuthSource] = useState<FieldSource>('primary');
	const [submitting, setSubmitting] = useState(false);

	const allApplications = useMemo(() => {
		const primaryApps = collectApplicationDetails(primary).map((app) => ({ ...app, ownerId: primary?.id || '' }));
		const secondaryApps = collectApplicationDetails(secondary).map((app) => ({ ...app, ownerId: secondary?.id || '' }));
		const byId = new Map<string, MergeApplicationDetail & { ownerId: string }>();
		[...primaryApps, ...secondaryApps].forEach((app) => {
			if (!byId.has(app.id)) byId.set(app.id, app);
		});
		return [...byId.values()];
	}, [primary, secondary]);

	useEffect(() => {
		const applicantIds = applicants.map((applicant) => applicant.id).filter(Boolean);
		if (applicantIds.length !== 2) {
			setLoading(false);
			return;
		}

		let cancelled = false;
		(async () => {
			try {
				const result = await getApplicantsForMerge({ applicantIds });
				const data = result.data as { applicants?: MergeApplicantRecord[] };
				const fetched = data.applicants || [];
				if (!cancelled && fetched.length === 2) {
					setResolvedApplicants(fetched);
					setPrimaryId(fetched[0].id);
					setSecondaryId(fetched[1].id);
					setFieldSelections(buildInitialFieldSelections(fetched[0], fetched[1]));
					const defaultKept = [
						...collectApplicationDetails(fetched[0]).map((app) => app.id),
						...collectApplicationDetails(fetched[1]).map((app) => app.id),
					];
					setKeptApplicationIds([...new Set(defaultKept)]);
					const defaultAuthSource: FieldSource =
						fetched[0].hasAuth && !fetched[1].hasAuth
							? 'primary'
							: fetched[1].hasAuth && !fetched[0].hasAuth
								? 'secondary'
								: 'primary';
					setKeptAuthSource(defaultAuthSource);
				}
			} catch (error) {
				if (!cancelled) {
					handleError(error, 'merge-applicant-lookup');
					setFieldSelections(buildInitialFieldSelections(applicants[0], applicants[1]));
					setKeptApplicationIds([
						...new Set(applicants.flatMap((applicant) => applicant.applications || [])),
					]);
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [applicants, handleError]);

	const swapAccounts = () => {
		const nextPrimaryId = secondaryId;
		const nextSecondaryId = primaryId;
		const nextPrimary = resolvedApplicants.find((a) => a.id === nextPrimaryId) || primary;
		const nextSecondary = resolvedApplicants.find((a) => a.id === nextSecondaryId) || secondary;
		setPrimaryId(nextPrimaryId);
		setSecondaryId(nextSecondaryId);
		setFieldSelections(buildInitialFieldSelections(nextPrimary, nextSecondary));
	};

	const handleFieldSelection = (field: MergeableField, source: FieldSource) => {
		setFieldSelections((prev) => ({ ...prev, [field]: source }));
	};

	const toggleApplication = (applicationId: string) => {
		setKeptApplicationIds((prev) =>
			prev.includes(applicationId) ? prev.filter((id) => id !== applicationId) : [...prev, applicationId],
		);
	};

	const handleMerge = async () => {
		if (!primary?.id || !secondary?.id || primary.id === secondary.id) {
			showAlert({ message: 'Choose two different accounts to merge.', type: 'error' });
			return;
		}

		setSubmitting(true);
		try {
			const result = await mergeApplicantAccounts({
				primaryId: primary.id,
				secondaryId: secondary.id,
				fieldSelections,
				keptApplicationIds,
				keptAuthSource,
			});
			const data = result.data as { message?: string };
			showAlert({ message: data?.message || 'Accounts merged successfully.', type: 'success' });
			onSuccess?.();
			onClose();
		} catch (error) {
			handleError(error, 'merge-applicant-accounts');
		} finally {
			setSubmitting(false);
		}
	};

	const primaryHasAuth = Boolean(primary?.hasAuth);
	const secondaryHasAuth = Boolean(secondary?.hasAuth);
	const hasAnyAuth = primaryHasAuth || secondaryHasAuth;
	const bothHaveAuth = primaryHasAuth && secondaryHasAuth;
	const loginStaysOnSurvivor = keptAuthSource === 'primary' && primaryHasAuth;

	const authLoginLabel = (applicant: MergeApplicantRecord, role: string) => {
		if (!applicant?.hasAuth) return `${role}: no login`;
		const loginEmail = applicant.authEmail || applicant.email || 'unknown email';
		return `${role}: ${loginEmail}`;
	};

	const authNotice = !hasAnyAuth
		? 'Neither account has a Firebase login (admin-created records only).'
		: bothHaveAuth
			? 'Both accounts have logins. Choose which login to keep on the merged account. The other login is disabled and deleted — it cannot be used after merge.'
			: 'One account has a login. That login will be kept on the merged account unless you choose otherwise below. The declined account cannot sign in after merge.';

	const authMigrationNote =
		hasAnyAuth && !loginStaysOnSurvivor
			? 'The kept login will move to the Primary account ID. Password sign-in may require Forgot Password once after merge.'
			: null;

	return (
		<>
			<DialogTitle>{title || 'Merge Applicant Accounts'}</DialogTitle>
			<DialogContent>
				{loading ? (
					<Typography variant='body2' color='text.secondary'>
						Loading account details…
					</Typography>
				) : (
					<>
						<Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
							Primary keeps the unified account ID. Choose profile fields, applications, and (when present) which
							login survives. Secondary is removed and its declined login is deleted from Firebase Auth.
						</Typography>

						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
							<Box sx={{ flex: 1 }}>
								<Typography variant='subtitle2'>Primary (kept)</Typography>
								<Typography variant='body2'>{accountLabel(primary)}</Typography>
								<Typography variant='caption' color='text.secondary'>
									{primaryHasAuth ? 'Has login' : 'No login detected'}
									{' · '}
									{collectApplicationDetails(primary).length} application(s)
								</Typography>
							</Box>
							<Button startIcon={<SwapHorizOutlined />} onClick={swapAccounts} size='small'>
								Swap
							</Button>
							<Box sx={{ flex: 1, textAlign: 'right' }}>
								<Typography variant='subtitle2'>Secondary (removed)</Typography>
								<Typography variant='body2'>{accountLabel(secondary)}</Typography>
								<Typography variant='caption' color='text.secondary'>
									{secondaryHasAuth ? 'Has login' : 'No login detected'}
									{' · '}
									{collectApplicationDetails(secondary).length} application(s)
								</Typography>
							</Box>
						</Box>

						{authNotice && (
							<Alert severity='info' sx={{ mb: 2 }}>
								{authNotice}
								{authMigrationNote ? ` ${authMigrationNote}` : ''}
							</Alert>
						)}

						{hasAnyAuth && (
							<Box sx={{ mb: 2 }}>
								<Typography variant='subtitle2' sx={{ mb: 1 }}>
									Login to keep
								</Typography>
								<RadioGroup
									value={keptAuthSource}
									onChange={(event) => setKeptAuthSource(event.target.value as FieldSource)}
								>
									{primaryHasAuth && (
										<FormControlLabel
											value='primary'
											control={<Radio size='small' />}
											label={authLoginLabel(primary, 'Primary')}
											disabled={!primaryHasAuth}
										/>
									)}
									{secondaryHasAuth && (
										<FormControlLabel
											value='secondary'
											control={<Radio size='small' />}
											label={authLoginLabel(secondary, 'Secondary')}
											disabled={!secondaryHasAuth}
										/>
									)}
								</RadioGroup>
							</Box>
						)}

						<Typography variant='subtitle2' sx={{ mb: 1 }}>
							Applications
						</Typography>
						{allApplications.length === 0 ? (
							<Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
								No applications on either account.
							</Typography>
						) : (
							<Box sx={{ mb: 2 }}>
								{allApplications.map((app) => {
									const owner =
										app.ownerId === primary?.id
											? 'Primary'
											: app.ownerId === secondary?.id
												? 'Secondary'
												: 'Unknown';
									return (
										<FormControlLabel
											key={app.id}
											control={
												<Checkbox
													checked={keptApplicationIds.includes(app.id)}
													onChange={() => toggleApplication(app.id)}
												/>
											}
											label={`${formatApplicationLabel(app)} · ${owner}`}
										/>
									);
								})}
								<Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
									Unchecked applications are marked Deleted and removed from the unified account.
								</Typography>
							</Box>
						)}

						<Typography variant='subtitle2' sx={{ mb: 1 }}>
							Profile fields
						</Typography>
						<Table size='small'>
							<TableHead>
								<TableRow>
									<TableCell>Field</TableCell>
									<TableCell>Primary value</TableCell>
									<TableCell>Secondary value</TableCell>
									<TableCell>Keep</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{MERGEABLE_APPLICANT_FIELDS.map(({ key, label }) => (
									<TableRow key={key}>
										<TableCell>{label}</TableCell>
										<TableCell>{formatFieldValue(key, primary?.[key])}</TableCell>
										<TableCell>{formatFieldValue(key, secondary?.[key])}</TableCell>
										<TableCell>
											<RadioGroup
												row
												value={fieldSelections[key]}
												onChange={(event) => handleFieldSelection(key, event.target.value as FieldSource)}
											>
												<FormControlLabel value='primary' control={<Radio size='small' />} label='Primary' />
												<FormControlLabel value='secondary' control={<Radio size='small' />} label='Secondary' />
											</RadioGroup>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={submitting}>
					Cancel
				</Button>
				<Button
					onClick={handleMerge}
					variant='contained'
					color='warning'
					disabled={submitting || loading}
				>
					{submitting ? 'Merging…' : 'Merge Accounts'}
				</Button>
			</DialogActions>
		</>
	);
};

export default MergeApplicantAccountsDialog;
