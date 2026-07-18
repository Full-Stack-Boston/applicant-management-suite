import React from 'react';
import { render, screen } from '@testing-library/react';
import PublicStatusPage from './PublicStatusPage';

vi.mock('./PublicPageLayout', () => ({
	default: ({ children }) => <div data-testid='public-layout'>{children}</div>,
}));

vi.mock('../auth/AuthFormCard', () => ({
	default: ({ title, eyebrow, subtitle, children }) => (
		<div data-testid='auth-card'>
			{eyebrow && <p>{eyebrow}</p>}
			<h1>{title}</h1>
			{subtitle && <p>{subtitle}</p>}
			{children}
		</div>
	),
}));

describe('PublicStatusPage', () => {
	it('wraps content in public layout by default', () => {
		render(
			<PublicStatusPage title='Hello' eyebrow='EYE' subtitle='Sub'>
				<span>Body</span>
			</PublicStatusPage>
		);
		expect(screen.getByTestId('public-layout')).toBeInTheDocument();
		expect(screen.getByText('Hello')).toBeInTheDocument();
		expect(screen.getByText('EYE')).toBeInTheDocument();
		expect(screen.getByText('Body')).toBeInTheDocument();
	});

	it('renders embedded without public layout', () => {
		render(
			<PublicStatusPage title='Embedded' embedded>
				<span>Inside</span>
			</PublicStatusPage>
		);
		expect(screen.queryByTestId('public-layout')).not.toBeInTheDocument();
		expect(screen.getByText('Embedded')).toBeInTheDocument();
		expect(screen.getByText('Inside')).toBeInTheDocument();
	});
});
