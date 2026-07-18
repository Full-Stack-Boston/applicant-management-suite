import React, { useMemo, useState } from 'react';
import { ArrowDropDown as ArrowDropDownIcon } from '@mui/icons-material';
import { Button, CircularProgress, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { resolveRowActionMeta, useRowActionInvoker } from '../../config/ui/tableConfig';

interface RowActionMeta {
	actionKey: string;
	label: string;
	IconComponent: React.ElementType;
	color?: string;
}

interface RowActionsMenuProps {
	row: Record<string, unknown>;
	actionKeys: string[];
	permittedAliases?: string[];
}

const RowActionsMenu = ({ row, actionKeys, permittedAliases }: RowActionsMenuProps) => {
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const [loadingKey, setLoadingKey] = useState<string | null>(null);
	const { runAction, handleError, member } = useRowActionInvoker({ permittedAliases });
	const open = Boolean(anchorEl);

	const items = useMemo(
		() =>
			actionKeys
				.map((actionKey) => {
					const meta = resolveRowActionMeta(actionKey, row as Record<string, unknown> & { id: string }, member);
					return meta ? { actionKey, ...meta } : null;
				})
				.filter(Boolean) as RowActionMeta[],
		[actionKeys, row, member],
	);

	const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		setAnchorEl(event.currentTarget);
	};

	const handleClose = (event?: React.MouseEvent) => {
		event?.stopPropagation?.();
		setAnchorEl(null);
	};

	const handleItemClick = async (event: React.MouseEvent, actionKey: string) => {
		event.stopPropagation();
		handleClose();
		setLoadingKey(actionKey);

		try {
			await runAction(actionKey, row as Record<string, unknown> & { id: string });
		} catch (error) {
			console.error(error);
			handleError(error, `action-${actionKey}`);
		} finally {
			setLoadingKey(null);
		}
	};

	if (items.length === 0) {
		return null;
	}

	return (
		<>
			<Button
				size='small'
				variant='outlined'
				endIcon={loadingKey ? <CircularProgress color='inherit' size={14} /> : <ArrowDropDownIcon />}
				onClick={handleOpen}
				disabled={Boolean(loadingKey)}
				sx={{ minWidth: 96, textTransform: 'none', px: 1.25 }}
			>
				Actions
			</Button>
			<Menu
				anchorEl={anchorEl}
				open={open}
				onClose={handleClose as () => void}
				onClick={(event: React.MouseEvent) => event.stopPropagation()}
				slotProps={{ paper: { sx: { minWidth: 180 } } }}
			>
				{items.map(({ actionKey, label, IconComponent, color }) => (
					<MenuItem key={actionKey} onClick={(event: React.MouseEvent<HTMLLIElement>) => handleItemClick(event, actionKey)} disabled={loadingKey === actionKey}>
						<ListItemIcon>
							<IconComponent fontSize='small' sx={{ color }} />
						</ListItemIcon>
						<ListItemText>{label}</ListItemText>
					</MenuItem>
				))}
			</Menu>
		</>
	);
};

export default RowActionsMenu;
