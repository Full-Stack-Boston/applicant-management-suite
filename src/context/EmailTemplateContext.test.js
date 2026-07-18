import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EmailTemplateProvider, useEmailTemplates } from './EmailTemplateContext';

vi.mock('../config/data/firebase', () => ({
	getRealTimeCollection: (_col, cb) => {
		cb([{ id: 't1', label: 'Welcome' }]);
		return jest.fn();
	},
}));

vi.mock('../config/data/collections', () => ({
	collections: { emailTemplates: 'emailTemplates' },
}));

const Probe = () => {
	const { templates, loading } = useEmailTemplates();
	if (loading) return <div>loading</div>;
	return <div>{templates.map((t) => t.label).join(',')}</div>;
};

describe('EmailTemplateContext', () => {
	it('provides templates from realtime collection', async () => {
		render(
			<EmailTemplateProvider>
				<Probe />
			</EmailTemplateProvider>
		);
		await waitFor(() => {
			expect(screen.getByText('Welcome')).toBeInTheDocument();
		});
	});

	it('throws outside provider', () => {
		const Broken = () => {
			useEmailTemplates();
			return null;
		};
		expect(() => render(<Broken />)).toThrow(/EmailTemplateProvider/);
	});
});
