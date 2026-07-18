import { adminLists, mobileCardConfig } from './lists';

describe('admin/lists', () => {
	it('exports list configs with columns and titles', () => {
		expect(adminLists).toBeTruthy();
		expect(Object.keys(adminLists).length).toBeGreaterThan(3);
		for (const key of Object.keys(adminLists)) {
			const list = adminLists[key];
			expect(list).toHaveProperty('title');
			expect(Array.isArray(list.columns) || typeof list.columns === 'function').toBe(true);
		}
		expect(mobileCardConfig).toBeTruthy();
		expect(Object.keys(mobileCardConfig).length).toBeGreaterThan(0);
	});
});
