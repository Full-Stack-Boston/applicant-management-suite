import React from 'react';
import { render, screen } from '@testing-library/react';
import EmailIcon from '@mui/icons-material/Email';
import ApplicationDetailGrid from './ApplicationDetailGrid';

describe('ApplicationDetailGrid', () => {
	test('renders visible items and skips empty values', () => {
		render(
			<ApplicationDetailGrid
				items={[
					{ label: 'From', value: 'a@example.com', icon: EmailIcon },
					{ label: 'Empty', value: '', icon: EmailIcon },
					{ label: 'To', value: 'b@example.com', icon: EmailIcon },
				]}
			/>
		);

		expect(screen.getByText('From')).toBeInTheDocument();
		expect(screen.getByText('a@example.com')).toBeInTheDocument();
		expect(screen.getByText('To')).toBeInTheDocument();
		expect(screen.queryByText('Empty')).not.toBeInTheDocument();
	});

	test('returns null when no values are present', () => {
		const { container } = render(
			<ApplicationDetailGrid items={[{ label: 'Hidden', value: '', icon: EmailIcon }]} />
		);
		expect(container).toBeEmptyDOMElement();
	});

	test('supports stacked layout', () => {
		render(
			<ApplicationDetailGrid
				stacked
				items={[{ label: 'Subject', value: 'Hello', icon: EmailIcon }]}
			/>
		);
		expect(screen.getByText('Subject')).toBeInTheDocument();
		expect(screen.getByText('Hello')).toBeInTheDocument();
	});
});
