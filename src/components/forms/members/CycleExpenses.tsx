import React, { useEffect, useMemo, useState } from 'react';
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	FormControl,
	IconButton,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../context/ThemeContext';
import { useAlert } from '../../../context/AlertContext';
import { useTitle } from '../../../context/HelmetContext';
import {
	adminPageHeaderSx,
	adminPagePanelSx,
	adminToolPageSx,
	getAdminPageTitleProps,
} from '../../../config/ui/adminPageStyles';
import {
	ensureYearlyFinancesDoc,
	getAwardsByIds,
	getRealTimeYearlyFinances,
	saveYearlyFinancesDoc,
} from '../../../config/data/firebase';
import {
	emptyYearlyFinances,
	type ProgramExpenseCategory,
	type ProgramExpenseItem,
	type YearlyFinancesDoc,
} from '../../../config/data/yearlyFinances';

const formatCurrency = (value: number | null | undefined) =>
	Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const CycleExpenses = () => {
	const navigate = useNavigate();
	const { boxShadow, darkMode } = useTheme();
	const { showAlert, handleError } = useAlert();
	useTitle({ title: 'Cycle Expenses', appear: false });
	const titleProps = getAdminPageTitleProps(darkMode);

	const [years, setYears] = useState<YearlyFinancesDoc[]>([]);
	const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
	const [draft, setDraft] = useState<YearlyFinancesDoc>(emptyYearlyFinances(new Date().getFullYear()));
	const [awards, setAwards] = useState<Record<string, unknown>[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

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
	}, [years, selectedYear]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const docs = await getAwardsByIds(draft.awardIDs || []);
				if (!cancelled) setAwards(docs);
			} catch (error) {
				handleError(error, 'cycle-expenses-load-awards');
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [draft.awardIDs, handleError]);

	const yearOptions = useMemo(() => {
		const set = new Set<number>(years.map((y) => y.cycleYear));
		const current = new Date().getFullYear();
		for (let y = current + 1; y >= current - 25; y -= 1) set.add(y);
		return [...set].sort((a, b) => b - a);
	}, [years]);

	const updateExpense = (index: number, patch: Partial<ProgramExpenseItem>) => {
		setDraft((prev) => {
			const next = [...(prev.programExpenseItems || [])];
			next[index] = { ...next[index], ...patch };
			return { ...prev, programExpenseItems: next };
		});
	};

	const addExpense = () => {
		setDraft((prev) => ({
			...prev,
			programExpenseItems: [
				...(prev.programExpenseItems || []),
				{ category: 'other' as ProgramExpenseCategory, program: '', request: 0, disbursement: 0 },
			],
		}));
	};

	const removeExpense = (index: number) => {
		setDraft((prev) => ({
			...prev,
			programExpenseItems: (prev.programExpenseItems || []).filter((_, i) => i !== index),
		}));
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
					<Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
						Camperships and non-scholarship program expenses by year, with awards indexed from the awards collection.
					</Typography>
				</Box>
				<AccountBalanceOutlinedIcon sx={{ color: 'secondary.main', fontSize: 32, opacity: 0.85, display: { xs: 'none', sm: 'block' } }} />
			</Box>

			<Box sx={{ ...adminPagePanelSx(boxShadow ?? ''), p: { xs: 2, md: 2.5 }, position: 'relative' }}>
				{(loading || saving) && (
					<Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.2)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
						<CircularProgress />
					</Box>
				)}

				<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, alignItems: { sm: 'center' } }}>
					<FormControl size='small' sx={{ minWidth: 140 }}>
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
					<Button variant='contained' onClick={handleSave} disabled={saving}>
						Save year
					</Button>
				</Stack>

				<Alert severity='info' sx={{ mb: 2 }}>
					Awards listed below come from <code>awards</code> via this year’s <code>awardIDs</code>. Add awards on applications as usual — they index here automatically.
				</Alert>

				<Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
					<TextField
						label='Total allotted disbursement'
						type='number'
						size='small'
						fullWidth
						value={draft.total_allotted_disbursement ?? ''}
						onChange={(e) => setDraft((prev) => ({ ...prev, total_allotted_disbursement: e.target.value === '' ? null : Number(e.target.value) }))}
					/>
					<TextField
						label='Prior year clawback'
						type='number'
						size='small'
						fullWidth
						value={draft.prior_year_clawback ?? ''}
						onChange={(e) => setDraft((prev) => ({ ...prev, prior_year_clawback: e.target.value === '' ? null : Number(e.target.value) }))}
					/>
				</Stack>

				<Typography variant='h6' sx={{ mb: 1 }}>
					Program expenses
				</Typography>
				<Table size='small' sx={{ mb: 2 }}>
					<TableHead>
						<TableRow>
							<TableCell>Category</TableCell>
							<TableCell>Program</TableCell>
							<TableCell>Request</TableCell>
							<TableCell>Disbursement</TableCell>
							<TableCell width={56} />
						</TableRow>
					</TableHead>
					<TableBody>
						{(draft.programExpenseItems || []).map((item, index) => (
							<TableRow key={`expense-${index}`}>
								<TableCell>
									<Select
										size='small'
										value={item.category}
										onChange={(e) => updateExpense(index, { category: e.target.value as ProgramExpenseCategory })}>
										<MenuItem value='campership'>campership</MenuItem>
										<MenuItem value='other'>other</MenuItem>
									</Select>
								</TableCell>
								<TableCell>
									<TextField size='small' fullWidth value={item.program} onChange={(e) => updateExpense(index, { program: e.target.value })} />
								</TableCell>
								<TableCell>
									<TextField
										size='small'
										type='number'
										value={item.request}
										onChange={(e) => updateExpense(index, { request: Number(e.target.value) || 0 })}
									/>
								</TableCell>
								<TableCell>
									<TextField
										size='small'
										type='number'
										value={item.disbursement}
										onChange={(e) => updateExpense(index, { disbursement: Number(e.target.value) || 0 })}
									/>
								</TableCell>
								<TableCell>
									<IconButton aria-label='Remove expense' onClick={() => removeExpense(index)}>
										<DeleteOutlinedIcon />
									</IconButton>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				<Button startIcon={<AddIcon />} onClick={addExpense} sx={{ mb: 3 }}>
					Add program expense
				</Button>

				<Typography variant='h6' sx={{ mb: 1 }}>
					Awards this year ({(draft.awardIDs || []).length})
				</Typography>
				{awards.length === 0 ? (
					<Typography variant='body2' color='text.secondary'>
						No award IDs indexed for {selectedYear} yet.
					</Typography>
				) : (
					<Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
						{awards.map((award) => (
							<Chip
								key={String(award.id)}
								label={`${award.type || 'Award'}: ${formatCurrency(Number(award.amount) || 0)}`}
								variant='outlined'
							/>
						))}
					</Box>
				)}

				{(draft.renewable_scholarships?.length || draft.non_renewable_grants?.length) ? (
					<Alert severity='warning' sx={{ mt: 3 }}>
						This year still has historical embedded scholarship/grant rows migrated from legacy finances
						({(draft.renewable_scholarships || []).length} renewable, {(draft.non_renewable_grants || []).length} grants).
						They are preserved until digitized into the awards collection.
					</Alert>
				) : null}
			</Box>
		</Box>
	);
};

export default CycleExpenses;
