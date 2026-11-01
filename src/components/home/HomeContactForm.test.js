import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import HomeContactForm from './HomeContactForm';
import { submitPublicContact } from '../../config/data/firebase';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';

vi.mock('../../config/data/firebase', () => ({
	submitPublicContact: vi.fn(),
}));

vi.mock('../../context/AlertContext', () => ({
	useAlert: vi.fn(),
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: vi.fn(),
}));

const fillForm = async () => {
	fireEvent.change(screen.getByRole('textbox', { name: 'Your name' }), { target: { value: 'Ada Lovelace' } });
	fireEvent.change(screen.getByRole('textbox', { name: 'Your email' }), { target: { value: 'ada@example.com' } });
	fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Topic' }));
	fireEvent.click(await screen.findByRole('option', { name: 'Technical support' }));
	fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'Please help.' } });
};

const theme = createTheme({
	palette: {
		custom: {
			black: '#000000',
			white: '#ffffff',
		},
	},
});

const renderForm = (props = {}) =>
	render(
		<ThemeProvider theme={theme}>
			<HomeContactForm {...props} />
		</ThemeProvider>,
	);

describe('HomeContactForm', () => {
	const showAlert = vi.fn();
	const handleError = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		useTheme.mockReturnValue({ primaryColor: '#0288D1' });
		useAlert.mockReturnValue({ showAlert, handleError });
		submitPublicContact.mockResolvedValue({ ok: true });
	});

	afterEach(cleanup);

	it('submits the form and resets it after success', async () => {
		renderForm({ fillHeight: true });
		await fillForm();

		await act(async () => {
			fireEvent.submit(screen.getByRole('button', { name: 'Send Message' }).closest('form'));
		});

		expect(submitPublicContact).toHaveBeenCalledWith({
			name: 'Ada Lovelace',
			email: 'ada@example.com',
			topic: 'technical',
			message: 'Please help.',
			website: '',
		});
		expect(showAlert).toHaveBeenCalledWith({
			message: 'Thank you. Your message has been sent. We will reply by email.',
			type: 'success',
		});
		expect(screen.getByRole('textbox', { name: 'Your name' })).toHaveValue('');
		expect(screen.getByRole('textbox', { name: 'Your email' })).toHaveValue('');
		expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('');
	});

	it('shows the submitting state while the request is pending', async () => {
		let resolveRequest;
		submitPublicContact.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveRequest = resolve;
				}),
		);
		renderForm();
		await fillForm();

		await act(async () => {
			fireEvent.submit(screen.getByRole('button', { name: 'Send Message' }).closest('form'));
		});
		expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();

		await act(async () => {
			resolveRequest({ ok: true });
		});
		expect(screen.getByRole('button', { name: 'Send Message' })).not.toBeDisabled();
	});

	it('delegates failed submissions to the alert error handler', async () => {
		const error = new Error('service unavailable');
		submitPublicContact.mockRejectedValueOnce(error);
		renderForm();
		await fillForm();

		await act(async () => {
			fireEvent.submit(screen.getByRole('button', { name: 'Send Message' }).closest('form'));
		});

		expect(handleError).toHaveBeenCalledWith(error, 'Unable to send your message. Please try again or email us directly.');
		expect(showAlert).not.toHaveBeenCalled();
	});
});
