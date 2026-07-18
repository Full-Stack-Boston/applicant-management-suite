/**
 * GENERIC EDIT PAGE WRAPPER
 * ---------------------------------------------------------------------------
 * This component acts as a "Shell" for all Admin Edit screens.
 *
 * * ARCHITECTURE (THE INJECTION PATTERN):
 * Instead of hardcoding forms, this page is dynamic.
 * 1. It receives a 'type' (e.g. 'member').
 * 2. It looks up the config in 'src/config/admin/index.js'.
 * 3. It fetches the data from Firestore.
 * 4. It "Injects" that data into the specific Form Component using React.cloneElement.
 *
 * * USAGE ROUTE:
 * <Route path="/admin/members/edit/:id" element={<Edit type="members" />} />
 */

import { useState, useEffect, cloneElement, type ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { DocumentData } from 'firebase/firestore';
import { Box, Typography, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Contexts & Config
import { useTheme } from '../../context/ThemeContext';
import { adminPageHeaderSx, adminPagePanelSx } from '../../config/ui/adminPageStyles';
import { useTitle } from '../../context/HelmetContext';
import { useAuth } from '../../context/AuthContext';
import { getCollectionData } from '../../config/data/firebase';
import { editableContent as editConfig } from '../../config/admin';

// Styles
import '../new/new.scss';

const Edit = ({ type }: { type: string }) => {
	// --- Hooks & State ---
	const { boxShadow } = useTheme();
	const navigate = useNavigate();
	const params = useParams();
	const { member: currentUser } = useAuth(); // The Admin user performing the edit

	const [data, setData] = useState<DocumentData>({}); // The document data being edited

	// --- Configuration Lookup ---
	const dataID = params.id;
	const currentConfig = editConfig[type]; // e.g. editConfig['members']

	// --- SEO ---
	useTitle({
		title: `Edit ${currentConfig?.formConfig?.title || type}`,
		appear: false, // Don't index admin pages
	});

	// --- Data Fetching ---
	useEffect(() => {
		const fetchData = async () => {
			if (currentConfig && dataID) {
				try {
					// Fetch the document based on the collection defined in config
					const result = await getCollectionData(dataID, currentConfig.collection, dataID);
					setData(result || {});
				} catch (error) {
					console.error('Failed to fetch data for edit:', error);
				}
			} else {
				setData({});
			}
		};
		fetchData();
	}, [dataID, type, currentConfig]);

	// --- Error Boundary ---
	if (!currentConfig) {
		return (
			<Typography sx={{ padding: '20px' }} color='error'>
				Error: Invalid edit type ('{type}') specified. Please check your route configuration.
			</Typography>
		);
	}

	// --- The Injection Pattern ---
	// We take the Form Component defined in config (e.g. <MemberForm />)
	// and clone it, injecting the fetched 'data' and the user's 'permissions' as props.
	const formWithProps = cloneElement(currentConfig.renderForm(data) as ReactElement<{ permissions?: unknown }>, {
		permissions: currentUser?.permissions,
	});

	return (
		<Box sx={{ display: 'flex', height: '100%', width: '100%', flexDirection: 'column' }}>
			{/* Header Section */}
			<Box sx={{ ...adminPageHeaderSx(boxShadow), m: '20px', width: 'auto' }}>
				<IconButton onClick={() => navigate(-1)} sx={{ mr: 1, color: 'secondary.main' }}>
					<ArrowBackIcon />
				</IconButton>
				<Typography component='span' sx={{ fontSize: '20px' }} color='secondary.main'>
					Edit {currentConfig.formConfig.title}
				</Typography>
			</Box>

			{/* Form Container */}
			<Box sx={{ ...adminPagePanelSx(boxShadow), m: '20px', p: '10px', width: 'auto' }}>
				<Box sx={{ flex: '1', margin: '0px 20px', padding: '20px 0px', color: 'text.primary' }}>
					{formWithProps}
				</Box>
			</Box>
		</Box>
	);
};

export default Edit;