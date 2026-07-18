import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AccentColorPicker from './AccentColorPicker';

const mockDispatch = jest.fn();

vi.mock('../../context/ThemeContext', () => ({
	useTheme: () => ({ darkMode: false, primaryColor: 'blue', dispatch: mockDispatch }),
}));

describe('AccentColorPicker', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('opens menu and selects a color', async () => {
		render(<AccentColorPicker />);
		fireEvent.click(screen.getByLabelText(/Choose theme color/i));
		expect(await screen.findByText('Forest Green')).toBeInTheDocument();
		fireEvent.click(screen.getByText('Forest Green'));
		expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_COLOR', payload: 'green' });
	});

	it('supports custom renderTrigger', () => {
		render(
			<AccentColorPicker
				renderTrigger={({ onClick, icon }) => (
					<button type='button' onClick={onClick}>
						{icon} Custom
					</button>
				)}
			/>
		);
		expect(screen.getByText('Custom')).toBeInTheDocument();
	});
});
