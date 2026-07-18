import React from 'react';
import { render, screen } from '@testing-library/react';
import {
	highlightMatch,
	sanitizeEmailString,
	findRelevantFamilyMember,
	findRelevantExperience,
} from './utils';

describe('admin/utils', () => {
	it('highlightMatch wraps matches in strong tags', () => {
		render(<div>{highlightMatch('Hello World', 'world')}</div>);
		expect(screen.getByText(/world/i).tagName).toBe('STRONG');
		expect(highlightMatch('', 'x')).toBe('');
		expect(highlightMatch('plain', '')).toBe('plain');
	});

	it('sanitizeEmailString strips brackets and quotes', () => {
		expect(sanitizeEmailString('')).toBe('');
		expect(sanitizeEmailString('A <B> "C"')).toBe('A  B   C');
	});

	it('findRelevantFamilyMember prefers term matches', () => {
		const family = [
			{ fullName: 'Ada Lovelace', occupation: 'Math' },
			{ fullName: 'Alan Turing', occupation: 'CS' },
		];
		expect(findRelevantFamilyMember(family, 'turing').fullName).toBe('Alan Turing');
		expect(findRelevantFamilyMember(family, null).fullName).toBe('Ada Lovelace');
		expect(findRelevantFamilyMember(null, 'x')).toBeNull();
	});

	it('findRelevantExperience prefers term matches', () => {
		const positions = [
			{ organization: 'Alpha', title: 'Intern' },
			{ organization: 'Beta Labs', title: 'Engineer' },
		];
		expect(findRelevantExperience(positions, 'beta').organization).toBe('Beta Labs');
		expect(findRelevantExperience(positions, '').organization).toBe('Alpha');
	});
});
