import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import List from './List';
import { useMediaQuery } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useMailbox } from '../../context/MailboxContext';
import { useAlert } from '../../context/AlertContext';
import { useRealTimeList } from '../../hooks/useRealTimeList';
import { getRoomDetails } from '../../config/data/firebase';

vi.mock('../../context/ConfigContext', () => ({
	useConfig: jest.fn(() => ({ emailDeliveryMode: 'demo' })),
}));

// --- Mocks ---

// 1. React Router
const mockNavigate = jest.fn();
vi.mock('react-router-dom', () => ({
	useNavigate: () => mockNavigate,
}));

// 2. Material UI & Theme
vi.mock('@mui/material', async () => {
	const actual = await vi.importActual('@mui/material');
	return {
		...actual,
		useMediaQuery: jest.fn(),
		useTheme: () => ({
			breakpoints: { down: jest.fn() },
		}),
	};
});

// 3. Config
vi.mock('../../config/admin/lists', () => ({
	adminLists: {
		users: {
			title: 'Users List',
			columns: [{ field: 'id', headerName: 'ID' }],
			actions: [],
		},
		interviews: {
			title: 'Interviews',
			columns: [{ field: 'id' }],
			getToolbarActions: jest.fn(() => [{ label: 'Action' }]),
			getActions: jest.fn(() => [{ label: 'Row Action' }]),
		},
		inbox: {
			title: 'Inbox',
			columns: [
				{ field: 'senderSubject', headerName: 'Subject' },
				{ field: 'tags', headerName: 'Tags' },
			],
		},
		legacyFinances: {
			title: (year) => `Finances ${year}`,
			columns: [],
		},
		noMobile: {
			title: 'No Mobile Config',
			columns: [{ field: 'id', headerName: 'ID' }],
			actions: [{ label: 'Static Action' }],
		},
	},
	mobileCardConfig: {
		users: {
			content: ({ item }) => <div>Mobile Content: {item.id}</div>,
			actionKeys: [],
			getProps: (item) => ({ 'data-extra': item.id }),
		},
	},
}));

vi.mock('../../config/ui/tableConfig', () => ({
	RecipientSubjectCell: (props) => <div data-testid='recipient-subject'>{props.row?.to}</div>,
}));

// 4. Firebase
vi.mock('../../config/data/firebase', () => ({
	getRoomDetails: jest.fn(),
	purgeUserRecords: jest.fn(),
	sendToTestDB: jest.fn(),
	wipeCollections: jest.fn(),
	wipeTestCollections: jest.fn(),
	backfillLastUpdated: jest.fn(),
	backfillSentEmailTags: jest.fn(),
	backfillSearchableTerms: jest.fn(),
	backfillEmailContent: jest.fn(),
	migrateEmailTemplates: jest.fn(),
	backfillApplicantCreationDates: jest.fn(),
	migrateDeadlinesToCycleYear: jest.fn(),
	backfillApplicantGradYears: jest.fn(),
	purgeDeletedApplications: jest.fn(),
	findUnownedRecords: jest.fn(),
	purgeUnownedRecords: jest.fn(),
	cleanupOrphanedStorage: jest.fn(),
	purgeLogs: jest.fn(),
}));

// 5. Contexts & Hooks
vi.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

vi.mock('../../context/MailboxContext', () => ({
	useMailbox: jest.fn(),
}));

vi.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

vi.mock('../../hooks/useRealTimeList', () => ({
	useRealTimeList: jest.fn(),
}));

// 6. Child Components
vi.mock('../../components/loader/Loader', () => ({ default: () => <div data-testid='loader'>Loading...</div> }));
vi.mock('../../components/datatable/Datatable', () => ({ default: (props) => (
	<div data-testid='datatable'>
		<h1>{props.titleIn}</h1>
		<div>Rows: {props.rows?.length}</div>
		<div data-testid='toolbar-actions'>{props.toolbarActions?.length || 0}</div>
		<div data-testid='row-actions'>{props.actions?.length || 0}</div>
		{props.columns?.map((col) => (
			<div key={col.field} data-testid={`col-${col.field}`}>
				{col.headerName || col.field}
				{typeof col.valueGetter === 'function' && (
					<span data-testid={`getter-${col.field}`}>
						{col.valueGetter(null, { to: 'to@x.com', subject: 'Subj' })}
					</span>
				)}
				{typeof col.renderCell === 'function' && (
					<span data-testid={`render-${col.field}`}>
						{col.renderCell({ row: { to: 'to@x.com', subject: 'Subj' }, value: 'x' })}
					</span>
				)}
			</div>
		))}
		{props.onFolderChange && (
			<button type='button' data-testid='folder-change' onClick={() => props.onFolderChange({ target: { value: 'sent' } })}>
				Change Folder
			</button>
		)}
		{props.onAliasFilterChange && (
			<button type='button' data-testid='alias-change' onClick={() => props.onAliasFilterChange({ target: { value: 'alias1' } })}>
				Change Alias
			</button>
		)}
	</div>
) }));
vi.mock('../../components/list/MobileListCard', () => ({ default: ({ children }) => <div data-testid='mobile-card'>{children}</div> }));
vi.mock('../../components/list/MobileListEmptyState', () => ({ default: () => <div data-testid='mobile-empty'>No items</div> }));
vi.mock('../../components/list/LegacyFinancesTable', () => ({ default: (props) => <div data-testid='legacy-table'>{props.titleIn}</div> }));

describe('List Page Component', () => {
	const mockHandleError = jest.fn();
	const mockSetSelectedFolderId = jest.fn();
	const mockSetSelectedAliasFilter = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		// Default Context Values
		useAuth.mockReturnValue({ member: { role: 'admin' } });
		useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
		useAlert.mockReturnValue({ handleError: mockHandleError });

		// Default Hook Values
		useRealTimeList.mockReturnValue({
			data: [{ id: '1' }, { id: '2' }],
			loading: false,
			year: 2025,
		});

		useMailbox.mockReturnValue({
			emails: [],
			loading: false,
			permittedFolders: [],
			permittedAliases: [],
			selectedFolderId: 'inbox',
			setSelectedFolderId: mockSetSelectedFolderId,
			selectedAliasFilter: 'all',
			setSelectedAliasFilter: mockSetSelectedAliasFilter,
		});

		// Default: Desktop view
		useMediaQuery.mockReturnValue(false);
	});

	test('renders loader when loading', () => {
		useRealTimeList.mockReturnValue({ data: [], loading: true });
		render(<List type='users' />);
		expect(screen.getByTestId('loader')).toBeInTheDocument();
	});

	test('renders Datatable on desktop', () => {
		render(<List type='users' />);

		expect(screen.getByTestId('datatable')).toBeInTheDocument();
		expect(screen.getByText('Users List')).toBeInTheDocument();
		expect(screen.getByText('Rows: 2')).toBeInTheDocument();
		expect(screen.queryByTestId('mobile-card')).not.toBeInTheDocument();
	});

	test('renders MobileListCards on small screens', () => {
		useMediaQuery.mockReturnValue(true); // Simulate Mobile

		render(<List type='users' />);

		expect(screen.queryByTestId('datatable')).not.toBeInTheDocument();
		const cards = screen.getAllByTestId('mobile-card');
		expect(cards).toHaveLength(2);
		expect(screen.getByText('Mobile Content: 1')).toBeInTheDocument();
	});

	test('renders mobile empty state when list has no items', () => {
		useMediaQuery.mockReturnValue(true);
		useRealTimeList.mockReturnValue({ data: [], loading: false, year: 2024 });

		render(<List type='users' />);

		expect(screen.getByTestId('mobile-empty')).toBeInTheDocument();
		expect(screen.queryByTestId('mobile-card')).not.toBeInTheDocument();
	});

	test('renders LegacyFinancesTable when type is legacyFinances', () => {
		render(<List type='legacyFinances' />);

		expect(screen.getByTestId('legacy-table')).toBeInTheDocument();
		expect(screen.getByText('Finances 2025')).toBeInTheDocument();
	});

	test('handles Inbox logic: uses useMailbox data', () => {
		useMailbox.mockReturnValue({
			emails: [{ id: 'e1', subject: 'Hello' }],
			loading: false,
			selectedFolderId: 'inbox',
		});

		render(<List type='inbox' />);

		expect(screen.getByTestId('datatable')).toBeInTheDocument();
		expect(screen.getByText('Rows: 1')).toBeInTheDocument();

		expect(useRealTimeList).toHaveBeenCalledWith('inbox', false);
	});

	test('handles Inbox logic: filters by alias', () => {
		const emails = [
			{ id: 'e1', tags: ['alias1'] },
			{ id: 'e2', tags: ['alias2'] },
		];

		useMailbox.mockReturnValue({
			emails,
			loading: false,
			selectedAliasFilter: 'alias1',
		});

		render(<List type='inbox' />);

		expect(screen.getByText('Rows: 1')).toBeInTheDocument();
	});

	test('checks for deliberation room existence when type is interviews', async () => {
		getRoomDetails.mockResolvedValue({ data: { success: true } });

		render(<List type='interviews' />);

		await waitFor(() => {
			expect(getRoomDetails).toHaveBeenCalledWith({ roomName: 'deliberation-room' });
		});
	});

	test('handles deliberation room check failure gracefully', async () => {
		const error = new Error('Network error');
		getRoomDetails.mockRejectedValue(error);

		render(<List type='interviews' />);

		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalledWith(error, 'list-checkDelibRoomUE');
		});
	});

	test('displays error for invalid list type', () => {
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

		render(<List type='invalidType' />);

		expect(screen.getByText(/Error: Invalid list type specified/i)).toBeInTheDocument();

		consoleSpy.mockRestore();
	});

	test('remaps inbox sent-folder columns and wires folder/alias handlers', () => {
		useMailbox.mockReturnValue({
			emails: [{ id: 'e1', subject: 'Hello', to: 'a@b.com', tags: ['alias1'] }],
			loading: false,
			permittedFolders: [{ id: 'sent', label: 'Sent' }],
			permittedAliases: ['alias1'],
			selectedFolderId: 'sent',
			setSelectedFolderId: mockSetSelectedFolderId,
			selectedAliasFilter: 'all',
			setSelectedAliasFilter: mockSetSelectedAliasFilter,
		});

		render(<List type='inbox' />);

		expect(screen.getByTestId('col-senderSubject')).toHaveTextContent('Recipient / Subject');
		expect(screen.getByTestId('col-tags')).toHaveTextContent('Sent By');
		expect(screen.getByTestId('getter-senderSubject')).toHaveTextContent('to@x.com Subj');
		expect(screen.getByTestId('recipient-subject')).toHaveTextContent('to@x.com');
		fireEvent.click(screen.getByTestId('folder-change'));
		expect(mockSetSelectedFolderId).toHaveBeenCalledWith('sent');
		fireEvent.click(screen.getByTestId('alias-change'));
		expect(mockSetSelectedAliasFilter).toHaveBeenCalledWith('alias1');
	});

	test('shows demo email banner for inbox in demo delivery mode', async () => {
		const { useConfig } = await import('../../context/ConfigContext');
		useConfig.mockReturnValue({ emailDeliveryMode: 'demo' });
		useMailbox.mockReturnValue({
			emails: [{ id: 'e1' }],
			loading: false,
			selectedFolderId: 'inbox',
			selectedAliasFilter: 'all',
		});
		render(<List type='inbox' />);
		expect(screen.getByRole('alert')).toBeInTheDocument();
	});

	test('falls back to DefaultCard when mobile card config is missing', () => {
		useMediaQuery.mockReturnValue(true);
		useRealTimeList.mockReturnValue({ data: [{ id: 'x1' }], loading: false, year: 2025 });
		render(<List type='noMobile' />);
		expect(screen.getByText(/Card for noMobile: x1/i)).toBeInTheDocument();
		expect(screen.getByText(/Mobile Card configuration missing/i)).toBeInTheDocument();
	});

	test('injects getActions and getToolbarActions for interviews', async () => {
		getRoomDetails.mockResolvedValue({ data: { success: true } });
		const { adminLists } = await import('../../config/admin/lists');
		render(<List type='interviews' />);
		await waitFor(() => {
			expect(getRoomDetails).toHaveBeenCalled();
		});
		expect(adminLists.interviews.getToolbarActions).toHaveBeenCalled();
		expect(adminLists.interviews.getActions).toHaveBeenCalled();
		expect(screen.getByTestId('toolbar-actions')).toHaveTextContent('1');
		expect(screen.getByTestId('row-actions')).toHaveTextContent('1');
	});

	test('uses static actions when getActions is not defined', () => {
		render(<List type='noMobile' />);
		expect(screen.getByTestId('row-actions')).toHaveTextContent('1');
	});
});
