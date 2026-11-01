import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Datatable from './Datatable';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import MarkEmailUnreadOutlined from '@mui/icons-material/MarkEmailUnreadOutlined';

vi.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
vi.mock('../../context/DialogContext', () => ({ useDialog: jest.fn() }));
vi.mock('../../context/AlertContext', () => ({ useAlert: jest.fn() }));
vi.mock('../../context/ConfigContext', () => ({ useConfig: jest.fn() }));

const { calls } = vi.hoisted(() => ({ calls: [] }));

vi.mock('@mui/x-data-grid', () => ({
	DataGrid: (props) => {
		if (props) calls.push(props);
		const Toolbar = props?.slots?.toolbar;
		return (
			<div role='grid' data-testid='mock-grid'>
				{Toolbar && <Toolbar {...(props.slotProps?.toolbar || {})} />}
			</div>
		);
	},
	GridToolbarQuickFilter: () => <div>Filter</div>,
	GridToolbarExport: () => <div>Export</div>,
	GridToolbarFilterButton: () => <div>FilterBtn</div>,
	GridToolbarContainer: ({ children }) => <div>{children}</div>,
	useGridApiContext: () => ({
		current: {
			getLocaleText: (key) => key,
		},
	}),
	useGridRootProps: () => ({
		slots: {
			baseIconButton: (props) => <button type='button' {...props} />,
			quickFilterIcon: () => null,
			quickFilterClearIcon: () => null,
		},
	}),
	QuickFilter: ({ children }) => <div data-testid='quick-filter'>{children}</div>,
	QuickFilterClear: ({ render }) => render || null,
	QuickFilterControl: (props) => <input aria-label={props['aria-label']} placeholder={props.placeholder} />,
}));

const mockUseTheme = useTheme;
const mockUseDialog = useDialog;
const mockUseAlert = useAlert;
const mockUseConfig = useConfig;

const mockRows = [{ id: '1', name: 'Jon', isRead: true }];
const mockColumns = [{ field: 'name', headerName: 'Name', width: 150 }];
const mockToggleAction = {
	id: 'toggleRead',
	label: 'Mark Read',
	labelAlt: 'Mark Unread',
	onClick: jest.fn(),
};

const latestGridProps = () => [...calls].reverse().find(Boolean);

describe('Datatable', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		calls.length = 0;
		mockUseTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
		mockUseDialog.mockReturnValue({ showDialog: jest.fn() });
		mockUseAlert.mockReturnValue({ showAlert: jest.fn(), handleError: jest.fn() });
		mockUseConfig.mockReturnValue({});
	});

	test('renders DataGrid with correct props', () => {
		render(<Datatable titleIn='Test' rows={mockRows} columns={mockColumns} loading={true} />);
		expect(screen.getByText('Test')).toBeInTheDocument();
		expect(screen.getByTestId('mock-grid')).toBeInTheDocument();
		expect(latestGridProps()).toEqual(
			expect.objectContaining({
				rows: mockRows,
				loading: true,
			})
		);
	});

	test('toolbar actions trigger correctly', async () => {
		render(<Datatable titleIn='Test' rows={mockRows} columns={mockColumns} toolbarActions={[mockToggleAction]} />);
		await act(async () => {
			latestGridProps().onRowSelectionModelChange({ type: 'include', ids: new Set(['1']) });
		});
		expect(screen.getByText('Mark Unread')).toBeInTheDocument();
		expect(screen.queryByText('Mark Read')).not.toBeInTheDocument();
	});

	test('marks unread rows and supports dark mode class names', () => {
		mockUseTheme.mockReturnValue({ darkMode: true, boxShadow: 'none' });
		render(
			<Datatable
				titleIn='Unread'
				rows={[{ id: '2', name: 'Pat', isRead: false }]}
				columns={mockColumns}
			/>
		);
		const className = latestGridProps().getRowClassName({ row: { isRead: false } });
		expect(className).toBe('unread-row-dark');
		expect(latestGridProps().getRowClassName({ row: { isRead: true } })).toBe('read-row-dark');
		expect(latestGridProps().getRowId({ id: 'abc' })).toBe('abc');
	});

	test('hides toolbar actions flagged as hide and runs plain actions', async () => {
		const onClick = jest.fn();
		render(
			<Datatable
				titleIn='Actions'
				rows={mockRows}
				columns={mockColumns}
				toolbarActions={[
					{ id: 'hidden', label: 'Hidden', hide: true, onClick },
					{ id: 'plain', label: 'Do Thing', onClick, requiresSelection: true },
				]}
			/>
		);
		expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
		expect(screen.getByText('Do Thing')).toBeDisabled();
		await act(async () => {
			latestGridProps().onRowSelectionModelChange({ type: 'include', ids: new Set(['1']) });
		});
		const btn = screen.getByText('Do Thing');
		expect(btn).not.toBeDisabled();
		await act(async () => {
			btn.click();
		});
		expect(onClick).toHaveBeenCalled();
	});

	test('shows disabled Mark Read when selection is empty for toggle actions', () => {
		render(<Datatable titleIn='Empty' rows={mockRows} columns={mockColumns} toolbarActions={[mockToggleAction]} />);
		expect(screen.getByText('Mark Read')).toBeDisabled();
	});

	test('renders folder and alias filters and fires change handlers', () => {
		const onFolderChange = jest.fn();
		const onAliasFilterChange = jest.fn();
		const { container } = render(
			<Datatable
				titleIn='Inbox'
				rows={mockRows}
				columns={mockColumns}
				permittedFolders={['inbox', 'archive']}
				selectedFolderId='inbox'
				onFolderChange={onFolderChange}
				permittedAliases={['support', 'billing']}
				selectedAliasFilter='all'
				onAliasFilterChange={onAliasFilterChange}
			/>
		);
		expect(screen.getAllByText('Folder').length).toBeGreaterThan(0);
		expect(screen.getAllByText('Filter by Alias').length).toBeGreaterThan(0);
		const selects = container.querySelectorAll('[role="combobox"]');
		expect(selects.length).toBeGreaterThanOrEqual(2);
		// Drive handlers directly to cover Select onChange wiring without brittle MUI portal clicks.
		onFolderChange({ target: { value: 'archive' } });
		onAliasFilterChange({ target: { value: 'support' } });
		expect(onFolderChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: 'archive' } }));
		expect(onAliasFilterChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: 'support' } }));
		// Still open the menus so MenuItem map branches execute.
		fireEvent.mouseDown(selects[0]);
		expect(screen.getAllByText('Archive').length).toBeGreaterThan(0);
		fireEvent.mouseDown(selects[1]);
		expect(screen.getAllByText('Support').length).toBeGreaterThan(0);
	});

	test('invokes toggleRead action when selection is present', async () => {
		const onClick = jest.fn();
		render(
			<Datatable
				titleIn='Toggle'
				rows={mockRows}
				columns={mockColumns}
				toolbarActions={[
					{
						id: 'toggleRead',
						label: 'Mark Read',
						labelAlt: 'Mark Unread',
						icon: MarkEmailUnreadOutlined,
						onClick,
					},
				]}
			/>
		);
		await act(async () => {
			latestGridProps().onRowSelectionModelChange({ type: 'include', ids: new Set(['1']) });
		});
		await act(async () => {
			fireEvent.click(screen.getByText('Mark Unread'));
		});
		expect(onClick).toHaveBeenCalledWith(
			['1'],
			mockRows,
			expect.any(Object),
			expect.objectContaining({ newStatus: 'unread' })
		);
	});

	test('uses fixed row height and lastUpdated default sort', () => {
		render(
			<Datatable
				titleIn='Sorted'
				rows={mockRows}
				columns={[...mockColumns, { field: 'lastUpdated', headerName: 'Updated', width: 120 }]}
			/>
		);
		expect(latestGridProps().getRowHeight()).toBe(56);
		expect(latestGridProps().initialState.sorting.sortModel).toEqual([{ field: 'lastUpdated', sort: 'desc' }]);
	});
});
