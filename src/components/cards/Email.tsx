/**
 * Email Reader Card
 * Full email content with profile-style header + embedded actions (PF parity).
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import {
	PersonOutlined as FromIcon,
	EmailOutlined as EmailIcon,
	CalendarMonthOutlined as DateIcon,
} from '@mui/icons-material';

import { useTheme } from '../../context/ThemeContext';
import { useConfig } from '../../context/ConfigContext';
import { useMailbox } from '../../context/MailboxContext';
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { useEmailActions } from '../../hooks/useEmailActions';

import { paths } from '../../config/navigation/paths';
import { collections } from '../../config/data/collections';
import { capitalize } from '../../config/Constants';
import { updateEmailReadStatus, deleteZohoEmail, fetchAttachmentContent } from '../../config/data/firebase';
import { assetCardShellSx, assetViewCardContentSx, singleAssetStackSx } from '../../config/ui/adminPageStyles';

import SingleAssetPage, { AssetCard } from '../layout/SingleAssetPage';
import AssetProfileSection from '../assets/AssetProfileSection';
import NotesSection from '../notes/NotesSection';
import EmailBody from '../messaging/EmailBody';
import EmailActions from '../messaging/EmailActions';

import type { EmailRecord } from './types';
import type { Member } from '../../types/domain';

interface MailboxContextValue {
	member?: (Member & { alias?: string }) | null;
	permittedAliases?: string[];
}

interface AttachmentContentResult {
	data: {
		contentType: string;
		content: string;
	};
}

const EmailCard = ({ email }: { email: EmailRecord }) => {
	const config = useConfig();
	const navigate = useNavigate();
	const { darkMode, boxShadow } = useTheme();
	const { showDialog } = useDialog();
	const { member, permittedAliases } = useMailbox() as MailboxContextValue;
	const { showAlert, handleError } = useAlert();
	const paperCardSx = assetCardShellSx(boxShadow ?? '');

	const { handleReply, handleReplyAll, handleForward } = useEmailActions({ navigate, permittedAliases, member });

	const [isDownloading, setIsDownloading] = useState<string | null>(null);
	const [showNotes, setShowNotes] = useState(false);

	if (!email) return null;

	const handleToggleRead = async () => {
		const newStatus = email.isRead ? 'unread' : 'read';
		try {
			const messagePayload = [{ id: email.id, tags: email.tags || [] }];
			await updateEmailReadStatus({ messages: messagePayload, status: newStatus });
			showAlert({ message: `Email marked as ${newStatus}`, type: 'success' });
		} catch (error) {
			handleError(error, 'toggle-read-status-card');
		}
	};

	const handleDelete = async () => {
		showDialog({
			id: 'confirmAction',
			messageOverride: `Are you sure you want to move the email "${email.subject || 'this email'}" to the trash?`,
			callback: async (value: unknown) => {
				if (value) {
					try {
						showAlert({ message: 'Moving email to trash...', type: 'info' });
						await deleteZohoEmail({ messageId: email.id });
						showAlert({ message: 'Email moved to trash.', type: 'success' });
						navigate(paths.inbox);
					} catch (error) {
						handleError(error, 'delete-email-card');
					}
				}
			},
		});
	};

	const handleDownload = async (attachment: { attachmentId: string; attachmentName?: string }) => {
		if (isDownloading === attachment.attachmentId) return;
		setIsDownloading(attachment.attachmentId);
		try {
			const result = (await fetchAttachmentContent({
				messageId: email.id,
				attachmentId: attachment.attachmentId,
				folderId: email.folderId,
			})) as AttachmentContentResult;
			const { contentType, content } = result.data;
			const link = document.createElement('a');
			link.href = `data:${contentType};base64,${content}`;
			link.download = attachment.attachmentName ?? 'attachment';
			document.body.appendChild(link);
			link.click();
			link.remove();
		} catch (error) {
			handleError(error, 'download-attachment-card');
		} finally {
			setIsDownloading(null);
		}
	};

	const getHeader = (key: string) => {
		const header = email.headerContent?.headerContent?.[key];
		return Array.isArray(header) && header.length > 0 ? header[0] : 'N/A';
	};

	const formatAddressList = (key: string) => {
		const header = email.headerContent?.headerContent?.[key];
		return Array.isArray(header) && header.length > 0 ? header.join(', ') : 'N/A';
	};

	const emailDetails = [
		{ label: 'From', value: getHeader('From'), icon: FromIcon },
		{ label: 'To', value: formatAddressList('To'), icon: EmailIcon },
		{ label: 'CC', value: formatAddressList('Cc'), icon: EmailIcon },
		{ label: 'Dated', value: new Date(getHeader('Date')).toLocaleString(), icon: DateIcon },
	].filter((row) => row.value && row.value !== 'N/A');

	return (
		<SingleAssetPage>
			<Box sx={singleAssetStackSx}>
				<AssetCard contentSx={assetViewCardContentSx}>
					<AssetProfileSection
						displayName={getHeader('Subject')}
						status={capitalize(email.folderName ?? '')}
						config={config}
						details={emailDetails}
						functionsTitle='Actions'
						functions={
							<EmailActions
								embedded
								email={email}
								onReply={() => handleReply(email)}
								onReplyAll={() => handleReplyAll(email)}
								onForward={() => handleForward(email)}
								onToggleRead={handleToggleRead}
								onDelete={handleDelete}
								onShowNotesToggle={() => setShowNotes(!showNotes)}
								onDownload={handleDownload}
								isDownloading={isDownloading as null | undefined}
								showNotes={showNotes}
							/>
						}
					/>
				</AssetCard>
			</Box>

			{showNotes && (
				<Box sx={singleAssetStackSx}>
					<AssetCard contentSx={assetViewCardContentSx}>
						<NotesSection targetId={email?.id} targetCollection={collections.mailCache} />
					</AssetCard>
				</Box>
			)}

			<EmailBody email={email as unknown as Parameters<typeof EmailBody>[0]['email']} darkMode={darkMode} cardStyles={paperCardSx as Record<string, unknown>} cardContentStyles={assetViewCardContentSx as Record<string, unknown>} />
		</SingleAssetPage>
	);
};

EmailCard.propTypes = {
	email: PropTypes.shape({
		id: PropTypes.string,
		isRead: PropTypes.bool,
		content: PropTypes.string,
		headerContent: PropTypes.object,
		folderId: PropTypes.string,
		folderName: PropTypes.string,
		attachments: PropTypes.array,
		inlineAttachments: PropTypes.array,
		tags: PropTypes.array,
		subject: PropTypes.string,
	}).isRequired,
};

export default EmailCard;
