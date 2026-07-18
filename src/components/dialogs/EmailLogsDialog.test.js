import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import EmailLogsDialog from './EmailLogsDialog';

vi.mock('../../config/data/firebase', () => ({
	getEmailLogs: jest.fn().mockResolvedValue([
		{
			id: '1',
			to: ['a@b.c'],
			message: { subject: 'Hello' },
			delivery: { state: 'SUCCESS' },
		},
		{
			id: '2',
			to: ['x@y.z'],
			message: { subject: 'Fail' },
			delivery: { state: 'ERROR', error: 'boom' },
		},
		{
			id: '3',
			to: ['q@w.e'],
			message: { subject: 'Queued' },
		},
	]),
}));

describe('EmailLogsDialog', () => {
	it('loads and renders email logs', async () => {
		render(<EmailLogsDialog onClose={jest.fn()} />);
		expect(screen.getByRole('progressbar')).toBeInTheDocument();
		await waitFor(() => {
			expect(screen.getByText('Hello')).toBeInTheDocument();
		});
		expect(screen.getByText('Fail')).toBeInTheDocument();
		expect(screen.getByText('Queued')).toBeInTheDocument();
	});
});
