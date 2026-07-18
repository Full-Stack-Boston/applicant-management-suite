import React from 'react';
import type { GridRenderCellParams } from '@mui/x-data-grid';
import RowActionsMenu from '../../components/datatable/RowActionsMenu';
import {
	createActionColumn,
	ROW_ACTION_MENU_COLUMN_WIDTH,
	MEMBER_ACTION_KEYS,
	APPLICANT_ACTION_KEYS,
	APP_ACTION_KEYS,
	REQUEST_ACTION_KEYS,
	INTERVIEW_ACTION_KEYS,
	SCHEDULER_ACTION_KEYS,
	INBOX_ACTION_KEYS,
} from './tableConfig';

const createMenuActionColumn = (
	actionKeys: string[],
	getExtraProps?: (params: GridRenderCellParams) => Partial<Pick<React.ComponentProps<typeof RowActionsMenu>, 'permittedAliases'>>,
) => [
	createActionColumn(
		1,
		(params: GridRenderCellParams) => (
			<RowActionsMenu
				row={params.row as Record<string, unknown>}
				actionKeys={actionKeys}
				{...(getExtraProps?.(params) || {})}
			/>
		),
		{ width: ROW_ACTION_MENU_COLUMN_WIDTH },
	),
];

export const memberActions = createMenuActionColumn(MEMBER_ACTION_KEYS);
export const applicantActions = createMenuActionColumn(APPLICANT_ACTION_KEYS);
export const appActions = createMenuActionColumn(APP_ACTION_KEYS);
export const reqActions = createMenuActionColumn(REQUEST_ACTION_KEYS);
export const interviewActions = createMenuActionColumn(INTERVIEW_ACTION_KEYS);
export const schedulerActions = createMenuActionColumn(SCHEDULER_ACTION_KEYS);

export const getInboxActions = ({ permittedAliases }: { permittedAliases: string[] }) =>
	createMenuActionColumn(INBOX_ACTION_KEYS, () => ({ permittedAliases }));
