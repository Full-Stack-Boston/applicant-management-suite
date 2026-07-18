import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RowActionsMenu from './RowActionsMenu';

const mockRunAction = jest.fn();
const mockHandleError = jest.fn();

vi.mock('../../config/ui/tableConfig', () => ({
	resolveRowActionMeta: (actionKey) => {
		if (actionKey === 'hidden') return null;
		return {
			label: actionKey === 'view' ? 'View' : 'Edit',
			IconComponent: () => <span data-testid={`icon-${actionKey}`} />,
			color: 'primary.main',
		};
	},
	useRowActionInvoker: () => ({
		runAction: mockRunAction,
		handleError: mockHandleError,
		member: { uid: 'm1' },
	}),
}));

describe('RowActionsMenu', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockRunAction.mockResolvedValue(undefined);
	});

	it('returns null when no resolvable actions', () => {
		const { container } = render(<RowActionsMenu row={{ id: '1' }} actionKeys={['hidden']} />);
		expect(container).toBeEmptyDOMElement();
	});

	it('opens menu and runs an action', async () => {
		render(<RowActionsMenu row={{ id: '1' }} actionKeys={['view', 'edit']} />);

		fireEvent.click(screen.getByRole('button', { name: /Actions/i }));
		expect(await screen.findByText('View')).toBeInTheDocument();
		expect(screen.getByText('Edit')).toBeInTheDocument();

		fireEvent.click(screen.getByText('View'));
		await waitFor(() => {
			expect(mockRunAction).toHaveBeenCalledWith('view', expect.objectContaining({ id: '1' }));
		});
	});

	it('surfaces errors through handleError', async () => {
		const err = new Error('boom');
		mockRunAction.mockRejectedValueOnce(err);
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

		render(<RowActionsMenu row={{ id: '1' }} actionKeys={['view']} />);
		fireEvent.click(screen.getByRole('button', { name: /Actions/i }));
		fireEvent.click(await screen.findByText('View'));

		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalledWith(err, 'action-view');
		});
		consoleSpy.mockRestore();
	});
});
