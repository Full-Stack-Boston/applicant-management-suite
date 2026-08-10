/**
 * Yearly finances hub: cycle-year docs that index awards and hold program expense lines.
 * SoT for award details remains the `awards` collection; year docs only store awardIDs[].
 */

export type ProgramExpenseCategory = 'campership' | 'other';

export interface ProgramExpenseItem {
	category: ProgramExpenseCategory;
	program: string;
	request: number;
	disbursement: number;
	notes?: string;
}

export interface FinancialBucket {
	amount_available?: number | null;
	amount_distributed?: number | null;
	amount_returned?: number | null;
}

export interface YearlyFinancesDoc {
	cycleYear: number;
	total_allotted_disbursement?: number | null;
	prior_year_clawback?: number | null;
	financial_summary?: {
		scholarships_grants?: FinancialBucket;
		non_scholarship_items?: FinancialBucket;
	};
	programExpenseItems: ProgramExpenseItem[];
	awardIDs: string[];
	/** Preserved from legacy_financials for historical years without award FKs */
	renewable_scholarships?: Record<string, unknown>[];
	non_renewable_grants?: Record<string, unknown>[];
	migratedFrom?: string;
	migratedAt?: unknown;
	[key: string]: unknown;
}

export interface LegacyFinanceRow {
	id?: string;
	year?: number;
	total_allotted_disbursement?: number | null;
	prior_year_clawback?: number | null;
	financial_summary?: YearlyFinancesDoc['financial_summary'];
	non_sg_items?: Array<{ program?: string; request?: number; disbursement?: number; notes?: string }>;
	renewable_scholarships?: Record<string, unknown>[];
	non_renewable_grants?: Record<string, unknown>[];
	[key: string]: unknown;
}

const CAMP_HINT = /campership|camp\b/i;

/** Map a legacy_financials year row into yearlyFinances shape (full field fidelity). */
export function mapLegacyFinanceToYearly(legacy: LegacyFinanceRow, migratedAt: unknown = null): YearlyFinancesDoc {
	const cycleYear = Number(legacy.year);
	if (!Number.isFinite(cycleYear)) {
		throw new Error('legacy finance row missing year');
	}

	const programExpenseItems: ProgramExpenseItem[] = (legacy.non_sg_items || []).map((item) => {
		const program = String(item.program ?? '');
		return {
			category: CAMP_HINT.test(program) ? 'campership' : 'other',
			program,
			request: Number(item.request) || 0,
			disbursement: Number(item.disbursement) || 0,
			notes: item.notes ? String(item.notes) : undefined,
		};
	});

	const known = new Set([
		'id',
		'year',
		'total_allotted_disbursement',
		'prior_year_clawback',
		'financial_summary',
		'non_sg_items',
		'renewable_scholarships',
		'non_renewable_grants',
	]);

	const extras: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(legacy)) {
		if (!known.has(key) && value !== undefined) {
			extras[key] = value;
		}
	}

	return {
		...extras,
		cycleYear,
		total_allotted_disbursement: legacy.total_allotted_disbursement ?? null,
		prior_year_clawback: legacy.prior_year_clawback ?? null,
		financial_summary: legacy.financial_summary
			? JSON.parse(JSON.stringify(legacy.financial_summary))
			: {
					scholarships_grants: {},
					non_scholarship_items: {},
				},
		programExpenseItems,
		awardIDs: [],
		renewable_scholarships: Array.isArray(legacy.renewable_scholarships)
			? JSON.parse(JSON.stringify(legacy.renewable_scholarships))
			: [],
		non_renewable_grants: Array.isArray(legacy.non_renewable_grants)
			? JSON.parse(JSON.stringify(legacy.non_renewable_grants))
			: [],
		migratedFrom: 'legacy_financials',
		migratedAt,
	};
}

export function emptyYearlyFinances(cycleYear: number): YearlyFinancesDoc {
	return {
		cycleYear,
		total_allotted_disbursement: null,
		prior_year_clawback: null,
		financial_summary: {
			scholarships_grants: {},
			non_scholarship_items: {},
		},
		programExpenseItems: [],
		awardIDs: [],
		renewable_scholarships: [],
		non_renewable_grants: [],
	};
}

/** Build council email HTML for a cycle year (PF). */
export function buildCouncilDisbursementHtml(params: {
	cycleYear: number;
	organizationName: string;
	awardees: Array<{ name: string; address: string; awards: Array<{ type: string; amount: string | number }> }>;
	programExpenseItems: ProgramExpenseItem[];
}): string {
	const { cycleYear, organizationName, awardees, programExpenseItems } = params;
	const awardRows = awardees
		.map((a) => {
			const awardList = a.awards.map((aw) => `${aw.type}: ${aw.amount}`).join('; ') || '—';
			return `<tr><td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.address)}</td><td>${escapeHtml(awardList)}</td></tr>`;
		})
		.join('');

	const expenseRows = programExpenseItems
		.map(
			(item) =>
				`<tr><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.program)}</td><td>${formatMoney(item.request)}</td><td>${formatMoney(item.disbursement)}</td></tr>`
		)
		.join('');

	return `
		<h2>${escapeHtml(organizationName)} — ${cycleYear} Council Disbursement Summary</h2>
		<p>Please find below the ${cycleYear} award recipients and non-scholarship program expenses for council distribution.</p>
		<h3>Award Recipients</h3>
		<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
			<thead><tr><th align="left">Name</th><th align="left">Address</th><th align="left">Awards</th></tr></thead>
			<tbody>${awardRows || '<tr><td colspan="3">No awards recorded for this year.</td></tr>'}</tbody>
		</table>
		<h3>Program Expenses (Camperships &amp; Non-Scholarship)</h3>
		<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
			<thead><tr><th align="left">Category</th><th align="left">Program</th><th align="left">Request</th><th align="left">Disbursement</th></tr></thead>
			<tbody>${expenseRows || '<tr><td colspan="4">No program expenses recorded for this year.</td></tr>'}</tbody>
		</table>
	`.trim();
}

function formatMoney(value: number): string {
	return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function escapeHtml(value: string): string {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
