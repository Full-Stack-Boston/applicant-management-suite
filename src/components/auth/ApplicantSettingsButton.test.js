import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ApplicantSettingsButton, { useApplicantSettingsDialog } from './ApplicantSettingsButton';

const mockShowDialog = jest.fn();
const mockNavigate = jest.fn();
const mockSaveApplicantData = jest.fn();
let mockAuthApplicant = { id: 'a1', notifications: { email: true, sms: false }, callMe: 'Sam' };

vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useNavigate: () => mockNavigate,
}));

vi.mock('../../context/DialogContext', () => ({
	useDialog: () => ({ showDialog: mockShowDialog }),
}));

vi.mock('../../context/AuthContext', () => ({
	useAuth: () => ({
		get applicant() {
			return mockAuthApplicant;
		},
	}),
}));

vi.mock('../../config/data/firebase', () => ({
	saveApplicantData: (...args) => mockSaveApplicantData(...args),
}));

vi.mock('../../config/navigation/routeUtils', () => ({
	generatePath: (path) => path,
}));

vi.mock('../../config/navigation/paths', () => ({
	paths: { apply: '/apply' },
}));

vi.mock('../../config/data/collections', () => ({
	UserType: { applicant: 'applicant' },
}));

describe('ApplicantSettingsButton', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAuthApplicant = { id: 'a1', notifications: { email: true, sms: false }, callMe: 'Sam' };
		mockSaveApplicantData.mockResolvedValue(true);
	});

	it('returns null without an applicant', () => {
		mockAuthApplicant = null;
		const { container } = render(<ApplicantSettingsButton applicant={null} />);
		expect(container).toBeEmptyDOMElement();
	});

	it('opens settings dialog on click', () => {
		render(<ApplicantSettingsButton />);
		fireEvent.click(screen.getByLabelText('Account settings'));
		expect(mockShowDialog).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'notificationsUpdate',
				data: expect.objectContaining({ email: true, sms: false, nickname: 'Sam' }),
			})
		);
	});

	it('saves applicant data from dialog callback', async () => {
		render(<ApplicantSettingsButton />);
		fireEvent.click(screen.getByLabelText('Account settings'));
		const { callback } = mockShowDialog.mock.calls[0][0];
		await callback({ email: false, sms: true, nickname: 'Alex' });
		expect(mockSaveApplicantData).toHaveBeenCalledWith(
			'a1',
			expect.objectContaining({
				notifications: { email: false, sms: true },
				callMe: 'Alex',
			})
		);
		expect(mockNavigate).toHaveBeenCalledWith('/apply');
	});
});

describe('useApplicantSettingsDialog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAuthApplicant = null;
	});

	it('no-ops when applicant has no id', () => {
		const Probe = () => {
			const open = useApplicantSettingsDialog({ id: '' });
			return (
				<button type='button' onClick={open}>
					open
				</button>
			);
		};
		render(<Probe />);
		fireEvent.click(screen.getByText('open'));
		expect(mockShowDialog).not.toHaveBeenCalled();
	});
});
