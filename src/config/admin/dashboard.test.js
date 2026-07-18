import { memberDashContent } from './dashboard';

describe('admin/dashboard', () => {
	it('exports widget and layout configuration', () => {
		expect(Array.isArray(memberDashContent.widgets)).toBe(true);
		expect(memberDashContent.widgets.length).toBeGreaterThan(0);
		expect(Array.isArray(memberDashContent.layout)).toBe(true);
		expect(memberDashContent.layout.length).toBeGreaterThan(0);
		for (const widget of memberDashContent.widgets) {
			expect(widget).toHaveProperty('id');
			expect(widget).toHaveProperty('title');
		}
	});
});
