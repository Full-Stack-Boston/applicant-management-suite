import React from 'react';
import { act, cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmailCard from './Email';
import { useMailbox } from '../../context/MailboxContext';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { useDialog } from '../../context/DialogContext';
import { useEmailActions } from '../../hooks/useEmailActions';
import { deleteZohoEmail, fetchAttachmentContent, fetchEmailContent, updateEmailReadStatus } from '../../config/data/firebase';

const mocks = vi.hoisted(() => ({
	navigate: vi.fn(),
	showAlert: vi.fn(),
	handleError: vi.fn(),
	showDialog: vi.fn(),
}));

// --- Mocks ---
vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useNavigate: () => mocks.navigate,
}));

vi.mock('../../context/MailboxContext', () => ({ useMailbox: jest.fn() }));
vi.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
vi.mock('../../context/AlertContext', () => ({ useAlert: jest.fn() }));
vi.mock('../../context/DialogContext', () => ({ useDialog: jest.fn() }));
vi.mock('../../context/ConfigContext', () => ({ useConfig: jest.fn(() => ({}))  }));

vi.mock('../../hooks/useEmailActions', () => ({
	useEmailActions: jest.fn(),
}));

vi.mock('../../config/data/firebase', () => ({
	__esModule: true,
	updateEmailReadStatus: jest.fn(),
	deleteZohoEmail: jest.fn(),
	fetchAttachmentContent: jest.fn(),
	fetchEmailContent: jest.fn(),
}));

// Mock children
vi.mock('../layout/SingleAssetPage', () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
	AssetCard: ({ children }) => <div>{children}</div>,
}));
vi.mock('../assets/AssetProfileSection', () => ({
	default: ({ displayName, functions }) => (
		<div>
			<h1>{displayName}</h1>
			{functions}
		</div>
	),
}));
vi.mock('../notes/NotesSection', () => ({
	default: () => <div data-testid='notes-section'>Notes</div>,
}));
vi.mock('../assets/Header', () => ({ default: ({ title }) => <h1>{title}</h1> }));
vi.mock('../assets/InfoTable', () => ({ default: () => <div>InfoTable</div> }));
vi.mock('../messaging/EmailBody', () => ({ default: () => <div data-testid='email-body'>Email Body</div> }));
vi.mock('../messaging/EmailActions', () => ({ default: (props) => (
	<div data-testid='email-actions'>
		<button type='button' onClick={props.onDelete}>Delete</button>
		<button type='button' onClick={props.onToggleRead}>Toggle Read</button>
		<button type='button' onClick={() => props.onDownload({ attachmentId: 'att-1', attachmentName: 'file.pdf' })}>Download</button>
		<button type='button' onClick={props.onShowNotesToggle}>Notes</button>
		<button type='button' onClick={() => props.onReply()}>Reply</button>
		<button type='button' onClick={() => props.onReplyAll()}>Reply all</button>
		<button type='button' onClick={() => props.onForward()}>Forward</button>
	</div>
) }));

describe('EmailCard', () => {
	const mockEmail = {
		id: 'msg123',
		isRead: false,
		content: 'Hello World',
		headerContent: {
			headerContent: {
				Subject: ['Test Subject'],
				From: ['sender@test.com'],
				To: ['me@test.com'],
				Date: [new Date().toISOString()],
			},
		},
		folderName: 'inbox',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		useMailbox.mockReturnValue({ member: {}, permittedAliases: [] });
		useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
		useAlert.mockReturnValue({ showAlert: mocks.showAlert, handleError: mocks.handleError });
		useDialog.mockReturnValue({ showDialog: mocks.showDialog });
		useEmailActions.mockReturnValue({
			handleReply: jest.fn(),
			handleReplyAll: jest.fn(),
			handleForward: jest.fn(),
		});
		updateEmailReadStatus.mockResolvedValue(true);
		deleteZohoEmail.mockResolvedValue(true);
		fetchAttachmentContent.mockResolvedValue({ data: { contentType: 'application/pdf', content: 'base64' } });
	});

	test('renders email subject and content', () => {
		render(<EmailCard email={mockEmail} />);
		expect(screen.getByText('Test Subject')).toBeInTheDocument();
		expect(screen.getByTestId('email-body')).toBeInTheDocument();
	});

	test('calls updateEmailReadStatus when toggled', async () => {
		render(<EmailCard email={mockEmail} />);

		const toggleBtn = screen.getByText('Toggle Read');
		await act(async () => {
			fireEvent.click(toggleBtn);
		});

		expect(updateEmailReadStatus).toHaveBeenCalledWith(expect.objectContaining({ status: 'read' }));
	});

	test('opens confirmation dialog on delete', () => {
		const { showDialog } = useDialog();
		render(<EmailCard email={mockEmail} />);

		const deleteBtn = screen.getByText('Delete');
		fireEvent.click(deleteBtn);

		expect(showDialog).toHaveBeenCalledWith(expect.objectContaining({ id: 'confirmAction' }));
	});

	test('hydrates incomplete email content and normalizes response headers', async () => {
		fetchEmailContent.mockResolvedValueOnce({
			data: {
				content: 'Hydrated body',
				headerContent: { Subject: ['Hydrated Subject'], From: ['sender@test.com'] },
				attachments: [],
				folderId: 'folder-1',
			},
		});
		render(
			<EmailCard
				email={{
					...mockEmail,
					content: '',
					headerContent: undefined,
					folderId: 'folder-1',
				}}
			/>,
		);

		await waitFor(() => expect(fetchEmailContent).toHaveBeenCalledWith(expect.objectContaining({ messageId: 'msg123', folderId: 'folder-1' })));
		expect(await screen.findByText('Hydrated Subject')).toBeInTheDocument();
	});

	test('handles read, delete, and attachment failures through the alert error handler', async () => {
		const toggleError = new Error('toggle failed');
		updateEmailReadStatus.mockRejectedValueOnce(toggleError);
		render(<EmailCard email={mockEmail} />);
		await act(async () => {
			fireEvent.click(screen.getByText('Toggle Read'));
		});
		expect(mocks.handleError).toHaveBeenCalledWith(toggleError, 'toggle-read-status-card');

		const dialog = mocks.showDialog.mock.calls[0]?.[0];
		fireEvent.click(screen.getByText('Delete'));
		const deleteDialog = mocks.showDialog.mock.calls.at(-1)[0];
		await act(async () => {
			await deleteDialog.callback(true);
		});
		expect(deleteZohoEmail).toHaveBeenCalledWith({ messageId: 'msg123' });
		expect(mocks.navigate).toHaveBeenCalled();
		expect(dialog).toBeUndefined();

		const attachmentError = new Error('download failed');
		fetchAttachmentContent.mockRejectedValueOnce(attachmentError);
		await act(async () => {
			fireEvent.click(screen.getByText('Download'));
		});
		expect(mocks.handleError).toHaveBeenCalledWith(attachmentError, 'download-attachment-card');
	});

	test('downloads attachments, toggles notes, and delegates message actions', async () => {
		const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
		render(<EmailCard email={{ ...mockEmail, attachments: [{ attachmentId: 'att-1' }] }} />);

		await act(async () => {
			fireEvent.click(screen.getByText('Download'));
		});
		expect(fetchAttachmentContent).toHaveBeenCalledWith(expect.objectContaining({ messageId: 'msg123', attachmentId: 'att-1' }));
		expect(clickSpy).toHaveBeenCalled();

		fireEvent.click(screen.getByText('Notes'));
		expect(screen.getByTestId('notes-section')).toBeInTheDocument();
		fireEvent.click(screen.getByText('Reply'));
		fireEvent.click(screen.getByText('Reply all'));
		fireEvent.click(screen.getByText('Forward'));
		expect(useEmailActions.mock.results[0].value.handleReply).toHaveBeenCalled();
		expect(useEmailActions.mock.results[0].value.handleReplyAll).toHaveBeenCalled();
		expect(useEmailActions.mock.results[0].value.handleForward).toHaveBeenCalled();
		clickSpy.mockRestore();
	});
	test('logs hydrate failures and routes delete failures through handleError', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		fetchEmailContent.mockRejectedValueOnce(new Error('hydrate boom'));
		render(
			<EmailCard
				email={{
					...mockEmail,
					content: '',
					headerContent: undefined,
					folderId: 'folder-1',
				}}
			/>,
		);
		await waitFor(() => expect(fetchEmailContent).toHaveBeenCalled());
		expect(consoleSpy).toHaveBeenCalledWith('Failed to hydrate email details:', expect.any(Error));
		consoleSpy.mockRestore();
		cleanup();

		deleteZohoEmail.mockRejectedValueOnce(new Error('delete boom'));
		render(<EmailCard email={mockEmail} />);
		fireEvent.click(screen.getByText('Delete'));
		const deleteDialog = mocks.showDialog.mock.calls.at(-1)[0];
		await act(async () => {
			await deleteDialog.callback(true);
		});
		expect(mocks.handleError).toHaveBeenCalledWith(expect.any(Error), 'delete-email-card');
	});

});
