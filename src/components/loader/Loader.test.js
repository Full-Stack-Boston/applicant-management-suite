import React from 'react';
import { render, screen } from '@testing-library/react';
import Loader from './Loader';

describe('Loader Component', () => {
	test('renders circular progress', () => {
		render(<Loader />);
		expect(screen.getByRole('progressbar')).toBeInTheDocument();
	});
});
