import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, CircularProgress } from '@mui/material';
import type { PDFPreviewProps } from './types';

const PDFPreview = ({ displayName, pages }: PDFPreviewProps) => {
	const [loading, setLoading] = React.useState(!pages || pages.length === 0);

	React.useEffect(() => {
		return () => {
			if (pages && Array.isArray(pages)) {
				pages.forEach((url) => {
					if (url?.startsWith('blob:')) {
						URL.revokeObjectURL(url);
					}
				});
			}
		};
	}, [pages]);

	React.useEffect(() => {
		if (pages?.length > 0) {
			setLoading(false);
		}
	}, [pages]);

	if (loading) {
		return (
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					minHeight: '200px',
					pageBreakInside: 'avoid',
				}}>
				<CircularProgress size={30} />
				<Typography variant='body2' sx={{ mt: 2 }} color='text.secondary'>
					Loading {displayName}...
				</Typography>
			</Box>
		);
	}

	return (
		<Box sx={{ pageBreakBefore: 'always', mb: 4 }}>
			<Box
				sx={{
					pageBreakInside: 'avoid',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
				}}>
				<Typography variant='h6' sx={{ mb: 2, textAlign: 'center', fontWeight: 'bold' }}>
					{displayName}
				</Typography>

				{pages.map((src: string, idx: number) => (
					<Box
						key={src}
						component='img'
						src={src}
						alt={`${displayName} - Page ${idx + 1}`}
						sx={{
							width: '90%',
							maxWidth: '800px',
							height: 'auto',
							mb: 2,
							pageBreakInside: 'avoid',
							border: '1px solid',
							borderColor: 'divider',
							boxShadow: 1,
						}}
					/>
				))}
			</Box>
		</Box>
	);
};

PDFPreview.propTypes = {
	displayName: PropTypes.string.isRequired,
	pages: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default PDFPreview;
