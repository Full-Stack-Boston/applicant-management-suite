import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Section from './Section';

vi.mock('../../context/ThemeContext', () => ({
	useTheme: () => ({ darkMode: false, primaryColor: '#0288D1' }),
}));

describe('Section Component', () => {
	test('renders title and children', () => {
		render(
			<MemoryRouter>
				<Section title='My Section'>
					<p>Content</p>
				</Section>
			</MemoryRouter>
		);

		expect(screen.getByText('My Section')).toBeInTheDocument();
		expect(screen.getByText('Content')).toBeInTheDocument();
		// Check for MUI Divider
		expect(screen.getByRole('separator')).toBeInTheDocument();
	});

	test('returns null if children are missing', () => {
		const { container } = render(
			<MemoryRouter>
				<Section title='Empty' />
			</MemoryRouter>
		);
		expect(container).toBeEmptyDOMElement();
	});
});
