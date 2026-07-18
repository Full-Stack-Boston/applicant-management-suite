import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MergeApplicantAccountsDialog from './MergeApplicantAccountsDialog';
import { useAlert } from '../../context/AlertContext';
import { getApplicantsForMerge, mergeApplicantAccounts } from '../../config/data/firebase';

vi.mock('../../context/AlertContext');
vi.mock('../../config/data/firebase', () => ({
	getApplicantsForMerge: vi.fn(),
	mergeApplicantAccounts: vi.fn(),
}));

const primaryApplicant = {
	id: 'primary-id-123',
	firstName: 'Alice',
	lastName: 'Smith',
	email: 'alice@example.com',
	hasAuth: true,
	authEmail: 'alice@example.com',
	applications: ['app-1'],
	applicationsDetail: [{ id: 'app-1', type: 'Scholarship', status: 'Submitted', cycleYear: '2026' }],
};

const secondaryApplicant = {
	id: 'secondary-id-456',
	firstName: 'Ally',
	lastName: 'Smyth',
	email: 'ally@example.com',
	hasAuth: false,
	applications: ['app-2'],
	applicationsDetail: [{ id: 'app-2', type: 'Grant', status: 'Pending', cycleYear: '2025' }],
};

describe('MergeApplicantAccountsDialog', () => {
	const mockOnClose = vi.fn();
	const mockOnSuccess = vi.fn();
	const mockShowAlert = vi.fn();
	const mockHandleError = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		useAlert.mockReturnValue({
			showAlert: mockShowAlert,
			handleError: mockHandleError,
		});
		getApplicantsForMerge.mockResolvedValue({ data: { applicants: [primaryApplicant, secondaryApplicant] } });
		mergeApplicantAccounts.mockResolvedValue({ data: { message: 'Accounts merged successfully.' } });
	});

	it('shows a loading state before resolving applicant details', () => {
		render(
			<MergeApplicantAccountsDialog
				applicants={[primaryApplicant, secondaryApplicant]}
				onClose={mockOnClose}
				onSuccess={mockOnSuccess}
			/>,
		);

		expect(screen.getByText('Merge Applicant Accounts')).toBeInTheDocument();
		expect(screen.getByText('Loading account details…')).toBeInTheDocument();
	});

	it('renders account details, applications, and profile fields once loaded', async () => {
		render(
			<MergeApplicantAccountsDialog
				applicants={[primaryApplicant, secondaryApplicant]}
				onClose={mockOnClose}
				onSuccess={mockOnSuccess}
				title='Custom Merge Title'
			/>,
		);

		await waitFor(() => {
			expect(getApplicantsForMerge).toHaveBeenCalledWith({
				applicantIds: [primaryApplicant.id, secondaryApplicant.id],
			});
		});

		expect(screen.getByText('Custom Merge Title')).toBeInTheDocument();
		expect(await screen.findByText(/Alice Smith/)).toBeInTheDocument();
		expect(screen.getByText(/Ally Smyth/)).toBeInTheDocument();
		expect(screen.getByText(/Has login/)).toBeInTheDocument();
		expect(screen.getByText(/No login detected/)).toBeInTheDocument();
		expect(screen.getByText(/Scholarship \(2026\) — Submitted/)).toBeInTheDocument();
		expect(screen.getByText(/Grant \(2025\) — Pending/)).toBeInTheDocument();
		expect(screen.getByText('First name')).toBeInTheDocument();
		expect(screen.getByText('Email')).toBeInTheDocument();
	});

	it('swaps primary and secondary accounts when Swap is clicked', async () => {
		render(
			<MergeApplicantAccountsDialog
				applicants={[primaryApplicant, secondaryApplicant]}
				onClose={mockOnClose}
				onSuccess={mockOnSuccess}
			/>,
		);

		expect(await screen.findByText(/Alice Smith/)).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: /Swap/i }));

		const subtitles = screen.getAllByText('Primary (kept)');
		expect(subtitles.length).toBeGreaterThan(0);
	});

	it('toggles an application checkbox', async () => {
		render(
			<MergeApplicantAccountsDialog
				applicants={[primaryApplicant, secondaryApplicant]}
				onClose={mockOnClose}
				onSuccess={mockOnSuccess}
			/>,
		);

		await screen.findByText(/Scholarship \(2026\) — Submitted/);
		const checkboxes = screen.getAllByRole('checkbox');
		expect(checkboxes[0]).toBeChecked();
		fireEvent.click(checkboxes[0]);
		expect(checkboxes[0]).not.toBeChecked();
	});

	it('merges accounts and calls onSuccess and onClose', async () => {
		render(
			<MergeApplicantAccountsDialog
				applicants={[primaryApplicant, secondaryApplicant]}
				onClose={mockOnClose}
				onSuccess={mockOnSuccess}
			/>,
		);

		await screen.findByText(/Alice Smith/);

		fireEvent.click(screen.getByRole('button', { name: 'Merge Accounts' }));

		await waitFor(() => {
			expect(mergeApplicantAccounts).toHaveBeenCalled();
		});
		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Accounts merged successfully.', type: 'success' });
		});
		expect(mockOnSuccess).toHaveBeenCalled();
		expect(mockOnClose).toHaveBeenCalled();
	});

	it('shows an error alert when merging fails to fetch two different accounts', async () => {
		getApplicantsForMerge.mockRejectedValue(new Error('lookup failed'));

		render(
			<MergeApplicantAccountsDialog
				applicants={[primaryApplicant, secondaryApplicant]}
				onClose={mockOnClose}
				onSuccess={mockOnSuccess}
			/>,
		);

		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error), 'merge-applicant-lookup');
		});
	});

	it('clicking Cancel calls onClose', () => {
		render(
			<MergeApplicantAccountsDialog
				applicants={[primaryApplicant, secondaryApplicant]}
				onClose={mockOnClose}
				onSuccess={mockOnSuccess}
			/>,
		);

		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(mockOnClose).toHaveBeenCalled();
	});
});
