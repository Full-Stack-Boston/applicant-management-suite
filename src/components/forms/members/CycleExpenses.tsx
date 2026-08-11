import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Alert,
	Box,
	Button,
	Checkbox,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	FormControlLabel,
	IconButton,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../context/ThemeContext';
import { useAlert } from '../../../context/AlertContext';
import { useTitle } from '../../../context/HelmetContext';
import { brand } from '../../../config/Constants';
import {
	adminMobileCardSx,
	adminPageHeaderSx,
	adminPagePanelSx,
	adminToolPageSx,
	getAdminPageTitleProps,
} from '../../../config/ui/adminPageStyles';
import {
	ensureYearlyFinancesDoc,
	getApplicationsByIds,
	getAwardsByIds,
	getMemberOrApplicantAddress,
	getRealTimeYearlyFinances,
	saveYearlyFinancesDoc,
} from '../../../config/data/firebase';
import {
	awardAmountOf,
	buildCouncilDisbursementHtml,
	computeCycleFinanceTotals,
	downloadCouncilDisbursementPdf,
	emptyYearlyFinances,
	type CycleAwardeeRow,
	type ProgramExpenseCategory,
	type ProgramExpenseItem,
	type YearlyFinancesDoc,
} from '../../../config/data/yearlyFinances';

const formatCurrency = (value: number | null | undefined) =>
	Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const SummaryStat = ({
	label,
	value,
	hint,
}: {
	label: string;
	value: string;
	hint?: string;
}) => (
	<Box
		sx={{
			flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 160px' },
			minWidth: { xs: 0, sm: 140 },
			p: { xs: 1.25, sm: 1.5 },
			borderRadius: 1.5,
			border: '1px solid',
			borderColor: 'divider',
			bgcolor: 'action.hover',
		}}>
		<Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5, lineHeight: 1.2 }}>
			{label}
		</Typography>
		<Typography
			variant='h6'
			sx={{ fontWeight: 700, lineHeight: 1.2, color: 'secondary.main', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
			{value}
		</Typography>
		{hint ? (
			<Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5, lineHeight: 1.2 }}>
				{hint}
			</Typography>
		) : null}
	</Box>
);

const mobileFullDialogSx = {
	'& .MuiDialog-paper': {
		m: { xs: 0, sm: 4 },
		width: { xs: '100%', sm: undefined },
		maxWidth: { xs: '100%', sm: undefined },
		height: { xs: '100%', sm: 'auto' },
		maxHeight: { xs: '100%', sm: 'calc(100% - 64px)' },
		borderRadius: { xs: 0, sm: 1 },
	},
} as const;

const CycleExpenses = () => {
	const navigate = useNavigate();
	const { boxShadow, darkMode } = useTheme();
	const { showAlert, handleError } = useAlert();
	const titleProps = getAdminPageTitleProps(darkMode);
	useTitle({ title: 'Cycle Expenses', appear: false });

	const [years, setYears] = useState<YearlyFinancesDoc[]>([]);
	const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
	const [draft, setDraft] = useState<YearlyFinancesDoc>(emptyYearlyFinances(new Date().getFullYear()));
	const [awards, setAwards] = useState<Record<string, unknown>[]>([]);
	const [awardeeRows, setAwardeeRows] = useState<CycleAwardeeRow[]>([]);
	const [enrichingAwards, setEnrichingAwards] = useState(false);
	const [awardsLoadError, setAwardsLoadError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [councilOpen, setCouncilOpen] = useState(false);
	const [councilHtml, setCouncilHtml] = useState('');
	const [councilSubject, setCouncilSubject] = useState('');
	const [councilIncludeProgramExpenses, setCouncilIncludeProgramExpenses] = useState(true);
	const [editingExpenseIndex, setEditingExpenseIndex] = useState<number | null>(null);
	const [expenseEditDraft, setExpenseEditDraft] = useState<ProgramExpenseItem | null>(null);

	useEffect(() => {
		const unsub = getRealTimeYearlyFinances((rows) => {
			const mapped = (rows as YearlyFinancesDoc[])
				.map((row) => ({
					...emptyYearlyFinances(Number(row.cycleYear || row.id || 0)),
					...row,
					cycleYear: Number(row.cycleYear || row.id || 0),
					programExpenseItems: Array.isArray(row.programExpenseItems) ? row.programExpenseItems : [],
					awardIDs: Array.isArray(row.awardIDs) ? row.awardIDs : [],
				}))
				.filter((row) => Number.isFinite(row.cycleYear) && row.cycleYear > 0)
				.sort((a, b) => b.cycleYear - a.cycleYear);
			setYears(mapped);
			setLoading(false);
		});
		return () => unsub();
	}, []);

	useEffect(() => {
		const existing = years.find((y) => y.cycleYear === selectedYear);
		setDraft(existing ? { ...emptyYearlyFinances(selectedYear), ...existing } : emptyYearlyFinances(selectedYear));
		setEditingExpenseIndex(null);
		setExpenseEditDraft(null);
	}, [years, selectedYear]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const ids = draft.awardIDs || [];
			if (!ids.length) {
				if (!cancelled) {
					setAwards([]);
					setAwardsLoadError(null);
				}
				return;
			}
			try {
				const docs = await getAwardsByIds(ids);
				if (cancelled) return;
				setAwards(docs);
				const missing = ids.length - docs.length;
				setAwardsLoadError(
					missing > 0
						? `${missing} of ${ids.length} award ID(s) are indexed on this year but no matching awards/{id} document was found.`
						: null
				);
			} catch (error) {
				if (!cancelled) {
					setAwards([]);
					setAwardsLoadError('Failed to load award documents for this year.');
				}
				handleError(error, 'cycle-expenses-load-awards');
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [draft.awardIDs, handleError]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			if (!awards.length) {
				if (!cancelled) setAwardeeRows([]);
				return;
			}
			setEnrichingAwards(true);
			try {
				const applicationIds = awards
					.map((award) => String(award.applicationID || award.applicationId || ''))
					.filter(Boolean);
				const apps = await getApplicationsByIds(applicationIds);
				const appById = new Map(apps.map((app) => [String(app.id), app]));
				const grouped = new Map<string, CycleAwardeeRow>();

				for (const award of awards) {
					const applicationId = String(award.applicationID || award.applicationId || '');
					const applicantId = String(award.applicantId || award.applicantID || '');
					const app = applicationId ? appById.get(applicationId) : undefined;
					const profileId = typeof app?.profile === 'string' ? String(app.profile) : undefined;
					const identity = await getMemberOrApplicantAddress(
						applicantId || String(app?.completedBy || ''),
						{ profileId }
					);
					const key = applicantId || applicationId || identity.name;
					const amount = awardAmountOf(award);
					const awardLine = {
						id: String(award.id || ''),
						type: String(award.type || award.awardName || 'Award'),
						amount,
					};
					const existing = grouped.get(key);
					if (existing) {
						existing.awards.push(awardLine);
						existing.total += amount;
					} else {
						grouped.set(key, {
							key,
							applicantId,
							applicationId,
							name: identity.name,
							address: identity.address,
							applicationType: String(app?.type || '—'),
							awards: [awardLine],
							total: amount,
						});
					}
				}

				const rows = [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));
				if (!cancelled) setAwardeeRows(rows);
			} catch (error) {
				if (!cancelled) setAwardeeRows([]);
				handleError(error, 'cycle-expenses-enrich-awards');
			} finally {
				if (!cancelled) setEnrichingAwards(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [awards, handleError]);

	const yearOptions = useMemo(() => {
		const set = new Set<number>(years.map((y) => y.cycleYear));
		const current = new Date().getFullYear();
		for (let y = current + 1; y >= current - 25; y -= 1) set.add(y);
		return [...set].sort((a, b) => b - a);
	}, [years]);

	const priorYearDoc = useMemo(
		() => years.find((y) => y.cycleYear === selectedYear - 1),
		[years, selectedYear]
	);

	const totals = useMemo(
		() =>
			computeCycleFinanceTotals({
				year: draft,
				awardAmounts: awards.map(awardAmountOf),
				priorYearClawback: draft.prior_year_clawback ?? priorYearDoc?.prior_year_clawback ?? null,
			}),
		[draft, awards, priorYearDoc]
	);

	const beginEditExpense = (index: number) => {
		if (editingExpenseIndex !== null && editingExpenseIndex !== index) {
			showAlert({
				message: 'Finish or cancel the row you’re already editing before unlocking another.',
				type: 'warning',
			});
			return;
		}
		const item = draft.programExpenseItems?.[index];
		if (!item) return;
		setExpenseEditDraft({ ...item });
		setEditingExpenseIndex(index);
	};

	const cancelEditExpense = () => {
		const wasNew =
			editingExpenseIndex !== null &&
			expenseEditDraft &&
			!String(expenseEditDraft.program || '').trim() &&
			!Number(expenseEditDraft.request) &&
			!Number(expenseEditDraft.disbursement);
		if (wasNew && editingExpenseIndex !== null) {
			setDraft((prev) => ({
				...prev,
				programExpenseItems: (prev.programExpenseItems || []).filter((_, i) => i !== editingExpenseIndex),
			}));
		}
		setEditingExpenseIndex(null);
		setExpenseEditDraft(null);
	};

	const saveEditExpense = async () => {
		if (editingExpenseIndex === null || !expenseEditDraft) return;
		const index = editingExpenseIndex;
		const nextItems = [...(draft.programExpenseItems || [])];
		nextItems[index] = { ...expenseEditDraft };
		const nextDraft = { ...draft, programExpenseItems: nextItems };
		setDraft(nextDraft);
		setEditingExpenseIndex(null);
		setExpenseEditDraft(null);
		setSaving(true);
		try {
			await ensureYearlyFinancesDoc(selectedYear);
			const ok = await saveYearlyFinancesDoc(selectedYear, {
				...nextDraft,
				cycleYear: selectedYear,
				programExpenseItems: nextItems,
				awardIDs: nextDraft.awardIDs || [],
			});
			if (!ok) throw new Error('Save failed');
			showAlert({ message: `Saved program expense for ${selectedYear}.`, type: 'success' });
		} catch (error) {
			handleError(error, 'cycle-expenses-save-row');
		} finally {
			setSaving(false);
		}
	};

	const addExpense = () => {
		if (editingExpenseIndex !== null) {
			showAlert({
				message: 'Finish or cancel the row you’re already editing before adding another.',
				type: 'warning',
			});
			return;
		}
		const blank: ProgramExpenseItem = {
			category: 'other',
			program: '',
			request: 0,
			disbursement: 0,
		};
		const nextIndex = (draft.programExpenseItems || []).length;
		setDraft((prev) => ({
			...prev,
			programExpenseItems: [...(prev.programExpenseItems || []), blank],
		}));
		setEditingExpenseIndex(nextIndex);
		setExpenseEditDraft({ ...blank });
	};

	const removeExpense = async (index: number) => {
		const nextItems = (draft.programExpenseItems || []).filter((_, i) => i !== index);
		const nextDraft = { ...draft, programExpenseItems: nextItems };
		setDraft(nextDraft);
		if (editingExpenseIndex === index) {
			setEditingExpenseIndex(null);
			setExpenseEditDraft(null);
		} else if (editingExpenseIndex !== null && editingExpenseIndex > index) {
			setEditingExpenseIndex(editingExpenseIndex - 1);
		}
		setSaving(true);
		try {
			await ensureYearlyFinancesDoc(selectedYear);
			const ok = await saveYearlyFinancesDoc(selectedYear, {
				...nextDraft,
				cycleYear: selectedYear,
				programExpenseItems: nextItems,
				awardIDs: nextDraft.awardIDs || [],
			});
			if (!ok) throw new Error('Save failed');
			showAlert({ message: `Removed program expense from ${selectedYear}.`, type: 'success' });
		} catch (error) {
			handleError(error, 'cycle-expenses-remove-row');
		} finally {
			setSaving(false);
		}
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			await ensureYearlyFinancesDoc(selectedYear);
			const ok = await saveYearlyFinancesDoc(selectedYear, {
				...draft,
				cycleYear: selectedYear,
				programExpenseItems: draft.programExpenseItems || [],
				awardIDs: draft.awardIDs || [],
			});
			if (!ok) throw new Error('Save failed');
			showAlert({ message: `Saved ${selectedYear} cycle expenses.`, type: 'success' });
		} catch (error) {
			handleError(error, 'cycle-expenses-save');
		} finally {
			setSaving(false);
		}
	};

	const buildCouncilEmailContent = useCallback(
		(includeProgramExpenses: boolean) => {
			const subject = `${brand.organizationShortName || 'AMS'} ${selectedYear} Disbursement Summary`;
			const html = buildCouncilDisbursementHtml({
				cycleYear: selectedYear,
				organizationName: String(brand.organizationName || brand.organizationShortName || 'AMS'),
				awardees: awardeeRows.map((row) => ({
					name: row.name,
					address: row.address,
					awards: row.awards.map((award) => ({
						type: award.type,
						amount: formatCurrency(award.amount),
					})),
				})),
				programExpenseItems: draft.programExpenseItems || [],
				includeProgramExpenses,
			});
			return { subject, html };
		},
		[awardeeRows, draft.programExpenseItems, selectedYear]
	);

	const handleGenerateCouncilEmail = useCallback(async () => {
		try {
			const include = true;
			setCouncilIncludeProgramExpenses(include);
			const { subject, html } = buildCouncilEmailContent(include);
			setCouncilSubject(subject);
			setCouncilHtml(html);
			setCouncilOpen(true);
		} catch (error) {
			handleError(error, 'cycle-expenses-council-email');
		}
	}, [buildCouncilEmailContent, handleError]);

	const handleToggleCouncilProgramExpenses = (include: boolean) => {
		setCouncilIncludeProgramExpenses(include);
		try {
			const { subject, html } = buildCouncilEmailContent(include);
			setCouncilSubject(subject);
			setCouncilHtml(html);
		} catch (error) {
			handleError(error, 'cycle-expenses-council-email-toggle');
		}
	};

	const handleDownloadCouncilPdf = () => {
		try {
			const fileName = downloadCouncilDisbursementPdf({
				cycleYear: selectedYear,
				organizationName: String(brand.organizationName || brand.organizationShortName || 'AMS'),
				awardees: awardeeRows.map((row) => ({
					name: row.name,
					address: row.address,
					awards: row.awards.map((award) => ({
						type: award.type,
						amount: formatCurrency(award.amount),
					})),
				})),
				programExpenseItems: draft.programExpenseItems || [],
				includeProgramExpenses: councilIncludeProgramExpenses,
			});
			showAlert({ message: `Downloaded ${fileName}.`, type: 'success' });
		} catch (error) {
			handleError(error, 'cycle-expenses-council-pdf');
		}
	};

	const copyText = async (label: string, value: string) => {
		await navigator.clipboard.writeText(value);
		showAlert({ message: `${label} copied.`, type: 'success' });
	};

	return (
		<Box sx={adminToolPageSx}>
			<Box sx={{ ...adminPageHeaderSx(boxShadow ?? ''), gap: 1.5 }}>
				<IconButton onClick={() => navigate(-1)} aria-label='Go back' sx={{ color: 'secondary.main' }}>
					<ArrowBackIcon />
				</IconButton>
				<Box sx={{ flex: 1, minWidth: 0 }}>
					<Typography component='h1' {...titleProps} sx={{ ...titleProps.sx, lineHeight: 1.2 }}>
						Cycle Expenses
					</Typography>
					<Typography
						variant='body2'
						sx={{ color: 'text.secondary', mt: 0.5, display: { xs: 'none', sm: 'block' } }}>
						Camperships and non-scholarship program expenses by year, with awards indexed from the awards collection.
					</Typography>
				</Box>
				<AccountBalanceOutlinedIcon sx={{ color: 'secondary.main', fontSize: 32, opacity: 0.85, display: { xs: 'none', sm: 'block' } }} />
			</Box>

			<Box sx={{ ...adminPagePanelSx(boxShadow ?? ''), p: { xs: 1.5, md: 2.5 }, position: 'relative' }}>
				{(loading || saving) && (
					<Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.2)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
						<CircularProgress />
					</Box>
				)}

				<Stack
					direction={{ xs: 'column', sm: 'row' }}
					spacing={1.25}
					sx={{ mb: 2, alignItems: { sm: 'center' }, flexWrap: 'wrap' }}>
					<FormControl size='small' sx={{ minWidth: { xs: '100%', sm: 140 } }}>
						<InputLabel id='cycle-year-label'>Cycle year</InputLabel>
						<Select
							labelId='cycle-year-label'
							label='Cycle year'
							value={selectedYear}
							onChange={(e) => setSelectedYear(Number(e.target.value))}>
							{yearOptions.map((year) => (
								<MenuItem key={year} value={year}>
									{year}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<Stack direction='row' spacing={1} useFlexGap sx={{ width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap' }}>
						<Button variant='contained' onClick={handleSave} disabled={saving} size='small'>
							<Box component='span' sx={{ display: { xs: 'inline', sm: 'none' } }}>
								SAVE
							</Box>
							<Box component='span' sx={{ display: { xs: 'none', sm: 'inline' } }}>
								Save year
							</Box>
						</Button>
						<Button
							variant='outlined'
							startIcon={<EmailOutlinedIcon />}
							onClick={handleGenerateCouncilEmail}
							size='small'
							sx={{ '& .MuiButton-startIcon': { display: { xs: 'none', sm: 'inherit' } } }}>
							<Box component='span' sx={{ display: { xs: 'inline', sm: 'none' } }}>
								EMAIL
							</Box>
							<Box component='span' sx={{ display: { xs: 'none', sm: 'inline' } }}>
								Disbursement email
							</Box>
						</Button>
					</Stack>
				</Stack>

				<Alert severity='info' sx={{ mb: 2, display: { xs: 'none', md: 'flex' } }}>
					Scholarship/grant awards come from the <code>awards</code> collection for this cycle. Program expenses are
					non-scholarship spend (camperships, ads, etc.). Totals below roll both up for the year.
				</Alert>

				<Typography variant='h6' sx={{ mb: 1 }}>
					Year summary — {selectedYear}
				</Typography>
				<Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
					<TextField
						label='Total allotted disbursement'
						type='number'
						size='small'
						fullWidth
						value={draft.total_allotted_disbursement ?? ''}
						onChange={(e) =>
							setDraft((prev) => ({
								...prev,
								total_allotted_disbursement: e.target.value === '' ? null : Number(e.target.value),
							}))
						}
						helperText='Source pool for 80% scholarships/grants and 20% non-scholarship'
					/>
					<TextField
						label='Prior year clawback (reference)'
						type='number'
						size='small'
						fullWidth
						value={draft.prior_year_clawback ?? ''}
						onChange={(e) =>
							setDraft((prev) => ({
								...prev,
								prior_year_clawback: e.target.value === '' ? null : Number(e.target.value),
							}))
						}
						helperText={`Last year’s returned funds for reference${priorYearDoc ? ` (${selectedYear - 1} doc available)` : ''}`}
					/>
				</Stack>

				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
					<SummaryStat label='Total allotted' value={formatCurrency(totals.allotted)} />
					<SummaryStat
						label={`Scholarships & grants (${totals.sgSharePct}%)`}
						value={formatCurrency(totals.sgAvailable)}
						hint={`Distributed ${formatCurrency(totals.awardsDistributed)}`}
					/>
					<SummaryStat
						label={`Non-scholarship (${totals.nsiSharePct}%)`}
						value={formatCurrency(totals.nsiAvailable)}
						hint={`Distributed ${formatCurrency(totals.programDisbursed)} · requested ${formatCurrency(totals.programRequested)}`}
					/>
					<SummaryStat label='Total awards' value={formatCurrency(totals.awardsDistributed)} hint={`${awardeeRows.length} awardee(s)`} />
					<SummaryStat label='Total non-scholarship spend' value={formatCurrency(totals.programDisbursed)} />
					<SummaryStat label='Total expenditures this year' value={formatCurrency(totals.yearTotalDisbursed)} />
					<SummaryStat label='Clawback this year' value={formatCurrency(totals.clawbackThisYear)} hint='Returned / unused funds recorded' />
					<SummaryStat
						label='Prior year clawback'
						value={formatCurrency(totals.priorYearClawback)}
						hint={`${selectedYear - 1} reference`}
					/>
				</Box>

				<Typography variant='h6' sx={{ mb: 1 }}>
					Awards — scholarships & grants ({awards.length} award{awards.length === 1 ? '' : 's'}, {awardeeRows.length}{' '}
					awardee{awardeeRows.length === 1 ? '' : 's'})
				</Typography>
				{(draft.awardIDs || []).length === 0 ? (
					<Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
						No award IDs indexed for {selectedYear} yet. Add awards on applications — they index here automatically.
					</Typography>
				) : awards.length === 0 ? (
					<Alert severity='warning' sx={{ mb: 3 }}>
						{awardsLoadError ||
							`${(draft.awardIDs || []).length} award ID(s) are indexed for ${selectedYear}, but none resolved from the awards collection.`}
					</Alert>
				) : (
					<>
						{/* Desktop / tablet table */}
						<TableContainer
							sx={{
								mb: 3,
								border: '1px solid',
								borderColor: 'divider',
								borderRadius: 1,
								maxHeight: 480,
								display: { xs: 'none', md: 'block' },
							}}>
							<Table size='small' stickyHeader sx={{ '& .MuiTableCell-root': { py: 1.5, px: 2 } }}>
								<TableHead>
									<TableRow>
										<TableCell>Applicant</TableCell>
										<TableCell>Application type</TableCell>
										<TableCell>Award types</TableCell>
										<TableCell align='right'>Award amounts</TableCell>
										<TableCell align='right'>Total awards</TableCell>
										<TableCell>Check mailing address</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{enrichingAwards && !awardeeRows.length ? (
										<TableRow>
											<TableCell colSpan={6}>
												<Typography variant='body2' color='text.secondary'>
													Loading awardee details…
												</Typography>
											</TableCell>
										</TableRow>
									) : (
										awardeeRows.map((row) => (
											<TableRow key={row.key} hover>
												<TableCell sx={{ fontWeight: 600, verticalAlign: 'top' }}>{row.name}</TableCell>
												<TableCell sx={{ verticalAlign: 'top' }}>{row.applicationType}</TableCell>
												<TableCell sx={{ verticalAlign: 'top' }}>
													{row.awards.map((award) => (
														<Typography key={award.id} variant='body2' sx={{ lineHeight: 1.6 }}>
															{award.type}
														</Typography>
													))}
												</TableCell>
												<TableCell align='right' sx={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>
													{row.awards.map((award) => (
														<Typography key={`${award.id}-amt`} variant='body2' sx={{ lineHeight: 1.6 }}>
															{formatCurrency(award.amount)}
														</Typography>
													))}
												</TableCell>
												<TableCell align='right' sx={{ verticalAlign: 'top', fontWeight: 700, whiteSpace: 'nowrap' }}>
													{formatCurrency(row.total)}
												</TableCell>
												<TableCell sx={{ verticalAlign: 'top', minWidth: 200 }}>
													<Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.5 }}>
														{row.address}
													</Typography>
												</TableCell>
											</TableRow>
										))
									)}
									<TableRow>
										<TableCell colSpan={4} align='right' sx={{ fontWeight: 700 }}>
											Awards total
										</TableCell>
										<TableCell align='right' sx={{ fontWeight: 700 }}>
											{formatCurrency(totals.awardsDistributed)}
										</TableCell>
										<TableCell />
									</TableRow>
								</TableBody>
							</Table>
						</TableContainer>

						{/* Mobile cards */}
						<Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5, mb: 3 }}>
							{enrichingAwards && !awardeeRows.length ? (
								<Typography variant='body2' color='text.secondary'>
									Loading awardee details…
								</Typography>
							) : (
								awardeeRows.map((row) => (
									<Box key={row.key} sx={adminMobileCardSx(boxShadow ?? '')}>
										<Box sx={{ p: 1.5 }}>
											<Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
												<Typography variant='subtitle1' sx={{ fontWeight: 700, lineHeight: 1.25 }}>
													{row.name}
												</Typography>
												<Typography variant='subtitle1' sx={{ fontWeight: 700, color: 'secondary.main', whiteSpace: 'nowrap' }}>
													{formatCurrency(row.total)}
												</Typography>
											</Box>
											<Typography variant='body2' color='text.secondary' sx={{ mb: 1.25 }}>
												{row.applicationType}
											</Typography>
											<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.25 }}>
												{row.awards.map((award) => (
													<Box
														key={award.id}
														sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
														<Typography variant='body2'>{award.type}</Typography>
														<Typography variant='body2' sx={{ whiteSpace: 'nowrap' }}>
															{formatCurrency(award.amount)}
														</Typography>
													</Box>
												))}
											</Box>
											<Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
												Check address
											</Typography>
											<Typography variant='body2' sx={{ wordBreak: 'break-word' }}>
												{row.address}
											</Typography>
										</Box>
									</Box>
								))
							)}
							<Box
								sx={{
									...adminMobileCardSx(boxShadow ?? ''),
									p: 1.5,
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
								}}>
								<Typography variant='body2' sx={{ fontWeight: 700 }}>
									Awards total
								</Typography>
								<Typography variant='body2' sx={{ fontWeight: 700, color: 'secondary.main' }}>
									{formatCurrency(totals.awardsDistributed)}
								</Typography>
							</Box>
						</Box>
					</>
				)}
				{awardsLoadError ? (
					<Alert severity='warning' sx={{ mb: 2 }}>
						{awardsLoadError}
					</Alert>
				) : null}

				<Typography variant='h6' sx={{ mb: 1 }}>
					Non-scholarship program expenses
				</Typography>
				<Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
					Rows stay locked by default. Unlock a row to edit, then save to lock it again (and persist). These are usually
					entered once per year.
				</Typography>

				{/* Desktop / tablet table */}
				<TableContainer
					sx={{
						mb: 1,
						border: '1px solid',
						borderColor: 'divider',
						borderRadius: 1,
						display: { xs: 'none', md: 'block' },
					}}>
					<Table size='small'>
						<TableHead>
							<TableRow>
								<TableCell sx={{ py: 1 }}>Category</TableCell>
								<TableCell sx={{ py: 1 }}>Purpose / program</TableCell>
								<TableCell align='right' sx={{ py: 1 }}>
									Requested
								</TableCell>
								<TableCell align='right' sx={{ py: 1 }}>
									Disbursed
								</TableCell>
								<TableCell align='right' width={88} sx={{ py: 1 }} />
							</TableRow>
						</TableHead>
						<TableBody>
							{(draft.programExpenseItems || []).map((item, index) => {
								const isEditing = editingExpenseIndex === index && expenseEditDraft;
								const display = isEditing ? expenseEditDraft : item;
								return (
									<TableRow key={`expense-${index}`} hover selected={Boolean(isEditing)}>
										<TableCell sx={{ py: 0.75, width: 130 }}>
											{isEditing ? (
												<Select
													variant='standard'
													disableUnderline
													value={display.category}
													onChange={(e) =>
														setExpenseEditDraft((prev) =>
															prev ? { ...prev, category: e.target.value as ProgramExpenseCategory } : prev
														)
													}
													sx={{
														fontSize: '0.875rem',
														'& .MuiSelect-select': { py: 0.5, pr: '24px !important' },
													}}>
													<MenuItem value='campership'>campership</MenuItem>
													<MenuItem value='other'>other</MenuItem>
												</Select>
											) : (
												<Typography variant='body2'>{display.category}</Typography>
											)}
										</TableCell>
										<TableCell sx={{ py: 0.75 }}>
											{isEditing ? (
												<TextField
													variant='standard'
													fullWidth
													autoFocus
													value={display.program}
													onChange={(e) =>
														setExpenseEditDraft((prev) => (prev ? { ...prev, program: e.target.value } : prev))
													}
													slotProps={{ input: { disableUnderline: true } }}
													sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem', py: 0.5 } }}
												/>
											) : (
												<Typography variant='body2'>{display.program || '—'}</Typography>
											)}
										</TableCell>
										<TableCell align='right' sx={{ py: 0.75, width: 110, whiteSpace: 'nowrap' }}>
											{isEditing ? (
												<TextField
													variant='standard'
													type='number'
													value={display.request}
													onChange={(e) =>
														setExpenseEditDraft((prev) =>
															prev ? { ...prev, request: Number(e.target.value) || 0 } : prev
														)
													}
													slotProps={{
														input: { disableUnderline: true },
														htmlInput: { style: { textAlign: 'right' } },
													}}
													sx={{
														width: 96,
														'& .MuiInputBase-input': { fontSize: '0.875rem', py: 0.5 },
													}}
												/>
											) : (
												<Typography variant='body2'>{formatCurrency(display.request)}</Typography>
											)}
										</TableCell>
										<TableCell align='right' sx={{ py: 0.75, width: 110, whiteSpace: 'nowrap' }}>
											{isEditing ? (
												<TextField
													variant='standard'
													type='number'
													value={display.disbursement}
													onChange={(e) =>
														setExpenseEditDraft((prev) =>
															prev ? { ...prev, disbursement: Number(e.target.value) || 0 } : prev
														)
													}
													slotProps={{
														input: { disableUnderline: true },
														htmlInput: { style: { textAlign: 'right' } },
													}}
													sx={{
														width: 96,
														'& .MuiInputBase-input': { fontSize: '0.875rem', py: 0.5 },
													}}
												/>
											) : (
												<Typography variant='body2'>{formatCurrency(display.disbursement)}</Typography>
											)}
										</TableCell>
										<TableCell align='right' sx={{ py: 0.25, width: 88, whiteSpace: 'nowrap' }}>
											{isEditing ? (
												<>
													<IconButton
														aria-label='Save expense row'
														size='small'
														color='secondary'
														onClick={() => void saveEditExpense()}
														disabled={saving}>
														<SaveOutlinedIcon fontSize='small' />
													</IconButton>
													<IconButton
														aria-label='Cancel expense edit'
														size='small'
														onClick={cancelEditExpense}
														sx={{ color: 'text.secondary' }}>
														<CloseOutlinedIcon fontSize='small' />
													</IconButton>
													<IconButton
														aria-label='Remove expense'
														size='small'
														onClick={() => void removeExpense(index)}
														sx={{ color: 'text.secondary' }}>
														<DeleteOutlinedIcon fontSize='small' />
													</IconButton>
												</>
											) : (
												<IconButton
													aria-label='Unlock expense row to edit'
													size='small'
													onClick={() => beginEditExpense(index)}
													sx={{ color: 'text.secondary' }}>
													<LockOutlinedIcon fontSize='small' />
												</IconButton>
											)}
										</TableCell>
									</TableRow>
								);
							})}
							{(draft.programExpenseItems || []).length ? (
								<TableRow>
									<TableCell colSpan={2} align='right' sx={{ py: 1, fontWeight: 700 }}>
										Program expense totals
									</TableCell>
									<TableCell align='right' sx={{ py: 1, fontWeight: 700, whiteSpace: 'nowrap' }}>
										{formatCurrency(totals.programRequested)}
									</TableCell>
									<TableCell align='right' sx={{ py: 1, fontWeight: 700, whiteSpace: 'nowrap' }}>
										{formatCurrency(totals.programDisbursed)}
									</TableCell>
									<TableCell />
								</TableRow>
							) : (
								<TableRow>
									<TableCell colSpan={5} sx={{ py: 1 }}>
										<Typography variant='body2' color='text.secondary'>
											No program expenses for {selectedYear} yet.
										</Typography>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</TableContainer>

				{/* Mobile expense cards */}
				<Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5, mb: 1 }}>
					{(draft.programExpenseItems || []).length === 0 ? (
						<Typography variant='body2' color='text.secondary'>
							No program expenses for {selectedYear} yet.
						</Typography>
					) : (
						(draft.programExpenseItems || []).map((item, index) => {
							const isEditing = editingExpenseIndex === index && expenseEditDraft;
							const display = isEditing ? expenseEditDraft : item;
							return (
								<Box key={`expense-card-${index}`} sx={adminMobileCardSx(boxShadow ?? '')}>
									<Box sx={{ p: 1.5 }}>
										<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
											<Box sx={{ minWidth: 0, flex: 1 }}>
												{isEditing ? (
													<>
														<Select
															variant='standard'
															disableUnderline
															fullWidth
															value={display.category}
															onChange={(e) =>
																setExpenseEditDraft((prev) =>
																	prev ? { ...prev, category: e.target.value as ProgramExpenseCategory } : prev
																)
															}
															sx={{ mb: 0.5, fontSize: '0.875rem' }}>
															<MenuItem value='campership'>campership</MenuItem>
															<MenuItem value='other'>other</MenuItem>
														</Select>
														<TextField
															variant='standard'
															fullWidth
															autoFocus
															value={display.program}
															onChange={(e) =>
																setExpenseEditDraft((prev) => (prev ? { ...prev, program: e.target.value } : prev))
															}
															slotProps={{ input: { disableUnderline: true } }}
															placeholder='Purpose / program'
															sx={{ '& .MuiInputBase-input': { fontSize: '1rem', fontWeight: 600, py: 0.5 } }}
														/>
													</>
												) : (
													<>
														<Typography variant='caption' color='text.secondary'>
															{display.category}
														</Typography>
														<Typography variant='subtitle1' sx={{ fontWeight: 700, lineHeight: 1.25 }}>
															{display.program || '—'}
														</Typography>
													</>
												)}
											</Box>
											<Box sx={{ display: 'flex', flexShrink: 0 }}>
												{isEditing ? (
													<>
														<IconButton
															aria-label='Save expense row'
															size='small'
															color='secondary'
															onClick={() => void saveEditExpense()}
															disabled={saving}>
															<SaveOutlinedIcon fontSize='small' />
														</IconButton>
														<IconButton
															aria-label='Cancel expense edit'
															size='small'
															onClick={cancelEditExpense}
															sx={{ color: 'text.secondary' }}>
															<CloseOutlinedIcon fontSize='small' />
														</IconButton>
														<IconButton
															aria-label='Remove expense'
															size='small'
															onClick={() => void removeExpense(index)}
															sx={{ color: 'text.secondary' }}>
															<DeleteOutlinedIcon fontSize='small' />
														</IconButton>
													</>
												) : (
													<IconButton
														aria-label='Unlock expense row to edit'
														size='small'
														onClick={() => beginEditExpense(index)}
														sx={{ color: 'text.secondary' }}>
														<LockOutlinedIcon fontSize='small' />
													</IconButton>
												)}
											</Box>
										</Box>
										<Stack direction='row' spacing={2}>
											<Box sx={{ flex: 1 }}>
												<Typography variant='caption' color='text.secondary'>
													Requested
												</Typography>
												{isEditing ? (
													<TextField
														variant='standard'
														type='number'
														fullWidth
														value={display.request}
														onChange={(e) =>
															setExpenseEditDraft((prev) =>
																prev ? { ...prev, request: Number(e.target.value) || 0 } : prev
															)
														}
														slotProps={{ input: { disableUnderline: true } }}
														sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem', py: 0.5 } }}
													/>
												) : (
													<Typography variant='body2'>{formatCurrency(display.request)}</Typography>
												)}
											</Box>
											<Box sx={{ flex: 1 }}>
												<Typography variant='caption' color='text.secondary'>
													Disbursed
												</Typography>
												{isEditing ? (
													<TextField
														variant='standard'
														type='number'
														fullWidth
														value={display.disbursement}
														onChange={(e) =>
															setExpenseEditDraft((prev) =>
																prev ? { ...prev, disbursement: Number(e.target.value) || 0 } : prev
															)
														}
														slotProps={{ input: { disableUnderline: true } }}
														sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem', py: 0.5 } }}
													/>
												) : (
													<Typography variant='body2' sx={{ fontWeight: 600 }}>
														{formatCurrency(display.disbursement)}
													</Typography>
												)}
											</Box>
										</Stack>
									</Box>
								</Box>
							);
						})
					)}
					{(draft.programExpenseItems || []).length ? (
						<Box
							sx={{
								...adminMobileCardSx(boxShadow ?? ''),
								p: 1.5,
								display: 'flex',
								justifyContent: 'space-between',
								gap: 2,
							}}>
							<Box>
								<Typography variant='caption' color='text.secondary'>
									Requested total
								</Typography>
								<Typography variant='body2' sx={{ fontWeight: 700 }}>
									{formatCurrency(totals.programRequested)}
								</Typography>
							</Box>
							<Box sx={{ textAlign: 'right' }}>
								<Typography variant='caption' color='text.secondary'>
									Disbursed total
								</Typography>
								<Typography variant='body2' sx={{ fontWeight: 700, color: 'secondary.main' }}>
									{formatCurrency(totals.programDisbursed)}
								</Typography>
							</Box>
						</Box>
					) : null}
				</Box>

				<Button
					startIcon={<AddIcon />}
					onClick={addExpense}
					size='small'
					sx={{ mb: 3 }}
					disabled={editingExpenseIndex !== null}>
					Add program expense
				</Button>

				{(draft.renewable_scholarships?.length || draft.non_renewable_grants?.length) ? (
					<Alert severity='warning' sx={{ mt: 3 }}>
						This year still has historical embedded scholarship/grant rows migrated from legacy finances
						({(draft.renewable_scholarships || []).length} renewable, {(draft.non_renewable_grants || []).length} grants).
						They are preserved until digitized into the awards collection.
					</Alert>
				) : null}
			</Box>

			<Dialog open={councilOpen} onClose={() => setCouncilOpen(false)} fullWidth maxWidth='md' sx={mobileFullDialogSx}>
				<DialogTitle>Disbursement email</DialogTitle>
				<DialogContent dividers>
					<FormControlLabel
						sx={{ mb: 1.5, display: 'flex', alignItems: 'flex-start', mr: 0 }}
						control={
							<Checkbox
								checked={councilIncludeProgramExpenses}
								onChange={(e) => handleToggleCouncilProgramExpenses(e.target.checked)}
								sx={{ pt: 0.25 }}
							/>
						}
						label={
							<Box>
								<Typography variant='body2' sx={{ fontWeight: 600 }}>
									Include non-scholarship program expenses
								</Typography>
								<Typography variant='caption' color='text.secondary'>
									Camperships, ads, and other program spend. Uncheck for an awards-only disbursement email.
								</Typography>
							</Box>
						}
					/>
					<Typography variant='subtitle2' sx={{ mb: 1 }}>
						Subject
					</Typography>
					<Typography sx={{ mb: 2, wordBreak: 'break-word' }}>{councilSubject}</Typography>
					<Typography variant='subtitle2' sx={{ mb: 1 }}>
						Body preview
					</Typography>
					<Box
						sx={{
							border: '1px solid',
							borderColor: 'divider',
							borderRadius: 1,
							p: { xs: 1.25, sm: 2 },
							maxHeight: { xs: 'none', sm: 360 },
							overflow: 'auto',
							bgcolor: '#ffffff',
							color: '#222222',
							'& table': { minWidth: 480 },
							'& th, & td': {
								padding: '14px 16px !important',
								verticalAlign: 'top',
								border: '1px solid #cccccc',
							},
						}}
						dangerouslySetInnerHTML={{ __html: councilHtml }}
					/>
				</DialogContent>
				<DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 } }}>
					<Button onClick={() => copyText('Subject', councilSubject)} sx={{ width: { xs: '100%', sm: 'auto' } }}>
						Copy subject
					</Button>
					<Button onClick={() => copyText('HTML body', councilHtml)} sx={{ width: { xs: '100%', sm: 'auto' } }}>
						Copy HTML
					</Button>
					<Button variant='outlined' onClick={handleDownloadCouncilPdf} sx={{ width: { xs: '100%', sm: 'auto' } }}>
						Download PDF
					</Button>
					<Button variant='contained' onClick={() => setCouncilOpen(false)} sx={{ width: { xs: '100%', sm: 'auto' } }}>
						Done
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default CycleExpenses;
