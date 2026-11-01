import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApplicantForm } from './Applicants';
import { useAlert } from '../../../context/AlertContext';
import { saveApplicantData, saveFile, getDownloadLinkForFile } from '../../../config/data/firebase';

// --- Mocks ---
vi.mock('../../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

vi.mock('../../../config/data/firebase', () => ({
	saveApplicantData: jest.fn(),
	saveFile: jest.fn(),
	getDownloadLinkForFile: jest.fn(),
}));

vi.mock('../../loader/Loader', () => ({ default: () => <div data-testid='loader'>Loading...</div> }));

// Mock Child Components
vi.mock('../GenericAdminForm', () => ({
	default: ({ onSubmit, onFileUpload }) => (
		<div data-testid='generic-admin-form'>
			<button onClick={() => onSubmit({ firstName: 'Updated Name', gradYear: '2025' })}>Submit</button>
			<button onClick={() => onSubmit({ firstName: 'Bad Year', gradYear: '25' })}>Submit Invalid Year</button>
			<button onClick={() => onSubmit({ firstName: 'No Year' })}>Submit No Year</button>
			<button onClick={() => onFileUpload('upload', 'picture', { name: 'test.jpg' })}>Upload</button>
			<button onClick={() => onFileUpload('delete', 'picture', { name: 'test.jpg' })}>Ignore Non Upload</button>
			<button onClick={() => onFileUpload('upload', 'picture', null)}>Upload Missing File</button>
		</div>
	),
}));

vi.mock('../../widget/Application', () => ({ default: ({ id }) => <div data-testid={`app-widget-${id}`}>App {id}</div> }));

describe('ApplicantForm Component', () => {
	const mockAlert = { showAlert: jest.fn(), handleError: jest.fn() };

	beforeEach(() => {
		jest.clearAllMocks();
		useAlert.mockReturnValue(mockAlert);
	});

	test('renders generic form and associated applications', () => {
		const applicant = { id: '123', applications: ['app1', 'app2'] };
		render(<ApplicantForm applicant={applicant} />);

		expect(screen.getByTestId('generic-admin-form')).toBeInTheDocument();
		expect(screen.getByText('Associated Applications')).toBeInTheDocument();
		expect(screen.getByTestId('app-widget-app1')).toBeInTheDocument();
		expect(screen.getByTestId('app-widget-app2')).toBeInTheDocument();
	});

	test('handles form submission successfully', async () => {
		render(<ApplicantForm applicant={{ id: '123' }} />);

		fireEvent.click(screen.getByText('Submit'));

		await waitFor(() => {
			expect(saveApplicantData).toHaveBeenCalledWith(
				'123',
				expect.objectContaining({
					firstName: 'Updated Name',
					// Logic converts 4-digit year to ISO string or keeps it if not matching regex
					// The mock passes '2025' which matches /^\d{4}$/
					// So we expect an ISO string
				})
			);
			expect(mockAlert.showAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});
	});

	test('validates graduation year format', async () => {
		render(<ApplicantForm applicant={{ id: '123' }} />);
		fireEvent.click(screen.getByText('Submit Invalid Year'));
		await waitFor(() => {
			expect(mockAlert.showAlert).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Please enter a valid 4-digit graduation year.', type: 'error' })
			);
		});
		expect(saveApplicantData).not.toHaveBeenCalled();
	});

	test('handles submit failure via handleError', async () => {
		saveApplicantData.mockRejectedValueOnce(new Error('save failed'));
		render(<ApplicantForm applicant={{ id: '123' }} />);
		fireEvent.click(screen.getByText('Submit'));
		await waitFor(() => {
			expect(mockAlert.handleError).toHaveBeenCalledWith(expect.any(Error), 'applicant-form-submit');
		});
	});

	test('handles file upload', async () => {
		saveFile.mockResolvedValue('ref/loc');
		getDownloadLinkForFile.mockResolvedValue('http://url.com');

		render(<ApplicantForm applicant={{ id: '123' }} />);

		fireEvent.click(screen.getByText('Upload'));

		expect(screen.getByTestId('loader')).toBeInTheDocument(); // Loading state

		await waitFor(() => {
			expect(saveFile).toHaveBeenCalled();
			expect(getDownloadLinkForFile).toHaveBeenCalled();
			expect(mockAlert.showAlert).toHaveBeenCalledWith(expect.objectContaining({ message: 'Picture updated!' }));
		});
	});

	test('handles missing download link and non-upload actions', async () => {
		saveFile.mockResolvedValue('ref/loc');
		getDownloadLinkForFile.mockResolvedValue(null);
		render(<ApplicantForm applicant={{ id: '123', applications: [{ id: 'obj-app' }] }} />);

		expect(screen.getByTestId('app-widget-obj-app')).toBeInTheDocument();

		fireEvent.click(screen.getByText('Ignore Non Upload'));
		fireEvent.click(screen.getByText('Upload Missing File'));
		expect(saveFile).not.toHaveBeenCalled();

		fireEvent.click(screen.getByText('Upload'));
		await waitFor(() => {
			expect(mockAlert.handleError).toHaveBeenCalledWith(expect.any(Error), 'applicant-picture-upload');
		});
	});

	test('shows empty application history message', () => {
		render(<ApplicantForm applicant={{ id: '123', applications: [] }} />);
		expect(screen.getByText('No application history found.')).toBeInTheDocument();
	});
});
