import { render, screen } from '@testing-library/react';
import MobileListEmptyState from './MobileListEmptyState';

describe('MobileListEmptyState', () => {
	test('renders default message', () => {
		render(<MobileListEmptyState />);
		expect(screen.getByText('No items to display')).toBeInTheDocument();
	});

	test('renders custom message', () => {
		render(<MobileListEmptyState message='Nothing scheduled for 2024' />);
		expect(screen.getByText('Nothing scheduled for 2024')).toBeInTheDocument();
	});
});
