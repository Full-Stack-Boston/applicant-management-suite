/**
 * GENERIC SINGLE ASSET VIEWER
 * Renders a read-only detail view for any data entity via viewAsset config.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box } from '@mui/material';
import type { DocumentData } from 'firebase/firestore';

import { getCollectionData } from '../../config/data/firebase';
import { useTitle } from '../../context/HelmetContext';
import { viewAsset as singleConfig } from '../../config/admin';
import { singleAssetPageSx } from '../../config/ui/adminPageStyles';

import NotFound from '../../components/layout/NotFound';
import Loader from '../../components/loader/Loader';

const Single = ({ type }: { type: string }) => {
	const [data, setData] = useState<DocumentData | null>(null);
	const [loading, setLoading] = useState(true);
	const { id: dataID } = useParams();

	const currentConfig = singleConfig[type];

	useTitle({
		title: currentConfig ? `View ${currentConfig.title}` : 'View',
		appear: false,
	});

	useEffect(() => {
		const controller = new AbortController();
		const signal = controller.signal;

		const fetchData = async () => {
			setLoading(true);

			if (currentConfig && dataID) {
				try {
					const fetchedData = await getCollectionData(dataID, currentConfig.collection, dataID);

					if (!signal.aborted) {
						setData(fetchedData ?? null);
						setLoading(false);
					}
				} catch (error) {
					console.error('Single View Fetch Error:', error);
					if (!signal.aborted) {
						setData(null);
						setLoading(false);
					}
				}
			} else if (!signal.aborted) {
				setData(null);
				setLoading(false);
			}
		};

		fetchData();

		return () => {
			controller.abort();
		};
	}, [dataID, type, currentConfig]);

	if (loading) {
		return <Loader />;
	}

	if (!currentConfig || !data) {
		return <NotFound />;
	}

	return (
		<Box className='single' sx={{ ...singleAssetPageSx, color: 'text.primary', mb: 5, pb: 5 }}>
			{currentConfig.renderComponent(data)}
		</Box>
	);
};

export default Single;
