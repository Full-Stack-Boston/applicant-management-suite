/**
 * Admin Layout
 * The main wrapper for all administrative pages.
 * Features:
 * - Collapsible Sidebar (controlled via context).
 * - Fixed Top Navbar.
 * - Scrollable Content Area with visual depth (inset shadow).
 * - Responsive transitions.
 */

import type { ReactNode } from 'react';
import { Box } from '@mui/material';

// Context
import { useSidebar, SidebarProvider } from '../../context/SidebarContext';
import { useTheme } from '../../context/ThemeContext';

// Components
import Sidebar from '../sidebar/Sidebar';
import { SIDEBAR_LAYOUT_TRANSITION } from '../sidebar/sidebarLayout';
import Navbar from '../navbar/Navbar';

// Sub-component to consume Context
const MainContent = ({ children }: { children: ReactNode }) => {
	const { collapsed } = useSidebar();
	const { boxShadow } = useTheme();

	// Sidebar dimensions matching the Sidebar component
	const sidebarWidth = collapsed ? 45 : 180;

	return (
		<Box
			sx={{
				marginLeft: `${sidebarWidth}px`,
				width: `calc(100% - ${sidebarWidth}px)`,
				maxWidth: `calc(100vw - ${sidebarWidth}px)`,
				minWidth: 0,
				height: '100%',
				boxSizing: 'border-box',
				transition: SIDEBAR_LAYOUT_TRANSITION,
				display: 'flex',
				flexDirection: 'column',
				bgcolor: 'background.paper',
			}}>
			{/* Top Navigation Bar */}
			<Box
				sx={{
					height: '50px',
					bgcolor: 'background.paper',
					width: '100%',
					flexShrink: 0,
					zIndex: 1000,
				}}>
				<Navbar />
			</Box>

			{/* Main Scrollable Content Area */}
			<Box
				sx={{
					paddingY: { xs: 2, md: 1.5 },
					paddingX: { xs: 1, md: 2 },
					overflowY: 'auto',
					overflowX: 'hidden',
					flexGrow: 1,
					minHeight: 0,
					minWidth: 0,
					width: '100%',
					boxSizing: 'border-box',
					bgcolor: 'background.canvas',
					borderTopLeftRadius: '12px',
					boxShadow: `inset ${boxShadow}`,
					display: 'flex',
					flexDirection: 'column',
				}}>
				{children}
			</Box>
		</Box>
	);
};

// Main Layout Wrapper
const AdminLayout = ({ children }: { children: ReactNode }) => {
	return (
		<SidebarProvider>
			<Box
				sx={{
					height: '100vh',
					width: '100%',
					maxWidth: '100vw',
					overflow: 'hidden',
					bgcolor: 'background.paper',
					position: 'relative',
				}}>
				<Sidebar />
				<MainContent>{children}</MainContent>
			</Box>
		</SidebarProvider>
	);
};

export default AdminLayout;
