import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TemplateManagerDialog from './TemplateManagerDialog';

const mockShowAlert = jest.fn();
const mockHandleError = jest.fn();
const mockSetDoc = jest.fn();
const mockDoc = jest.fn(() => ({ path: 'emailTemplates/t1' }));

vi.mock('../../context/EmailTemplateContext', () => ({
	useEmailTemplates: () => ({
		templates: [{ id: 'welcome', key: 'welcome', label: 'Welcome', group: 'Reminders', subject: 'Hi', html: '<p>Hi</p>', requiredFields: [] }],
	}),
}));

vi.mock('../../context/AlertContext', () => ({
	useAlert: () => ({ showAlert: mockShowAlert, handleError: mockHandleError }),
}));

vi.mock('firebase/firestore', () => ({
	doc: (...args) => mockDoc(...args),
	setDoc: (...args) => mockSetDoc(...args),
}));

vi.mock('../../config/data/firebase', () => ({
	db: {},
}));

vi.mock('../../config/data/collections', () => ({
	collections: { emailTemplates: 'emailTemplates' },
}));

describe('TemplateManagerDialog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSetDoc.mockResolvedValue(undefined);
	});

	it('lists templates and opens editor for add', async () => {
		render(<TemplateManagerDialog onClose={jest.fn()} />);
		expect(screen.getByText('Welcome')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: /add/i }));
		expect(await screen.findByLabelText(/Key/i)).toBeInTheDocument();
	});

	it('warns when required fields are missing on save', async () => {
		render(<TemplateManagerDialog onClose={jest.fn()} />);
		fireEvent.click(screen.getByRole('button', { name: /add/i }));
		fireEvent.click(await screen.findByRole('button', { name: /save/i }));
		expect(mockShowAlert).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'warning' })
		);
	});

	it('saves a valid template', async () => {
		render(<TemplateManagerDialog onClose={jest.fn()} />);
		fireEvent.click(screen.getByRole('button', { name: /add/i }));

		fireEvent.change(await screen.findByLabelText(/Template Key/i), { target: { value: 't1' } });
		fireEvent.change(screen.getByLabelText(/Label \(Button Text\)/i), { target: { value: 'T1' } });
		fireEvent.change(screen.getByLabelText(/Email Subject/i), { target: { value: 'Subject' } });
		fireEvent.click(screen.getByRole('button', { name: /save/i }));

		await waitFor(() => {
			expect(mockSetDoc).toHaveBeenCalled();
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});
	});

	it('edits an existing template and manages required fields', async () => {
		render(<TemplateManagerDialog onClose={jest.fn()} />);
		fireEvent.click(screen.getByRole('button', { name: /edit/i }));

		expect(await screen.findByDisplayValue('Welcome')).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText(/HTML Body/i), { target: { value: '<p>Updated</p>' } });

		fireEvent.click(screen.getByRole('button', { name: /add required field/i }));
		fireEvent.change(screen.getByLabelText(/Variable Name/i), { target: { value: 'amount' } });
		fireEvent.change(screen.getByLabelText(/Display Label/i), { target: { value: 'Amount' } });

		// Remove the required field via the error IconButton
		const removeBtn = screen.getByTestId('DeleteOutlinedIcon').closest('button');
		fireEvent.click(removeBtn);
		expect(screen.queryByLabelText(/Variable Name/i)).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
		expect(await screen.findByText('Manage Email Templates')).toBeInTheDocument();
	});

	it('surfaces save errors via handleError', async () => {
		mockSetDoc.mockRejectedValueOnce(new Error('write failed'));
		render(<TemplateManagerDialog onClose={jest.fn()} />);
		fireEvent.click(screen.getByRole('button', { name: /add/i }));
		fireEvent.change(await screen.findByLabelText(/Template Key/i), { target: { value: 't2' } });
		fireEvent.change(screen.getByLabelText(/Label \(Button Text\)/i), { target: { value: 'T2' } });
		fireEvent.change(screen.getByLabelText(/Email Subject/i), { target: { value: 'Subj' } });
		fireEvent.click(screen.getByRole('button', { name: /save/i }));
		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error), 'saveTemplate');
		});
	});

	it('closes from the list view', () => {
		const onClose = jest.fn();
		render(<TemplateManagerDialog onClose={onClose} />);
		fireEvent.click(screen.getByRole('button', { name: /close/i }));
		expect(onClose).toHaveBeenCalled();
	});
});
