import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ApplicantApplicationOverlay from './ApplicantApplicationOverlay';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';
import { getApplication, getCollectionData } from '../../config/data/firebase';

vi.mock('../../context/AuthContext', () => ({
	useAuth: vi.fn(),
}));

vi.mock('../../context/AlertContext', () => ({
	useAlert: vi.fn(),
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: vi.fn(),
}));

vi.mock('../../config/data/firebase', () => ({
	getApplication: vi.fn(),
	getCollectionData: vi.fn(),
}));

vi.mock('../../config/Constants', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		attachmentFields: [
			{ key: 'applicantPersonalLetter', label: 'Personal Letter', requiredBy: ['New Applicant'] },
		],
	};
});

vi.mock('../../components/loader/Loader', () => ({
	default: () => <div data-testid='loader' />,
}));

vi.mock('../../components/list/StatusCapsule', () => ({
	StatusCapsule: ({ status }) => <span>{status}</span>,
}));

vi.mock('./ReviewMobileDetails', () => ({
	ReviewProfileMobile: () => <div>Profile section</div>,
	ReviewFamilySection: () => <div>Family section</div>,
	ReviewEducationSection: () => null,
	ReviewScoutingSection: () => null,
	ReviewExpensesSection: () => null,
	ReviewIncomesSection: () => null,
	ReviewContributionsSection: () => null,
	ReviewProjectionsSection: () => null,
	ReviewMobileAttachmentCard: ({ label, children }) => (
		<div>
			{label}
			{children}
		</div>
	),
}));

describe('ApplicantApplicationOverlay', () => {
	const handleError = vi.fn();
	const onClose = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		useAuth.mockReturnValue({ user: { uid: 'user-1' } });
		useAlert.mockReturnValue({ handleError });
		useTheme.mockReturnValue({ darkMode: true });
		getApplication.mockResolvedValue({
			completedBy: 'user-1',
			type: 'New Applicant',
			status: 'Submitted',
			submittedOn: '7/14/2026',
			profile: 'profile-1',
			family: 'family-1',
			education: 'education-1',
			scouting: 'scouting-1',
			expenses: 'expenses-1',
			incomes: 'incomes-1',
			contributions: 'contributions-1',
			projections: 'projections-1',
			attachments: 'attachments-1',
		});
		getCollectionData.mockImplementation(async (_uid, collectionName) => {
			if (collectionName === 'profiles') return { applicantFirstName: 'Test' };
			if (collectionName === 'families') return { familyMembers: [] };
			if (collectionName === 'attachments') return { applicantPersonalLetter: { displayName: 'letter.pdf', home: 'https://example.com/letter.pdf' } };
			return null;
		});
	});

	test('loads and shows application content while staying modal', async () => {
		render(<ApplicantApplicationOverlay open applicationId='app-1' onClose={onClose} />);

		expect(await screen.findByText(/Your Application/i)).toBeInTheDocument();
		await waitFor(() => {
			expect(screen.getByText('Profile section')).toBeInTheDocument();
		});
		expect(screen.getByText('Family section')).toBeInTheDocument();
		expect(screen.getByText('letter.pdf')).toBeInTheDocument();
		expect(getApplication).toHaveBeenCalledWith('user-1', 'app-1');
	});

	test('closes when the close button is pressed', async () => {
		render(<ApplicantApplicationOverlay open applicationId='app-1' onClose={onClose} />);
		await screen.findByText(/Your Application/i);
		fireEvent.click(screen.getByLabelText(/Close application overlay/i));
		expect(onClose).toHaveBeenCalled();
	});

	test('shows an error when the application cannot be found', async () => {
		getApplication.mockResolvedValue(null);
		render(<ApplicantApplicationOverlay open applicationId='missing' onClose={onClose} />);
		expect(await screen.findByText(/Application not found/i)).toBeInTheDocument();
	});

	test('does not fetch when closed or when the user is missing', () => {
		render(<ApplicantApplicationOverlay open={false} applicationId='app-1' onClose={onClose} />);
		expect(getApplication).not.toHaveBeenCalled();

		useAuth.mockReturnValue({ user: null });
		render(<ApplicantApplicationOverlay open applicationId='app-1' onClose={onClose} />);
		expect(getApplication).not.toHaveBeenCalled();
	});

	test('surfaces load failures from getApplication', async () => {
		getApplication.mockRejectedValueOnce(new Error('boom'));
		render(<ApplicantApplicationOverlay open applicationId='app-1' onClose={onClose} />);
		expect(await screen.findByText(/Could not load your application/i)).toBeInTheDocument();
		expect(handleError).toHaveBeenCalledWith(expect.any(Error), 'waitingRoomApplicationOverlay');
	});

	test('renders attachment request and missing states', async () => {
		getCollectionData.mockImplementation(async (_uid, collectionName) => {
			if (collectionName === 'profiles') return { applicantFirstName: 'Test' };
			if (collectionName === 'families') return { familyMembers: [] };
			if (collectionName === 'attachments') {
				return {
					applicantPersonalLetter: { requestID: 'req-1' },
				};
			}
			return null;
		});
		render(<ApplicantApplicationOverlay open applicationId='app-1' onClose={onClose} />);
		expect(await screen.findByText('Request Sent')).toBeInTheDocument();
	});

	test('renders display-name-only attachment chips without links', async () => {
		getCollectionData.mockImplementation(async (_uid, collectionName) => {
			if (collectionName === 'profiles') return { applicantFirstName: 'Test' };
			if (collectionName === 'families') return { familyMembers: [] };
			if (collectionName === 'attachments') {
				return {
					applicantPersonalLetter: { displayName: 'offline.pdf' },
				};
			}
			return null;
		});
		render(<ApplicantApplicationOverlay open applicationId='app-1' onClose={onClose} />);
		expect(await screen.findByText('offline.pdf')).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'offline.pdf' })).not.toBeInTheDocument();
	});

	test('renders not-uploaded copy when attachment data is empty', async () => {
		getCollectionData.mockImplementation(async (_uid, collectionName) => {
			if (collectionName === 'profiles') return { applicantFirstName: 'Test' };
			if (collectionName === 'families') return { familyMembers: [] };
			if (collectionName === 'attachments') return {};
			return null;
		});
		render(<ApplicantApplicationOverlay open applicationId='app-1' onClose={onClose} />);
		expect((await screen.findAllByText(/Not uploaded/i)).length).toBeGreaterThan(0);
	});
});
