/**
 * Applicant Admin Form
 * Allows administrators to edit an Applicant's profile (photo, contact info, school)
 * and view their associated applications.
 */

import React, { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { Box, Divider, Typography } from '@mui/material';

// Config & Context
import { saveApplicantData, saveFile, getDownloadLinkForFile } from '../../../config/data/firebase';
import { UploadType } from '../../../config/data/collections';
import { applicantFormConfig } from '../../../config/ui/formConfig';
import { useAlert } from '../../../context/AlertContext';

// Components
import Loader from '../../loader/Loader';
import GenericAdminForm from '../GenericAdminForm';
import Application from '../../widget/Application';

import type { ApplicationRecord } from '../types';

interface ApplicantFormData {
	id: string;
	gradYear?: string | number;
	picture?: { displayName?: string; home?: string; refLoc?: string };
	applications?: Array<string | { id?: string }>;
	[key: string]: unknown;
}

export const ApplicantForm = ({ applicant }: { applicant?: Record<string, unknown> | null }) => {
	const [initialData, setInitialData] = useState<ApplicantFormData>({ id: uuid() });
	const [uploading, setUploading] = useState(false);
	const { showAlert, handleError } = useAlert();

	useEffect(() => {
		if (applicant) {
			setInitialData({
				...applicant,
				id: (applicant.id as string) || uuid(),
			});
		}
	}, [applicant]);

	const handleFileUpload = async (action: string, fieldPath: string, fileIn: unknown) => {
		const file = fileIn as File | undefined;
		if (action !== 'upload' || !file) return;

		setUploading(true);
		try {
			const savedFile = await saveFile(UploadType.applicantAvatar, initialData.id, file.name, file);
			const returnedLink = await getDownloadLinkForFile(savedFile);

			if (returnedLink) {
				const newPictureData = { displayName: file.name, home: returnedLink, refLoc: savedFile };
				setInitialData((prev) => ({ ...prev, picture: newPictureData }));
				showAlert({ message: 'Picture updated!', type: 'success' });
			} else {
				throw new Error('Failed to get the download link.');
			}
		} catch (error) {
			handleError(error, 'applicant-picture-upload');
		} finally {
			setUploading(false);
		}
	};

	const handleSubmit = async (formData: ApplicationRecord) => {
		const updatedApplicant: ApplicantFormData = { ...initialData, ...formData, id: initialData.id };

		// Validate Graduation Year (Must be 4 digits)
		if (updatedApplicant.gradYear && !/^\d{4}$/.test(String(updatedApplicant.gradYear))) {
			showAlert({ message: 'Please enter a valid 4-digit graduation year.', type: 'error' });
			return;
		}

		// Ensure strictly numeric storage if valid
		if (updatedApplicant.gradYear) {
			updatedApplicant.gradYear = Number(updatedApplicant.gradYear);
		}

		try {
			await saveApplicantData(updatedApplicant.id, updatedApplicant);
			showAlert({ message: 'Applicant data saved successfully.', type: 'success' });
		} catch (error) {
			handleError(error, 'applicant-form-submit');
		}
	};

	if (uploading) return <Loader />;

	return (
        <>
            <GenericAdminForm formConfig={{ ...applicantFormConfig, name: 'applicant' }} initialData={initialData} onSubmit={handleSubmit} onFileUpload={handleFileUpload} />
            <Divider sx={{ my: 4 }} />
            <Typography variant='h5' component='h3' gutterBottom color='text.active'>
				Associated Applications
			</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
				{initialData.applications && initialData.applications.length > 0 ? (
					initialData.applications.map((app) => {
						// Handle both full objects or ID strings
						const appId = typeof app === 'string' ? app : (app.id ?? '');
						return <Application key={appId} id={appId} />;
					})
				) : (
					<Typography color='text.secondary' sx={{ fontStyle: 'italic' }}>
						No application history found.
					</Typography>
				)}
			</Box>
        </>
    );
};
