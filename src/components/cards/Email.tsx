/**
 * Email Reader Card
 * Full email content with profile-style header + embedded actions (PF parity).
 */

import React, { useState, useEffect } from 'react';
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
import { updateEmailReadStatus, deleteZohoEmail, fetchAttachmentContent, fetchEmailContent } from '../../config/data/firebase';
import { assetViewCardContentSx, singleAssetStackSx } from '../../config/ui/adminPageStyles';

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

const EmailCard = ({ email: initialEmail }: { email: EmailRecord }) => {
	const config = useConfig();
	const navigate = useNavigate();
	const { darkMode } = useTheme();
	const { showDialog } = useDialog();
	const { member, permittedAliases } = useMailbox() as MailboxContextValue;
	const { showAlert, handleError } = useAlert();

	const { handleReply, handleReplyAll, handleForward } = useEmailActions({ navigate, permittedAliases, member });

	const [email, setEmail] = useState<EmailRecord>(initialEmail);
	const [isDownloading, setIsDownloading] = useState<string | null>(null);
	const [showNotes, setShowNotes] = useState(false);

	useEffect(() => {
		setEmail(initialEmail);
	}, [initialEmail]);

	useEffect(() => {
		const needsHydration = !email?.content || !email?.headerContent;
		if (!email?.id || !(email.folderId || email.folderName) || !needsHydration) return;

		let cancelled = false;
		(async () => {
			try {
				const result = await fetchEmailContent({
					messageId: email.id,
					folderId: email.folderId,
					folderName: email.folderName,
				});
				const data = result.data as Partial<EmailRecord> & {
					headerContent?: EmailRecord['headerContent'] | Record<string, string[]>;
				};
				if (cancelled || !data) return;

				const rawHeaders = data.headerContent;
				const normalizedHeaderContent =
					rawHeaders && typeof rawHeaders === 'object' && 'headerContent' in rawHeaders
						? (rawHeaders as EmailRecord['headerContent'])
						: rawHeaders
							? { headerContent: rawHeaders as Record<string, string[]> }
							: undefined;

				setEmail((prev) => ({
					...prev,
					content: data.content ?? prev.content,
					attachments: (data.attachments as EmailRecord['attachments']) ?? prev.attachments,
					inlineAttachments: (data.inlineAttachments as EmailRecord['inlineAttachments']) ?? prev.inlineAttachments,
					folderId: (data.folderId as string | undefined) || prev.folderId,
					headerContent: normalizedHeaderContent || prev.headerContent,
				}));
			} catch (error) {
				console.error('Failed to hydrate email details:', error);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [email?.id, email?.content, email?.headerContent, email?.folderId, email?.folderName]);

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
						stackDetails
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

			<Box sx={singleAssetStackSx}>
				<AssetCard contentSx={{ ...assetViewCardContentSx, p: { xs: 0, md: 0 }, px: 0, py: 0 }}>
					<EmailBody email={email as unknown as Parameters<typeof EmailBody>[0]['email']} darkMode={darkMode} cardStyles={{}} cardContentStyles={{}} />
				</AssetCard>
			</Box>
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
