import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import GoogleAutoComplete, { buildManualPlace, hasGooglePlacesApiKey } from './GoogleAutoComplete';

const mockGetPlacePredictions = jest.fn();
const mockAutocompleteService = jest.fn(function MockAutocompleteService() {
	this.getPlacePredictions = mockGetPlacePredictions;
});

globalThis.google = {
	maps: {
		places: {
			AutocompleteService: mockAutocompleteService,
			PlacesServiceStatus: { OK: 'OK', REQUEST_DENIED: 'REQUEST_DENIED', OVER_QUERY_LIMIT: 'OVER_QUERY_LIMIT' },
		},
	},
};
global.window.google = globalThis.google;

const originalQuerySelector = document.querySelector.bind(document);
const originalEnvKey = process.env.REACT_APP_googleApiKey;

describe('GoogleAutoComplete helpers', () => {
	afterEach(() => {
		process.env.REACT_APP_googleApiKey = originalEnvKey;
	});

	it('buildManualPlace returns Places-shaped object', () => {
		expect(buildManualPlace('  10 Main St, Boston, MA  ')).toEqual({
			description: '10 Main St, Boston, MA',
			place_id: 'manual:10 Main St, Boston, MA',
			structured_formatting: {
				main_text: '10 Main St, Boston, MA',
				secondary_text: '',
			},
			matched_substrings: [],
			terms: [],
			types: ['manual_entry'],
		});
		expect(buildManualPlace('   ')).toBeNull();
	});

	it('hasGooglePlacesApiKey rejects placeholders', () => {
		process.env.REACT_APP_googleApiKey = 'NO_KEY_GIVEN';
		expect(hasGooglePlacesApiKey()).toBe(false);
		process.env.REACT_APP_googleApiKey = 'REPLACE_WITH_YOUR_KEY';
		expect(hasGooglePlacesApiKey()).toBe(false);
		process.env.REACT_APP_googleApiKey = 'real-looking-key';
		expect(hasGooglePlacesApiKey()).toBe(true);
	});
});

describe('GoogleAutoComplete', () => {
	const mockChangeLocation = jest.fn();
	const baseProps = {
		label: 'Location',
		location: null,
		changeLocation: mockChangeLocation,
		disabled: false,
	};

	beforeEach(() => {
		process.env.REACT_APP_googleApiKey = 'test-google-key';
		mockGetPlacePredictions.mockReset();
		mockChangeLocation.mockReset();

		global.window.google.maps.places.AutocompleteService = mockAutocompleteService;
		globalThis.google.maps.places.AutocompleteService = mockAutocompleteService;
		mockAutocompleteService.mockClear();
		document.getElementById('google-maps')?.remove();

		document.querySelector = jest.fn((selector) => {
			if (selector === '#google-maps') return document.createElement('div');
			if (selector === 'head') return document.head;
			return originalQuerySelector(selector);
		});
	});

	afterEach(() => {
		process.env.REACT_APP_googleApiKey = originalEnvKey;
		document.querySelector = originalQuerySelector;
		document.getElementById('google-maps')?.remove();
		delete globalThis.gm_authFailure;
	});

	test('fetches predictions when user types', async () => {
		const mockPredictions = [{ description: '123 Main St, Anytown, USA' }];

		mockGetPlacePredictions.mockImplementation((request, callback) => {
			if (request.input === '123') {
				callback(mockPredictions, 'OK');
			} else {
				callback([], 'OK');
			}
		});

		render(<GoogleAutoComplete {...baseProps} />);

		await waitFor(() => {
			expect(global.window.google.maps.places.AutocompleteService).toHaveBeenCalled();
		});

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: '123' } });

		await waitFor(() => {
			expect(mockGetPlacePredictions).toHaveBeenCalledWith({ input: '123' }, expect.any(Function));
		});

		const option = await screen.findByText('123 Main St, Anytown, USA');
		expect(option).toBeInTheDocument();
	});

	test('calls changeLocation when an option is selected', async () => {
		const selectedPrediction = { description: '123 Main St, Anytown, USA' };

		mockGetPlacePredictions.mockImplementation((request, callback) => {
			if (request.input === '123') {
				callback([selectedPrediction], 'OK');
			} else {
				callback([], 'OK');
			}
		});

		render(<GoogleAutoComplete {...baseProps} />);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: '123' } });

		const option = await screen.findByRole('option', {
			name: '123 Main St, Anytown, USA',
		});

		fireEvent.click(option);

		await waitFor(() => {
			expect(mockChangeLocation).toHaveBeenCalledWith(selectedPrediction);
		});
	});

	test('displays existing location value if provided', () => {
		const existingLocation = { description: 'Saved Address' };
		render(<GoogleAutoComplete {...baseProps} location={existingLocation} />);
		expect(screen.getByRole('combobox')).toHaveValue('Saved Address');
	});

	test('falls back to manual entry when no API key is configured', async () => {
		process.env.REACT_APP_googleApiKey = 'NO_KEY_GIVEN';
		render(<GoogleAutoComplete {...baseProps} />);

		expect(screen.getByText(/Google Places is not configured/i)).toBeInTheDocument();

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: '42 Demo Lane, Boston, MA' } });
		fireEvent.blur(input);

		await waitFor(() => {
			expect(mockChangeLocation).toHaveBeenCalledWith(
				expect.objectContaining({
					description: '42 Demo Lane, Boston, MA',
					types: ['manual_entry'],
				})
			);
		});
	});

	test('commits manual address on Enter', async () => {
		process.env.REACT_APP_googleApiKey = '';
		render(<GoogleAutoComplete {...baseProps} />);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: '9 Open Source Rd' } });
		fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

		await waitFor(() => {
			expect(mockChangeLocation).toHaveBeenCalledWith(
				expect.objectContaining({ description: '9 Open Source Rd' })
			);
		});
	});

	test('clears location when selection is cleared', async () => {
		const existing = { description: 'Saved Address' };
		render(<GoogleAutoComplete {...baseProps} location={existing} />);
		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: '' } });
		// Autocomplete clear via onChange(null)
		fireEvent.keyDown(input, { key: 'Escape' });
		// Simulate freeSolo clear by selecting null through blur empty
		fireEvent.change(input, { target: { value: '   ' } });
		fireEvent.blur(input);
		await waitFor(() => {
			expect(mockChangeLocation).toHaveBeenCalledWith(null);
		});
	});

	test('drops to manual entry on REQUEST_DENIED', async () => {
		mockGetPlacePredictions.mockImplementation((request, callback) => {
			callback([], 'REQUEST_DENIED');
		});

		render(<GoogleAutoComplete {...baseProps} />);
		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'denied' } });

		await waitFor(() => {
			expect(screen.getByText(/Google Places is not configured/i)).toBeInTheDocument();
		});
	});

	test('handles freeSolo string selection via onChange', async () => {
		process.env.REACT_APP_googleApiKey = '';
		render(<GoogleAutoComplete {...baseProps} />);
		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'typed string address' } });
		fireEvent.keyDown(input, { key: 'Enter' });
		await waitFor(() => {
			expect(mockChangeLocation).toHaveBeenCalledWith(
				expect.objectContaining({ description: 'typed string address' })
			);
		});
	});

	test('drops to manual entry on OVER_QUERY_LIMIT', async () => {
		mockGetPlacePredictions.mockImplementation((request, callback) => {
			callback([], 'OVER_QUERY_LIMIT');
		});

		render(<GoogleAutoComplete {...baseProps} />);
		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'quota' } });

		await waitFor(() => {
			expect(screen.getByText(/Google Places is not configured/i)).toBeInTheDocument();
		});
	});

	test('handles gm_authFailure by switching to manual entry', async () => {
		render(<GoogleAutoComplete {...baseProps} />);
		await waitFor(() => {
			expect(typeof globalThis.gm_authFailure).toBe('function');
		});
		act(() => {
			globalThis.gm_authFailure();
		});
		expect(await screen.findByText(/Google Places is not configured/i)).toBeInTheDocument();
	});

	test('loads the Google Maps script when the tag is missing', async () => {
		document.querySelector = jest.fn((selector) => {
			if (selector === '#google-maps') return null;
			if (selector === 'head') return document.head;
			return originalQuerySelector(selector);
		});
		const appendSpy = jest.spyOn(document.head, 'appendChild');

		render(<GoogleAutoComplete {...baseProps} />);

		await waitFor(() => {
			expect(appendSpy).toHaveBeenCalled();
		});
		const script = appendSpy.mock.calls.map((c) => c[0]).find((node) => node?.id === 'google-maps');
		expect(script).toBeTruthy();
		expect(script.src).toContain('maps.googleapis.com');
		act(() => {
			script.onload?.();
		});
		appendSpy.mockRestore();
	});

	test('marks Places unavailable when the Maps script fails to load', async () => {
		document.querySelector = jest.fn((selector) => {
			if (selector === '#google-maps') return null;
			if (selector === 'head') return document.head;
			return originalQuerySelector(selector);
		});
		const appendSpy = jest.spyOn(document.head, 'appendChild');

		render(<GoogleAutoComplete {...baseProps} />);
		await waitFor(() => {
			expect(appendSpy).toHaveBeenCalled();
		});
		const script = appendSpy.mock.calls.map((c) => c[0]).find((node) => node?.id === 'google-maps');
		act(() => {
			script.onerror?.();
		});
		expect(await screen.findByText(/Google Places is not configured/i)).toBeInTheDocument();
		appendSpy.mockRestore();
	});

	test('renders helperText and error props from the parent', () => {
		render(<GoogleAutoComplete {...baseProps} error helperText='Parent helper' disabled />);
		expect(screen.getByText('Parent helper')).toBeInTheDocument();
		expect(screen.getByRole('combobox')).toBeDisabled();
	});

});
