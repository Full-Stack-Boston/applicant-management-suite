import { render, screen } from '@testing-library/react';
import { StatusCapsule, RsvpCapsule } from './StatusCapsule';
import { ApplicationStatus, InterviewStatus } from '../../config/data/collections';

describe('StatusCapsule', () => {
	test('renders status label', () => {
		render(<StatusCapsule status={ApplicationStatus.completed}>Status: Completed</StatusCapsule>);
		expect(screen.getByText('Status: Completed')).toBeInTheDocument();
	});

	test('renders interview status', () => {
		render(<StatusCapsule status={InterviewStatus.confirmed} />);
		expect(screen.getByText(InterviewStatus.confirmed)).toBeInTheDocument();
	});
});

describe('RsvpCapsule', () => {
	test('renders yes RSVP', () => {
		render(<RsvpCapsule rsvpStatus='yes' />);
		expect(screen.getByText(/RSVP: ✅ Yes/)).toBeInTheDocument();
	});

	test('renders unknown RSVP', () => {
		render(<RsvpCapsule rsvpStatus={undefined} />);
		expect(screen.getByText(/RSVP: ❓ Unknown/)).toBeInTheDocument();
	});
});
