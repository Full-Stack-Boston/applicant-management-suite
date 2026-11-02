import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Crumbs, { SettingsButton } from './Breadcrumbs';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../context/DialogContext';
import { useAuth } from '../../context/AuthContext';
import { logoutUser, saveApplicantData } from '../../config/data/firebase';

const mocks = vi.hoisted(() => ({
	navigate: vi.fn(),
	dispatch: vi.fn(),
	showDialog: vi.fn(),
}));

vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useNavigate: () => mocks.navigate,
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: vi.fn(),
}));

vi.mock('../../context/DialogContext', () => ({
	useDialog: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
	useAuth: vi.fn(),
}));

vi.mock('../../config/data/firebase', () => ({
	logoutUser: vi.fn(),
	saveApplicantData: vi.fn(),
}));

const applicant = {
	id: 'applicant-1',
	callMe: 'Ada',
	notifications: { email: true, sms: false },
};

describe('Breadcrumbs', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useTheme.mockReturnValue({ darkMode: false, dispatch: mocks.dispatch, primaryColor: 'blue' });
		useDialog.mockReturnValue({ showDialog: mocks.showDialog });
		useAuth.mockReturnValue({ applicant });
		saveApplicantData.mockResolvedValue(true);
	});

	it('opens the applicant notification preferences dialog and saves changes', async () => {
		render(<SettingsButton applicant={applicant} />);
		fireEvent.click(screen.getByRole('button'));

		expect(mocks.showDialog).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'notificationsUpdate',
				data: expect.objectContaining({ email: true, sms: false, nickname: 'Ada' }),
			}),
		);
		const callback = mocks.showDialog.mock.calls[0][0].callback;
		await callback(null);
		await callback({ email: false, sms: true, nickname: 'Lady Ada' });

		expect(saveApplicantData).toHaveBeenCalledWith(
			'applicant-1',
			expect.objectContaining({
				callMe: 'Lady Ada',
				notifications: { email: false, sms: true },
			}),
		);
		expect(mocks.navigate).toHaveBeenCalled();
	});

	it('does not open settings when the applicant has no id', () => {
		render(<SettingsButton applicant={{}} />);
		fireEvent.click(screen.getByRole('button'));
		expect(mocks.showDialog).not.toHaveBeenCalled();
		expect(() => render(<SettingsButton applicant={null} />)).not.toThrow();
	});

	it('navigates, toggles theme, and selects a color', () => {
		render(<Crumbs title='Review' logout />);

		fireEvent.click(screen.getByRole('button', { name: 'Home' }));
		fireEvent.click(screen.getByRole('button', { name: 'Applications' }));

		const buttons = screen.getAllByRole('button');
		fireEvent.click(buttons[3]);
		fireEvent.click(screen.getByRole('menuitem', { name: 'Forest Green' }));
		expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'SET_COLOR', payload: 'green' });

		fireEvent.click(screen.getAllByRole('button')[4]);
		expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'TOGGLE' });

		fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
		expect(logoutUser).toHaveBeenCalled();
		expect(mocks.navigate).toHaveBeenCalled();
	});

	it('renders the applications label when no title is supplied', () => {
		render(<Crumbs />);
		expect(screen.getByText('APPLICATIONS')).toBeInTheDocument();
	});

	it('closes the theme color menu via onClose', () => {
		render(<Crumbs title='Review' logout />);
		const buttons = screen.getAllByRole('button');
		fireEvent.click(buttons[3]);
		expect(screen.getByRole('menuitem', { name: 'Forest Green' })).toBeInTheDocument();
		fireEvent.keyDown(document.body, { key: 'Escape' });
		const backdrop = document.querySelector('.MuiBackdrop-root');
		if (backdrop) fireEvent.click(backdrop);
	});
});

