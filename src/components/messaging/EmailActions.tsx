/**
 * Email Actions Component
 * Reply / Forward / Delete / Attachments for an individual email.
 * embedded=true: inline wrap for AssetProfileSection (PF parity).
 */

import { useState, type MouseEvent } from 'react';
import { Box, Button, ButtonGroup, Menu, MenuItem, ListItemIcon as MuiListItemIcon, CircularProgress } from '@mui/material';
import { Reply, Forward, MarkEmailReadOutlined, MarkEmailUnreadOutlined, ArrowDropDown as ArrowDropDownIcon, Delete, Group as ReplyAllIcon, AttachFile as AttachFileIcon, Download as DownloadIcon } from '@mui/icons-material';

export interface EmailAttachment {
	attachmentId: string;
	attachmentName?: string;
	attachmentSize?: number;
}

interface ActionableEmail<TAttachment extends EmailAttachment = EmailAttachment> {
	isRead?: boolean;
	attachments?: TAttachment[];
}

interface EmailActionsProps<TEmail extends ActionableEmail<TAttachment>, TAttachment extends EmailAttachment> {
	email: TEmail;
	embedded?: boolean;
	onReply: (email: TEmail) => void;
	onReplyAll: (email: TEmail) => void;
	onForward: (email: TEmail) => void;
	onToggleRead: () => void;
	onDelete: () => void;
	onShowNotesToggle: () => void;
	onDownload: (attachment: TAttachment) => void;
	isDownloading?: string | null;
	showNotes: boolean;
}

const EmailActions = <TEmail extends ActionableEmail<TAttachment>, TAttachment extends EmailAttachment = EmailAttachment>({
	email,
	embedded = false,
	onReply,
	onReplyAll,
	onForward,
	onToggleRead,
	onDelete,
	onShowNotesToggle,
	onDownload,
	isDownloading = null,
	showNotes,
}: EmailActionsProps<TEmail, TAttachment>) => {
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const open = Boolean(anchorEl);
	const [attachmentAnchorEl, setAttachmentAnchorEl] = useState<HTMLElement | null>(null);
	const attachmentMenuOpen = Boolean(attachmentAnchorEl);

	const hasAttachments = !!email?.attachments?.length;

	const handleMenuToggle = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
	const handleMenuClose = () => setAnchorEl(null);
	const handleAttachmentMenuToggle = (event: MouseEvent<HTMLElement>) => setAttachmentAnchorEl(event.currentTarget);
	const handleAttachmentMenuClose = () => setAttachmentAnchorEl(null);

	const handleReplyClick = () => {
		onReply(email);
		handleMenuClose();
	};

	const handleReplyAllClick = () => {
		onReplyAll(email);
		handleMenuClose();
	};

	const handleAttachmentDownloadClick = (att: TAttachment) => {
		onDownload(att);
		handleAttachmentMenuClose();
	};

	const buttonSx = embedded ? { flex: { xs: '1 1 calc(50% - 6px)', sm: '0 1 auto' }, minWidth: { sm: 0 } } : { width: '100%' };

	const content = (
		<>
			<ButtonGroup variant='contained' aria-label='reply split button' sx={embedded ? { flex: { xs: '1 1 100%', sm: '0 1 auto' } } : { width: '100%' }}>
				<Button onClick={handleReplyClick} startIcon={<Reply />} sx={{ flexGrow: 1 }}>
					Reply
				</Button>
				<Button size='small' onClick={handleMenuToggle} sx={{ flexGrow: 0 }} aria-label='Reply options'>
					<ArrowDropDownIcon />
				</Button>
			</ButtonGroup>

			<Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} transformOrigin={{ vertical: 'top', horizontal: 'center' }}>
				<MenuItem onClick={handleReplyClick}>
					<MuiListItemIcon>
						<Reply fontSize='small' />
					</MuiListItemIcon>
					Reply
				</MenuItem>
				<MenuItem onClick={handleReplyAllClick}>
					<MuiListItemIcon>
						<ReplyAllIcon fontSize='small' />
					</MuiListItemIcon>
					Reply All
				</MenuItem>
			</Menu>

			<Button onClick={() => onForward(email)} startIcon={<Forward />} variant='outlined' sx={buttonSx}>
				Forward
			</Button>

			<Button onClick={onToggleRead} startIcon={email.isRead ? <MarkEmailUnreadOutlined /> : <MarkEmailReadOutlined />} variant='outlined' sx={buttonSx}>
				Mark as {email.isRead ? 'Unread' : 'Read'}
			</Button>

			<Button onClick={onDelete} startIcon={<Delete />} color='error' variant='outlined' sx={buttonSx}>
				Delete
			</Button>

			<Button onClick={onShowNotesToggle} variant='outlined' sx={buttonSx}>
				{showNotes ? 'Hide' : 'Show'} Notes
			</Button>

			<Button variant='outlined' startIcon={<AttachFileIcon />} endIcon={hasAttachments ? <ArrowDropDownIcon /> : null} onClick={hasAttachments ? handleAttachmentMenuToggle : undefined} disabled={!hasAttachments} sx={buttonSx}>
				{hasAttachments ? `Attachments (${email.attachments?.length})` : 'No Attachments'}
			</Button>

			<Menu anchorEl={attachmentAnchorEl} open={attachmentMenuOpen} onClose={handleAttachmentMenuClose}>
				{hasAttachments &&
					email.attachments?.map((att) => (
						<MenuItem key={att.attachmentId} onClick={() => handleAttachmentDownloadClick(att)} disabled={isDownloading === att.attachmentId}>
							<MuiListItemIcon>{isDownloading === att.attachmentId ? <CircularProgress size={20} /> : <DownloadIcon fontSize='small' />}</MuiListItemIcon>
							{att.attachmentName} {att.attachmentSize ? `(${(att.attachmentSize / 1024).toFixed(1)} KB)` : ''}
						</MenuItem>
					))}
			</Menu>
		</>
	);

	if (embedded) {
		return <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>{content}</Box>;
	}

	return (
		<Box sx={{ flex: '0.5', display: 'flex', flexDirection: 'column', gap: '10px' }}>
			{content}
		</Box>
	);
};

export default EmailActions;
