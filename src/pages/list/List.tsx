/**
 * UNIVERSAL LIST VIEW (Admin Tables)
 * ---------------------------------------------------------------------------
 * This component renders every list page in the Admin Dashboard.
 *
 * * ARCHITECTURE (THE POLYMORPHIC LIST):
 * 1. Config Driven: Behavior is defined in 'src/config/admin/lists.js'.
 * - Columns, Titles, and Actions are injected based on the 'type' prop.
 * 2. Hybrid Data Source:
 * - 'inbox': Fetches from 'useMailbox' (special handling for folders/tags).
 * - 'standard': Fetches from 'useRealTimeList' (Firestore collections).
 * 3. Responsive Design:
 * - Desktop: Renders a <Datatable /> (MUI DataGrid).
 * - Mobile: Renders a list of <MobileListCard /> components.
 */

import { useState, useEffect, useMemo, type ComponentProps, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, useMediaQuery, useTheme as useMuiTheme, Typography, Alert } from '@mui/material';
import type { DocumentData } from 'firebase/firestore';
import type { GridRenderCellParams } from '@mui/x-data-grid';

// Contexts & Hooks
import { useTitle } from '../../context/HelmetContext';
import { useAuth } from '../../context/AuthContext';
import { useMailbox } from '../../context/MailboxContext';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { useRealTimeList } from '../../hooks/useRealTimeList';

// Config & Data
import { adminLists as listConfig, mobileCardConfig } from '../../config/admin';
import { RecipientSubjectCell } from '../../config/ui/tableConfig';
import { getRoomDetails } from '../../config/data/firebase';
import { DEMO_EMAIL_BANNER, isDemoEmailMode } from '../../config/content/emailDelivery';

// Components
import Loader from '../../components/loader/Loader';
import Datatable from '../../components/datatable/Datatable';
import MobileListCard from '../../components/list/MobileListCard';
import MobileListEmptyState from '../../components/list/MobileListEmptyState';
import LegacyFinancesTable from '../../components/list/LegacyFinancesTable';
import { adminListMobileLayoutSx, adminListPageSx, adminPageHeaderSx, adminPageTitleSx, getAdminPageTitleColor } from '../../config/ui/adminPageStyles';

// --- Fallback Component ---
const DefaultCard = ({ item, type }: { item: DocumentData; type?: string }) => (
	<Box key={item.id} sx={{ p: 2, mb: 1, borderRadius: '12px', boxShadow: 3, bgcolor: 'background.paper' }}>
		<Typography variant='body1'>
			Card for {type}: {item.id}
		</Typography>
		<Typography variant='caption' color='text.secondary'>
			(Mobile Card configuration missing in admin/lists.js)
		</Typography>
	</Box>
);

// =============================================================================
//  MAIN COMPONENT
// =============================================================================

const List = ({ type }: { type: string }) => {
	// --- Hooks & Contexts ---
	const navigate = useNavigate();
	const { darkMode, boxShadow } = useTheme();
	const { member } = useAuth();
	const { handleError } = useAlert();
	const config = useConfig();

	const muiTheme = useMuiTheme();
	// Keep the desktop grid until md; toolbar stays nowrap/right-pinned and
	// only yields to mobile cards below this width.
	const isSmallScreen = useMediaQuery(muiTheme.breakpoints.down('md'));

	// --- 1. Identify List Type ---
	const isInbox = type === 'inbox';
	const isLegacyFinances = type === 'legacyFinances';
	const currentConfig = listConfig[type];
	const showDemoMailBanner = isInbox && isDemoEmailMode(config);

	// --- 2. Data Fetching (Hybrid Strategy) ---

	// A. Standard Lists (Members, Applications, etc.)
	// Only fetch if NOT inbox to save bandwidth
	const { data: firestoreData, loading: firestoreLoading, year } = useRealTimeList(type, !isInbox);

	// B. Inbox (Internal Email)
	const { emails, loading: inboxLoading, permittedFolders, permittedAliases, selectedFolderId, setSelectedFolderId, selectedAliasFilter, setSelectedAliasFilter } = useMailbox();

	// Select the active data source
	const loading = isInbox ? inboxLoading : firestoreLoading;
	const rawData = isInbox ? emails : firestoreData;

	// --- 3. Computed State ---

	// State for specific features (like Deliberation Room check for Interviews)
	const [deliberationRoomExists, setDeliberationRoomExists] = useState(false);

	// Apply Filter Logic (Inbox Only)
	const data = useMemo(() => {
		if (isInbox) {
			if (selectedAliasFilter === 'all' || !selectedAliasFilter) {
				return rawData;
			}
			return rawData.filter((email) => {
				const tags = (email as { tags?: string[] }).tags;
				return tags?.some((tag) => tag.toLowerCase() === selectedAliasFilter.toLowerCase());
			});
		}
		return rawData;
	}, [isInbox, rawData, selectedAliasFilter]);

	// Construct Page Title (Dynamic based on Year if needed)
	const pageTitle = useMemo(() => {
		if (!currentConfig) return '';
		return typeof currentConfig.title === 'function' ? currentConfig.title(Number(year)) : currentConfig.title;
	}, [currentConfig, year]);

	useTitle({ title: pageTitle, appear: false });

	// --- 4. Column Configuration ---
	const columns = useMemo(() => {
		if (!currentConfig) return [];

		// Special Handling for "Sent" folder in Inbox
		if (isInbox && selectedFolderId === 'sent') {
			return currentConfig.columns.map((col) => {
				if (col.field === 'senderSubject') {
					return {
						...col,
						headerName: 'Recipient / Subject',
						valueGetter: (_value: unknown, row: DocumentData) => `${row.to || ''} ${row.subject || ''}`,
						renderCell: (params: GridRenderCellParams) => <RecipientSubjectCell {...params} />,
					};
				} else if (col.field === 'tags') {
					return { ...col, headerName: 'Sent By' };
				}
				return col;
			});
		}
		return currentConfig.columns;
	}, [isInbox, selectedFolderId, currentConfig]);

	// --- 5. Action Injection ---

	// Toolbar Actions (Top of Table: "Create New", "Export")
	const toolbarActions = useMemo(() => {
		if (typeof currentConfig?.getToolbarActions === 'function') {
			const helpers = { navigate, deliberationRoomExists, member: member ?? undefined, permittedAliases };
			return currentConfig.getToolbarActions(helpers);
		}
		return [];
	}, [currentConfig, navigate, deliberationRoomExists, member, permittedAliases]);

	// Row Actions (Right side of row: "Edit", "Delete")
	const actions = useMemo(() => {
		if (!currentConfig) return [];
		if (typeof currentConfig?.getActions === 'function') {
			// Config action factories may also read navigate/member at runtime.
			const actionHelpers = { navigate, permittedAliases, member };
			return currentConfig.getActions(actionHelpers);
		}
		return currentConfig.actions || [];
	}, [currentConfig, navigate, member, permittedAliases]);

	// --- Effect: Feature Detection ---
	useEffect(() => {
		const controller = new AbortController();
		const signal = controller.signal;

		if (type === 'interviews') {
			const checkRoom = async () => {
				try {
					const result = await getRoomDetails({ roomName: 'deliberation-room' });
					if (!signal.aborted) {
						setDeliberationRoomExists(Boolean((result.data as { success?: boolean } | undefined)?.success));
					}
				} catch (error) {
					if (!signal.aborted) {
						setDeliberationRoomExists(false);
						handleError(error, 'list-checkDelibRoomUE');
					}
				}
			};
			checkRoom();
		}
		return () => {
			controller.abort();
		};
	}, [type, handleError]);

	// --- Render Logic ---

	const renderDatatable = () => {
		return (
			<Datatable
				titleIn={pageTitle}
				rows={data}
				columns={columns}
				actions={actions}
				// tableConfig's ToolbarAction narrows row ids to string[]; the Datatable
				// invokes it with string document ids, so the shapes agree at runtime.
				toolbarActions={toolbarActions as unknown as ComponentProps<typeof Datatable>['toolbarActions']}
				loading={loading}
				// Inbox Specific Props
				permittedFolders={isInbox ? permittedFolders : undefined}
				selectedFolderId={isInbox ? selectedFolderId : undefined}
				onFolderChange={isInbox ? (e) => setSelectedFolderId(e.target.value) : undefined}
				permittedAliases={isInbox ? permittedAliases : undefined}
				selectedAliasFilter={isInbox ? selectedAliasFilter : undefined}
				onAliasFilterChange={isInbox ? (e) => setSelectedAliasFilter(e.target.value) : undefined}
			/>
		);
	};

	const renderLayout = () => {
		if (isSmallScreen) {
			return (
				<Box sx={adminListMobileLayoutSx}>
					<Box sx={{ ...adminPageHeaderSx(boxShadow), mb: 2 }}>
						<Typography color={getAdminPageTitleColor(darkMode)} sx={adminPageTitleSx}>
							{pageTitle}
						</Typography>
					</Box>
					{data.length === 0 ? (
						<MobileListEmptyState boxShadow={boxShadow} />
					) : (
						data.map((item) => {
							const config = mobileCardConfig[type];
							const CardContentComponent = (config?.content || DefaultCard) as ComponentType<{ item: DocumentData; type?: string }>;
							const customProps = config?.getProps ? config.getProps(item) : {};

							return (
								<MobileListCard
									key={String(item.id)}
									item={item}
									actionKeys={config?.actionKeys || []}
									primaryCount={config?.primaryCount}
									boxShadow={boxShadow}
									{...customProps}
									navigate={navigate}
									permittedAliases={permittedAliases}
									member={member ?? undefined}>
									<CardContentComponent item={item} type={type} />
								</MobileListCard>
							);
						})
					)}
				</Box>
			);
		}

		if (isLegacyFinances) {
			return <LegacyFinancesTable data={data as unknown as ComponentProps<typeof LegacyFinancesTable>['data']} titleIn={pageTitle} />;
		}

		return renderDatatable();
	};

	if (!currentConfig) return <Box sx={{ p: 3 }}>Error: Invalid list type specified ('{type}'). Check admin/lists.js</Box>;
	if (loading && data.length === 0) return <Loader />;

	return (
		<Box sx={adminListPageSx}>
			{showDemoMailBanner && (
				<Alert severity='info' sx={{ mb: 2 }}>
					{DEMO_EMAIL_BANNER}
				</Alert>
			)}
			{renderLayout()}
		</Box>
	);
};

export default List;