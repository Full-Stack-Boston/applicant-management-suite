import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmailCard from './Email';
import { useMailbox } from '../../context/MailboxContext';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { useDialog } from '../../context/DialogContext';
import { useEmailActions } from '../../hooks/useEmailActions';
import { deleteZohoEmail, updateEmailReadStatus, fetchEmailContent, fetchAttachmentContent } from '../../config/data/firebase';

const mocks = vi.hoisted(() => ({
	navigate: vi.fn(),
	showAlert: vi.fn(),
	handleError: vi.fn(),
	showDialog: vi.fn(),
}));

vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useNavigate: () => mocks.navigate,
}));

vi.mock('../../context/MailboxContext', () => ({ useMailbox: vi.fn() }));
vi.mock('../../context/ThemeContext', () => ({ useTheme: vi.fn() }));
vi.mock('../../context/AlertContext', () => ({ useAlert: vi.fn() }));
vi.mock('../../context/DialogContext', () => ({ useDialog: vi.fn() }));
vi.mock('../../context/ConfigContext', () => ({ useConfig: vi.fn(() => ({})) }));

vi.mock('../../hooks/useEmailActions', () => ({
	useEmailActions: vi.fn(),
}));

vi.mock('../../config/data/firebase', () => ({
	__esModule: true,
	updateEmailReadStatus: vi.fn(),
	deleteZohoEmail: vi.fn(),
	fetchAttachmentContent: vi.fn(),
	fetchEmailContent: vi.fn(),
}));

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
vi.mock('../notes/NotesSection', () => ({ default: () => <div data-testid='notes-section'>Notes</div> }));
vi.mock('../messaging/EmailBody', () => ({ default: () => <div data-testid='email-body'>Email Body</div> }));
vi.mock('../messaging/EmailActions', () => ({
	default: (props) => (
		<div data-testid='email-actions'>
			<button onClick={props.onDelete}>Delete</button>
			<button onClick={props.onToggleRead}>Toggle Read</button>
			<button
				onClick={() =>
					props.onDownload?.({ attachmentId: 'att-1', attachmentName: 'doc.pdf' })
				}>
				Download
			</button>
			<button onClick={props.onShowNotesToggle}>Notes</button>
			<button onClick={() => props.onReply()}>Reply</button>
			<button onClick={() => props.onReplyAll()}>Reply all</button>
			<button onClick={() => props.onForward()}>Forward</button>
		</div>
	),
}));

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
		vi.clearAllMocks();
		useMailbox.mockReturnValue({ member: {}, permittedAliases: [] });
		useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
		useAlert.mockReturnValue({ showAlert: mocks.showAlert, handleError: mocks.handleError });
		useDialog.mockReturnValue({ showDialog: mocks.showDialog });
		useEmailActions.mockReturnValue({
			handleReply: vi.fn(),
			handleReplyAll: vi.fn(),
			handleForward: vi.fn(),
		});
		updateEmailReadStatus.mockResolvedValue(true);
		deleteZohoEmail.mockResolvedValue(true);
		fetchAttachmentContent.mockResolvedValue({ data: { contentType: 'application/pdf', content: 'YmFzZTY0' } });
	});

	test('renders email subject and content', () => {
		render(<EmailCard email={mockEmail} />);
		expect(screen.getByText('Test Subject')).toBeInTheDocument();
		expect(screen.getByTestId('email-body')).toBeInTheDocument();
	});

	test('hydrates missing content from fetchEmailContent', async () => {
		fetchEmailContent.mockResolvedValue({
			data: {
				content: '<p>hydrated</p>',
				headerContent: { Subject: ['Hydrated Subject'], From: ['a@b.c'] },
				folderId: 'inbox-id',
			},
		});

		render(
			<EmailCard
				email={{
					id: 'msg-hydrate',
					folderName: 'inbox',
					isRead: true,
				}}
			/>
		);

		await waitFor(() => {
			expect(fetchEmailContent).toHaveBeenCalledWith(
				expect.objectContaining({ messageId: 'msg-hydrate', folderName: 'inbox' })
			);
		});
		await waitFor(() => {
			expect(screen.getByText('Hydrated Subject')).toBeInTheDocument();
		});
	});

	test('hydrates nested headerContent payloads', async () => {
		fetchEmailContent.mockResolvedValue({
			data: {
				content: '<p>nested</p>',
				headerContent: {
					headerContent: {
						Subject: ['Nested Subject'],
						From: ['nested@test.com'],
					},
				},
				attachments: [{ attachmentId: 'a1', attachmentName: 'file.pdf' }],
			},
		});

		render(
			<EmailCard
				email={{
					id: 'msg-nested',
					folderId: 'folder-1',
					isRead: false,
				}}
			/>
		);

		await waitFor(() => {
			expect(screen.getByText('Nested Subject')).toBeInTheDocument();
		});
	});

	test('downloads attachments via fetchAttachmentContent', async () => {
		fetchAttachmentContent.mockResolvedValue({
			data: { contentType: 'application/pdf', content: 'YmFzZTY0' },
		});
		const createEl = document.createElement.bind(document);
		const click = vi.fn();
		vi.spyOn(document, 'createElement').mockImplementation((tag) => {
			const el = createEl(tag);
			if (tag === 'a') el.click = click;
			return el;
		});

		render(<EmailCard email={mockEmail} />);
		fireEvent.click(screen.getByText('Download'));

		await waitFor(() => {
			expect(fetchAttachmentContent).toHaveBeenCalledWith(
				expect.objectContaining({ messageId: 'msg123', attachmentId: 'att-1' })
			);
		});
		expect(click).toHaveBeenCalled();
	});

	test('calls updateEmailReadStatus when toggled', async () => {
		render(<EmailCard email={mockEmail} />);

		const toggleBtn = screen.getByText('Toggle Read');
		fireEvent.click(toggleBtn);

		expect(updateEmailReadStatus).toHaveBeenCalledWith(expect.objectContaining({ status: 'read' }));
	});

	test('opens confirmation dialog on delete', () => {
		const { showDialog } = useDialog();
		render(<EmailCard email={mockEmail} />);

		const deleteBtn = screen.getByText('Delete');
		fireEvent.click(deleteBtn);

		expect(showDialog).toHaveBeenCalledWith(expect.objectContaining({ id: 'confirmAction' }));
	});

	test('handles read, delete, and attachment failures through the alert error handler', async () => {
		const toggleError = new Error('toggle failed');
		updateEmailReadStatus.mockRejectedValueOnce(toggleError);
		render(<EmailCard email={mockEmail} />);
		fireEvent.click(screen.getByText('Toggle Read'));
		await waitFor(() => expect(mocks.handleError).toHaveBeenCalledWith(toggleError, 'toggle-read-status-card'));

		fireEvent.click(screen.getByText('Delete'));
		const deleteDialog = mocks.showDialog.mock.calls.at(-1)[0];
		await deleteDialog.callback(true);
		expect(deleteZohoEmail).toHaveBeenCalledWith({ messageId: 'msg123' });
		expect(mocks.navigate).toHaveBeenCalled();

		const attachmentError = new Error('download failed');
		fetchAttachmentContent.mockRejectedValueOnce(attachmentError);
		fireEvent.click(screen.getByText('Download'));
		await waitFor(() => expect(mocks.handleError).toHaveBeenCalledWith(attachmentError, 'download-attachment-card'));
	});

	test('toggles notes and delegates reply actions', () => {
		const actionHandlers = {
			handleReply: vi.fn(),
			handleReplyAll: vi.fn(),
			handleForward: vi.fn(),
		};
		useEmailActions.mockReturnValue(actionHandlers);
		render(<EmailCard email={mockEmail} />);

		fireEvent.click(screen.getByText('Notes'));
		expect(screen.getByTestId('notes-section')).toBeInTheDocument();
		fireEvent.click(screen.getByText('Reply'));
		fireEvent.click(screen.getByText('Reply all'));
		fireEvent.click(screen.getByText('Forward'));
		expect(actionHandlers.handleReply).toHaveBeenCalledWith(mockEmail);
		expect(actionHandlers.handleReplyAll).toHaveBeenCalledWith(mockEmail);
		expect(actionHandlers.handleForward).toHaveBeenCalledWith(mockEmail);
	});
});
