import React from 'react';
import { render, screen } from '@testing-library/react';
import SingleAssetPage, { AssetCard } from './SingleAssetPage';
import { useTheme } from '../../context/ThemeContext';

vi.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

describe('SingleAssetPage', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
	});

	test('renders children without a page-level back button', () => {
		render(
			<SingleAssetPage>
				<div>Page Content</div>
			</SingleAssetPage>
		);

		expect(screen.getByText('Page Content')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /go back/i })).not.toBeInTheDocument();
	});
});

describe('AssetCard', () => {
	beforeEach(() => {
		useTheme.mockReturnValue({ darkMode: false, boxShadow: '0px 2px 5px black' });
	});

	test('renders children', () => {
		render(
			<AssetCard>
				<div>Card Content</div>
			</AssetCard>
		);

		expect(screen.getByText('Card Content')).toBeInTheDocument();
	});
});
