/**
 * Member Detail Card
 * Administrative view for internal team members.
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import {
	PersonOutlined as PersonIcon,
	EmailOutlined as EmailIcon,
	BadgeOutlined as AliasIcon,
	PhoneIphoneOutlined as CellIcon,
	WorkOutlineOutlined as PositionIcon,
	EventOutlined as SinceIcon,
} from '@mui/icons-material';

import { useConfig } from '../../context/ConfigContext';
import { useAlert } from '../../context/AlertContext';
import { useAssetActionHandler } from '../../hooks/useAssetActionHandler';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { getMemberActions } from '../../config/ui/buttonActions';
import { memberFormConfig } from '../../config/ui/formConfig';
import { assetViewCardContentSx, singleAssetStackSx } from '../../config/ui/adminPageStyles';

import SingleAssetPage, { AssetCard } from '../layout/SingleAssetPage';
import AssetProfileSection from '../assets/AssetProfileSection';
import AssetSectionHeader from '../assets/AssetSectionHeader';
import UserActivityFooter from '../assets/UserActivityFooter';
import MyNotes from '../notes/MyNotes';
import PermissionGroup from '../forms/PermissionGroup';

import type { AssetRecord, DynamicAction } from '../assets/types';
import type { MemberRecord } from './types';

export const Member = ({ member }: { member: MemberRecord }) => {
	const { showAlert, handleError } = useAlert();
	const config = useConfig();
	const [showNotes, setShowNotes] = useState(false);
	const [showSignature, setShowSignature] = useState(false);

	const handleAction = useAssetActionHandler('updateLoginEmail');
	const actions = useMemo(() => getMemberActions(showAlert, handleError, showNotes, setShowNotes, showSignature, setShowSignature), [showAlert, handleError, showNotes, showSignature]);

	const memberDetails = useMemo(
		() => [
			{ label: 'Name', value: `${member?.firstName ?? ''} ${member?.lastName ?? ''}`.trim(), icon: PersonIcon },
			{ label: 'Email', value: member?.email, icon: EmailIcon },
			{ label: 'Alias', value: member?.alias, icon: AliasIcon },
			{ label: 'Phone', value: member?.cell, icon: CellIcon },
			{ label: 'Position', value: member?.position, icon: PositionIcon },
			{ label: 'Since', value: member?.since, icon: SinceIcon },
		],
		[member],
	);

	const permissionGroups = memberFormConfig.fields.find((field) => field.name === 'permissions')?.groups || {};

	return (
		<SingleAssetPage>
			<Box sx={singleAssetStackSx}>
				<AssetCard contentSx={assetViewCardContentSx}>
					<AssetProfileSection
						image={member?.picture?.home}
						displayName={member?.displayName || member?.firstName}
						config={config}
						details={memberDetails}
						editPath={generatePath(paths.editMember, { id: member?.id })}
						actions={actions as DynamicAction[]}
						asset={member as AssetRecord}
						onAction={handleAction}
						footerMeta={<UserActivityFooter userId={member?.id} />}
					/>
				</AssetCard>
			</Box>

			{showSignature && (
				<Box sx={singleAssetStackSx}>
					<AssetCard contentSx={assetViewCardContentSx}>
						<AssetSectionHeader title='Personal Signature' />
						<Box
							sx={{
								border: '2px solid',
								borderColor: 'primary.main',
								borderRadius: '4px',
								padding: '10px 15px',
								minHeight: '60px',
								bgcolor: 'background.paper',
								color: 'text.primary',
							}}>
							{member.personalSignature ? (
								<div dangerouslySetInnerHTML={{ __html: member.personalSignature }} />
							) : (
								<Typography variant='body2' sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
									No personal signature set.
								</Typography>
							)}
						</Box>
					</AssetCard>
				</Box>
			)}

			{showNotes && (
				<Box sx={singleAssetStackSx}>
					<AssetCard contentSx={assetViewCardContentSx}>
						<MyNotes id={member.id} />
					</AssetCard>
				</Box>
			)}

			<Box sx={singleAssetStackSx}>
				<AssetCard contentSx={assetViewCardContentSx}>
					<AssetSectionHeader title='Permissions' />
					<PermissionGroup formData={member} onUpdate={() => {}} groups={permissionGroups} disabled={true} />
				</AssetCard>
			</Box>
		</SingleAssetPage>
	);
};

Member.propTypes = {
	member: PropTypes.shape({
		id: PropTypes.string.isRequired,
		firstName: PropTypes.string,
		lastName: PropTypes.string,
		displayName: PropTypes.string,
		alias: PropTypes.string,
		email: PropTypes.string,
		cell: PropTypes.string,
		position: PropTypes.string,
		since: PropTypes.string,
		picture: PropTypes.object,
		personalSignature: PropTypes.string,
		permissions: PropTypes.object,
	}).isRequired,
};

export default Member;
