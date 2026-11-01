import React from 'react';
import { render, screen } from '@testing-library/react';
import {
	memberActions,
	applicantActions,
	appActions,
	reqActions,
	interviewActions,
	schedulerActions,
	getInboxActions,
} from './tableActionColumns';

vi.mock('../../components/datatable/RowActionsMenu', () => ({
	default: ({ actionKeys, permittedAliases }) => (
		<div data-testid='row-actions' data-keys={(actionKeys || []).join(',')} data-aliases={(permittedAliases || []).join(',')} />
	),
}));

vi.mock('./tableConfig', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		createActionColumn: (flex, renderCell, opts) => ({
			field: 'actions',
			flex,
			width: opts?.width,
			renderCell,
		}),
	};
});

describe('tableActionColumns', () => {
	it('exports action column definitions for each entity', () => {
		expect(memberActions).toHaveLength(1);
		expect(applicantActions).toHaveLength(1);
		expect(appActions).toHaveLength(1);
		expect(reqActions).toHaveLength(1);
		expect(interviewActions).toHaveLength(1);
		expect(schedulerActions).toHaveLength(1);
	});

	it('renders inbox actions with permittedAliases via getExtraProps', () => {
		const cols = getInboxActions({ permittedAliases: ['a1', 'a2'] });
		expect(cols).toHaveLength(1);
		render(cols[0].renderCell({ row: { id: 'r1' } }));
		expect(screen.getByTestId('row-actions')).toHaveAttribute('data-aliases', 'a1,a2');
	});
});
