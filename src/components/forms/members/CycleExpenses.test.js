import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import CycleExpenses from './CycleExpenses';
import { useTheme } from '../../../context/ThemeContext';
import { useAlert } from '../../../context/AlertContext';
import * as firebaseConfig from '../../../config/data/firebase';
import { PageTitleProvider } from '../../../context/HelmetContext';
import { HelmetProvider } from 'react-helmet-async';

const mockNavigate = vi.fn();
const mockShowAlert = vi.fn();
const mockHandleError = vi.fn();

vi.mock('react-router-dom', () => ({
	useNavigate: () => mockNavigate,
}));

vi.mock('../../../context/ThemeContext', () => ({ useTheme: vi.fn() }));
vi.mock('../../../context/AlertContext', () => ({ useAlert: vi.fn() }));

vi.mock('../../../config/data/firebase', () => ({
	__esModule: true,
	getRealTimeYearlyFinances: vi.fn(),
	ensureYearlyFinancesDoc: vi.fn(),
	saveYearlyFinancesDoc: vi.fn(),
	getAwardsByIds: vi.fn(),
	getApplicationsByIds: vi.fn(),
	getMemberOrApplicantAddress: vi.fn(),
}));

vi.mock('../../../config/data/yearlyFinances', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		downloadCouncilDisbursementPdf: vi.fn(() => 'Application-Management-Suite-2026-Disbursement.pdf'),
	};
});

const renderPage = () =>
	render(
		<HelmetProvider>
			<PageTitleProvider>
				<CycleExpenses />
			</PageTitleProvider>
		</HelmetProvider>
	);

describe('CycleExpenses', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
		firebaseConfig.getAwardsByIds.mockResolvedValue([]);
		firebaseConfig.ensureYearlyFinancesDoc.mockResolvedValue('2026');
		firebaseConfig.saveYearlyFinancesDoc.mockResolvedValue(true);
		firebaseConfig.getMemberOrApplicantAddress.mockResolvedValue({ name: 'Casey Scout', address: '1 Main St' });
		firebaseConfig.getApplicationsByIds.mockResolvedValue([
			{ id: 'app-1', type: 'New Applicant', completedBy: 'applicant-1' },
		]);
		firebaseConfig.getRealTimeYearlyFinances.mockImplementation((handler) => {
			handler([
				{
					id: '2026',
					cycleYear: 2026,
					programExpenseItems: [{ category: 'campership', program: 'Camp', request: 100, disbursement: 100 }],
					awardIDs: ['award-1'],
					total_allotted_disbursement: 1000,
					prior_year_clawback: 0,
				},
			]);
			return () => {};
		});
		firebaseConfig.getAwardsByIds.mockResolvedValue([
			{ id: 'award-1', type: 'Grant', amount: 500, applicationID: 'app-1', applicantId: 'applicant-1' },
		]);
	});

	it('renders year summary and award table rows', async () => {
		await act(async () => {
			renderPage();
		});
		expect(screen.getByRole('heading', { name: 'Cycle Expenses' })).toBeInTheDocument();
		expect(screen.getByText(/Camperships and non-scholarship/i)).toBeInTheDocument();
		await waitFor(() => expect(screen.getAllByText('Casey Scout').length).toBeGreaterThan(0));
		expect(screen.getAllByText('New Applicant').length).toBeGreaterThan(0);
		expect(screen.getAllByText('1 Main St').length).toBeGreaterThan(0);
		expect(screen.getByText(/Year summary/)).toBeInTheDocument();
		expect(screen.getAllByText('Camp').length).toBeGreaterThan(0);
		expect(screen.getAllByLabelText('Unlock expense row to edit').length).toBeGreaterThan(0);
	});

	it('saves the selected year', async () => {
		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getByText('Save year')).toBeInTheDocument());
		await act(async () => {
			fireEvent.click(screen.getByText('Save year'));
		});
		await waitFor(() => {
			expect(firebaseConfig.ensureYearlyFinancesDoc).toHaveBeenCalledWith(2026);
			expect(firebaseConfig.saveYearlyFinancesDoc).toHaveBeenCalled();
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});
	});

	it('adds a program expense row in edit mode', async () => {
		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getByText('Add program expense')).toBeInTheDocument());
		await act(async () => {
			fireEvent.click(screen.getByText('Add program expense'));
		});
		await waitFor(() => {
			expect(screen.getAllByLabelText('Save expense row').length).toBeGreaterThan(0);
			expect(screen.getAllByLabelText('Cancel expense edit').length).toBeGreaterThan(0);
		});
	});

	it('generates disbursement email preview', async () => {
		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getByText('Disbursement email')).toBeInTheDocument());
		await act(async () => {
			fireEvent.click(screen.getByText('Disbursement email'));
		});
		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'Disbursement email' })).toBeInTheDocument();
			expect(firebaseConfig.getMemberOrApplicantAddress).toHaveBeenCalled();
			expect(screen.getByLabelText(/Include non-scholarship program expenses/i)).toBeChecked();
		});
		await act(async () => {
			fireEvent.click(screen.getByLabelText(/Include non-scholarship program expenses/i));
		});
		await waitFor(() => {
			expect(screen.getByLabelText(/Include non-scholarship program expenses/i)).not.toBeChecked();
		});
		await act(async () => {
			fireEvent.click(screen.getByText('Download PDF'));
		});
		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/Downloaded /) }));
		});
	});

	it('unlocks an expense row, edits fields, and saves', async () => {
		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getAllByLabelText('Unlock expense row to edit').length).toBeGreaterThan(0));
		await act(async () => {
			fireEvent.click(screen.getAllByLabelText('Unlock expense row to edit')[0]);
		});
		await waitFor(() => expect(screen.getAllByLabelText('Save expense row').length).toBeGreaterThan(0));

		await act(async () => {
			fireEvent.change(screen.getAllByDisplayValue('Camp')[0], { target: { value: 'Updated Camp' } });
		});

		await act(async () => {
			fireEvent.click(screen.getAllByLabelText('Save expense row')[0]);
		});
		await waitFor(() => {
			expect(firebaseConfig.saveYearlyFinancesDoc).toHaveBeenCalled();
			expect(mockShowAlert).toHaveBeenCalledWith(
				expect.objectContaining({ message: expect.stringMatching(/Saved program expense/) })
			);
		});
		const savedPayload = firebaseConfig.saveYearlyFinancesDoc.mock.calls.at(-1)[1];
		expect(savedPayload.programExpenseItems[0].program).toBe('Updated Camp');
	});

	it('cancels expense edit and reverts to locked values', async () => {
		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getAllByLabelText('Unlock expense row to edit').length).toBeGreaterThan(0));
		await act(async () => {
			fireEvent.click(screen.getAllByLabelText('Unlock expense row to edit')[0]);
		});
		await waitFor(() => expect(screen.getAllByLabelText('Cancel expense edit').length).toBeGreaterThan(0));

		await act(async () => {
			fireEvent.change(screen.getAllByDisplayValue('Camp')[0], { target: { value: 'Should Revert' } });
		});
		await act(async () => {
			fireEvent.click(screen.getAllByLabelText('Cancel expense edit')[0]);
		});
		await waitFor(() => {
			expect(screen.queryByLabelText('Save expense row')).not.toBeInTheDocument();
			expect(screen.getAllByText('Camp').length).toBeGreaterThan(0);
			expect(screen.queryByDisplayValue('Should Revert')).not.toBeInTheDocument();
		});
	});

	it('removes an unlocked expense row', async () => {
		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getAllByLabelText('Unlock expense row to edit').length).toBeGreaterThan(0));
		await act(async () => {
			fireEvent.click(screen.getAllByLabelText('Unlock expense row to edit')[0]);
		});
		await waitFor(() => expect(screen.getAllByLabelText('Remove expense').length).toBeGreaterThan(0));
		await act(async () => {
			fireEvent.click(screen.getAllByLabelText('Remove expense')[0]);
		});
		await waitFor(() => {
			expect(firebaseConfig.saveYearlyFinancesDoc).toHaveBeenCalled();
			expect(mockShowAlert).toHaveBeenCalledWith(
				expect.objectContaining({ message: expect.stringMatching(/Removed program expense/) })
			);
		});
		const savedPayload = firebaseConfig.saveYearlyFinancesDoc.mock.calls.at(-1)[1];
		expect(savedPayload.programExpenseItems).toEqual([]);
	});

	it('copies disbursement email subject and HTML', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });

		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getByText('Disbursement email')).toBeInTheDocument());
		await act(async () => {
			fireEvent.click(screen.getByText('Disbursement email'));
		});
		await waitFor(() => expect(screen.getByText('Copy subject')).toBeInTheDocument());

		await act(async () => {
			fireEvent.click(screen.getByText('Copy subject'));
		});
		await waitFor(() => {
			expect(writeText).toHaveBeenCalled();
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ message: 'Subject copied.' }));
		});

		await act(async () => {
			fireEvent.click(screen.getByText('Copy HTML'));
		});
		await waitFor(() => {
			expect(writeText).toHaveBeenCalledTimes(2);
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ message: 'HTML body copied.' }));
		});
	});

	it('changes the selected cycle year', async () => {
		firebaseConfig.getRealTimeYearlyFinances.mockImplementation((handler) => {
			handler([
				{
					id: '2026',
					cycleYear: 2026,
					programExpenseItems: [{ category: 'campership', program: 'Camp', request: 100, disbursement: 100 }],
					awardIDs: ['award-1'],
					total_allotted_disbursement: 1000,
					prior_year_clawback: 0,
				},
				{
					id: '2025',
					cycleYear: 2025,
					programExpenseItems: [{ category: 'other', program: 'Ads', request: 50, disbursement: 50 }],
					awardIDs: [],
					total_allotted_disbursement: 500,
					prior_year_clawback: 0,
				},
			]);
			return () => {};
		});

		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getByLabelText('Cycle year')).toBeInTheDocument());

		await act(async () => {
			fireEvent.mouseDown(screen.getByLabelText('Cycle year'));
		});
		await waitFor(() => expect(screen.getByRole('option', { name: '2025' })).toBeInTheDocument());
		await act(async () => {
			fireEvent.click(screen.getByRole('option', { name: '2025' }));
		});
		await waitFor(() => {
			expect(screen.getByText(/Year summary — 2025/)).toBeInTheDocument();
			expect(screen.getAllByText('Ads').length).toBeGreaterThan(0);
		});
	});

	it('shows awards load error when getAwardsByIds rejects', async () => {
		firebaseConfig.getAwardsByIds.mockRejectedValue(new Error('network down'));

		await act(async () => {
			renderPage();
		});
		await waitFor(() => {
			expect(screen.getAllByText('Failed to load award documents for this year.').length).toBeGreaterThan(0);
			expect(mockHandleError).toHaveBeenCalled();
		});
	});

	it('shows empty awards state when awardIDs is empty', async () => {
		firebaseConfig.getRealTimeYearlyFinances.mockImplementation((handler) => {
			handler([
				{
					id: '2026',
					cycleYear: 2026,
					programExpenseItems: [],
					awardIDs: [],
					total_allotted_disbursement: 1000,
					prior_year_clawback: 0,
				},
			]);
			return () => {};
		});

		await act(async () => {
			renderPage();
		});
		await waitFor(() => {
			expect(screen.getByText(/No award IDs indexed for 2026 yet/i)).toBeInTheDocument();
		});
		expect(firebaseConfig.getAwardsByIds).not.toHaveBeenCalled();
	});

	it('warns when unlocking a second expense while one is editing', async () => {
		firebaseConfig.getRealTimeYearlyFinances.mockImplementation((handler) => {
			handler([
				{
					id: '2026',
					cycleYear: 2026,
					programExpenseItems: [
						{ category: 'campership', program: 'Camp', request: 100, disbursement: 100 },
						{ category: 'other', program: 'Ads', request: 50, disbursement: 50 },
					],
					awardIDs: [],
					total_allotted_disbursement: 1000,
					prior_year_clawback: 0,
				},
			]);
			return () => {};
		});

		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getAllByLabelText('Unlock expense row to edit').length).toBeGreaterThan(1));
		await act(async () => {
			fireEvent.click(screen.getAllByLabelText('Unlock expense row to edit')[0]);
		});
		await waitFor(() => expect(screen.getAllByLabelText('Save expense row').length).toBeGreaterThan(0));
		await act(async () => {
			const unlocks = screen.getAllByLabelText('Unlock expense row to edit');
			fireEvent.click(unlocks[0]);
		});
		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'warning',
					message: expect.stringMatching(/Finish or cancel/),
				})
			);
		});
	});

	it('updates year summary allotted and clawback fields', async () => {
		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getByLabelText('Total allotted disbursement')).toBeInTheDocument());
		await act(async () => {
			fireEvent.change(screen.getByLabelText('Total allotted disbursement'), { target: { value: '2500' } });
			fireEvent.change(screen.getByLabelText(/Prior year clawback/), { target: { value: '75' } });
		});
		expect(screen.getByLabelText('Total allotted disbursement')).toHaveValue(2500);
		expect(screen.getByLabelText(/Prior year clawback/)).toHaveValue(75);
	});
});
