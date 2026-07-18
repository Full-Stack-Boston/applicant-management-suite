import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileListCard from './MobileListCard';
import { useTheme } from '../../context/ThemeContext';
import { resolveRowActionMeta, useRowActionInvoker } from '../../config/ui/tableConfig';

// --- Mocks ---
vi.mock('../../context/ThemeContext', () => ({
	useTheme: vi.fn(),
}));

vi.mock('../../config/ui/tableConfig', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		ActionCellButton: ({ actionKey }) => <button data-testid={`action-${actionKey}`}>{actionKey}</button>,
		resolveRowActionMeta: vi.fn(),
		useRowActionInvoker: vi.fn(),
	};
});

describe('MobileListCard', () => {
	beforeEach(() => {
		useTheme.mockReturnValue({ darkMode: false });
		useRowActionInvoker.mockReturnValue({
			runAction: vi.fn(),
			handleError: vi.fn(),
			member: {},
		});
		resolveRowActionMeta.mockImplementation((key) => ({
			label: key,
			IconComponent: () => <span data-testid={`icon-${key}`} />,
			color: 'info.light',
		}));
	});

	test('renders children content', () => {
		render(
			<MobileListCard item={{ id: 1 }}>
				<div>Child Content</div>
			</MobileListCard>
		);
		expect(screen.getByText('Child Content')).toBeInTheDocument();
	});

	test('renders primary actions from actionKeys', () => {
		render(
			<MobileListCard item={{ id: 1 }} actionKeys={['viewMember', 'editMember']}>
				<div>Content</div>
			</MobileListCard>
		);
		expect(screen.getByTestId('action-viewMember')).toBeInTheDocument();
		expect(screen.getByTestId('action-editMember')).toBeInTheDocument();
	});

	test('applies visual style for unread items', () => {
		render(
			<MobileListCard item={{ id: 1 }} isUnread={true}>
				<div>Unread Content</div>
			</MobileListCard>
		);
		expect(screen.getByText('Unread Content')).toBeInTheDocument();
	});

	test('uses a column layout so content and actions size the card shell', () => {
		const { container } = render(
			<MobileListCard item={{ id: 1 }}>
				<div>Shell Content</div>
			</MobileListCard>
		);

		const shell = container.firstChild;
		expect(shell).not.toBeNull();
		const styles = window.getComputedStyle(shell);
		expect(styles.display).toBe('flex');
		expect(styles.flexDirection).toBe('column');
		expect(styles.minHeight).toBe('fit-content');
	});

	test('shows all actions when count is within primaryCount', () => {
		render(
			<MobileListCard item={{ id: 1 }} actionKeys={['a', 'b', 'c']} primaryCount={3}>
				<div>Content</div>
			</MobileListCard>
		);

		expect(screen.getByTestId('action-a')).toBeInTheDocument();
		expect(screen.getByTestId('action-b')).toBeInTheDocument();
		expect(screen.getByTestId('action-c')).toBeInTheDocument();
		expect(screen.queryByLabelText('More actions')).not.toBeInTheDocument();
	});

	test('shows overflow menu with proper MenuItems when actions exceed primaryCount', () => {
		render(
			<MobileListCard item={{ id: 1 }} actionKeys={['a', 'b', 'c', 'd']} primaryCount={2}>
				<div>Content</div>
			</MobileListCard>
		);

		expect(screen.getByTestId('action-a')).toBeInTheDocument();
		expect(screen.getByTestId('action-b')).toBeInTheDocument();
		expect(screen.queryByText('c')).not.toBeInTheDocument();

		const moreButton = screen.getByLabelText('More actions');
		expect(moreButton).toBeInTheDocument();

		fireEvent.click(moreButton);

		expect(screen.getByText('c')).toBeInTheDocument();
		expect(screen.getByText('d')).toBeInTheDocument();
		expect(screen.getByTestId('icon-c')).toBeInTheDocument();
		expect(screen.getByTestId('icon-d')).toBeInTheDocument();
	});
});
