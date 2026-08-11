import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
	buildCouncilDisbursementHtml,
	computeCycleFinanceTotals,
	downloadCouncilDisbursementPdf,
	emptyYearlyFinances,
	mapLegacyFinanceToYearly,
} from './yearlyFinances';

const { mockSave, mockText, mockSplitTextToSize, mockSetFont, mockSetFontSize, mockAutoTable } = vi.hoisted(() => {
	const mockAutoTable = vi.fn((doc) => {
		doc.lastAutoTable = { finalY: 200 };
	});
	return {
		mockSave: vi.fn(),
		mockText: vi.fn(),
		mockSplitTextToSize: vi.fn((text) => [text]),
		mockSetFont: vi.fn(),
		mockSetFontSize: vi.fn(),
		mockAutoTable,
	};
});

vi.mock('jspdf', () => {
	function MockJsPDF() {
		this.internal = { pageSize: { getWidth: () => 612 } };
		this.setFont = mockSetFont;
		this.setFontSize = mockSetFontSize;
		this.text = mockText;
		this.splitTextToSize = mockSplitTextToSize;
		this.save = mockSave;
		this.lastAutoTable = { finalY: 120 };
	}
	return { jsPDF: MockJsPDF };
});

vi.mock('jspdf-autotable', () => ({
	__esModule: true,
	default: mockAutoTable,
	autoTable: mockAutoTable,
}));

describe('mapLegacyFinanceToYearly', () => {
	it('maps all core legacy fields and renames non_sg_items', () => {
		const mapped = mapLegacyFinanceToYearly({
			year: 2024,
			total_allotted_disbursement: 10000,
			prior_year_clawback: 100,
			financial_summary: {
				scholarships_grants: { amount_available: 8000, amount_returned: 0 },
				non_scholarship_items: { amount_available: 2000, amount_returned: 50 },
			},
			non_sg_items: [
				{ program: 'Summer Campership', request: 500, disbursement: 500 },
				{ program: 'Training Event', request: 200, disbursement: 150 },
			],
			renewable_scholarships: [{ scout_name: 'Ada', total_disbursement: 1000 }],
			non_renewable_grants: [{ scout_name: 'Bea', grant_amount: 250 }],
			custom_note: 'keep me',
		});

		expect(mapped.cycleYear).toBe(2024);
		expect(mapped.total_allotted_disbursement).toBe(10000);
		expect(mapped.prior_year_clawback).toBe(100);
		expect(mapped.programExpenseItems).toEqual([
			{ category: 'campership', program: 'Summer Campership', request: 500, disbursement: 500, notes: undefined },
			{ category: 'other', program: 'Training Event', request: 200, disbursement: 150, notes: undefined },
		]);
		expect(mapped.awardIDs).toEqual([]);
		expect(mapped.renewable_scholarships).toHaveLength(1);
		expect(mapped.non_renewable_grants).toHaveLength(1);
		expect(mapped.custom_note).toBe('keep me');
		expect(mapped.migratedFrom).toBe('legacy_financials');
	});

	it('throws without year', () => {
		expect(() => mapLegacyFinanceToYearly({})).toThrow(/year/);
	});
});

describe('emptyYearlyFinances', () => {
	it('returns a writable empty year hub', () => {
		expect(emptyYearlyFinances(2026).programExpenseItems).toEqual([]);
		expect(emptyYearlyFinances(2026).awardIDs).toEqual([]);
	});
});

describe('computeCycleFinanceTotals', () => {
	it('derives 80/20 allotment and rolls award + program spend', () => {
		const year = emptyYearlyFinances(2026);
		year.total_allotted_disbursement = 10000;
		year.prior_year_clawback = 250;
		year.programExpenseItems = [{ category: 'campership', program: 'Camp', request: 400, disbursement: 300 }];
		const totals = computeCycleFinanceTotals({ year, awardAmounts: [1000, 500] });
		expect(totals.sgAvailable).toBe(8000);
		expect(totals.nsiAvailable).toBe(2000);
		expect(totals.awardsDistributed).toBe(1500);
		expect(totals.programDisbursed).toBe(300);
		expect(totals.programRequested).toBe(400);
		expect(totals.yearTotalDisbursed).toBe(1800);
		expect(totals.priorYearClawback).toBe(250);
	});
});

describe('buildCouncilDisbursementHtml', () => {
	it('includes awardees and program expenses', () => {
		const html = buildCouncilDisbursementHtml({
			cycleYear: 2026,
			organizationName: 'Application Management Suite',
			awardees: [{ name: 'Casey Scout', address: '1 Main St', awards: [{ type: 'One Time Grant', amount: 500 }] }],
			programExpenseItems: [{ category: 'campership', program: 'Camp', request: 100, disbursement: 100 }],
		});
		expect(html).toContain('2026');
		expect(html).toContain('Casey Scout');
		expect(html).toContain('1 Main St');
		expect(html).toContain('Mailing address');
		expect(html).toContain('padding:14px 16px');
		expect(html).toContain('cellpadding="14"');
		expect(html).toContain('border-collapse:separate');
		expect(html).toContain('One Time Grant');
		expect(html).toContain('Camp');
		expect(html).toContain('campership');
		expect(html).toContain('Program Expenses');
		expect(html).toContain('non-scholarship program expenses');
		expect(html).toContain('Disbursement Summary');
	});

	it('omits program expenses when includeProgramExpenses is false', () => {
		const html = buildCouncilDisbursementHtml({
			cycleYear: 2026,
			organizationName: 'Application Management Suite',
			awardees: [{ name: 'Casey Scout', address: '1 Main St', awards: [{ type: 'One Time Grant', amount: 500 }] }],
			programExpenseItems: [{ category: 'campership', program: 'Camp', request: 100, disbursement: 100 }],
			includeProgramExpenses: false,
		});
		expect(html).toContain('Casey Scout');
		expect(html).toContain('award recipients for distribution');
		expect(html).not.toContain('Program Expenses');
		expect(html).not.toContain('campership');
		expect(html).not.toContain('non-scholarship program expenses');
	});
});

describe('downloadCouncilDisbursementPdf', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('saves a pdf including program expenses by default', () => {
		const name = downloadCouncilDisbursementPdf({
			cycleYear: 2026,
			organizationName: 'Application Management Suite',
			awardees: [{ name: 'Casey Scout', address: '1 Main St', awards: [{ type: 'One Time Grant', amount: '$500.00' }] }],
			programExpenseItems: [{ category: 'campership', program: 'Camp', request: 100, disbursement: 100 }],
		});
		expect(name).toBe('Application-Management-Suite-2026-Disbursement.pdf');
		expect(mockSave).toHaveBeenCalledWith('Application-Management-Suite-2026-Disbursement.pdf');
		expect(mockAutoTable).toHaveBeenCalledTimes(2);
	});

	it('skips program expense table when includeProgramExpenses is false', () => {
		downloadCouncilDisbursementPdf({
			cycleYear: 2026,
			organizationName: 'Application Management Suite',
			awardees: [{ name: 'Casey Scout', address: '1 Main St', awards: [{ type: 'One Time Grant', amount: '$500.00' }] }],
			programExpenseItems: [{ category: 'campership', program: 'Camp', request: 100, disbursement: 100 }],
			includeProgramExpenses: false,
		});
		expect(mockAutoTable).toHaveBeenCalledTimes(1);
	});
});
