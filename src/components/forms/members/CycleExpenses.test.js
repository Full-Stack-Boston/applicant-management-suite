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
		await act(async () => {
			fireEvent.change(screen.getByLabelText('Total allotted disbursement'), { target: { value: '' } });
			fireEvent.change(screen.getByLabelText(/Prior year clawback/), { target: { value: '' } });
		});
		expect(screen.getByLabelText('Total allotted disbursement')).toHaveValue(null);
		expect(screen.getByLabelText(/Prior year clawback/)).toHaveValue(null);
	});

	it('navigates back from the header', async () => {
		await act(async () => {
			renderPage();
		});
		await act(async () => {
			fireEvent.click(screen.getByLabelText('Go back'));
		});
		expect(mockNavigate).toHaveBeenCalledWith(-1);
	});

	it('disables add while an expense row is already editing', async () => {
		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getAllByLabelText('Unlock expense row to edit').length).toBeGreaterThan(0));
		await act(async () => {
			fireEvent.click(screen.getAllByLabelText('Unlock expense row to edit')[0]);
		});
		await waitFor(() => expect(screen.getByText('Add program expense')).toBeDisabled());
	});

	it('cancels a blank new expense row and removes it', async () => {
		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getByText('Add program expense')).toBeInTheDocument());
		await act(async () => {
			fireEvent.click(screen.getByText('Add program expense'));
		});
		await waitFor(() => expect(screen.getAllByLabelText('Cancel expense edit').length).toBeGreaterThan(0));
		await act(async () => {
			fireEvent.click(screen.getAllByLabelText('Cancel expense edit')[0]);
		});
		await waitFor(() => {
			expect(screen.queryByLabelText('Save expense row')).not.toBeInTheDocument();
			expect(screen.getAllByLabelText('Unlock expense row to edit').length).toBeGreaterThan(0);
		});
	});

	it('handles save year failure', async () => {
		firebaseConfig.saveYearlyFinancesDoc.mockResolvedValue(false);
		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getByText('Save year')).toBeInTheDocument());
		await act(async () => {
			fireEvent.click(screen.getByText('Save year'));
		});
		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalled();
		});
	});

	it('handles save expense row failure', async () => {
		firebaseConfig.saveYearlyFinancesDoc.mockResolvedValue(false);
		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getAllByLabelText('Unlock expense row to edit').length).toBeGreaterThan(0));
		await act(async () => {
			fireEvent.click(screen.getAllByLabelText('Unlock expense row to edit')[0]);
		});
		await waitFor(() => expect(screen.getAllByLabelText('Save expense row').length).toBeGreaterThan(0));
		await act(async () => {
			fireEvent.click(screen.getAllByLabelText('Save expense row')[0]);
		});
		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalled();
		});
	});

	it('handles remove expense failure', async () => {
		firebaseConfig.saveYearlyFinancesDoc.mockResolvedValue(false);
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
			expect(mockHandleError).toHaveBeenCalled();
		});
	});

	it('shows partial missing awards warning', async () => {
		firebaseConfig.getRealTimeYearlyFinances.mockImplementation((handler) => {
			handler([
				{
					id: '2026',
					cycleYear: 2026,
					programExpenseItems: [],
					awardIDs: ['award-1', 'award-missing'],
					total_allotted_disbursement: 1000,
					prior_year_clawback: 0,
				},
			]);
			return () => {};
		});
		firebaseConfig.getAwardsByIds.mockResolvedValue([
			{ id: 'award-1', type: 'Grant', amount: 500, applicationID: 'app-1', applicantId: 'applicant-1' },
		]);

		await act(async () => {
			renderPage();
		});
		await waitFor(() => {
			expect(screen.getAllByText(/1 of 2 award ID\(s\) are indexed/i).length).toBeGreaterThan(0);
		});
	});

	it('shows warning when indexed award IDs resolve to none', async () => {
		firebaseConfig.getRealTimeYearlyFinances.mockImplementation((handler) => {
			handler([
				{
					id: '2026',
					cycleYear: 2026,
					programExpenseItems: [],
					awardIDs: ['ghost-1'],
					total_allotted_disbursement: 1000,
					prior_year_clawback: 0,
				},
			]);
			return () => {};
		});
		firebaseConfig.getAwardsByIds.mockResolvedValue([]);

		await act(async () => {
			renderPage();
		});
		await waitFor(() => {
			expect(screen.getAllByText(/1 of 1 award ID\(s\) are indexed/i).length).toBeGreaterThan(0);
		});
	});

	it('handles enrich awards failure', async () => {
		firebaseConfig.getApplicationsByIds.mockRejectedValue(new Error('apps down'));

		await act(async () => {
			renderPage();
		});
		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error), 'cycle-expenses-enrich-awards');
		});
	});

	it('groups multiple awards for the same applicant', async () => {
		firebaseConfig.getAwardsByIds.mockResolvedValue([
			{ id: 'award-1', type: 'Grant', amount: 500, applicationID: 'app-1', applicantId: 'applicant-1' },
			{ id: 'award-2', type: 'Scholarship', amount: 250, applicationID: 'app-1', applicantId: 'applicant-1' },
		]);

		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getAllByText('Casey Scout').length).toBeGreaterThan(0));
		expect(screen.getAllByText('Grant').length).toBeGreaterThan(0);
		expect(screen.getAllByText('Scholarship').length).toBeGreaterThan(0);
	});

	it('shows legacy embedded scholarship warning', async () => {
		firebaseConfig.getRealTimeYearlyFinances.mockImplementation((handler) => {
			handler([
				{
					id: '2026',
					cycleYear: 2026,
					programExpenseItems: [],
					awardIDs: [],
					renewable_scholarships: [{ id: 'legacy-1' }],
					non_renewable_grants: [{ id: 'legacy-g' }],
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
			expect(screen.getByText(/historical embedded scholarship\/grant rows/i)).toBeInTheDocument();
		});
	});

	it('closes the council dialog with Done', async () => {
		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getByText('Disbursement email')).toBeInTheDocument());
		await act(async () => {
			fireEvent.click(screen.getByText('Disbursement email'));
		});
		await waitFor(() => expect(screen.getByText('Done')).toBeInTheDocument());
		await act(async () => {
			fireEvent.click(screen.getByText('Done'));
		});
		await waitFor(() => {
			expect(screen.queryByRole('heading', { name: 'Disbursement email' })).not.toBeInTheDocument();
		});
	});

	it('handles council PDF download failure', async () => {
		const yearly = await import('../../../config/data/yearlyFinances');
		yearly.downloadCouncilDisbursementPdf.mockImplementation(() => {
			throw new Error('pdf failed');
		});

		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getByText('Disbursement email')).toBeInTheDocument());
		await act(async () => {
			fireEvent.click(screen.getByText('Disbursement email'));
		});
		await waitFor(() => expect(screen.getByText('Download PDF')).toBeInTheDocument());
		await act(async () => {
			fireEvent.click(screen.getByText('Download PDF'));
		});
		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error), 'cycle-expenses-council-pdf');
		});
	});

	it('edits expense request and disbursement while unlocked', async () => {
		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getAllByLabelText('Unlock expense row to edit').length).toBeGreaterThan(0));
		await act(async () => {
			fireEvent.click(screen.getAllByLabelText('Unlock expense row to edit')[0]);
		});
		await waitFor(() => expect(screen.getAllByLabelText('Save expense row').length).toBeGreaterThan(0));

		expect(screen.getAllByText('campership').length).toBeGreaterThan(0);

		await act(async () => {
			const requestInputs = screen.getAllByDisplayValue('100');
			fireEvent.change(requestInputs[0], { target: { value: '150' } });
			const disbursementInputs = screen.getAllByDisplayValue('100');
			if (disbursementInputs[0]) {
				fireEvent.change(disbursementInputs[0], { target: { value: '125' } });
			}
		});

		await act(async () => {
			fireEvent.click(screen.getAllByLabelText('Save expense row')[0]);
		});
		await waitFor(() => {
			expect(firebaseConfig.saveYearlyFinancesDoc).toHaveBeenCalled();
		});
	});

	it('changes category via select and edits via the mobile unlock control', async () => {
		await act(async () => {
			renderPage();
		});
		await waitFor(() => expect(screen.getAllByLabelText('Unlock expense row to edit').length).toBeGreaterThan(1));

		// Prefer the last unlock control (mobile card twin of the same row)
		const unlocks = screen.getAllByLabelText('Unlock expense row to edit');
		await act(async () => {
			fireEvent.click(unlocks[unlocks.length - 1]);
		});
		await waitFor(() => expect(screen.getAllByLabelText('Save expense row').length).toBeGreaterThan(0));

		await act(async () => {
			fireEvent.mouseDown(screen.getAllByRole('combobox').find((el) => /campership/i.test(el.textContent || '')) || screen.getAllByRole('combobox')[0]);
		});
		await waitFor(() => expect(screen.getByRole('option', { name: 'other' })).toBeInTheDocument());
		await act(async () => {
			fireEvent.click(screen.getByRole('option', { name: 'other' }));
		});

		await act(async () => {
			const programInputs = screen.getAllByDisplayValue('Camp');
			fireEvent.change(programInputs[programInputs.length - 1], { target: { value: 'Mobile Camp' } });
			const amountInputs = screen.getAllByDisplayValue('100');
			// Cover both request and disbursement draft setters (incl. empty → 0 coerce).
			fireEvent.change(amountInputs[0], { target: { value: '' } });
			fireEvent.change(amountInputs[0], { target: { value: '160' } });
			if (amountInputs[1]) {
				fireEvent.change(amountInputs[1], { target: { value: '175' } });
			} else {
				fireEvent.change(amountInputs[0], { target: { value: '175' } });
			}
		});

		await act(async () => {
			const saves = screen.getAllByLabelText('Save expense row');
			fireEvent.click(saves[saves.length - 1]);
		});
		await waitFor(() => {
			expect(firebaseConfig.saveYearlyFinancesDoc).toHaveBeenCalled();
			const savedPayload = firebaseConfig.saveYearlyFinancesDoc.mock.calls.at(-1)[1];
			expect(savedPayload.programExpenseItems[0].category).toBe('other');
			expect(savedPayload.programExpenseItems[0].program).toBe('Mobile Camp');
		});
	});

	describe('Mobile card Requested/Disbursed fields and program totals', () => {
		it('edits Requested and Disbursed TextFields from the last (mobile) unlock control', async () => {
			await act(async () => {
				renderPage();
			});
			await waitFor(() => expect(screen.getAllByLabelText('Unlock expense row to edit').length).toBeGreaterThan(1));

			const unlocks = screen.getAllByLabelText('Unlock expense row to edit');
			await act(async () => {
				fireEvent.click(unlocks[unlocks.length - 1]);
			});
			await waitFor(() => expect(screen.getAllByLabelText('Save expense row').length).toBeGreaterThan(0));

			expect(screen.getAllByText('Requested').length).toBeGreaterThan(0);
			expect(screen.getAllByText('Disbursed').length).toBeGreaterThan(0);

			await act(async () => {
				const amountInputs = screen.getAllByDisplayValue('100');
				expect(amountInputs.length).toBeGreaterThanOrEqual(2);
				// Drive every Requested/Disbursed number field (desktop + mobile twins).
				for (const input of amountInputs) {
					fireEvent.change(input, { target: { value: '' } });
					fireEvent.change(input, { target: { value: '222' } });
				}
			});

			await act(async () => {
				const saves = screen.getAllByLabelText('Save expense row');
				fireEvent.click(saves[saves.length - 1]);
			});
			await waitFor(() => {
				expect(firebaseConfig.saveYearlyFinancesDoc).toHaveBeenCalled();
				const savedPayload = firebaseConfig.saveYearlyFinancesDoc.mock.calls.at(-1)[1];
				expect(savedPayload.programExpenseItems[0].request).toBe(222);
				expect(savedPayload.programExpenseItems[0].disbursement).toBe(222);
			});
		});

		it('cancels a mobile expense edit without saving', async () => {
			await act(async () => {
				renderPage();
			});
			await waitFor(() => expect(screen.getAllByLabelText('Unlock expense row to edit').length).toBeGreaterThan(1));
			const unlocks = screen.getAllByLabelText('Unlock expense row to edit');
			await act(async () => {
				fireEvent.click(unlocks[unlocks.length - 1]);
			});
			await waitFor(() => expect(screen.getAllByLabelText('Cancel expense edit').length).toBeGreaterThan(0));

			await act(async () => {
				const amountInputs = screen.getAllByDisplayValue('100');
				fireEvent.change(amountInputs[amountInputs.length - 1], { target: { value: '999' } });
			});
			await act(async () => {
				const cancels = screen.getAllByLabelText('Cancel expense edit');
				fireEvent.click(cancels[cancels.length - 1]);
			});
			await waitFor(() => {
				expect(screen.queryAllByLabelText('Cancel expense edit').length).toBe(0);
			});
			expect(firebaseConfig.saveYearlyFinancesDoc).not.toHaveBeenCalled();
		});

		it('removes an expense from the mobile card remove control', async () => {
			await act(async () => {
				renderPage();
			});
			await waitFor(() => expect(screen.getAllByLabelText('Unlock expense row to edit').length).toBeGreaterThan(1));
			const unlocks = screen.getAllByLabelText('Unlock expense row to edit');
			await act(async () => {
				fireEvent.click(unlocks[unlocks.length - 1]);
			});
			await waitFor(() => expect(screen.getAllByLabelText('Remove expense').length).toBeGreaterThan(0));
			await act(async () => {
				const removes = screen.getAllByLabelText('Remove expense');
				fireEvent.click(removes[removes.length - 1]);
			});
			await waitFor(() => {
				expect(firebaseConfig.saveYearlyFinancesDoc).toHaveBeenCalled();
				const savedPayload = firebaseConfig.saveYearlyFinancesDoc.mock.calls.at(-1)[1];
				expect(savedPayload.programExpenseItems).toEqual([]);
			});
		});

		it('shows Requested/Disbursed program expense totals on the mobile summary card', async () => {
			await act(async () => {
				renderPage();
			});
			await waitFor(() => {
				expect(screen.getAllByText('Requested total').length).toBeGreaterThan(0);
				expect(screen.getAllByText('Disbursed total').length).toBeGreaterThan(0);
			});
		});

		it('adds a program expense via the mobile Add program expense button when unlocked', async () => {
			await act(async () => {
				renderPage();
			});
			await waitFor(() => expect(screen.getAllByText('Add program expense').length).toBeGreaterThan(0));
			const addButtons = screen.getAllByText('Add program expense');
			await act(async () => {
				fireEvent.click(addButtons[addButtons.length - 1]);
			});
			await waitFor(() => {
				expect(screen.getAllByLabelText('Save expense row').length).toBeGreaterThan(0);
			});
		});

		it('renders legacy renewable_scholarships and non_renewable_grants alert copy', async () => {
			firebaseConfig.getRealTimeYearlyFinances.mockImplementation((handler) => {
				handler([
					{
						id: '2026',
						cycleYear: 2026,
						programExpenseItems: [{ category: 'campership', program: 'Camp', request: 50, disbursement: 40 }],
						awardIDs: [],
						renewable_scholarships: [{ id: 'rs-1' }, { id: 'rs-2' }],
						non_renewable_grants: [{ id: 'ng-1' }],
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
				expect(screen.getByText(/2 renewable, 1 grants/i)).toBeInTheDocument();
				expect(screen.getByText(/historical embedded scholarship\/grant rows/i)).toBeInTheDocument();
			});
			expect(screen.getAllByText('Requested total').length).toBeGreaterThan(0);
		});

		it('hides program totals card when there are no program expense items', async () => {
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
			await waitFor(() => expect(screen.getByText('Add program expense')).toBeInTheDocument());
			expect(screen.queryByText('Requested total')).not.toBeInTheDocument();
		});
	});
});
