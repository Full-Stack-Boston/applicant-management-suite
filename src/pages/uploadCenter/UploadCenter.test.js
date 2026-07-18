import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UploadCenter from './UploadCenter';
import { saveFile, getRequestData, saveCollectionData, getDownloadLinkForFile, getApplication } from '../../config/data/firebase';
import { validateRequest, validatePin } from '../../config/Constants';
import { maybePromoteApplicationToCompleted } from '../../config/data/applicationAttachments';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';

// --- Mocks ---

vi.mock('../../config/data/firebase', () => ({
	saveFile: jest.fn(),
	getRequestData: jest.fn(),
	saveCollectionData: jest.fn(),
	getDownloadLinkForFile: jest.fn(),
	getApplication: jest.fn(),
}));

vi.mock('../../config/Constants', () => ({
	validateRequest: jest.fn(),
	validatePin: jest.fn(),
	brand: {
		helpEmail: 'demo@fullstackboston.com',
		theOrganizationName: 'The Application Management Suite',
		organizationName: 'Application Management Suite',
	},
	LettersOfRecommendation: {
		'rec-letter': { name: 'Recommendation Letter', purpose: 'endorse the candidate' },
	},
}));

vi.mock('../../config/data/applicationAttachments', () => ({
	maybePromoteApplicationToCompleted: jest.fn(),
}));

vi.mock('../../config/data/collections', () => ({
	UploadType: { applicationAttachment: 'applicationAttachment' },
	collections: { requests: 'requests', attachments: 'attachments' },
}));

vi.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

vi.mock('react-router-dom', () => ({
	useParams: jest.fn(),
	useNavigate: jest.fn(),
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

vi.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

vi.mock('../../components/home/homePageStyles', () => ({
	homeAuthSubmitButtonSx: () => ({}),
	homeAuthSecondaryButtonSx: {},
	homeDashboardIntroBodySx: {},
}));

vi.mock('../../components/home/PublicPageLayout', () => ({
	default: ({ children }) => <div data-testid='public-page-layout'>{children}</div>,
}));

vi.mock('../../components/home/PublicStatusPage', () => ({
	default: ({ children, title, subtitle }) => (
		<div data-testid='public-status-page'>
			<div>{title}</div>
			{subtitle && <p>{subtitle}</p>}
			{children}
		</div>
	),
}));

vi.mock('../../components/auth/AuthFormCard', () => ({
	default: ({ children, title, subtitle }) => (
		<div data-testid='auth-form-card'>
			<div>{title}</div>
			{subtitle && <p>{subtitle}</p>}
			{children}
		</div>
	),
}));

vi.mock('../../components/visuallyHiddenInput/VisuallyHiddenInput', () => ({
	VisuallyHiddenInput: ({ onChange, ...props }) => <input data-testid='file-input' type='file' onChange={onChange} {...props} />,
}));

describe('UploadCenter Component', () => {
	const mockNavigate = jest.fn();
	const mockShowAlert = jest.fn();
	const mockToken = 'valid-token-123';
	const mockRequest = {
		id: 'req-1',
		applicationID: 'app-1',
		attachmentsID: 'att-1',
		attempts: 0,
		expiryDate: new Date(Date.now() + 86400000).toISOString(),
		completed: false,
		fromName: 'John Doe',
		attachmentType: 'rec-letter',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		useParams.mockReturnValue({ token: mockToken });
		useNavigate.mockReturnValue(mockNavigate);
		useTheme.mockReturnValue({ primaryColor: 'green' });
		useAlert.mockReturnValue({ showAlert: mockShowAlert });
		window.close = jest.fn();
		validatePin.mockResolvedValue(true);
		maybePromoteApplicationToCompleted.mockResolvedValue(true);
	});

	test('renders loading state initially', async () => {
		validateRequest.mockReturnValue(new Promise(() => {}));
		render(<UploadCenter />);
		expect(screen.getByText(/Verifying Your Link/i)).toBeInTheDocument();
	});

	test('renders error message when token is invalid', async () => {
		validateRequest.mockResolvedValue({ result: false });

		render(<UploadCenter />);

		await waitFor(() => expect(screen.queryByText(/Verifying Your Link/i)).not.toBeInTheDocument());

		expect(screen.getByText(/This upload link may be expired/i)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Contact the board/i })).toHaveAttribute('href', expect.stringContaining('demo@fullstackboston.com'));
	});

	test('renders error message when request is expired', async () => {
		validateRequest.mockResolvedValue({ result: true, id: 'req-1' });
		getRequestData.mockResolvedValue({
			...mockRequest,
			expiryDate: new Date(Date.now() - 86400000).toISOString(),
		});

		render(<UploadCenter />);

		await waitFor(() => expect(screen.queryByText(/Verifying Your Link/i)).not.toBeInTheDocument());
		expect(screen.getByText(/This upload link may be expired/i)).toBeInTheDocument();
	});

	test('renders upload form when token is valid', async () => {
		validateRequest.mockResolvedValue({ result: true, id: 'req-1' });
		getRequestData.mockResolvedValue(mockRequest);

		render(<UploadCenter />);

		await waitFor(() => expect(screen.queryByText(/Verifying Your Link/i)).not.toBeInTheDocument());

		expect(screen.getByText('Upload Recommendation Letter for John Doe')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('123456')).toBeInTheDocument();
		expect(screen.getByText(/The Application Management Suite has asked you to submit a letter/i)).toBeInTheDocument();
		expect(screen.getByText(/endorse the candidate/i)).toBeInTheDocument();
	});

	test('renders success message immediately if request is already completed', async () => {
		validateRequest.mockResolvedValue({ result: true, id: 'req-1' });
		getRequestData.mockResolvedValue({ ...mockRequest, completed: true });

		render(<UploadCenter />);

		await waitFor(() => expect(screen.queryByText(/Verifying Your Link/i)).not.toBeInTheDocument());

		expect(screen.getByText(/Thank you\. We received your/i)).toBeInTheDocument();
	});

	test('renders upload form when token is valid even if attempts is missing', async () => {
		validateRequest.mockResolvedValue({ result: true, id: 'req-1' });
		getRequestData.mockResolvedValue({ ...mockRequest, attempts: undefined });

		render(<UploadCenter />);

		await waitFor(() => expect(screen.queryByText(/Verifying Your Link/i)).not.toBeInTheDocument());
		expect(screen.getByText('Upload Recommendation Letter for John Doe')).toBeInTheDocument();
	});

	test('handles file upload success flow', async () => {
		validateRequest.mockResolvedValue({ result: true, id: 'req-1' });
		getRequestData.mockResolvedValue(mockRequest);
		getApplication.mockResolvedValue({ attachments: 'att-1' });

		saveFile.mockResolvedValue('path/to/file.pdf');
		getDownloadLinkForFile.mockResolvedValue('http://download-link');

		render(<UploadCenter />);
		await waitFor(() => expect(screen.queryByText(/Verifying Your Link/i)).not.toBeInTheDocument());

		const pinInput = screen.getByPlaceholderText('123456');
		fireEvent.change(pinInput, { target: { value: '123456' } });

		const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
		const input = screen.getByTestId('file-input');

		Object.defineProperty(input, 'files', { value: [file] });
		fireEvent.change(input);

		await screen.findByText(/Thank you\. We received your/i);

		expect(validatePin).toHaveBeenCalledWith('123456');
		expect(saveCollectionData).toHaveBeenCalledWith('requests', 'req-1', expect.objectContaining({ attempts: 1 }));
		expect(maybePromoteApplicationToCompleted).toHaveBeenCalledWith('app-1');
	});

	test('alerts when file is not a PDF', async () => {
		validateRequest.mockResolvedValue({ result: true, id: 'req-1' });
		getRequestData.mockResolvedValue(mockRequest);

		render(<UploadCenter />);
		await waitFor(() => expect(screen.queryByText(/Verifying Your Link/i)).not.toBeInTheDocument());

		fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '123456' } });

		const file = new File(['content'], 'test.png', { type: 'image/png' });
		const input = screen.getByTestId('file-input');
		Object.defineProperty(input, 'files', { value: [file] });
		fireEvent.change(input);

		await waitFor(() => expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Please select a PDF file.', type: 'warning' }));
		expect(saveFile).not.toHaveBeenCalled();
	});

	test('alerts when file is too large (>25MB)', async () => {
		validateRequest.mockResolvedValue({ result: true, id: 'req-1' });
		getRequestData.mockResolvedValue(mockRequest);

		render(<UploadCenter />);
		await waitFor(() => expect(screen.queryByText(/Verifying Your Link/i)).not.toBeInTheDocument());

		fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '123456' } });

		const largeFile = new File([''], 'large.pdf', { type: 'application/pdf' });
		Object.defineProperty(largeFile, 'size', { value: 26 * 1024 * 1024 });

		const input = screen.getByTestId('file-input');
		Object.defineProperty(input, 'files', { value: [largeFile] });
		fireEvent.change(input);

		await waitFor(() => expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('File size exceeds the limit'), type: 'warning' })));
	});

	test('alerts on attachment ID mismatch', async () => {
		validateRequest.mockResolvedValue({ result: true, id: 'req-1' });
		getRequestData.mockResolvedValue(mockRequest);
		getApplication.mockResolvedValue({ attachments: 'WRONG-ID' });

		render(<UploadCenter />);
		await waitFor(() => expect(screen.queryByText(/Verifying Your Link/i)).not.toBeInTheDocument());

		fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '123456' } });

		const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
		const input = screen.getByTestId('file-input');
		Object.defineProperty(input, 'files', { value: [file] });
		fireEvent.change(input);

		await waitFor(() => expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Attachment ID mismatch. Please contact support.', type: 'error' }));
	});

	test('Navigation buttons work correctly on success screen', async () => {
		validateRequest.mockResolvedValue({ result: true, id: 'req-1' });
		getRequestData.mockResolvedValue({ ...mockRequest, completed: true });

		render(<UploadCenter />);
		await waitFor(() => expect(screen.queryByText(/Verifying Your Link/i)).not.toBeInTheDocument());

		fireEvent.click(screen.getByText('Return home'));
		expect(mockNavigate).toHaveBeenCalled();

		fireEvent.click(screen.getByText('Close this page'));
		expect(window.close).toHaveBeenCalled();
	});
});
