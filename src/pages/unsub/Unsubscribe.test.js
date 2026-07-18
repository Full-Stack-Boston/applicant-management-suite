import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Unsubscribe from './Unsubscribe';
import { validateLink } from '../../config/Constants';
import { updateApplicantData } from '../../config/data/firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { generatePath } from '../../config/navigation/routeUtils';

// --- Mocks ---

vi.mock('../../config/data/firebase', () => ({
	updateApplicantData: vi.fn(),
}));

vi.mock('../../config/Constants', () => ({
	validateLink: vi.fn(),
}));

vi.mock('../../config/navigation/routeUtils', () => ({
	generatePath: vi.fn(),
}));

vi.mock('../../config/navigation/paths', () => ({
	paths: { root: '/home' },
}));

vi.mock('react-router-dom', () => ({
	useNavigate: vi.fn(),
	useParams: vi.fn(),
}));

vi.mock('../../context/HelmetContext', () => ({
	useTitle: vi.fn(),
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: vi.fn(),
}));

vi.mock('../../components/loader/Loader', () => ({ default: () => <div data-testid='loader'>Loader Component</div> }));
vi.mock('../../components/home/homePageStyles', () => ({
	homeAuthSubmitButtonSx: () => ({}),
}));
vi.mock('../../components/home/PublicStatusPage', () => ({
	default: ({ title, subtitle, children }) => (
		<div data-testid='public-status-page'>
			<div>{title}</div>
			{subtitle ? <div>{subtitle}</div> : null}
			{children}
		</div>
	),
}));

describe('Unsubscribe Component', () => {
	const mockNavigate = vi.fn();
	const mockEncID = 'encrypted-id-123';

	beforeEach(() => {
		vi.clearAllMocks();

		useNavigate.mockReturnValue(mockNavigate);
		useParams.mockReturnValue({ encID: mockEncID });
		useTheme.mockReturnValue({ primaryColor: '#0288D1' });
		generatePath.mockReturnValue('/home');
	});

	test('renders Loader initially', async () => {
		validateLink.mockReturnValue(new Promise(() => {}));

		render(<Unsubscribe />);

		expect(screen.getByTestId('loader')).toBeInTheDocument();
	});

	test('handles successful unsubscribe', async () => {
		const mockId = 'user-123';

		validateLink.mockResolvedValue({ result: true, id: mockId });
		updateApplicantData.mockResolvedValue(true);

		render(<Unsubscribe />);

		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		expect(screen.getByTestId('public-status-page')).toBeInTheDocument();
		expect(screen.getByText('Unsubscribe Successful')).toBeInTheDocument();
		expect(screen.getByText(/successfully unsubscribed/i)).toBeInTheDocument();

		expect(validateLink).toHaveBeenCalledWith(mockEncID);
		expect(updateApplicantData).toHaveBeenCalledWith(mockId, { 'notifications.email': false });
	});

	test('handles invalid link error', async () => {
		const mockErrorMsg = 'Token expired';

		validateLink.mockResolvedValue({ result: false, error: mockErrorMsg });

		render(<Unsubscribe />);

		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		expect(screen.getByTestId('public-status-page')).toBeInTheDocument();
		expect(screen.getByText('Unsubscribe Error')).toBeInTheDocument();
		expect(screen.getByText(new RegExp(`Error: ${mockErrorMsg}`, 'i'))).toBeInTheDocument();

		expect(updateApplicantData).not.toHaveBeenCalled();
	});

	test('handles exception during validation/update process', async () => {
		const crashError = 'Network Error';

		validateLink.mockRejectedValue(new Error(crashError));

		render(<Unsubscribe />);

		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		expect(screen.getByTestId('public-status-page')).toBeInTheDocument();
		expect(screen.getByText('Unsubscribe Error')).toBeInTheDocument();
		expect(screen.getByText(crashError)).toBeInTheDocument();
	});

	test('navigates to homepage when button is clicked', async () => {
		validateLink.mockResolvedValue({ result: true, id: '123' });
		updateApplicantData.mockResolvedValue(true);

		render(<Unsubscribe />);

		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const homeButton = screen.getByRole('button', { name: /go to homepage/i });
		fireEvent.click(homeButton);

		expect(mockNavigate).toHaveBeenCalledWith('/home');
	});
});
