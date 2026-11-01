import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmailForm } from './Emails';
import { useAuth } from '../../../context/AuthContext';
import { useMailbox } from '../../../context/MailboxContext';
import { useAlert } from '../../../context/AlertContext';
import { useConfig } from '../../../context/ConfigContext';
import { useComposeEmailOptions } from '../../../hooks/useComposeEmailOptions';
import { sendZohoEmail } from '../../../config/data/firebase';

// --- Mocks ---
const mockNavigate = jest.fn();
const mockLocation = { state: {} };

vi.mock('react-router-dom', () => ({
	useNavigate: () => mockNavigate,
	useLocation: () => mockLocation,
}));

vi.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
vi.mock('../../../context/MailboxContext', () => ({ useMailbox: jest.fn() }));
vi.mock('../../../context/AlertContext', () => ({ useAlert: jest.fn() }));
vi.mock('../../../context/ConfigContext', () => ({ useConfig: jest.fn() }));
vi.mock('../../../hooks/useComposeEmailOptions', () => ({ useComposeEmailOptions: jest.fn() }));

vi.mock('../../../config/data/firebase', () => ({
	sendZohoEmail: jest.fn(),
}));

describe('EmailForm Component', () => {
	const mockAlert = { showAlert: jest.fn(), handleError: jest.fn() };
	const mockRefresh = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		useAuth.mockReturnValue({ member: { id: 'mem1' } });
		useMailbox.mockReturnValue({ refreshMailbox: mockRefresh });
		useAlert.mockReturnValue(mockAlert);
		useConfig.mockReturnValue({});
		useComposeEmailOptions.mockReturnValue({
			fromOptions: [{ value: 'test@example.com', label: 'Test <test@example.com>' }],
			signatureOptions: [],
			defaultFrom: 'test@example.com',
			permittedAliases: ['test@example.com'], // Valid loaded state
		});
	});

	test('renders loading state if aliases not permitted', () => {
		useComposeEmailOptions.mockReturnValue({ permittedAliases: [] });
		render(<EmailForm />);
		expect(screen.getByText('Loading email configuration...')).toBeInTheDocument();
	});

	test('renders form fields', () => {
		render(<EmailForm />);
		// Check for input labels/placeholders
		expect(screen.getByLabelText(/From/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Subject/i)).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/Compose your message/i)).toBeInTheDocument();
		expect(screen.getByText('Send')).toBeInTheDocument();
	});

	test('shows validation error if fields missing on send', async () => {
		render(<EmailForm />);

		// Clear subject (default empty) and try sending
		const sendBtn = screen.getByText('Send');
		fireEvent.click(sendBtn);

		expect(mockAlert.showAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
		expect(sendZohoEmail).not.toHaveBeenCalled();
	});

	test('sends email successfully', async () => {
		render(<EmailForm />);

		// Fill subject (To field is autocomplete, tricky to fill in basic unit test without complex interaction,
		// assuming state handling is internal. We can check validations or partials.
		// Actually, 'To' is required by logic: if (!fromAddress || to.length === 0 || !subject)
		// We need to simulate filling 'To'.

		const toInput = screen.getByLabelText('To'); // Autocomplete input
		fireEvent.change(toInput, { target: { value: 'recipient@test.com' } });
		fireEvent.keyDown(toInput, { key: 'Enter' }); // Simulate selecting option

		const subjectInput = screen.getByLabelText('Subject');
		fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });

		const sendBtn = screen.getByText('Send');
		fireEvent.click(sendBtn);

		await waitFor(() => {
			expect(sendZohoEmail).toHaveBeenCalled();
			expect(mockRefresh).toHaveBeenCalled();
			expect(mockNavigate).toHaveBeenCalledWith(-1);
		});
	});

	test('renders reply fields, signature options, and sends branded HTML', async () => {
		mockLocation.state = {
			to: 'recipient@test.com',
			cc: 'copy@test.com',
			subject: 'Reply subject',
			htmlPreview: '<p>Quoted message</p>',
			originalMessageId: 'original-1',
		};
		useComposeEmailOptions.mockReturnValue({
			fromOptions: [{ value: 'test@example.com', label: 'Test <test@example.com>' }],
			signatureOptions: [{ value: '<p>Signature</p>', label: 'Signature' }],
			defaultFrom: 'test@example.com',
			permittedAliases: ['test@example.com'],
		});
		render(<EmailForm />);

		expect(screen.getByLabelText('Cc')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Bcc' }));
		expect(screen.getByLabelText('Bcc')).toBeInTheDocument();
		expect(screen.getByText('Replying to:')).toBeInTheDocument();
		fireEvent.mouseDown(screen.getAllByRole('combobox').at(-1));
		fireEvent.click(await screen.findByRole('option', { name: 'Signature' }));
		fireEvent.click(screen.getByLabelText('Include Branded Header & Footer'));
		fireEvent.change(screen.getByPlaceholderText(/Compose your message/i), { target: { value: 'New body' } });
		fireEvent.click(screen.getByText('Send'));

		await waitFor(() => expect(sendZohoEmail).toHaveBeenCalledWith(expect.objectContaining({
			to: ['recipient@test.com'],
			cc: ['copy@test.com'],
			originalMessageId: 'original-1',
			useBranding: true,
		})));
		expect(sendZohoEmail.mock.calls[0][0].body).toContain('Signature');
	});

	test('reports send failures and restores the send button', async () => {
		mockLocation.state = { to: 'recipient@test.com', subject: 'Subject' };
		sendZohoEmail.mockRejectedValueOnce(new Error('mail service down'));
		render(<EmailForm />);
		fireEvent.click(screen.getByText('Send'));

		await waitFor(() => {
			expect(mockAlert.handleError).toHaveBeenCalledWith(expect.any(Error), 'Error sending email');
			expect(screen.getByText('Send')).not.toBeDisabled();
		});
	});

	test('opens Cc/Bcc fields and cancels compose', async () => {
		mockLocation.state = {};
		render(<EmailForm />);
		fireEvent.click(screen.getByRole('button', { name: 'Cc' }));
		expect(screen.getByLabelText('Cc')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Bcc' }));
		expect(screen.getByLabelText('Bcc')).toBeInTheDocument();

		const bccInput = screen.getByLabelText('Bcc');
		fireEvent.change(bccInput, { target: { value: 'hidden@test.com' } });
		fireEvent.keyDown(bccInput, { key: 'Enter' });
		await waitFor(() => {
			expect(screen.getByText('hidden@test.com')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText('Cancel'));
		expect(mockNavigate).toHaveBeenCalledWith(-1);
	});
});
