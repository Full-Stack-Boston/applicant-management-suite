import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AssetProfileSection from './AssetProfileSection';

const mocks = vi.hoisted(() => ({
	navigate: vi.fn(),
	onBack: vi.fn(),
	onAction: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
	useNavigate: () => mocks.navigate,
}));

vi.mock('./AssetSectionHeader', () => ({
	default: ({ title, onBack, endAdornment }) => (
		<div>
			<button type='button' onClick={onBack}>Back</button>
			<span>{title}</span>
			{endAdornment}
		</div>
	),
}));

vi.mock('./ApplicationDetailGrid', () => ({
	default: ({ items }) => <div data-testid='detail-grid'>{items.map((item) => <span key={item.label}>{item.label}:{item.value}</span>)}</div>,
}));

vi.mock('../dynamicButtons/DynamicButtons', () => ({
	default: ({ actions }) => <div data-testid='dynamic-actions'>{actions.map((action) => <button key={action.label}>{action.label}</button>)}</div>,
}));

vi.mock('../../config/ui/statusCapsuleStyles', () => ({
	getStatusCapsuleSx: () => ({}),
}));

describe('AssetProfileSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders identity, details, footer, actions, and edit navigation', () => {
		render(
			<AssetProfileSection
				sectionTitle='Application'
				image='avatar.png'
				displayName='Ada Lovelace'
				status='Submitted'
				config={{ DEFAULT_AVATAR: 'fallback.png' }}
				details={[{ label: 'Email', value: 'ada@example.com' }]}
				footerMeta={<span>Footer metadata</span>}
				actions={[{ label: 'Edit' }]}
				asset={{ id: 'app-1' }}
				onAction={mocks.onAction}
				editPath='/applications/app-1/edit'>
				ignored
			</AssetProfileSection>,
		);

		expect(screen.getByAltText('Profile')).toHaveAttribute('src', 'avatar.png');
		expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
		expect(screen.getByText('Submitted')).toBeInTheDocument();
		expect(screen.getByTestId('detail-grid')).toHaveTextContent('Email:ada@example.com');
		expect(screen.getByText('Footer metadata')).toBeInTheDocument();
		expect(screen.getByTestId('dynamic-actions')).toBeInTheDocument();
		fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
		expect(mocks.navigate).toHaveBeenCalledWith('/applications/app-1/edit');
		fireEvent.click(screen.getAllByRole('button', { name: 'Back' })[0]);
		expect(mocks.onBack).not.toHaveBeenCalled();
	});

	it('renders explicit functions without identity or back button', () => {
		render(
			<AssetProfileSection
				sectionTitle='Details'
				showBackButton={false}
				details={[]}
				stackDetails
				functions={<span>Custom functions</span>}
				functionsTitle='Actions'>
				content
			</AssetProfileSection>,
		);

		expect(screen.getByText('Custom functions')).toBeInTheDocument();
		expect(screen.queryByAltText('Profile')).not.toBeInTheDocument();
	});
});
