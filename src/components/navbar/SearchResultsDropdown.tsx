/**
 * Search Results Dropdown
 * Displays global search results anchored to the Navbar search input.
 * Features:
 * - Uses MUI 'Popper' for robust positioning.
 * - Renders grouped results based on 'searchConfig'.
 * - visual loading state.
 */

import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Divider, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Popper, Grow } from '@mui/material';

// Config
import { searchConfig } from '../../config/admin';

type SearchResultItem = Record<string, unknown> & { id?: string };

export interface SearchResults {
	error?: string;
	[category: string]: unknown;
}

interface SearchResultsDropdownProps {
	results?: SearchResults | null;
	loading: boolean;
	anchorEl?: HTMLElement | null;
	onClose: () => void;
	searchTerm?: string;
}

const getCategoryItems = (results: SearchResults | null | undefined, key: string): SearchResultItem[] | undefined => {
	const items = results?.[key];
	return Array.isArray(items) ? (items as SearchResultItem[]) : undefined;
};

const SearchResultsDropdown = ({ results, loading, anchorEl, onClose, searchTerm }: SearchResultsDropdownProps) => {
	const navigate = useNavigate();

	const handleItemClick = (path: string | null) => {
		if (path) {
			navigate(path);
			onClose();
		}
	};

	const renderResultGroup = (items: SearchResultItem[] | undefined, type: string) => {
		const config = searchConfig[type];
		if (!config || !items || items.length === 0) return null;

		const { icon, title, getPath, getText } = config;

		return (
			<Box key={type}>
				<Typography variant='caption' sx={{ px: 2, pt: 1, display: 'block', fontWeight: 'bold' }} color='text.secondary'>
					{title} ({items.length})
				</Typography>
				<List dense>
					{items.map((item) => {
						const { primary, secondary } = getText(item, searchTerm ?? '');
						const path = getPath(item);
						return (
							<ListItem key={String(item.id)} disablePadding>
								<ListItemButton onClick={() => handleItemClick(path)} disabled={!path}>
									{icon && <ListItemIcon sx={{ minWidth: '32px' }}>{icon}</ListItemIcon>}
									<ListItemText primary={primary} secondary={secondary} />
								</ListItemButton>
							</ListItem>
						);
					})}
				</List>
				<Divider />
			</Box>
		);
	};

	const hasResults = results && !results.error && Object.keys(searchConfig).some((key) => (getCategoryItems(results, key)?.length ?? 0) > 0);
	const isOpen = Boolean(loading || results);

	return (
		<Popper
			open={isOpen}
			anchorEl={anchorEl}
			placement='bottom-start'
			transition
			style={{
				zIndex: 1200,
				width: anchorEl ? anchorEl.clientWidth : '300px', // Match width of search bar
			}}>
			{({ TransitionProps }) => (
				<Grow {...TransitionProps} style={{ transformOrigin: 'top center' }}>
					<Paper
						elevation={8}
						sx={{
							maxHeight: '400px',
							overflowY: 'auto',
							mt: 1, // Slight gap from the search bar
							borderRadius: '12px',
						}}
						// Prevent focus loss on input when clicking scrollbar/list
						onMouseDown={(e) => e.preventDefault()}>
						{loading && (
							<Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
								<CircularProgress size={24} />
							</Box>
						)}

						{!loading && results?.error && (
							<Typography sx={{ p: 2 }} color='error.main'>
								{results.error}
							</Typography>
						)}

						{!loading && !results?.error && !hasResults && (
							<Typography sx={{ p: 2 }} color='text.secondary'>
								No results found.
							</Typography>
						)}

						{!loading && hasResults && Object.keys(searchConfig).map((key) => renderResultGroup(getCategoryItems(results, key), key))}
					</Paper>
				</Grow>
			)}
		</Popper>
	);
};

export default SearchResultsDropdown;
