import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmailCard from './Email';
import { useMailbox } from '../../context/MailboxContext';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { useDialog } from '../../context/DialogContext';
import { useEmailActions } from '../../hooks/useEmailActions';
import { updateEmailReadStatus, fetchEmailContent } from '../../config/data/firebase';

vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useNavigate: vi.fn(),
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
	default: ({ displayName }) => <h1>{displayName}</h1>,
}));
vi.mock('../notes/NotesSection', () => ({ default: () => null }));
vi.mock('../messaging/EmailBody', () => ({ default: () => <div data-testid='email-body'>Email Body</div> }));
vi.mock('../messaging/EmailActions', () => ({
	default: (props) => (
		<div data-testid='email-actions'>
			<button onClick={props.onDelete}>Delete</button>
			<button onClick={props.onToggleRead}>Toggle Read</button>
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
		useAlert.mockReturnValue({ showAlert: vi.fn(), handleError: vi.fn() });
		useDialog.mockReturnValue({ showDialog: vi.fn() });
		useEmailActions.mockReturnValue({
			handleReply: vi.fn(),
			handleReplyAll: vi.fn(),
			handleForward: vi.fn(),
		});
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
});
