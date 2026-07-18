import { InputAdornment } from '@mui/material';
import {
	QuickFilter,
	QuickFilterClear,
	QuickFilterControl,
	useGridApiContext,
	useGridRootProps,
} from '@mui/x-data-grid';

const DatatableQuickFilter = () => {
	const apiRef = useGridApiContext();
	const rootProps = useGridRootProps();
	const BaseIconButton = rootProps.slots.baseIconButton;
	const SearchIcon = rootProps.slots.quickFilterIcon;
	const ClearIcon = rootProps.slots.quickFilterClearIcon;

	return (
		<QuickFilter expanded style={{ width: '100%', minWidth: 120, maxWidth: '100%' }}>
			<QuickFilterControl
				size='small'
				placeholder={apiRef.current.getLocaleText('toolbarQuickFilterPlaceholder')}
				aria-label={apiRef.current.getLocaleText('toolbarQuickFilterLabel')}
				style={{ width: '100%', minWidth: 0 }}
				slotProps={{
					input: {
						startAdornment: (
							<InputAdornment position='start'>
								<SearchIcon fontSize='small' />
							</InputAdornment>
						),
						endAdornment: (
							<InputAdornment position='end'>
								<QuickFilterClear
									render={
										<BaseIconButton
											size='small'
											edge='end'
											aria-label={apiRef.current.getLocaleText('toolbarQuickFilterDeleteIconLabel')}
										>
											<ClearIcon fontSize='small' />
										</BaseIconButton>
									}
								/>
							</InputAdornment>
						),
					},
				}}
			/>
		</QuickFilter>
	);
};

export default DatatableQuickFilter;
