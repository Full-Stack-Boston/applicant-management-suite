import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import SiteSettings from './Settings';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { saveCollectionData, getCollection } from '../../config/data/firebase';
import { collections } from '../../config/data/collections';

// --- 1. MOCK DEPENDENCIES ---

vi.mock('../../context/ConfigContext', () => ({
	useConfig: jest.fn(),
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

vi.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

vi.mock('../../context/DialogContext', () => ({
	useDialog: jest.fn(),
}));

vi.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(() => ({ member: { permissions: { email: true } } })),
}));

vi.mock('../../config/data/firebase', () => ({
	saveCollectionData: jest.fn(),
	getCollection: jest.fn(),
	db: {},
}));

vi.mock('firebase/firestore', () => ({
	doc: jest.fn(() => ({ path: 'videoBudget/status' })),
	onSnapshot: jest.fn(() => jest.fn()),
}));

// **FIX**: Added ApplicationType and other exports that Constants.js depends on
vi.mock('../../config/data/collections', () => ({
	collections: {
		siteConfig: 'site_config',
		applicants: 'applicants',
		videoBudget: 'videoBudget',
	},
	ApplicationType: {
		newApplication: 'newApplication',
		returningGrant: 'returningGrant',
		scholarship: 'scholarship',
	},
	UserType: {
		applicant: 'applicant',
		member: 'member',
	},
	ApplicationStatus: {
		started: 'Started',
	},
	InterviewStatus: {
		scheduled: 'Scheduled',
		invited: 'Invited',
		confirmed: 'Confirmed',
		completed: 'Completed',
		cancelled: 'Cancelled',
		noShow: 'No Show',
	},
}));

vi.mock('../../components/loader/Loader', () => ({ default: () => <div data-testid='loader'>Loading...</div> }));

// --- 2. MOCK ADMIN FUNCTIONS ---
const { mockNoParamsAction, mockWithParamsAction } = vi.hoisted(() => ({
	mockNoParamsAction: jest.fn(),
	mockWithParamsAction: jest.fn(),
}));

vi.mock('../../config/admin/maintenance', () => ({
	adminFunctions: [
		{
			id: 'test-no-params',
			label: 'Test Action (No Params)',
			description: 'Simple action description',
			action: mockNoParamsAction,
			parameters: [],
		},
		{
			id: 'test-with-params',
			label: 'Test Action (With Params)',
			description: 'Complex action description',
			action: mockWithParamsAction,
			parameters: [
				{ name: 'userId', label: 'Select User', type: 'select', required: true },
				{ name: 'force', label: 'Force', type: 'switch', defaultValue: false },
			],
		},
	],
	_testMocks: {
		mockNoParamsAction,
		mockWithParamsAction,
	},
}));

// --- 3. MOCK DATE PICKERS ---
vi.mock('@mui/x-date-pickers', () => {
	const React = require('react');
	const dayjs = require('dayjs');

	return {
		LocalizationProvider: ({ children }) => React.createElement('div', null, children),
		DateTimeField: ({ label, value, onChange }) =>
			React.createElement(
				'div',
				null,
				React.createElement('label', { htmlFor: label }, label),
				React.createElement('input', {
					id: label,
					'data-testid': `date-picker-${label}`,
					value: value ? new Date(value).toISOString().split('T')[0] : '',
					onChange: (e) => onChange(e.target.value ? dayjs(e.target.value) : null),
				})
			),
	};
});

vi.mock('@mui/x-date-pickers/AdapterDayjs', () => ({
	AdapterDayjs: {},
}));

describe('SiteSettings Component', () => {
	const mockShowAlert = jest.fn();
	const mockHandleError = jest.fn();
	const mockShowDialog = jest.fn();

	const mockConfigData = {
		CONFIG_ID: 'test-config-123',
		ENABLE_REGISTRATION: true,
		MAINTENANCE_MODE: false,
		APPLICATION_DEADLINE: new Date('2025-12-31'),
		SIGNATURE_CHAIRMAN: 'John Doe',
		SYSTEM_EMAIL: 'system@test.com',
		API_KEY: '12345',
		WELCOME_MESSAGE: 'Hello World',
		automations: {
			memberActivitySummary: {
				enabled: true,
				schedule: 'weekly',
				recipients: ['admin@test.com'],
			},
			incompleteCountAlert: {
				enabled: false,
				schedule: 'daily',
				threshold: 10,
				recipients: [],
			},
		},
	};

	const mockApplicants = [
		{ id: 'app1', firstName: 'Alice', lastName: 'Applicant', email: 'alice@test.com' },
		{ id: 'app2', firstName: 'Bob', lastName: 'Builder', email: 'bob@test.com' },
	];

	beforeEach(() => {
		jest.clearAllMocks();
		useConfig.mockReturnValue(mockConfigData);
		useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
		useDialog.mockReturnValue({ showDialog: mockShowDialog });
		useTitle.mockImplementation(() => { });

		getCollection.mockResolvedValue(mockApplicants);
		saveCollectionData.mockResolvedValue(true);

				mockNoParamsAction.mockClear();
		mockWithParamsAction.mockClear();
	});

	test('renders loader initially if config is null', () => {
		useConfig.mockReturnValue(null);
		render(<SiteSettings />);
		expect(screen.getByTestId('loader')).toBeInTheDocument();
	});

	test('renders grouped settings correctly', async () => {
		render(<SiteSettings />);

		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		expect(screen.getByText('Site Settings')).toBeInTheDocument();
		expect(screen.getByText('Automated Tasks')).toBeInTheDocument();
		expect(screen.getByText('Shared Signatures')).toBeInTheDocument();
		expect(screen.getByText('Email Delivery')).toBeInTheDocument();
		expect(screen.getByText('Lead Capture')).toBeInTheDocument();
		expect(screen.getByText('System Identity')).toBeInTheDocument();
		expect(screen.getByText(/Outbound: Simulated/i)).toBeInTheDocument();

		expect(screen.getByLabelText(/Enable Registration/i)).toBeChecked();
		expect(screen.getByLabelText(/Signature Chairman/i)).toHaveValue('John Doe');
		expect(screen.getByLabelText(/Api Key/i)).toHaveValue('12345');
		expect(screen.getByLabelText(/Application Deadline/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/System Email/i)).toHaveValue('system@test.com');
		expect(screen.getByLabelText(/Owner Lead Email/i)).toBeInTheDocument();
	});

	test('handles modifying a setting value', async () => {
		render(<SiteSettings />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const signatureInput = screen.getByLabelText(/Signature Chairman/i);
		fireEvent.change(signatureInput, { target: { value: 'Jane Doe' } });

		expect(signatureInput).toHaveValue('Jane Doe');
	});

	test('handles saving settings to firebase', async () => {
		render(<SiteSettings />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const signatureInput = screen.getByLabelText(/Signature Chairman/i);
		fireEvent.change(signatureInput, { target: { value: 'Jane Doe' } });

		const saveButton = screen.getByRole('button', { name: /Save Settings/i });
		fireEvent.click(saveButton);

		await waitFor(() => {
			expect(saveCollectionData).toHaveBeenCalledWith(
				collections.siteConfig,
				'test-config-123',
				expect.objectContaining({
					SIGNATURE_CHAIRMAN: 'Jane Doe',
					ENABLE_REGISTRATION: true,
				})
			);
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});
	});

	test('handles saving automation settings', async () => {
		render(<SiteSettings />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const recipientsInput = screen.getByDisplayValue('admin@test.com');
		fireEvent.change(recipientsInput, { target: { value: 'new@test.com, other@test.com' } });

		fireEvent.click(screen.getByRole('button', { name: /Save Settings/i }));

		await waitFor(() => {
			expect(saveCollectionData).toHaveBeenCalledWith(
				collections.siteConfig,
				'test-config-123',
				expect.objectContaining({
					automations: expect.objectContaining({
						memberActivitySummary: expect.objectContaining({
							recipients: ['new@test.com', 'other@test.com'],
						}),
					}),
				})
			);
		});
	});

	test('executes admin action with NO parameters', async () => {
		render(<SiteSettings />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const actionCard = screen.getByText('Test Action (No Params)').closest('div');
		const executeBtn = within(actionCard).getByRole('button', { name: /Execute/i });

		fireEvent.click(executeBtn);

		expect(mockShowDialog).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'adminActionConfirmation',
				callback: expect.any(Function),
			})
		);

		const dialogCall = mockShowDialog.mock.calls[0][0];
		await dialogCall.callback(true);

		expect(mockNoParamsAction).toHaveBeenCalled();
		expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('executed successfully') }));
	});

	test('executes admin action WITH parameters', async () => {
		render(<SiteSettings />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const actionCard = screen.getByText('Test Action (With Params)').closest('div');
		const executeBtn = within(actionCard).getByRole('button', { name: /Execute/i });

		fireEvent.click(executeBtn);

		expect(mockShowDialog).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'test-with-params',
				data: expect.objectContaining({
					inputs: expect.arrayContaining([expect.objectContaining({ name: 'userId', type: 'select' }), expect.objectContaining({ name: 'force', type: 'switch' })]),
				}),
				callback: expect.any(Function),
			})
		);

		const dialogCall = mockShowDialog.mock.calls[0][0];
		const mockResult = { userId: 'app1', force: true };
		await dialogCall.callback(mockResult);

		expect(mockWithParamsAction).toHaveBeenCalledWith(mockResult);
		expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('executed successfully') }));
	});

	test('handles admin action failure', async () => {
		render(<SiteSettings />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const testError = new Error('Execution Boom');
		mockNoParamsAction.mockRejectedValue(testError);

		const actionCard = screen.getByText('Test Action (No Params)').closest('div');
		const executeBtn = within(actionCard).getByRole('button', { name: /Execute/i });
		fireEvent.click(executeBtn);

		const dialogCall = mockShowDialog.mock.calls[0][0];
		await dialogCall.callback(true);

		expect(mockHandleError).toHaveBeenCalledWith(testError, expect.stringContaining('adminAction'));
	});

	test('reports Parker rebrand save failures', async () => {
		useConfig.mockReturnValue({
			...mockConfigData,
			WELCOME_MESSAGE: 'Welcome to Parker Memorial Fund',
		});
		const rebrandError = new Error('rebrand boom');
		saveCollectionData.mockRejectedValueOnce(rebrandError);

		render(<SiteSettings />);
		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalledWith(rebrandError, 'rebrand-settings');
		});
	});

	test('covers rebrand, grouping, save errors, and delivery controls', async () => {
		useConfig.mockReturnValue({
			...mockConfigData,
			WELCOME_MESSAGE: 'Welcome to the Parker Fund',
			MAIL_TO_GENERAL_EMAIL: 'general@test.com',
			CONTACT_EMAIL_ALIAS: 'alias@test.com',
			TAG_LIST: ['alpha', 'beta'],
			automations: {
				...mockConfigData.automations,
				memberActivitySummary: {
					enabled: true,
					schedule: 'weekly',
					recipients: 'legacy-not-array',
				},
			},
		});

		render(<SiteSettings />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		await waitFor(() => {
			expect(saveCollectionData).toHaveBeenCalled();
			expect(mockShowAlert).toHaveBeenCalledWith(
				expect.objectContaining({ message: expect.stringContaining('Parker branding') })
			);
		});

		expect(screen.getByLabelText(/Mail To General Email/i)).toHaveValue('general@test.com');
		expect(screen.getByLabelText(/Contact Email Alias/i)).toHaveValue('alias@test.com');

		const tagInput = screen.getByLabelText(/Tag List/i);
		fireEvent.change(tagInput, { target: { value: 'gamma, delta' } });
		expect(tagInput).toHaveValue('gamma, delta');

		const deliverySelect = screen.getAllByRole('combobox').find((el) => el.textContent?.includes('Demo') || el.getAttribute('aria-expanded') !== null);
		fireEvent.mouseDown(deliverySelect || screen.getAllByRole('combobox')[0]);
		fireEvent.click(await screen.findByRole('option', { name: /Connected/i }));

		const saveError = new Error('save boom');
		saveCollectionData.mockRejectedValueOnce(saveError);
		fireEvent.click(screen.getByRole('button', { name: /Save Settings/i }));
		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalledWith(saveError, 'saveSettings');
		});
	});

	test('covers applicant fetch errors, automation toggles, and template manager', async () => {
		const fetchError = new Error('applicants boom');
		getCollection.mockRejectedValueOnce(fetchError);

		render(<SiteSettings />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalledWith(fetchError, 'fetchApplicants-settings');
		});

		fireEvent.click(screen.getByRole('switch', { name: /Incomplete Count Alert/i }));

		await waitFor(() => {
			expect(screen.getByLabelText(/Alert Threshold/i)).toBeInTheDocument();
		});
		fireEvent.change(screen.getByLabelText(/Alert Threshold/i), { target: { value: '25' } });

		const scheduleSelect = screen.getAllByRole('combobox').find((el) => /weekly|daily/i.test(el.textContent || '')) || screen.getAllByRole('combobox')[0];
		fireEvent.mouseDown(scheduleSelect);
		fireEvent.click(await screen.findByRole('option', { name: /Daily/i }));

		fireEvent.click(screen.getByRole('button', { name: /Manage Email Templates/i }));
		expect(mockShowDialog).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'templateManager' })
		);
	});

	test('covers parameterized admin action failures and date null clears', async () => {
		render(<SiteSettings />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const paramError = new Error('param boom');
		mockWithParamsAction.mockRejectedValueOnce(paramError);
		const actionCard = screen.getByText('Test Action (With Params)').closest('div');
		fireEvent.click(within(actionCard).getByRole('button', { name: /Execute/i }));
		const dialogCall = mockShowDialog.mock.calls[0][0];
		await dialogCall.callback({ userId: 'app1', force: false });
		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalledWith(paramError, 'adminAction-test-with-params');
		});

		const deadline = screen.getByLabelText(/Application Deadline/i);
		fireEvent.change(deadline, { target: { value: '' } });
	});

	test('creates missing automation buckets when toggled', async () => {
		useConfig.mockReturnValue({
			...mockConfigData,
			automations: {},
		});

		render(<SiteSettings />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		fireEvent.click(screen.getByRole('switch', { name: /Member Activity Summary/i }));
		await waitFor(() => {
			expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
		});
	});
});
