/**
 * Dynamic Action Group
 * Renders a list of action buttons based on a configuration array.
 * Handles navigation (`navTo`), direct execution (`onClick`), or parent `onAction`.
 * layout: 'stack' (default) | 'inline' (wraps in profile card like PF).
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Button, Box } from '@mui/material';

import { useTheme } from '../../context/ThemeContext';
import { generatePath } from '../../config/navigation/routeUtils';
import type { AssetRecord, DynamicAction } from '../assets/types';

interface DynamicActionGroupProps {
	actions: DynamicAction[];
	asset?: AssetRecord;
	onAction?: (action: DynamicAction, asset: AssetRecord) => void | Promise<void>;
	layout?: 'stack' | 'inline';
}

const DynamicActionGroup = ({ actions, asset, onAction, layout = 'stack' }: DynamicActionGroupProps) => {
	const navigate = useNavigate();
	const { darkMode } = useTheme();

	const handleActionClick = (action: DynamicAction) => {
		const resolvedAsset = (asset ?? {}) as AssetRecord;

		if (onAction) {
			onAction(action, resolvedAsset);
			return;
		}

		if (action.navTo) {
			const { path, params } = action.navTo(resolvedAsset);
			navigate(generatePath(path, params));
		} else if (action.onClick) {
			action.onClick(resolvedAsset);
		}
	};

	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: layout === 'inline' ? 'row' : 'column',
				flexWrap: 'wrap',
				gap: layout === 'inline' ? 0.75 : 1,
				mt: layout === 'inline' ? 0 : 2,
			}}>
			{actions.map((action) => {
				if (action.hide) return null;

				return (
					<Button
						key={action.label}
						variant={darkMode ? 'contained' : 'outlined'}
						size={layout === 'inline' ? 'small' : 'medium'}
						onClick={() => handleActionClick(action)}
						sx={layout === 'inline' ? { flex: { xs: '1 1 calc(50% - 6px)', sm: '0 1 auto' }, minWidth: { sm: 0 } } : undefined}>
						{action.label}
					</Button>
				);
			})}
		</Box>
	);
};

DynamicActionGroup.propTypes = {
	actions: PropTypes.arrayOf(
		PropTypes.shape({
			label: PropTypes.string.isRequired,
			hide: PropTypes.bool,
			navTo: PropTypes.func,
			onClick: PropTypes.func,
		})
	).isRequired,
	asset: PropTypes.object,
	onAction: PropTypes.func,
	layout: PropTypes.oneOf(['stack', 'inline']),
};

export default DynamicActionGroup;
