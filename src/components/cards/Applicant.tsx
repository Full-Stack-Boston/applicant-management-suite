/**
 * Applicant Card (Single View)
 * Displays the full profile of a specific Applicant.
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import {
	PersonOutlined as PersonIcon,
	SchoolOutlined as SchoolIcon,
	MenuBookOutlined as MajorIcon,
	BusinessOutlined as OrgIcon,
	EmailOutlined as EmailIcon,
	PhoneIphoneOutlined as CellIcon,
} from '@mui/icons-material';

import { useConfig } from '../../context/ConfigContext';
import { useAlert } from '../../context/AlertContext';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { collections } from '../../config/data/collections';
import { getApplicantActions } from '../../config/ui/buttonActions';
import { useAssetActionHandler } from '../../hooks/useAssetActionHandler';
import { assetViewCardContentSx, singleAssetStackSx } from '../../config/ui/adminPageStyles';

import SingleAssetPage, { AssetCard } from '../layout/SingleAssetPage';
import AssetProfileSection from '../assets/AssetProfileSection';
import AssetSectionHeader from '../assets/AssetSectionHeader';
import UserActivityFooter from '../assets/UserActivityFooter';
import NotesSection from '../notes/NotesSection';
import CollapsableTable from '../table/Table';

import type { AssetRecord } from '../assets/types';
import type { ApplicantRecord, DynamicAction } from './types';

export const Applicant = ({ applicant }: { applicant: ApplicantRecord }) => {
	const { showAlert, handleError } = useAlert();
	const config = useConfig();
	const [showNotes, setShowNotes] = useState(false);

	const handleAction = useAssetActionHandler('updateLoginEmail-applicant');
	const actions = useMemo(() => getApplicantActions(showAlert, handleError, showNotes, setShowNotes), [showAlert, handleError, showNotes]);

	const applicantDetails = useMemo(
		() => [
			{ label: 'Name', value: `${applicant?.firstName ?? ''} ${applicant?.lastName ?? ''}`.trim(), icon: PersonIcon },
			{ label: 'School', value: applicant?.school ? `${applicant.school} (${applicant?.gradYear ?? '—'})` : undefined, icon: SchoolIcon },
			{ label: 'Major', value: applicant?.major, icon: MajorIcon },
			{ label: 'Organization', value: applicant?.organization, icon: OrgIcon },
			{ label: 'Email', value: applicant?.email, icon: EmailIcon },
			{ label: 'Phone', value: applicant?.cell, icon: CellIcon },
		],
		[applicant],
	);

	return (
		<SingleAssetPage>
			<Box sx={singleAssetStackSx}>
				<AssetCard contentSx={assetViewCardContentSx}>
					<AssetProfileSection
						image={applicant?.picture?.home}
						displayName={applicant?.callMe || applicant?.firstName}
						config={config}
						details={applicantDetails}
						editPath={generatePath(paths.editApplicant, { id: applicant?.id })}
						actions={actions as DynamicAction[]}
						asset={applicant as AssetRecord}
						onAction={handleAction}
						footerMeta={<UserActivityFooter userId={applicant?.id} />}
					/>
				</AssetCard>
			</Box>

			{showNotes && (
				<Box sx={singleAssetStackSx}>
					<AssetCard contentSx={assetViewCardContentSx}>
						<NotesSection targetId={applicant.id ?? ''} targetCollection={collections.applicants} />
					</AssetCard>
				</Box>
			)}

			<Box sx={singleAssetStackSx}>
				<AssetCard contentSx={assetViewCardContentSx}>
					<AssetSectionHeader title='Applications' />
					{applicant?.applications && applicant.applications.length > 0 ? (
						<CollapsableTable data={applicant.applications} />
					) : (
						<Typography variant='body2' sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
							No application history to show...
						</Typography>
					)}
				</AssetCard>
			</Box>
		</SingleAssetPage>
	);
};

Applicant.propTypes = {
	applicant: PropTypes.object.isRequired,
};

export default Applicant;
