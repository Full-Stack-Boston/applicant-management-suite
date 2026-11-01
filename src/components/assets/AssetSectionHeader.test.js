import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AssetSectionHeader from './AssetSectionHeader';

const mockNavigate = jest.fn();

vi.mock('react-router-dom', () => ({
	useNavigate: () => mockNavigate,
}));

describe('AssetSectionHeader', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders title and divider by default', () => {
		const { container } = render(<AssetSectionHeader title='Notes' />);
		expect(screen.getByRole('heading', { name: 'Notes' })).toBeInTheDocument();
		expect(container.querySelector('hr')).toBeTruthy();
	});

	it('hides divider when showDivider is false', () => {
		const { container } = render(<AssetSectionHeader title='Notes' showDivider={false} />);
		expect(container.querySelector('hr')).toBeNull();
	});

	it('calls onBack when back button is clicked', () => {
		const onBack = jest.fn();
		render(<AssetSectionHeader title='Notes' showBackButton onBack={onBack} />);
		fireEvent.click(screen.getByLabelText('Go back'));
		expect(onBack).toHaveBeenCalledTimes(1);
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it('navigates back when no onBack is provided', () => {
		render(<AssetSectionHeader title='Notes' showBackButton />);
		fireEvent.click(screen.getByLabelText('Go back'));
		expect(mockNavigate).toHaveBeenCalledWith(-1);
	});

	it('renders endAdornment', () => {
		render(<AssetSectionHeader title='Notes' endAdornment={<button type='button'>Extra</button>} />);
		expect(screen.getByRole('button', { name: 'Extra' })).toBeInTheDocument();
	});
});
