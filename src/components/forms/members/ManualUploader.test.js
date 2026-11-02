import React from 'react';
import { act, cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManualUploader from './ManualUploader';
import { useTheme } from '../../../context/ThemeContext';
import { useAlert } from '../../../context/AlertContext';
import * as firebaseConfig from '../../../config/data/firebase';
import { useTitle } from '../../../context/HelmetContext';
import { maybePromoteApplicationToCompleted } from '../../../config/data/applicationAttachments';

const mockNavigate = jest.fn();
const mockShowAlert = jest.fn();
const mockHandleError = jest.fn();

vi.mock('react-router-dom', () => ({
	useNavigate: () => mockNavigate,
}));

vi.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
vi.mock('../../../context/AlertContext', () => ({ useAlert: jest.fn() }));
vi.mock('../../../context/HelmetContext', () => ({ useTitle: jest.fn() }));

vi.mock('../../../config/data/firebase', () => ({
	__esModule: true,
	getRealTimeCollection: jest.fn(),
	getApplicationsForApplicant: jest.fn(),
	getCollectionData: jest.fn(),
	saveFile: jest.fn(),
	getDownloadLinkForFile: jest.fn(),
	saveCollectionData: jest.fn(),
	resolveApplicationCycleYear: jest.fn((app) => app.cycleYear ?? null),
}));

vi.mock('../../../config/data/applicationAttachments', () => ({
	maybePromoteApplicationToCompleted: jest.fn(),
}));

vi.mock('../../loader/Loader', () => ({ default: () => <div>Loading...</div> }));

describe('ManualUploader Component', () => {
	afterEach(cleanup);

	beforeEach(() => {
		jest.clearAllMocks();
		useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
		useTitle.mockImplementation(() => {});

		firebaseConfig.getRealTimeCollection.mockImplementation((_col, callback) => {
			callback([{ id: 'app1', firstName: 'John', lastName: 'Doe' }]);
			return jest.fn();
		});
	});

	const selectAutocompleteOption = async (label, optionText) => {
		const input = screen.getByRole('combobox', { name: label });
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: optionText } });
		const option = await screen.findByRole('option', { name: new RegExp(optionText, 'i') });
		fireEvent.click(option);
	};

	const selectFirstAttachmentType = async () => {
		const attachmentSelect = document.getElementById('manual-upload-attachment-type');
		expect(attachmentSelect).toBeTruthy();
		await waitFor(() => expect(attachmentSelect).not.toHaveAttribute('aria-disabled', 'true'));
		fireEvent.mouseDown(attachmentSelect);
		const options = await screen.findAllByRole('option');
		fireEvent.click(options[0]);
	};

	const fillRequiredFields = async () => {
		firebaseConfig.getApplicationsForApplicant.mockResolvedValue([
			{ id: 'appl-1', type: 'New Applicant', status: 'Incomplete', cycleYear: 2026 },
		]);
		firebaseConfig.getCollectionData.mockResolvedValue({
			id: 'appl-1',
			type: 'New Applicant',
			status: 'Incomplete',
			attachments: 'att-doc-1',
		});

		await selectAutocompleteOption('Applicant', 'John Doe');
		await selectAutocompleteOption('Application', 'New Applicant');
		await waitFor(() => expect(firebaseConfig.getCollectionData).toHaveBeenCalled());
		await selectFirstAttachmentType();

		const file = new File(['pdf-bytes'], 'transcript.pdf', { type: 'application/pdf' });
		const fileInput = document.querySelector('input[type="file"]');
		expect(fileInput).toBeTruthy();
		fireEvent.change(fileInput, { target: { files: [file] } });
	};

	test('renders loader initially then form', async () => {
		render(<ManualUploader />);
		expect(screen.getByRole('heading', { name: 'Manual Attachment Uploader' })).toBeInTheDocument();
		expect(screen.getByRole('combobox', { name: 'Applicant' })).toBeInTheDocument();
		expect(screen.getByRole('combobox', { name: 'Application' })).toBeInTheDocument();
		expect(screen.getByText('Attachment type')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /select file/i })).toBeInTheDocument();
	});

	test('navigates back on close', () => {
		render(<ManualUploader />);

		const backBtn = screen.getByLabelText('Go back');
		fireEvent.click(backBtn);
		expect(mockNavigate).toHaveBeenCalledWith(-1);
	});

	test('requires all fields before upload', async () => {
		render(<ManualUploader />);

		fireEvent.click(screen.getByRole('button', { name: /upload attachment/i }));

		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith({
				message: 'Please complete every field before uploading.',
				type: 'error',
			});
		});
	});

	test('uploads a document and promotes the application when configured', async () => {
		firebaseConfig.saveFile.mockResolvedValue('apps/appl-1/file.pdf');
		firebaseConfig.getDownloadLinkForFile.mockResolvedValue('https://example.com/file.pdf');
		firebaseConfig.saveCollectionData.mockResolvedValue(true);
		maybePromoteApplicationToCompleted.mockResolvedValue(true);

		render(<ManualUploader />);
		await fillRequiredFields();
		fireEvent.click(screen.getByRole('button', { name: /upload attachment/i }));

		await waitFor(() => {
			expect(firebaseConfig.saveFile).toHaveBeenCalled();
			expect(firebaseConfig.saveCollectionData).toHaveBeenCalledWith(
				'attachments',
				'att-doc-1',
				expect.objectContaining({ applicantPersonalLetter: expect.any(Object) }),
			);
			expect(maybePromoteApplicationToCompleted).toHaveBeenCalledWith('appl-1');
			expect(mockShowAlert).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'File uploaded and application marked completed!', type: 'success' }),
			);
		});
	});

	test('reports application-loading failures', async () => {
		firebaseConfig.getApplicationsForApplicant.mockRejectedValueOnce(new Error('applications unavailable'));
		render(<ManualUploader />);
		await selectAutocompleteOption('Applicant', 'John Doe');
		await waitFor(() => expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error), 'manual-upload-load-applications'));
	});

	test('reports upload failures during submission', async () => {
		const error = new Error('storage unavailable');
		firebaseConfig.saveFile.mockRejectedValueOnce(error);

		render(<ManualUploader />);
		await fillRequiredFields();
		fireEvent.click(screen.getByRole('button', { name: /upload attachment/i }));

		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalled();
			expect(mockHandleError.mock.calls[0][0]).toBe(error);
			expect(mockHandleError.mock.calls[0][1]).toBe('manual-upload-submit');
		});
	});

	test('reports selected-application load failures and formats large file sizes', async () => {
		firebaseConfig.getCollectionData.mockRejectedValueOnce(new Error('application unavailable'));
		render(<ManualUploader />);
		await selectAutocompleteOption('Applicant', 'John Doe');
		await selectAutocompleteOption('Application', 'New Applicant');
		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error), 'manual-upload-load-application');
		});

		const fileInput = document.querySelector('input[type="file"]');
		const big = new File([new Uint8Array(2 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' });
		await act(async () => {
			fireEvent.change(fileInput, { target: { files: [big] } });
		});
		expect(screen.getByText(/MB/i)).toBeInTheDocument();
	});

	test('navigates back from the Cancel action button', () => {
		render(<ManualUploader />);
		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(mockNavigate).toHaveBeenCalledWith(-1);
	});

	test('creates and links a new attachments doc when application has none', async () => {
		firebaseConfig.getApplicationsForApplicant.mockResolvedValue([
			{ id: 'appl-1', type: 'New Applicant', status: 'Incomplete', cycleYear: 2026 },
		]);
		firebaseConfig.getCollectionData.mockResolvedValue({
			id: 'appl-1',
			type: 'New Applicant',
			status: 'Incomplete',
			// no attachments field → ensureAttachmentsId creates one
		});
		firebaseConfig.saveFile.mockResolvedValue('apps/appl-1/file.pdf');
		firebaseConfig.getDownloadLinkForFile.mockResolvedValue('https://example.com/file.pdf');
		firebaseConfig.saveCollectionData.mockResolvedValue(true);
		maybePromoteApplicationToCompleted.mockResolvedValue(false);

		render(<ManualUploader />);
		await selectAutocompleteOption('Applicant', 'John Doe');
		await selectAutocompleteOption('Application', 'New Applicant');
		await waitFor(() => expect(firebaseConfig.getCollectionData).toHaveBeenCalled());
		await selectFirstAttachmentType();
		const file = new File(['pdf-bytes'], 'transcript.pdf', { type: 'application/pdf' });
		fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } });
		fireEvent.click(screen.getByRole('button', { name: /upload attachment/i }));

		await waitFor(() => {
			expect(firebaseConfig.saveCollectionData).toHaveBeenCalledWith(
				'attachments',
				expect.any(String),
				expect.objectContaining({ attachmentsID: expect.any(String), completedBy: expect.any(String) }),
			);
			expect(firebaseConfig.saveCollectionData).toHaveBeenCalledWith(
				'applications',
				'appl-1',
				expect.objectContaining({ attachments: expect.any(String) }),
			);
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});
	});

	test('surfaces attachment-create failure when ensureAttachments cannot create', async () => {
		firebaseConfig.getApplicationsForApplicant.mockResolvedValue([
			{ id: 'appl-1', type: 'New Applicant', status: 'Incomplete', cycleYear: 2026 },
		]);
		// Application load: no attachments field. Later ensureAttachmentsId may call getCollectionData for missing id — n/a.
		firebaseConfig.getCollectionData.mockResolvedValue({
			id: 'appl-1',
			type: 'New Applicant',
			status: 'Incomplete',
		});
		firebaseConfig.saveFile.mockResolvedValue('apps/appl-1/file.pdf');
		firebaseConfig.getDownloadLinkForFile.mockResolvedValue('https://example.com/file.pdf');
		firebaseConfig.saveCollectionData.mockResolvedValue(false); // create attachments doc fails

		render(<ManualUploader />);
		await selectAutocompleteOption('Applicant', 'John Doe');
		await selectAutocompleteOption('Application', 'New Applicant');
		await waitFor(() => expect(firebaseConfig.getCollectionData).toHaveBeenCalled());
		await selectFirstAttachmentType();
		fireEvent.change(document.querySelector('input[type="file"]'), {
			target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] },
		});
		fireEvent.click(screen.getByRole('button', { name: /upload attachment/i }));
		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalled();
			expect(String(mockHandleError.mock.calls.at(-1)[0].message)).toMatch(/Could not create an attachment record/);
		});
	});

	test('surfaces attachment-link failure after creating attachments doc', async () => {
		firebaseConfig.getApplicationsForApplicant.mockResolvedValue([
			{ id: 'appl-1', type: 'New Applicant', status: 'Incomplete', cycleYear: 2026 },
		]);
		firebaseConfig.getCollectionData.mockResolvedValue({
			id: 'appl-1',
			type: 'New Applicant',
			status: 'Incomplete',
		});
		firebaseConfig.saveFile.mockResolvedValue('apps/appl-1/file.pdf');
		firebaseConfig.getDownloadLinkForFile.mockResolvedValue('https://example.com/file.pdf');
		firebaseConfig.saveCollectionData
			.mockResolvedValueOnce(true) // create attachments ok
			.mockResolvedValueOnce(false); // link to application fails

		render(<ManualUploader />);
		await selectAutocompleteOption('Applicant', 'John Doe');
		await selectAutocompleteOption('Application', 'New Applicant');
		await waitFor(() => expect(firebaseConfig.getCollectionData).toHaveBeenCalled());
		await selectFirstAttachmentType();
		fireEvent.change(document.querySelector('input[type="file"]'), {
			target: { files: [new File(['x'], 'b.pdf', { type: 'application/pdf' })] },
		});
		fireEvent.click(screen.getByRole('button', { name: /upload attachment/i }));
		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalled();
			expect(String(mockHandleError.mock.calls.at(-1)[0].message)).toMatch(/could not link it to the application/);
		});
	});



	test('recreates attachments when existing id is missing from storage', async () => {
		firebaseConfig.getApplicationsForApplicant.mockResolvedValue([
			{ id: 'appl-1', type: 'New Applicant', status: 'Incomplete', cycleYear: 2026 },
		]);
		const appWithStaleAtt = {
			id: 'appl-1',
			type: 'New Applicant',
			status: 'Incomplete',
			attachments: 'stale-att',
			completedBy: 'owner-9',
		};
		firebaseConfig.getCollectionData.mockImplementation(async (id, collection) => {
			if (collection === 'attachments' || id === 'stale-att') return null;
			return appWithStaleAtt;
		});
		firebaseConfig.saveFile.mockResolvedValue('apps/appl-1/file.pdf');
		firebaseConfig.getDownloadLinkForFile.mockResolvedValue('https://example.com/file.pdf');
		firebaseConfig.saveCollectionData.mockResolvedValue(true);
		maybePromoteApplicationToCompleted.mockResolvedValue(true);

		render(<ManualUploader />);
		await selectAutocompleteOption('Applicant', 'John Doe');
		await selectAutocompleteOption('Application', 'New Applicant');
		await waitFor(() => expect(firebaseConfig.getCollectionData).toHaveBeenCalled());
		await selectFirstAttachmentType();
		fireEvent.change(document.querySelector('input[type="file"]'), {
			target: { files: [new File(['x'], 'c.pdf', { type: 'application/pdf' })] },
		});
		fireEvent.click(screen.getByRole('button', { name: /upload attachment/i }));
		await waitFor(() => {
			expect(firebaseConfig.saveCollectionData).toHaveBeenCalledWith(
				'attachments',
				expect.any(String),
				expect.objectContaining({ completedBy: 'owner-9' }),
			);
			expect(mockShowAlert).toHaveBeenCalledWith(
				expect.objectContaining({ message: expect.stringMatching(/marked completed/i) }),
			);
		});
	});

	test('reports null saveFile as upload failure', async () => {
		firebaseConfig.getApplicationsForApplicant.mockResolvedValue([
			{ id: 'appl-1', type: 'New Applicant', status: 'Incomplete', cycleYear: 2026 },
		]);
		firebaseConfig.getCollectionData.mockResolvedValue({
			id: 'appl-1', type: 'New Applicant', status: 'Incomplete', attachments: 'att-doc-1',
		});
		firebaseConfig.saveFile.mockResolvedValue(null);
		render(<ManualUploader />);
		await selectAutocompleteOption('Applicant', 'John Doe');
		await selectAutocompleteOption('Application', 'New Applicant');
		await waitFor(() => expect(firebaseConfig.getCollectionData).toHaveBeenCalled());
		await selectFirstAttachmentType();
		fireEvent.change(document.querySelector('input[type="file"]'), {
			target: { files: [new File(['x'], 'd.pdf', { type: 'application/pdf' })] },
		});
		fireEvent.click(screen.getByRole('button', { name: /upload attachment/i }));
		await waitFor(() => {
			expect(String(mockHandleError.mock.calls.at(-1)[0].message)).toMatch(/File upload failed/);
		});
	});

	test('reports missing download link after upload', async () => {
		firebaseConfig.getApplicationsForApplicant.mockResolvedValue([
			{ id: 'appl-1', type: 'New Applicant', status: 'Incomplete', cycleYear: 2026 },
		]);
		firebaseConfig.getCollectionData.mockResolvedValue({
			id: 'appl-1', type: 'New Applicant', status: 'Incomplete', attachments: 'att-doc-1',
		});
		firebaseConfig.saveFile.mockResolvedValue('apps/appl-1/file.pdf');
		firebaseConfig.getDownloadLinkForFile.mockResolvedValue(null);
		render(<ManualUploader />);
		await selectAutocompleteOption('Applicant', 'John Doe');
		await selectAutocompleteOption('Application', 'New Applicant');
		await waitFor(() => expect(firebaseConfig.getCollectionData).toHaveBeenCalled());
		await selectFirstAttachmentType();
		fireEvent.change(document.querySelector('input[type="file"]'), {
			target: { files: [new File(['x'], 'e.pdf', { type: 'application/pdf' })] },
		});
		fireEvent.click(screen.getByRole('button', { name: /upload attachment/i }));
		await waitFor(() => {
			expect(String(mockHandleError.mock.calls.at(-1)[0].message)).toMatch(/download link/);
		});
	});

	test('navigates back when Go back is clicked', async () => {
		render(<ManualUploader />);
		fireEvent.click(screen.getByRole('button', { name: /go back/i }));
		expect(mockNavigate).toHaveBeenCalledWith(-1);
	});

});
