import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

		document.querySelector = jest.fn((selector) => {
			if (selector === '#google-maps') return document.createElement('div');
			if (selector === 'head') return document.head;
			return originalQuerySelector(selector);
		});
	});

	afterEach(() => {
		process.env.REACT_APP_googleApiKey = originalEnvKey;
		document.querySelector = originalQuerySelector;
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
});
