import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemberForm } from './Members';
import { useAuth } from '../../../context/AuthContext';
import { useAlert } from '../../../context/AlertContext';
import { saveCollectionData, registerUser, saveFile, getDownloadLinkForFile } from '../../../config/data/firebase';

vi.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
vi.mock('../../../context/AlertContext', () => ({ useAlert: jest.fn() }));
vi.mock('../../../config/data/firebase', () => ({
	saveCollectionData: jest.fn(),
	registerUser: jest.fn(),
	saveFile: jest.fn(),
	getDownloadLinkForFile: jest.fn(() => Promise.resolve('http://img.com')),
}));

vi.mock('../../loader/Loader', () => ({ default: () => <div>Loading...</div> }));

vi.mock('../GenericAdminForm', () => ({
	default: ({ onSubmit, onFileUpload, initialData }) => (
		<div>
			<span data-testid='picture-home'>{initialData?.picture?.home || ''}</span>
			<button onClick={() => onSubmit({ firstName: 'New', email: 'new@test.com' })}>Save</button>
			<button onClick={() => onFileUpload('upload', 'path', { name: 'pic.jpg' })}>Upload</button>
			<button onClick={() => onFileUpload('delete', 'path', { name: 'pic.jpg' })}>Ignore</button>
		</div>
	),
}));

describe('MemberForm Component', () => {
	const mockAlert = { showAlert: jest.fn(), handleError: jest.fn() };

	beforeEach(() => {
		jest.clearAllMocks();
		useAuth.mockReturnValue({ member: { permissions: { admin: true } } });
		useAlert.mockReturnValue(mockAlert);
	});

	test('renders generic form', () => {
		render(<MemberForm />);
		expect(screen.getByText('Save')).toBeInTheDocument();
	});

	test('creates new member (registerUser)', async () => {
		registerUser.mockResolvedValue({ user: { uid: 'newUid' } });

		render(<MemberForm />);
		fireEvent.click(screen.getByText('Save'));

		await waitFor(() => {
			expect(registerUser).toHaveBeenCalled();
			expect(saveCollectionData).toHaveBeenCalledWith(expect.anything(), 'newUid', expect.anything());
			expect(mockAlert.showAlert).toHaveBeenCalledWith({ message: 'New member registered successfully.', type: 'success' });
		});
	});

	test('updates existing member', async () => {
		render(<MemberForm member={{ id: 'existing1' }} />);
		fireEvent.click(screen.getByText('Save'));

		await waitFor(() => {
			expect(registerUser).not.toHaveBeenCalled();
			expect(saveCollectionData).toHaveBeenCalledWith(expect.anything(), 'existing1', expect.anything());
			expect(mockAlert.showAlert).toHaveBeenCalledWith({ message: 'Member updated successfully.', type: 'success' });
		});
	});

	test('handles file upload', async () => {
		render(<MemberForm />);
		fireEvent.click(screen.getByText('Upload'));

		expect(screen.getByText('Loading...')).toBeInTheDocument(); // Should show loader

		await waitFor(() => {
			expect(saveFile).toHaveBeenCalled();
		});
	});

	test('normalizes legacy string picture URLs', async () => {
		render(<MemberForm member={{ id: 'm1', picture: 'https://legacy/pic.jpg' }} />);
		await waitFor(() => {
			expect(screen.getByTestId('picture-home')).toHaveTextContent('https://legacy/pic.jpg');
		});
	});

	test('handles missing download link and submit failures', async () => {
		getDownloadLinkForFile.mockResolvedValueOnce(null);
		render(<MemberForm member={{ id: 'm1' }} />);
		fireEvent.click(screen.getByText('Ignore'));
		fireEvent.click(screen.getByText('Upload'));
		await waitFor(() => {
			expect(mockAlert.handleError).toHaveBeenCalledWith(expect.any(Error), 'member-upload-picture');
		});

		saveCollectionData.mockRejectedValueOnce(new Error('save fail'));
		fireEvent.click(screen.getByText('Save'));
		await waitFor(() => {
			expect(mockAlert.handleError).toHaveBeenCalledWith(expect.any(Error), 'member-form-submit');
		});
	});
});
