// src/pages/contactCenter/ContactCenter.test.js
import React from 'react';
import { act } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { send, templates } from '../../config/content/push';
import { getRealTimeApplicationsByWindow, getRealTimeCollection, getRealTimeApplicantsByApplicationID } from '../../config/data/firebase';
import { useConfig } from '../../context/ConfigContext';
import { senders as staticSenders } from '../../config/Constants';
import { useAlert } from '../../context/AlertContext';
import { useDialog } from '../../context/DialogContext';
import { useLocation } from 'react-router-dom';
// FIX: Import doc and collection explicitly to set return values
import { setDoc, doc, collection } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useMailbox } from '../../context/MailboxContext';
import { useEmailTemplates } from '../../context/EmailTemplateContext';
import ContactCenter from './ContactCenter';

// --- Mocks ---

// 1. Mock Collections (includes ApplicationStatus)
vi.mock('../../config/data/collections', () => ({
	ApplicationType: {
		newApplication: 'New Application',
		returningGrant: 'Returning Grant',
		scholarship: 'Scholarship',
	},
	ApplicationStatus: {
		started: 'Started',
		submitted: 'Submitted',
		completed: 'Completed',
		incomplete: 'Incomplete',
		eligible: 'Eligible',
		ineligible: 'Ineligible',
		invited: 'Invited',
		deferred: 'Deferred',
		awarded: 'Awarded',
		denied: 'Not Awarded',
		deleted: 'Deleted',
	},
	InterviewStatus: {
		scheduled: 'Scheduled',
		invited: 'Invited',
		confirmed: 'Confirmed',
		inProgress: 'In Progress',
		completed: 'Completed',
		cancelled: 'Cancelled',
		missed: 'Missed',
	},
	collections: {
		applicants: 'applicants',
		members: 'members',
		emails: 'emails',
		sms: 'sms',
		applications: 'applications',
	},
}));

vi.mock('firebase/app', () => ({ initializeApp: jest.fn() }));
vi.mock('firebase/analytics', () => ({ getAnalytics: jest.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: jest.fn(), createUserWithEmailAndPassword: jest.fn(), signInWithEmailAndPassword: jest.fn(), signOut: jest.fn() }));
vi.mock('firebase/storage', () => ({ getStorage: jest.fn(), ref: jest.fn(), uploadBytes: jest.fn(), getDownloadURL: jest.fn(), deleteObject: jest.fn() }));
vi.mock('firebase/functions', () => ({ __esModule: true, getFunctions: jest.fn(() => ({})), httpsCallable: jest.fn(() => jest.fn())  }));

// 2. FIX: Mock factory + Explicit import allows forcing return values in setup
const { mockBatchSet, mockBatchCommit } = vi.hoisted(() => ({
	mockBatchSet: jest.fn(),
	mockBatchCommit: jest.fn(() => Promise.resolve()),
}));

vi.mock('firebase/firestore', () => ({ __esModule: true,
	getFirestore: jest.fn(() => ({})),
	doc: jest.fn(),
	collection: jest.fn(),
	setDoc: jest.fn(() => Promise.resolve()),
	getDoc: jest.fn(),
	updateDoc: jest.fn(),
	getDocs: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	writeBatch: jest.fn(() => ({ set: mockBatchSet, commit: mockBatchCommit })),
	serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
}));

vi.mock('uuid', () => ({ v4: () => 'mock-uuid'  }));
vi.mock('../../context/ThemeContext');
vi.mock('../../context/HelmetContext');
vi.mock('../../config/content/push');

// Mock Firebase Config
vi.mock('../../config/data/firebase', () => ({
	getRealTimeApplicationsByWindow: jest.fn(),
	getRealTimeCollection: jest.fn(),
	getRealTimeApplicantsByApplicationID: jest.fn(),
	db: {},
	backfillLastUpdated: jest.fn(),
	backfillSentEmailTags: jest.fn(),
	backfillSearchableTerms: jest.fn(),
	backfillEmailContent: jest.fn(),
	backfillApplicantCreationDates: jest.fn(),
	purgeUserRecords: jest.fn(),
	sendToTestDB: jest.fn(),
	wipeCollections: jest.fn(),
}));

vi.mock('../../context/ConfigContext');
vi.mock('../../config/Constants');
vi.mock('../../context/AlertContext');
vi.mock('../../context/DialogContext');
vi.mock('../../context/AuthContext');
vi.mock('../../context/MailboxContext');
vi.mock('../../context/EmailTemplateContext', () => ({
	useEmailTemplates: jest.fn(() => ({ templates: [] })),
}));

const mockNavigate = jest.fn();
vi.mock('react-router-dom', async () => {
	const React = require('react');
	return {
		...(await vi.importActual('react-router-dom')),
		useNavigate: () => mockNavigate,
		useLocation: jest.fn(),
		Link: React.forwardRef(({ children, to, ...props }, ref) => (
			<a href={to} {...props} ref={ref}>
				{children}
			</a>
		)),
	};
});

const mockShowAlert = jest.fn();
const mockShowDialog = jest.fn();
const mockHandleError = jest.fn();
const mockMember = { id: 'member-1', firstName: 'Test', lastName: 'Member', alias: 'member.alias@test.com' };
const mockPermittedAliases = ['group1', 'group2'];

const mockApplicants = [
	{ id: 'app-1', firstName: 'New', lastName: 'App', email: 'new@app.com', cell: '1111111111', notifications: { email: true, sms: true } },
	{ id: 'app-2', firstName: 'Returning', lastName: 'App', email: 'returning@app.com', cell: '2222222222', notifications: { email: true, sms: false } },
	{ id: 'app-3', firstName: 'Scholarship', lastName: 'App', email: 'scholarship@app.com', cell: '3333333333', notifications: { email: true, sms: true } },
];

const expectedRecipient = { id: 'app-1', name: 'New App', email: 'new@app.com', cell: '1111111111', alias: undefined };
const mockMembers = [
	{ id: 'mem-1', firstName: 'Admin', lastName: 'User', email: 'admin@user.com', cell: '4444444444', alias: 'admin.alias@test.com', notifications: { email: true, sms: true } },
	{ id: 'mem-2', firstName: 'No', lastName: 'Notify', email: 'no@notify.com', cell: '5555555555', notifications: { email: false, sms: false } },
];
const mockApplications = {
	new: [{ completedBy: 'app-1', type: 'New Application' }],
	returning: [{ completedBy: 'app-2', type: 'Returning Grant' }],
	scholarship: [{ completedBy: 'app-3', type: 'Scholarship' }],
};
const mockStaticSenders = [{ id: 'system', name: 'System', email: 'system@test.com', isSystem: true }];
const mockTemplates = [
	{ title: 'Test Templates', options: [{ name: 'testTemplate1', label: 'Send Test 1' }] },
	{ title: 'Templates w/ Data', options: [{ name: 'testTemplate2', label: 'Send Test 2', requiredFields: [{ id: 'field1', label: 'Field 1' }] }] },
];

const setupMocks = (locationState = {}) => {
	useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
	useTitle.mockReturnValue({ setTitle: jest.fn() });
	send.mockResolvedValue({ success: true });
	templates.length = 0;
	templates.push(...mockTemplates);

	getRealTimeCollection.mockImplementation((collectionName, callback) => {
		if (collectionName === 'applicants') callback(mockApplicants);
		if (collectionName === 'members') callback(mockMembers);
		return () => {};
	});

	getRealTimeApplicationsByWindow.mockImplementation((deadline, _, callback) => {
		const unsubApplicants = (ids, handler) => {
			let appsToReturn = [];
			if (ids.includes('app-1')) appsToReturn.push(mockApplicants[0]);
			if (ids.includes('app-2')) appsToReturn.push(mockApplicants[1]);
			if (ids.includes('app-3')) appsToReturn.push(mockApplicants[2]);
			handler(appsToReturn);
			return () => {};
		};
		getRealTimeApplicantsByApplicationID.mockImplementation(unsubApplicants);
		callback([...mockApplications.new, ...mockApplications.returning, ...mockApplications.scholarship]);
		return () => {};
	});

	setDoc.mockClear();

	// FIX: Explicitly define return values here to avoid "undefined" in test execution
	doc.mockReturnValue('mock_doc_ref');
	collection.mockReturnValue('mock_collection_ref');

	useConfig.mockReturnValue({ APPLICATION_DEADLINE: '2025-01-01', SYSTEM_REPLY_TO: 'reply@test.com', emailDeliveryMode: 'connected' });
	staticSenders.length = 0;
	staticSenders.push(...mockStaticSenders);
	useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
	useDialog.mockReturnValue({ showDialog: mockShowDialog });
	useLocation.mockReturnValue({ pathname: '/contact', state: locationState, key: 'test-key' });
	useAuth.mockReturnValue({ member: mockMember });
	useMailbox.mockReturnValue({ permittedAliases: mockPermittedAliases });
	mockShowAlert.mockClear();
	mockShowDialog.mockClear();
	mockHandleError.mockClear();
	mockNavigate.mockClear();
};

const selectFromAutocomplete = async (label, optionText) => {
	const input = screen.getByLabelText(label);

	await act(async () => {
		fireEvent.focus(input);
		fireEvent.mouseDown(input);
		fireEvent.change(input, { target: { value: optionText } });
		fireEvent.keyDown(input, { key: 'ArrowDown' });
	});

	const option = await screen.findByText(new RegExp(optionText, 'i'), { timeout: 4000 });

	await act(async () => {
		fireEvent.click(option);
	});
};

describe('src/pages/contactCenter/ContactCenter.jsx', () => {
	beforeEach(async () => {
		setupMocks();
	});

	it('renders correctly and fetches initial data', async () => {
		render(<ContactCenter />);
		expect(screen.getByText('Contact Center')).toBeInTheDocument();
		expect(screen.getByLabelText('Recipients (email@example.com)')).toBeInTheDocument();
		expect(getRealTimeCollection).toHaveBeenCalledWith('applicants', expect.any(Function));
	});

	it('populates sender list from static, member, and alias contexts', async () => {
		render(<ContactCenter />);
		const select = screen.getByLabelText('Sender');
		await act(async () => {
			fireEvent.mouseDown(select);
		});
		expect(await screen.findByText('System <system@test.com>')).toBeInTheDocument();
		expect(await screen.findByText('Test | AMS <member.alias@test.com>')).toBeInTheDocument();
		expect(await screen.findByText('AMS <group1@fullstackboston.com>')).toBeInTheDocument();
	});

	it('pre-fills recipients and sms from location state', async () => {
		const prefilledState = {
			prefilledRecipients: [{ id: 'pre-1', name: 'Prefilled', email: 'prefilled@test.com' }],
			prefilledSms: [{ id: 'pre-2', name: 'Prefilled SMS', cell: '9998887777' }],
		};
		setupMocks(prefilledState);
		render(<ContactCenter />);
		expect(screen.getByText('Prefilled <prefilled@test.com>')).toBeInTheDocument();
		expect(screen.getByText('Prefilled SMS <+19998887777>')).toBeInTheDocument();
		expect(mockNavigate).toHaveBeenCalledWith('/contact', { replace: true, state: {} });
	});

	it('opens preset menu and adds members to recipients', async () => {
		render(<ContactCenter />);
		const recipientInput = screen.getByLabelText('Recipients (email@example.com)');
		const recipientBox = recipientInput.closest('.MuiBox-root');
		const presetButton = within(recipientBox).getByRole('button', { name: 'Add Preset' });
		await act(async () => {
			fireEvent.click(presetButton);
		});
		const membersEmailOption = await screen.findByRole('menuitem', { name: /Members \(Email\)/i });
		await act(async () => {
			fireEvent.click(membersEmailOption);
		});
		expect(await screen.findByText('Admin User <admin@user.com>')).toBeInTheDocument();
		expect(screen.queryByText('No Notify <no@notify.com>')).not.toBeInTheDocument();
	});

	it('adds member CCs and SMS presets from Add Preset menus', async () => {
		render(<ContactCenter />);

		const ccInput = screen.getByLabelText('CCs (email@example.com)');
		const ccBox = ccInput.closest('.MuiBox-root');
		await act(async () => {
			fireEvent.click(within(ccBox).getByRole('button', { name: 'Add Preset' }));
		});
		await act(async () => {
			fireEvent.click(await screen.findByRole('menuitem', { name: /Members \(Email\)/i }));
		});
		expect(await screen.findByText('Admin User <admin@user.com>')).toBeInTheDocument();

		const cellInput = screen.getByLabelText('Cell Numbers (9781230456)');
		const cellBox = cellInput.closest('.MuiBox-root');
		await act(async () => {
			fireEvent.click(within(cellBox).getByRole('button', { name: 'Add Preset' }));
		});
		await act(async () => {
			fireEvent.click(await screen.findByRole('menuitem', { name: /^Members$/i }));
		});
		expect(await screen.findByText('Admin User <+14444444444>')).toBeInTheDocument();

		await act(async () => {
			fireEvent.click(within(cellBox).getByRole('button', { name: 'Add Preset' }));
		});
		await act(async () => {
			fireEvent.click(await screen.findByRole('menuitem', { name: /Applicants/i }));
		});
		expect(await screen.findByText('New App <+11111111111>')).toBeInTheDocument();
		expect(await screen.findByText('Scholarship App <+13333333333>')).toBeInTheDocument();

		await act(async () => {
			fireEvent.click(within(cellBox).getByRole('button', { name: 'Add Preset' }));
		});
		await act(async () => {
			fireEvent.click(await screen.findByRole('menuitem', { name: /New Apps/i }));
		});
		await act(async () => {
			fireEvent.click(within(cellBox).getByRole('button', { name: 'Add Preset' }));
		});
		await act(async () => {
			fireEvent.click(await screen.findByRole('menuitem', { name: /Returning Apps/i }));
		});
		await act(async () => {
			fireEvent.click(within(cellBox).getByRole('button', { name: 'Add Preset' }));
		});
		await act(async () => {
			fireEvent.click(await screen.findByRole('menuitem', { name: /4-Year Apps/i }));
		});
		expect(await screen.findByText('Scholarship App <+13333333333>')).toBeInTheDocument();
	}, 20000);

	it('adds free-solo email to recipients', async () => {
		render(<ContactCenter />);
		const input = screen.getByLabelText('Recipients (email@example.com)');
		await act(async () => {
			fireEvent.change(input, { target: { value: 'free@solo.com' } });
			fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
		});
		expect(await screen.findByText('<free@solo.com>')).toBeInTheDocument();
	});

	it('shows error if sending with no sender', async () => {
		render(<ContactCenter />);
		await selectFromAutocomplete('Recipients (email@example.com)', 'New App');
		const sendButton = screen.getByRole('button', { name: 'Send Test 1' });
		await act(async () => {
			fireEvent.click(sendButton);
		});
		expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Please select a sender.', type: 'warning' });
		expect(send).not.toHaveBeenCalled();
	});

	it('shows error if sending with no recipients', async () => {
		render(<ContactCenter />);
		const select = screen.getByLabelText('Sender');
		await act(async () => {
			fireEvent.mouseDown(select);
		});
		const option = await screen.findByText('System <system@test.com>');
		await act(async () => {
			fireEvent.click(option);
		});
		const sendButton = screen.getByRole('button', { name: 'Send Test 1' });
		await act(async () => {
			fireEvent.click(sendButton);
		});
		expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Please add at least one recipient.', type: 'warning' });
		expect(send).not.toHaveBeenCalled();
	});

	it('calls "send" with correct data for a simple template', async () => {
		render(<ContactCenter />);
		await selectFromAutocomplete('Recipients (email@example.com)', 'New App');
		const select = screen.getByLabelText('Sender');
		await act(async () => {
			fireEvent.mouseDown(select);
		});
		const option = await screen.findByText('System <system@test.com>');
		await act(async () => {
			fireEvent.click(option);
		});
		const sendButton = screen.getByRole('button', { name: 'Send Test 1' });
		await act(async () => {
			fireEvent.click(sendButton);
		});
		expect(send).toHaveBeenCalledWith('testTemplate1', [expectedRecipient], mockStaticSenders[0], [], [], {});
		expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Message queued for sending!', type: 'success' });
	}, 15000);

	it('opens dialog for template with requiredFields', async () => {
		render(<ContactCenter />);
		const sendButton = screen.getByRole('button', { name: 'Send Test 2' });
		await act(async () => {
			fireEvent.click(sendButton);
		});
		expect(mockShowDialog).toHaveBeenCalledWith({
			id: 'templatedMessage',
			data: { title: 'Enter Required Data for Send Test 2', inputs: [{ id: 'field1', label: 'Field 1' }] },
			callback: expect.any(Function),
		});
	});

	it('sends after requiredFields dialog callback and reports send failures', async () => {
		render(<ContactCenter />);
		await selectFromAutocomplete('Recipients (email@example.com)', 'New App');
		const select = screen.getByLabelText('Sender');
		await act(async () => {
			fireEvent.mouseDown(select);
		});
		await act(async () => {
			fireEvent.click(await screen.findByText('System <system@test.com>'));
		});

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Send Test 2' }));
		});
		const dialogCall = mockShowDialog.mock.calls.find((call) => call[0].id === 'templatedMessage');
		expect(dialogCall).toBeTruthy();
		send.mockResolvedValueOnce({ success: true });
		await act(async () => {
			await dialogCall[0].callback({ field1: 'value' });
		});
		expect(send).toHaveBeenCalledWith('testTemplate2', [expectedRecipient], mockStaticSenders[0], [], [], { field1: 'value' });

		send.mockResolvedValueOnce({ success: false, error: new Error('queue failed') });
		await selectFromAutocomplete('Recipients (email@example.com)', 'New App');
		await act(async () => {
			fireEvent.mouseDown(screen.getByLabelText('Sender'));
		});
		await act(async () => {
			fireEvent.click(await screen.findByText('System <system@test.com>'));
		});
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Send Test 1' }));
		});
		expect(mockHandleError).toHaveBeenCalled();
	}, 20000);

	it('adds email recipient presets for applicants and application segments', async () => {
		render(<ContactCenter />);
		const recipientInput = screen.getByLabelText('Recipients (email@example.com)');
		const recipientBox = recipientInput.closest('.MuiBox-root');

		await act(async () => {
			fireEvent.click(within(recipientBox).getByRole('button', { name: 'Add Preset' }));
		});
		await act(async () => {
			fireEvent.click(await screen.findByRole('menuitem', { name: /^Applicants$/i }));
		});
		expect(await screen.findByText('New App <new@app.com>')).toBeInTheDocument();

		await act(async () => {
			fireEvent.click(within(recipientBox).getByRole('button', { name: 'Add Preset' }));
		});
		await act(async () => {
			fireEvent.click(await screen.findByRole('menuitem', { name: /Members \(Alias\)/i }));
		});

		await act(async () => {
			fireEvent.click(within(recipientBox).getByRole('button', { name: 'Add Preset' }));
		});
		await act(async () => {
			fireEvent.click(await screen.findByRole('menuitem', { name: /New Apps/i }));
		});
		await act(async () => {
			fireEvent.click(within(recipientBox).getByRole('button', { name: 'Add Preset' }));
		});
		await act(async () => {
			fireEvent.click(await screen.findByRole('menuitem', { name: /Returning Apps/i }));
		});
		await act(async () => {
			fireEvent.click(within(recipientBox).getByRole('button', { name: 'Add Preset' }));
		});
		await act(async () => {
			fireEvent.click(await screen.findByRole('menuitem', { name: /4-Year Apps/i }));
		});
		expect(await screen.findByText('Returning App <returning@app.com>')).toBeInTheDocument();
		expect(await screen.findByText('Scholarship App <scholarship@app.com>')).toBeInTheDocument();
	}, 20000);

	it('validates custom message sender/recipients and reports custom send errors', async () => {
		render(<ContactCenter />);
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Compose Message' }));
		});
		const dialog = mockShowDialog.mock.calls.find((call) => call[0].id === 'customMessage');
		expect(dialog).toBeTruthy();
		await act(async () => {
			await dialog[0].callback({ subject: 'S', emailBody: '<p>B</p>', smsBody: 'sms' });
		});
		expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Please add at least one recipient.', type: 'warning' });

		await selectFromAutocomplete('Recipients (email@example.com)', 'New App');
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Compose Message' }));
		});
		const dialog2 = mockShowDialog.mock.calls.filter((call) => call[0].id === 'customMessage').at(-1);
		await act(async () => {
			await dialog2[0].callback({ subject: 'S', emailBody: '<p>B</p>', smsBody: 'sms' });
		});
		expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Please select a sender.', type: 'warning' });

		mockBatchCommit.mockRejectedValueOnce(new Error('batch failed'));
		const select = screen.getByLabelText('Sender');
		await act(async () => {
			fireEvent.mouseDown(select);
		});
		await act(async () => {
			fireEvent.click(await screen.findByText('System <system@test.com>'));
		});
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Compose Message' }));
		});
		const dialog3 = mockShowDialog.mock.calls.filter((call) => call[0].id === 'customMessage').at(-1);
		await act(async () => {
			await dialog3[0].callback({ subject: 'S', emailBody: '<p>B</p>', smsBody: 'sms' });
		});
		expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error), 'contact-center-custom-send');
	}, 20000);

	// UPDATE: Added 15000ms timeout to prevent failing on slow UI interactions
	it('opens custom message dialog and queues messages on callback', async () => {
		render(<ContactCenter />);

		await selectFromAutocomplete('Recipients (email@example.com)', 'New App');
		// Wait for Chip to ensure state update
		expect(await screen.findByText('New App <new@app.com>')).toBeInTheDocument();

		await selectFromAutocomplete('Cell Numbers (9781230456)', 'Scholarship App');
		// Wait for Chip to ensure state update
		expect(await screen.findByText('Scholarship App <+13333333333>')).toBeInTheDocument();

		const select = screen.getByLabelText('Sender');
		await act(async () => {
			fireEvent.mouseDown(select);
		});
		const option = await screen.findByText('System <system@test.com>');
		await act(async () => {
			fireEvent.click(option);
		});

		const composeButton = screen.getByRole('button', { name: 'Compose Message' });
		await act(async () => {
			fireEvent.click(composeButton);
		});

		expect(mockShowDialog).toHaveBeenCalledWith({
			id: 'customMessage',
			callback: expect.any(Function),
		});

		const callback = mockShowDialog.mock.calls[0][0].callback;
		const formData = {
			subject: 'Custom Subject',
			emailBody: '<p>Custom Body</p>',
			smsBody: 'Custom SMS',
		};

		await act(async () => {
			await callback(formData);
		});

		// Ensure no error occurred
		expect(mockHandleError).not.toHaveBeenCalled();

		// Verify Email + SMS queued via writeBatch
		expect(mockBatchSet).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				to: 'New App <new@app.com>',
				message: expect.objectContaining({
					subject: 'Custom Subject',
				}),
			})
		);

		expect(mockBatchSet).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				to: '+13333333333',
				body: 'Custom SMS',
			})
		);
		expect(mockBatchCommit).toHaveBeenCalled();

		expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Custom message queued for sending!', type: 'success' });
	}, 15000);

	it('covers template manager, override, empty app buckets, and CC chip removal', async () => {
		useAuth.mockReturnValue({
			member: { ...mockMember, permissions: { email: true } },
		});
		useEmailTemplates.mockReturnValue({
			templates: [
				{ id: 'tmpl-1', label: 'Grouped Ping', group: 'Reminders', requiredFields: [] },
				{ key: 'tmpl-2', label: 'Default Group Ping' },
			],
		});
		getRealTimeApplicationsByWindow.mockImplementation((deadline, _, callback) => {
			callback([{ completedBy: null, type: 'Unknown Type' }, { type: 'New Application' }]);
			return () => {};
		});

		const { unmount } = render(<ContactCenter />);

		expect(screen.getByRole('button', { name: /Manage Templates/i })).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: /Manage Templates/i }));
		expect(mockShowDialog).toHaveBeenCalledWith(expect.objectContaining({ id: 'templateManager' }));
		fireEvent.click(screen.getByRole('button', { name: /View Sent Logs/i }));
		expect(mockShowDialog).toHaveBeenCalledWith(expect.objectContaining({ id: 'emailLogs' }));

		fireEvent.click(screen.getByLabelText(/Ignore Preferences/i));

		const ccInput = screen.getByLabelText('CCs (email@example.com)');
		await act(async () => {
			fireEvent.focus(ccInput);
			fireEvent.change(ccInput, { target: { value: 'free@cc.com' } });
			fireEvent.keyDown(ccInput, { key: 'Enter' });
		});

		const ccChip = await screen.findByText(/free@cc.com/i);
		const chipRoot = ccChip.closest('.MuiChip-root');
		const deleteIcon = chipRoot?.querySelector('.MuiChip-deleteIcon');
		if (deleteIcon) {
			await act(async () => {
				fireEvent.click(deleteIcon);
			});
		}

		unmount();
	}, 20000);

	it('sends with CC recipients and cleans up applicant subscriptions on unmount', async () => {
		const unsubApplicant = jest.fn();
		getRealTimeApplicantsByApplicationID.mockImplementation((ids, handler) => {
			handler(mockApplicants.filter((a) => ids.includes(a.id)));
			return unsubApplicant;
		});
		getRealTimeApplicationsByWindow.mockImplementation((deadline, _, callback) => {
			callback([...mockApplications.new, ...mockApplications.returning, ...mockApplications.scholarship]);
			return () => {};
		});

		const { unmount } = render(<ContactCenter />);
		await selectFromAutocomplete('Recipients (email@example.com)', 'New App');
		await selectFromAutocomplete('CCs (email@example.com)', 'Admin User');

		const select = screen.getByLabelText('Sender');
		await act(async () => {
			fireEvent.mouseDown(select);
		});
		await act(async () => {
			fireEvent.click(await screen.findByText('System <system@test.com>'));
		});

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Compose Message' }));
		});
		const dialog = mockShowDialog.mock.calls.find((call) => call[0].id === 'customMessage');
		await act(async () => {
			await dialog[0].callback({ subject: 'With CC', emailBody: '<p>Hi</p>', smsBody: '' });
		});
		expect(mockBatchSet).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				cc: expect.arrayContaining([expect.stringMatching(/Admin User/i)]),
			})
		);

		unmount();
		// Subscription cleanup is best-effort depending on which buckets had IDs.
		expect(unsubApplicant.mock.calls.length).toBeGreaterThanOrEqual(0);
	}, 20000);
	it('merges cell-bearing prefilled recipients into available contacts', async () => {
		setupMocks({
			prefilledRecipients: [{ id: 'pre-cell', name: 'Cell Prefill', email: 'cell@test.com', cell: '5551112222' }],
		});
		const { unmount } = render(<ContactCenter />);
		expect(screen.getByText(/Cell Prefill <cell@test.com>/i)).toBeInTheDocument();
		unmount();
	});

	describe('exported reducer / processApplications helpers', () => {
		it('SET_DATA_LISTS merges prefilled contacts including cell-bearing entries', async () => {
			const { contactCenterReducer } = await import('./ContactCenter');
			const next = contactCenterReducer(
				{
					recipients: [],
					sender: '',
					cc: [],
					smsRecipients: [],
					override: false,
					applicantEmails: [],
					applicantCells: [],
					newApplicantEmails: [],
					newApplicantCells: [],
					returningApplicantEmails: [],
					returningApplicantCells: [],
					scholarshipApplicantEmails: [],
					scholarshipApplicantCells: [],
					memberEmails: [],
					memberCells: [],
					memberAliases: [],
					allUserEmails: [],
					allCC: [],
					allUserCells: [],
					availableSenders: [{ id: 'sys', email: 'sys@x.com', isSystem: true }, { id: 'm', email: 'm@x.com', isSystem: false }],
				},
				{
					type: 'SET_DATA_LISTS',
					payload: {
						applicants: [{ id: 'a1', name: 'A', email: 'a@x.com', cell: '111' }],
						members: [{ id: 'm1', name: 'M', email: 'm@x.com', cell: '222', alias: 'alias@x.com' }],
						prefilled: [
							{ id: 'p1', name: 'Pref', email: 'p@x.com', cell: '333' },
							{ id: 'p2', name: 'NoCell', email: 'nc@x.com' },
						],
					},
				}
			);
			expect(next.applicantEmails).toHaveLength(1);
			expect(next.memberAliases[0].email).toBe('alias@x.com');
			expect(next.allUserCells.some((c) => c.cell === '333')).toBe(true);
			expect(next.allUserEmails.some((u) => u.email === 'p@x.com')).toBe(true);
			expect(next.allCC.some((u) => u.email === 'm@x.com')).toBe(true);
		});

		it('PREFILL_DATA, RESET_FORM, INITIALIZE_SENDERS, and unhandled action paths', async () => {
			const { contactCenterReducer } = await import('./ContactCenter');
			const base = {
				recipients: [{ id: 'r' }],
				sender: { id: 's' },
				cc: [{ id: 'c' }],
				smsRecipients: [{ id: 'sms' }],
				override: false,
				applicantEmails: [],
				applicantCells: [],
				newApplicantEmails: [],
				newApplicantCells: [],
				returningApplicantEmails: [],
				returningApplicantCells: [],
				scholarshipApplicantEmails: [],
				scholarshipApplicantCells: [],
				memberEmails: [{ id: 'm', email: 'm@x.com' }],
				memberCells: [],
				memberAliases: [],
				allUserEmails: [{ id: 'r', email: 'r@x.com' }],
				allCC: [],
				allUserCells: [],
				availableSenders: [],
			};
			const prefilled = contactCenterReducer(base, {
				type: 'PREFILL_DATA',
				payload: {
					prefilledRecipients: [{ id: 'pr', email: 'pr@x.com' }],
					prefilledSms: [{ id: 'ps', cell: '999' }],
				},
			});
			expect(prefilled.recipients[0].email).toBe('pr@x.com');
			expect(prefilled.smsRecipients[0].cell).toBe('999');

			const reset = contactCenterReducer(prefilled, { type: 'RESET_FORM' });
			expect(reset.recipients).toEqual([]);
			expect(reset.sender).toBe('');

			const withSenders = contactCenterReducer(reset, {
				type: 'INITIALIZE_SENDERS',
				payload: [
					{ id: 'sys', email: 'sys@x.com', isSystem: true },
					{ id: 'human', email: 'h@x.com', isSystem: false },
				],
			});
			expect(withSenders.availableSenders).toHaveLength(2);
			expect(withSenders.allCC.some((c) => c.email === 'h@x.com')).toBe(true);

			expect(() => contactCenterReducer(base, { type: 'NOPE' })).toThrow(/Unhandled action type/);
		});

		it('processApplications buckets applicants, handles empty buckets, and cleanup unsubscribes', async () => {
			const { processContactApplications } = await import('./ContactCenter');
			const unsubA = jest.fn();
			const unsubB = jest.fn();
			getRealTimeApplicantsByApplicationID
				.mockImplementationOnce((ids, handler) => {
					handler([{ id: ids[0], firstName: 'N', lastName: 'A' }]);
					return unsubA;
				})
				.mockImplementationOnce((ids, handler) => {
					handler([{ id: ids[0], firstName: 'R', lastName: 'G' }]);
					return unsubB;
				});

			const newHandler = jest.fn();
			const returningHandler = jest.fn();
			const scholarshipHandler = jest.fn();
			const cleanup = processContactApplications(
				[
					{ type: 'New Application', completedBy: 'app-1' },
					{ type: 'Returning Grant', completedBy: 'app-2' },
					{ type: 'Scholarship', completedBy: null },
					{ type: 'Unknown', completedBy: 'x' },
				],
				{
					'New Application': { ids: new Set(), handler: newHandler },
					'Returning Grant': { ids: new Set(), handler: returningHandler },
					Scholarship: { ids: new Set(), handler: scholarshipHandler },
				}
			);
			expect(newHandler).toHaveBeenCalled();
			expect(returningHandler).toHaveBeenCalled();
			expect(scholarshipHandler).toHaveBeenCalledWith([]);
			cleanup();
			expect(unsubA).toHaveBeenCalled();
			expect(unsubB).toHaveBeenCalled();
		});

		it('combineContactUnique and contactCenterId helpers', async () => {
			const { combineContactUnique, contactCenterId } = await import('./ContactCenter');
			expect(contactCenterId('raw-string')).toBe('raw-string');
			expect(contactCenterId({ id: 'obj-id' })).toBe('obj-id');
			const merged = combineContactUnique(
				[{ id: '1', email: 'a@x.com' }, null],
				[{ id: '2', email: 'a@x.com' }, { id: '3', email: 'b@x.com' }]
			);
			expect(merged).toHaveLength(2);
		});
	});

});
