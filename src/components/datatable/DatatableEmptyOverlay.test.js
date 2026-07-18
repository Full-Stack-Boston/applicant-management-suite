import React from 'react';
import { render, screen } from '@testing-library/react';
import DatatableEmptyOverlay from './DatatableEmptyOverlay';

describe('DatatableEmptyOverlay', () => {
	it('renders default message', () => {
		render(<DatatableEmptyOverlay />);
		expect(screen.getByText('No items to display')).toBeInTheDocument();
	});

	it('renders custom message', () => {
		render(<DatatableEmptyOverlay message='Nothing here' />);
		expect(screen.getByText('Nothing here')).toBeInTheDocument();
	});
});
