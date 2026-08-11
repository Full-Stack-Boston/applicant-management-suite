/**
 * Yearly finances hub: cycle-year docs that index awards and hold program expense lines.
 * SoT for award details remains the `awards` collection; year docs only store awardIDs[].
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export type CycleFinanceTotals = {
	allotted: number;
	sgAvailable: number;
	nsiAvailable: number;
	awardsDistributed: number;
	programRequested: number;
	programDisbursed: number;
	yearTotalDisbursed: number;
	clawbackThisYear: number;
	priorYearClawback: number;
	sgSharePct: number;
	nsiSharePct: number;
};

/** Compute display totals for a cycle year (80/20 allotment + live award/expense sums). */
export function computeCycleFinanceTotals(params: {
	year: YearlyFinancesDoc;
	awardAmounts: number[];
	priorYearClawback?: number | null;
}): CycleFinanceTotals {
	const { year, awardAmounts } = params;
	const allotted = Number(year.total_allotted_disbursement) || 0;
	const summary = year.financial_summary || {};
	const sgBucket = summary.scholarships_grants || {};
	const nsiBucket = summary.non_scholarship_items || {};

	const derivedSg = allotted ? allotted * 0.8 : 0;
	const derivedNsi = allotted ? allotted * 0.2 : 0;
	const sgAvailable = Number(sgBucket.amount_available);
	const nsiAvailable = Number(nsiBucket.amount_available);

	const awardsDistributed = awardAmounts.reduce((sum, n) => sum + (Number(n) || 0), 0);
	const programRequested = (year.programExpenseItems || []).reduce((sum, item) => sum + (Number(item.request) || 0), 0);
	const programDisbursed = (year.programExpenseItems || []).reduce((sum, item) => sum + (Number(item.disbursement) || 0), 0);
	const clawbackThisYear =
		(Number(sgBucket.amount_returned) || 0) + (Number(nsiBucket.amount_returned) || 0);
	const priorYearClawback =
		params.priorYearClawback != null && params.priorYearClawback !== undefined
			? Number(params.priorYearClawback) || 0
			: Number(year.prior_year_clawback) || 0;

	return {
		allotted,
		sgAvailable: Number.isFinite(sgAvailable) && sgAvailable > 0 ? sgAvailable : derivedSg,
		nsiAvailable: Number.isFinite(nsiAvailable) && nsiAvailable > 0 ? nsiAvailable : derivedNsi,
		awardsDistributed,
		programRequested,
		programDisbursed,
		yearTotalDisbursed: awardsDistributed + programDisbursed,
		clawbackThisYear,
		priorYearClawback,
		sgSharePct: 80,
		nsiSharePct: 20,
	};
}

export type CycleAwardeeRow = {
	key: string;
	applicantId: string;
	applicationId: string;
	name: string;
	address: string;
	applicationType: string;
	awards: Array<{ id: string; type: string; amount: number }>;
	total: number;
};

export function awardAmountOf(award: Record<string, unknown>): number {
	return Number(award.amount ?? award.awardAmount) || 0;
}

/** Build disbursement email HTML for a cycle year. */
export function buildCouncilDisbursementHtml(params: {
	cycleYear: number;
	organizationName: string;
	awardees: Array<{ name: string; address: string; awards: Array<{ type: string; amount: string | number }> }>;
	programExpenseItems: ProgramExpenseItem[];
	includeProgramExpenses?: boolean;
}): string {
	const {
		cycleYear,
		organizationName,
		awardees,
		programExpenseItems,
		includeProgramExpenses = true,
	} = params;
	// Email clients often ignore cellpadding when border-collapse:collapse — pad every cell inline.
	const cell =
		'padding:14px 16px;vertical-align:top;border:1px solid #cccccc;font-family:Georgia,Times New Roman,serif;font-size:14px;line-height:1.45;color:#222222;';
	const head = `${cell}background-color:#f5f5f5;font-weight:600;`;
	const tableStyle =
		'border-collapse:separate;border-spacing:0;width:100%;margin:0 0 24px 0;border:1px solid #cccccc;';
	const awardRows = awardees
		.map((a) => {
			const awardList = a.awards.map((aw) => `${escapeHtml(String(aw.type))}: ${escapeHtml(String(aw.amount))}`).join('<br/>') || '—';
			return `<tr>
				<td style="${cell}">${escapeHtml(a.name)}</td>
				<td style="${cell}">${escapeHtml(a.address).replace(/\n/g, '<br/>')}</td>
				<td style="${cell}">${awardList}</td>
			</tr>`;
		})
		.join('');

	const expenseRows = programExpenseItems
		.map(
			(item) =>
				`<tr>
					<td style="${cell}">${escapeHtml(item.category)}</td>
					<td style="${cell}">${escapeHtml(item.program)}</td>
					<td style="${cell}" align="right">${formatMoney(item.request)}</td>
					<td style="${cell}" align="right">${formatMoney(item.disbursement)}</td>
				</tr>`
		)
		.join('');

	const intro = includeProgramExpenses
		? `Please find below the ${cycleYear} award recipients and non-scholarship program expenses for distribution.`
		: `Please find below the ${cycleYear} award recipients for distribution.`;

	const programSection = includeProgramExpenses
		? `
			<h3 style="margin:24px 0 12px;">Program Expenses (Camperships &amp; Non-Scholarship)</h3>
			<table cellpadding="14" cellspacing="0" border="0" width="100%" style="${tableStyle.replace('margin:0 0 24px 0;', 'margin:0;')}">
				<thead>
					<tr>
						<th align="left" style="${head}">Category</th>
						<th align="left" style="${head}">Program</th>
						<th align="right" style="${head}">Request</th>
						<th align="right" style="${head}">Disbursement</th>
					</tr>
				</thead>
				<tbody>${expenseRows || `<tr><td colspan="4" style="${cell}">No program expenses recorded for this year.</td></tr>`}</tbody>
			</table>`
		: '';

	return `
		<div style="font-family:Georgia, 'Times New Roman', serif; color:#222222; line-height:1.5;">
			<h2 style="margin:0 0 12px; font-weight:600;">${escapeHtml(organizationName)} — ${cycleYear} Disbursement Summary</h2>
			<p style="margin:0 0 20px;">${intro}</p>
			<h3 style="margin:0 0 12px;">Award Recipients</h3>
			<table cellpadding="14" cellspacing="0" border="0" width="100%" style="${tableStyle}">
				<thead>
					<tr>
						<th align="left" style="${head}">Name</th>
						<th align="left" style="${head}">Mailing address</th>
						<th align="left" style="${head}">Awards</th>
					</tr>
				</thead>
				<tbody>${awardRows || `<tr><td colspan="3" style="${cell}">No awards recorded for this year.</td></tr>`}</tbody>
			</table>
			${programSection}
		</div>
	`.trim();
}

/** Download the disbursement summary as a PDF (same content as the email HTML). */
export function downloadCouncilDisbursementPdf(params: {
	cycleYear: number;
	organizationName: string;
	awardees: Array<{ name: string; address: string; awards: Array<{ type: string; amount: string | number }> }>;
	programExpenseItems: ProgramExpenseItem[];
	includeProgramExpenses?: boolean;
	fileName?: string;
}): string {
	const {
		cycleYear,
		organizationName,
		awardees,
		programExpenseItems,
		includeProgramExpenses = true,
		fileName,
	} = params;

	const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
	const marginX = 40;
	const pageWidth = doc.internal.pageSize.getWidth();
	let cursorY = 48;

	doc.setFont('times', 'bold');
	doc.setFontSize(16);
	doc.text(`${organizationName} — ${cycleYear} Disbursement Summary`, marginX, cursorY, {
		maxWidth: pageWidth - marginX * 2,
	});
	cursorY += 28;

	doc.setFont('times', 'normal');
	doc.setFontSize(11);
	const intro = includeProgramExpenses
		? `Please find below the ${cycleYear} award recipients and non-scholarship program expenses for distribution.`
		: `Please find below the ${cycleYear} award recipients for distribution.`;
	const introLines = doc.splitTextToSize(intro, pageWidth - marginX * 2);
	doc.text(introLines, marginX, cursorY);
	cursorY += introLines.length * 14 + 16;

	doc.setFont('times', 'bold');
	doc.setFontSize(13);
	doc.text('Award Recipients', marginX, cursorY);
	cursorY += 10;

	autoTable(doc, {
		startY: cursorY,
		margin: { left: marginX, right: marginX },
		head: [['Name', 'Mailing address', 'Awards']],
		body:
			awardees.length > 0
				? awardees.map((a) => [
						a.name,
						a.address,
						a.awards.map((aw) => `${aw.type}: ${aw.amount}`).join('\n') || '—',
					])
				: [['No awards recorded for this year.', '', '']],
		styles: {
			font: 'times',
			fontSize: 9,
			cellPadding: 6,
			valign: 'top',
			overflow: 'linebreak',
		},
		headStyles: {
			fillColor: [245, 245, 245],
			textColor: [34, 34, 34],
			fontStyle: 'bold',
		},
		columnStyles: {
			0: { cellWidth: 110 },
			1: { cellWidth: 200 },
			2: { cellWidth: 'auto' },
		},
	});

	if (includeProgramExpenses) {
		const afterAwards = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY;
		cursorY = afterAwards + 24;
		doc.setFont('times', 'bold');
		doc.setFontSize(13);
		doc.text('Program Expenses (Camperships & Non-Scholarship)', marginX, cursorY);
		cursorY += 10;

		autoTable(doc, {
			startY: cursorY,
			margin: { left: marginX, right: marginX },
			head: [['Category', 'Program', 'Request', 'Disbursement']],
			body:
				programExpenseItems.length > 0
					? programExpenseItems.map((item) => [
							item.category,
							item.program,
							formatMoney(item.request),
							formatMoney(item.disbursement),
						])
					: [['No program expenses recorded for this year.', '', '', '']],
			styles: {
				font: 'times',
				fontSize: 9,
				cellPadding: 6,
				valign: 'top',
				overflow: 'linebreak',
			},
			headStyles: {
				fillColor: [245, 245, 245],
				textColor: [34, 34, 34],
				fontStyle: 'bold',
			},
			columnStyles: {
				2: { halign: 'right' },
				3: { halign: 'right' },
			},
		});
	}

	const safeOrg = String(organizationName || 'Fund')
		.replace(/[^\w\-]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
	const resolvedName = fileName || `${safeOrg}-${cycleYear}-Disbursement.pdf`;
	doc.save(resolvedName);
	return resolvedName;
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
