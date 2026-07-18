import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManualUploader from './ManualUploader';
import { useTheme } from '../../../context/ThemeContext';
import { useAlert } from '../../../context/AlertContext';
import * as firebaseConfig from '../../../config/data/firebase';
import { useTitle } from '../../../context/HelmetContext';

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
});
