import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EmailTemplateProvider, useEmailTemplates, applyEmailTemplatesSnapshot } from './EmailTemplateContext';

const firebaseMock = vi.hoisted(() => ({
	getRealTimeCollection: vi.fn((_col, cb) => {
		cb([{ id: 't1', label: 'Welcome' }]);
		return jest.fn();
	}),
}));

vi.mock('../config/data/firebase', () => ({
	getRealTimeCollection: firebaseMock.getRealTimeCollection,
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
	beforeEach(() => {
		firebaseMock.getRealTimeCollection.mockImplementation((_col, cb) => {
			cb([{ id: 't1', label: 'Welcome' }]);
			return jest.fn();
		});
	});

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

	it('tolerates a missing unsubscribe function', async () => {
		firebaseMock.getRealTimeCollection.mockImplementationOnce((_col, cb) => {
			cb([{ id: 't2', label: 'Later' }]);
			return null;
		});
		const { unmount } = render(
			<EmailTemplateProvider>
				<Probe />
			</EmailTemplateProvider>
		);
		await waitFor(() => {
			expect(screen.getByText('Later')).toBeInTheDocument();
		});
		expect(() => unmount()).not.toThrow();
	});

	it('applyEmailTemplatesSnapshot clears loading when the setter throws', () => {
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		const setTemplates = jest.fn(() => {
			throw new Error('template state boom');
		});
		const setLoading = jest.fn();
		applyEmailTemplatesSnapshot([{ id: 'x' }], setTemplates, setLoading);
		expect(consoleSpy).toHaveBeenCalledWith('Error setting email templates:', expect.any(Error));
		expect(setLoading).toHaveBeenCalledWith(false);
		consoleSpy.mockRestore();
	});
});
