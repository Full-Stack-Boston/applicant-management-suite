import { describe, expect, it } from 'vitest';
import {
	buildCouncilDisbursementHtml,
	emptyYearlyFinances,
	mapLegacyFinanceToYearly,
} from './yearlyFinances';

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

describe('buildCouncilDisbursementHtml', () => {
	it('includes awardees and program expenses', () => {
		const html = buildCouncilDisbursementHtml({
			cycleYear: 2026,
			organizationName: 'Parker Fund',
			awardees: [{ name: 'Casey Scout', address: '1 Main St', awards: [{ type: 'One Time Grant', amount: 500 }] }],
			programExpenseItems: [{ category: 'campership', program: 'Camp', request: 100, disbursement: 100 }],
		});
		expect(html).toContain('2026');
		expect(html).toContain('Casey Scout');
		expect(html).toContain('1 Main St');
		expect(html).toContain('One Time Grant');
		expect(html).toContain('Camp');
		expect(html).toContain('campership');
	});
});
