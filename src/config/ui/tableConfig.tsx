/**
 * DATA TABLE CONFIGURATION & COMPONENTS
 * ---------------------------------------------------------------------------
 * This file defines the columns, actions, and custom cell renderers for the
 * application's Data Grids (Tables).
 *
 * * ARCHITECTURE:
 * 1. ActionFactory: 'ActionCellButton' renders buttons based on a config key.
 * 2. RowActions: Defines the behavior (onClick), icon, and color for every action.
 * 3. CustomCells: React components for rendering complex data (Avatars, Dates).
 * 4. TableConfig: Exports the column definitions used by the 'DynamicTable' component.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import he from 'he';
import { format } from 'date-fns';
import type { DocumentData } from 'firebase/firestore';
import type { GridColDef } from '@mui/x-data-grid';

// UI Components & Icons
import { Avatar, Box, Tooltip, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import { datatableAvatarCellSx, datatableAvatarSx } from './adminPageStyles';
import { FileUploadOutlined as UploadIcon, MailOutlined, Rsvp, Visibility, PublishedWithChangesOutlined, MeetingRoomOutlined, ChairOutlined, EventOutlined, DeleteOutlined, AddBoxOutlined, NoMeetingRoomOutlined, InfoOutlined, EditOutlined, DoneAllOutlined, ContactPageOutlined, Check, HourglassBottom, Close, CloseOutlined, SendOutlined, Add, Send, Delete, PersonOutlined, Reply, ReplyAll, Forward, MarkEmailReadOutlined, MarkEmailUnreadOutlined, AttachFile as AttachFileIcon, PeopleOutlined, MergeTypeOutlined } from '@mui/icons-material';

// Contexts & Hooks
import { useConfig } from '../../context/ConfigContext';
import { useDialog } from '../../context/DialogContext';
import type { ShowDialogParams } from '../../context/DialogContext';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import type { AlertContextValue } from '../../context/AlertContext';
import { useEmailActions } from '../../hooks/useEmailActions';
import type { Member } from '../../types/domain';
import type { SiteConfig, CollectionName } from '../../types/firebase';

// Config & Utils
import { generatePath } from '../navigation/routeUtils';
import { paths } from '../navigation/paths';
import { collections, InterviewStatus } from '../data/collections';
import { attachmentFields, generateUploadLink, generateSecurePin, generate6DigitNumber } from '../Constants';
import { formatRelativeTime } from './formatUtils';
import { sendRequest } from '../content/push';

// Backend / Firebase
import { getCollectionData, updateCollectionData, db, getDocumentsByIDs, getUserAuthRecord, subscribeUserLastSeen, updateEmailReadStatus, fetchEmailContent, deleteZohoEmail, bulkDeleteZohoEmails, deleteSingleInterview, createInterviewRoom, closeInterviewRoom, updateInterviewStatus, sendInterviewInvitations, bulkDeleteInterviews, deleteDeliberationRoom, createDeliberationRoom, bulkUpdateInterviewStatus } from '../data/firebase';
import { writeBatch, doc } from 'firebase/firestore';

// Components
import ContactDialog from '../../components/messaging/ContactDialog';
import MergeApplicantAccountsDialog from '../../components/dialogs/MergeApplicantAccountsDialog';
import RescheduleDialog from '../../components/interviews/RescheduleDialog';
import AutoScheduler from '../../components/interviews/AutoScheduler';
import ManualScheduler from '../../components/interviews/ManualScheduler';

// =============================================================================
//  Shared types
// =============================================================================

/** A row rendered in a data grid — Firestore document data plus its id. */
export interface RowData extends DocumentData {
	id: string;
}

/** Member shape available to row actions (may be an empty object pre-auth). */
type ActionMember = Partial<Member>;

interface ActionContext {
	row: RowData;
	navigate: ReturnType<typeof useNavigate>;
	showDialog: (params: ShowDialogParams) => void;
	showAlert: AlertContextValue['showAlert'];
	handleError: AlertContextValue['handleError'];
	member: ActionMember;
	config: SiteConfig;
	emailActions: ReturnType<typeof useEmailActions>;
	props: Record<string, unknown>;
}

type IconResolver = SvgIconComponent | ((row: RowData) => SvgIconComponent);

interface RowActionConfig {
	label?: string;
	getLabel?: (row: RowData) => string;
	icon: IconResolver;
	color?: string;
	getColor?: (row: RowData) => string;
	borderColor?: string;
	async?: boolean;
	hide?: (ctx: { row: RowData; member: ActionMember }) => boolean;
	onClick: (ctx: ActionContext) => void | Promise<void>;
}

export interface ToolbarContext {
	navigate: ReturnType<typeof useNavigate>;
	member?: ActionMember;
	permittedAliases?: string[];
	deliberationRoomExists?: boolean;
}

interface ToolbarHelpers {
	showDialog: (params: ShowDialogParams) => void;
	showAlert: AlertContextValue['showAlert'];
	handleError: AlertContextValue['handleError'];
	config: SiteConfig;
}

export interface ToolbarAction {
	id?: string;
	label: string;
	labelAlt?: string;
	icon?: SvgIconComponent;
	iconAlt?: SvgIconComponent;
	onClick: (selectionModel: string[], allRows: RowData[], helpers: ToolbarHelpers, dynamicProps?: Record<string, unknown>) => void | Promise<void>;
	variant?: 'contained' | 'outlined' | 'text';
	color?: string;
	requiresSelection?: boolean;
	disabled?: boolean;
	hide?: boolean;
}

export interface RowActionMeta {
	label: string;
	IconComponent: SvgIconComponent;
	color: string;
}

// --- Styles ---

// Keep stacked cells content-sized; the DataGrid cell flex-centers the block (PF parity).
// Style objects stay as plain literals so they can be spread into per-usage `sx` props.
const stackedCellSx = {
	display: 'flex',
	flexDirection: 'column',
	justifyContent: 'center',
	width: '100%',
	minWidth: 0,
};

const buttonContainerSX = {
	display: 'flex',
	flexDirection: 'column',
	gap: '3px',
	fontWeight: '400',
	fontSize: '9px',
	textAlign: 'center',
	justifyContent: 'center',
	alignContent: 'center',
	alignItems: 'center',
	alignSelf: 'center',
	cursor: 'pointer',
};

const mobileButtonContainerSX = {
	display: 'flex',
	flexDirection: 'column',
	alignItems: 'center',
	justifyContent: 'center',
	gap: '2px',
	cursor: 'pointer',
	borderRadius: '8px',
	py: 0.75,
	px: 0.5,
	transition: 'background-color 0.15s',
	'&:hover': { bgcolor: 'action.hover' },
	'&:active': { bgcolor: 'action.selected' },
};

const iconButtonSX = {
	padding: '2px 5px',
	borderRadius: '5px',
};

// --- Helper Functions ---

export const getAttachmentLabel = (key: string): string => {
	const match = attachmentFields.find((f) => f.key === key);
	let label = match ? match?.label : key;
	if (label?.endsWith('Letter of Recommendation')) {
		label = label?.replace('Letter of Recommendation', '');
	}
	return label;
};

export const getStatusIcon = (completed: boolean, invalid: boolean): ReactElement => {
	if (completed) return <Check sx={{ color: 'success.main' }} />;
	if (invalid) return <Close sx={{ color: 'error.main' }} />;
	return <HourglassBottom sx={{ color: 'warning.main' }} />;
};

export const parseDisplayName = (addressString: string | null | undefined): string => {
	if (!addressString) return 'Unknown';
	const decodedString = he.decode(addressString);
	const nameMatch = decodedString.match(/([^<]*)\s*</);
	if (nameMatch?.[1]) {
		const name = nameMatch[1].replace(/"/g, '').trim();
		if (name) return name;
	}
	return decodedString.replace(/[<>"]/g, '');
};

export const getRsvpLabel = (status: string): string => {
	if (status === 'yes') return '✅ Yes';
	if (status === 'no') return '❌ No';
	return '❓ Unknown';
};

export const extractPipeData = (text: string | null | undefined): { left: string; right: string } => {
	if (!text || typeof text !== 'string') {
		return { left: '', right: '' };
	}
	const parts = text.split('|');
	return {
		left: parts[0]?.trim() || '',
		right: parts[1]?.trim() || '',
	};
};


// =============================================================================
//  Action column helpers + shared invoker (PF parity)
// =============================================================================

export const ROW_ACTION_MENU_COLUMN_WIDTH = 128;
const ACTION_BUTTON_WIDTH = 54;
const ACTION_COLUMN_PADDING = 16;

const getActionColumnWidth = (buttonCount: number, buttonsPerRow = 3): number => {
	const colsInWidestRow = Math.min(buttonCount, buttonsPerRow);
	return colsInWidestRow * ACTION_BUTTON_WIDTH + ACTION_COLUMN_PADDING;
};

const createActionColumn = (buttonCount: number, renderCell: GridColDef['renderCell'], { buttonsPerRow = 3, width: widthOverride }: { buttonsPerRow?: number; width?: number } = {}): GridColDef => {
	const width = widthOverride ?? getActionColumnWidth(buttonCount, buttonsPerRow);
	return {
		field: 'action',
		headerName: 'Actions',
		width,
		minWidth: width,
		maxWidth: width,
		flex: 0,
		sortable: false,
		filterable: false,
		headerAlign: 'center',
		align: 'center',
		renderCell,
	};
};

export { createActionColumn, getActionColumnWidth };

export const MEMBER_ACTION_KEYS = ['viewMember', 'editMember', 'contact'];
export const APPLICANT_ACTION_KEYS = ['viewApplicant', 'editApplicant', 'contact'];
export const APP_ACTION_KEYS = ['viewApp', 'markEligible', 'contact'];
export const REQUEST_ACTION_KEYS = ['viewRequestApp', 'editRequest', 'resendRequest', 'invalidateRequest', 'contact'];
export const INTERVIEW_ACTION_KEYS = ['createRoom', 'joinInterview', 'closeRoom', 'waitInterview', 'updateRsvp', 'rescheduleInterview', 'deleteInterview', 'changeStatus'];
export const SCHEDULER_ACTION_KEYS = ['viewApplicantFromInterview', 'contactApplicantFromInterview', 'sendInvite', 'updateRsvp', 'deleteInterview'];
export const INBOX_ACTION_KEYS = ['viewEmail', 'replyEmail', 'replyAllEmail', 'forwardEmail', 'toggleRead', 'deleteEmail'];


// =============================================================================
//  1. THE ACTION FACTORY
// =============================================================================

/**
 * A "Smart Button" that renders based on a configuration key.
 * Used inside table cells to render Edit, View, Delete buttons dynamically.
 */
interface ActionCellButtonProps {
	actionKey: string;
	row: RowData;
	variant?: 'cell' | 'mobile';
	permittedAliases?: string[];
	[key: string]: unknown;
}

export const ActionCellButton = ({ actionKey, row, variant = 'cell', ...props }: ActionCellButtonProps): ReactElement | null => {
	const { runAction, handleError, member } = useRowActionInvoker(props);
	const [loading, setLoading] = useState(false);

	const config = ROW_ACTIONS[actionKey];

	if (!config) return null;

	if (config?.hide?.({ row, member })) {
		return null;
	}

	const handleClick = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (loading) return;

		if (config.async) setLoading(true);

		try {
			await runAction(actionKey, row);
		} catch (error) {
			console.error(error);
			if (config.async) handleError(error, `action-${actionKey}`);
		} finally {
			if (config.async) setLoading(false);
		}
	};

	const IconFromConfig = config.icon;
	const IconComponent = typeof IconFromConfig === 'function' && !(IconFromConfig as SvgIconComponent).muiName ? (IconFromConfig as (row: RowData) => SvgIconComponent)(row) : (IconFromConfig as SvgIconComponent);
	const resolvedLabel = typeof config.getLabel === 'function' ? config.getLabel(row) : config.label;
	const color = typeof config.getColor === 'function' ? config.getColor(row) : config.color;
	const borderColor = config.borderColor || color;

	if (variant === 'mobile') {
		return (
			<Box sx={{ ...mobileButtonContainerSX, opacity: loading ? 0.5 : 1 }} onClick={handleClick}>
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						width: 36,
						height: 36,
						borderRadius: '10px',
						bgcolor: 'action.hover',
					}}>
					<IconComponent sx={{ fontSize: 20, color }} />
				</Box>
				<Typography
					variant='caption'
					sx={{
						fontSize: '10px',
						fontWeight: 500,
						color: 'text.secondary',
						lineHeight: 1.2,
					}}>
					{loading ? '...' : resolvedLabel}
				</Typography>
			</Box>
		);
	}

	return (
		<Box sx={{ ...buttonContainerSX, opacity: loading ? 0.5 : 1 }} onClick={handleClick}>
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					width: 32,
					height: 32,
					borderRadius: '10px',
					bgcolor: 'action.hover',
					border: '1px solid',
					borderColor: borderColor || 'divider',
				}}>
				<IconComponent sx={{ ...iconButtonSX, color, border: 'none', p: 0 }} />
			</Box>
			{loading ? (
				'...'
			) : (
				<Typography variant='subtitle2' sx={{ fontSize: '9.5px', color: 'text.secondary' }}>
					{resolvedLabel}
				</Typography>
			)}
		</Box>
	);
};

// =============================================================================
//  2. ACTION DEFINITIONS (Logic Mapping)
// =============================================================================

const ROW_ACTIONS: Record<string, RowActionConfig> = {
	// -- General --
	viewApp: {
		label: 'View',
		icon: InfoOutlined,
		color: 'info.light',
		onClick: ({ row, navigate }) => navigate(generatePath(paths.viewApp, { id: row.id })),
	},
	markEligible: {
		label: 'Evaluate',
		icon: DoneAllOutlined,
		color: 'success.light',
		onClick: ({ row, showDialog, showAlert }) => {
			showDialog({
				id: 'markEligibility',
				data: { app: row },
				callback: async (newStatus) => {
					if (newStatus) {
						await updateCollectionData(collections.applications, row.id, { status: newStatus });
						showAlert({ message: `Application marked as ${newStatus}.`, type: 'success' });
					}
				},
			});
		},
	},

	// -- Members/Applicants --
	viewMember: {
		label: 'View',
		icon: InfoOutlined,
		color: 'info.light',
		onClick: ({ row, navigate }) => navigate(generatePath(paths.viewMember, { id: row.id })),
	},
	viewApplicant: {
		label: 'View',
		icon: InfoOutlined,
		color: 'info.light',
		onClick: ({ row, navigate }) => navigate(generatePath(paths.viewApplicant, { id: row.id })),
	},
	editMember: {
		label: 'Edit',
		icon: EditOutlined,
		color: 'warning.dark',
		onClick: ({ row, navigate }) => navigate(generatePath(paths.editMember, { id: row.id })),
	},
	editApplicant: {
		label: 'Edit',
		icon: EditOutlined,
		color: 'warning.dark',
		onClick: ({ row, navigate }) => navigate(generatePath(paths.editApplicant, { id: row.id })),
	},
	contact: {
		label: 'Contact',
		icon: ContactPageOutlined,
		color: 'custom.brown',
		onClick: ({ row, showDialog }) => {
			const recipient = {
				id: row.id,
				name: row.attachmentType ? row.name : row.applicantName || `${row.firstName} ${row.lastName}`,
				email: row.email,
				cell: row.cell,
			};
			showDialog({
				id: 'contactDialog',
				data: { title: `Contacting: ${recipient.name}`, component: ContactDialog, recipients: [recipient], maxWidth: 'sm' },
			});
		},
	},

	// -- Requests --
	viewRequestApp: {
		label: 'View App',
		icon: InfoOutlined,
		color: 'info.light',
		onClick: ({ row, navigate }) => navigate(generatePath(paths.viewApp, { id: row.applicationID })),
	},
	editRequest: {
		label: 'Edit',
		icon: EditOutlined,
		color: 'warning.dark',
		onClick: ({ row, navigate }) => navigate(generatePath(paths.editRequest, { id: row.id })),
	},
	resendRequest: {
		label: 'Resend',
		icon: SendOutlined,
		color: 'success.dark',
		async: true,
		onClick: async ({ row, showAlert, config }) => {
			const newExpiry = config.APPLICATION_DEADLINE;
			const sixDigits = generate6DigitNumber();
			await updateCollectionData(collections.requests, row.id, { attempts: 0, expiryDate: newExpiry, pinCode: await generateSecurePin(sixDigits) });
			const uploadLink = await generateUploadLink(row.id);
			await sendRequest(row, uploadLink, sixDigits);
			showAlert({ message: 'Request resent successfully!', type: 'success' });
		},
	},
	invalidateRequest: {
		label: 'Cancel',
		icon: CloseOutlined,
		color: 'error.dark',
		async: true,
		onClick: async ({ row, showAlert }) => {
			await updateCollectionData(collections.requests, row.id, { expiryDate: new Date().toISOString() });
			if (row.attachmentsID && row.attachmentType && row.applicationID) {
				const application = await getCollectionData(row.applicationID, collections.applications, row.applicationID);
				if (application?.completedBy) {
					const attachmentsDoc = await getCollectionData(application.completedBy, collections.attachments, row.attachmentsID);
					if (attachmentsDoc?.[row.attachmentType]?.requestID === row.id) {
						delete attachmentsDoc[row.attachmentType].requestID;
						await updateCollectionData(collections.attachments, row.attachmentsID, attachmentsDoc);
					}
				}
			}
			showAlert({ message: 'Request invalidated and unlinked!', type: 'success' });
		},
	},

	// -- Interviews --
	joinInterview: {
		label: 'Enter',
		icon: MeetingRoomOutlined,
		color: 'success.dark',
		hide: ({ row, member }) => !row.roomId || !member?.permissions?.interviews?.canAccess,
		onClick: ({ row, navigate }) => navigate(generatePath(paths.interviewRoom, { interviewId: row.id })),
	},
	waitInterview: {
		label: 'Wait',
		icon: ChairOutlined,
		color: 'info.light',
		hide: ({ row, member }) => ![InterviewStatus.invited, InterviewStatus.confirmed].includes(row.status) || !member?.permissions?.interviews?.canAccess,
		onClick: ({ row, navigate }) => navigate(generatePath(paths.waitingRoom, { interviewId: row.id })),
	},
	rescheduleInterview: {
		label: 'Reschedule',
		icon: EventOutlined,
		color: 'warning.dark',
		hide: ({ member }) => !member?.permissions?.interviews?.canSchedule,
		onClick: ({ row, showDialog }) => showDialog({ id: 'rescheduleInterview', data: { component: RescheduleDialog, interview: row } }),
	},
	deleteInterview: {
		label: 'Delete',
		icon: DeleteOutlined,
		color: 'error.dark',
		hide: ({ member }) => !member?.permissions?.interviews?.canSchedule,
		onClick: ({ row, showDialog, showAlert, handleError }) => {
			showDialog({
				id: 'confirmAction',
				messageOverride: 'Are you sure you want to delete this interview? This action cannot be undone.',
				callback: async (confirmed) => {
					if (confirmed) {
						try {
							await deleteSingleInterview({ interviewId: row.id });
							showAlert({ message: 'Interview deleted.', type: 'success' });
						} catch (error) {
							handleError(error, 'delete-interview-error');
						}
					}
				},
			});
		},
	},
	createRoom: {
		label: 'Open',
		icon: AddBoxOutlined,
		color: 'success.dark',
		async: true,
		hide: ({ row, member }) => row.roomId || !member?.permissions?.interviews?.canHost,
		onClick: async ({ row, showAlert }) => {
			await createInterviewRoom({ interviewId: row.id });
			showAlert({ message: 'Room created successfully!', type: 'success' });
		},
	},
	closeRoom: {
		label: 'Close',
		icon: NoMeetingRoomOutlined,
		color: 'error.dark',
		hide: ({ row, member }) => !row.roomId || !member?.permissions?.interviews?.canHost,
		onClick: async ({ row, showAlert }) => {
			await closeInterviewRoom({ interviewId: row.id });
			showAlert({ message: 'Interview room closed.', type: 'success' });
		},
	},
	changeStatus: {
		label: 'Status',
		icon: PublishedWithChangesOutlined,
		color: 'warning.dark',
		hide: ({ member }) => !member?.permissions?.interviews?.canHost,
		onClick: ({ row, showDialog, showAlert }) => {
			showDialog({
				id: 'changeInterviewStatus',
				data: { status: row.status },
				callback: async (formData) => {
					const newStatus = (formData as { status?: string } | null)?.status;
					if (newStatus) {
						await updateInterviewStatus({ interviewId: row.id, newStatus });
						showAlert({ message: 'Interview status updated!', type: 'success' });
					}
				},
			});
		},
	},
	sendInvite: {
		label: 'Invite',
		icon: MailOutlined,
		color: 'success.dark',
		hide: ({ row }) => row.status !== 'Scheduled',
		onClick: ({ row, showDialog, showAlert }) => {
			showDialog({
				id: 'adminActionConfirmation',
				messageOverride: `Are you sure you want to send an invitation for the interview with ${row.applicantName}?`,
				callback: async (confirmed) => {
					if (confirmed) {
						await sendInterviewInvitations({ interviewIds: [row.id] });
						showAlert({ message: 'Invitation queued successfully!', type: 'success' });
					}
				},
			});
		},
	},
	updateRsvp: {
		label: 'RSVP',
		icon: Rsvp,
		color: 'warning.dark',
		onClick: ({ row, showDialog, showAlert }) => {
			showDialog({
				id: 'updateRsvpStatus',
				data: { rsvpStatus: row.rsvpStatus },
				callback: async (formData) => {
					const rsvpStatus = (formData as { rsvpStatus?: string } | null)?.rsvpStatus;
					if (rsvpStatus) {
						await updateCollectionData(collections.interviews, row.id, { rsvpStatus });
						showAlert({ message: 'RSVP status updated!', type: 'success' });
					}
				},
			});
		},
	},
	viewApplicantFromInterview: {
		label: 'Applicant',
		icon: Visibility,
		color: 'info.light',
		hide: ({ row }) => !row.applicantId,
		onClick: ({ row, navigate }) => navigate(generatePath(paths.viewApplicant, { id: row.applicantId })),
	},
	contactApplicantFromInterview: {
		label: 'Contact',
		icon: ContactPageOutlined,
		color: 'custom.brown',
		hide: ({ row }) => !row.applicantId,
		onClick: async ({ row, showDialog }) => {
			const applicants = await getDocumentsByIDs(collections.applicants, [row.applicantId]);
			if (applicants.length > 0) {
				const app = applicants[0];
				const recipient = { id: app.id, name: `${app.firstName} ${app.lastName}`, email: app.email, cell: app.cell };
				showDialog({
					id: 'contactDialog',
					data: { title: `Contacting: ${recipient.name}`, component: ContactDialog, recipients: [recipient], maxWidth: 'sm' },
				});
			}
		},
	},

	// -- Email --
	viewEmail: {
		label: 'View',
		icon: Visibility,
		color: 'info.light',
		onClick: ({ row, navigate }) => navigate(generatePath(paths.viewEmail, { id: row.id })),
	},
	replyEmail: {
		label: 'Reply',
		icon: Reply,
		color: 'success.dark',
		async: true,
		onClick: async ({ row, emailActions }) => {
			const result = await fetchEmailContent({ messageId: row.id, folderId: row.folderId });
			emailActions.handleReply({ ...(result.data as Record<string, unknown>), id: row.id, isRead: row.isRead, folderId: row.folderId, tags: row.tags });
		},
	},
	replyAllEmail: {
		label: 'Reply All',
		icon: ReplyAll,
		color: 'success.light',
		async: true,
		onClick: async ({ row, emailActions }) => {
			const result = await fetchEmailContent({ messageId: row.id, folderId: row.folderId });
			emailActions.handleReplyAll({ ...(result.data as Record<string, unknown>), id: row.id, isRead: row.isRead, folderId: row.folderId, tags: row.tags });
		},
	},
	forwardEmail: {
		label: 'Forward',
		icon: Forward,
		color: 'custom.brown',
		async: true,
		onClick: async ({ row, emailActions }) => {
			const result = await fetchEmailContent({ messageId: row.id, folderId: row.folderId });
			emailActions.handleForward({ ...(result.data as Record<string, unknown>), id: row.id, isRead: row.isRead, folderId: row.folderId, tags: row.tags });
		},
	},
	deleteEmail: {
		label: 'Delete',
		icon: Delete,
		color: 'error.dark',
		onClick: ({ row, showDialog, showAlert }) => {
			showDialog({
				id: 'confirmAction',
				messageOverride: `Are you sure you want to move the email "${row.subject || 'this email'}" to the trash?`,
				callback: async (confirmed) => {
					if (confirmed) {
						showAlert({ message: 'Deleting email...', type: 'info' });
						await deleteZohoEmail({ messageId: row.id });
						showAlert({ message: 'Email moved to trash.', type: 'success' });
					}
				},
			});
		},
	},
	toggleRead: {
		getLabel: (row) => (row.isRead ? 'Unread' : 'Read'),
		icon: (row) => (row.isRead ? MarkEmailUnreadOutlined : MarkEmailReadOutlined),
		getColor: (row) => (row.isRead ? 'warning.dark' : 'custom.white'),
		onClick: async ({ row }) => {
			const newStatus = row.isRead ? 'unread' : 'read';
			const messagePayload = [{ id: row.id, tags: row.tags || [] }];
			await updateEmailReadStatus({ messages: messagePayload, status: newStatus });
		},
	},
};

// =============================================================================
//  3. EXPORTED BUTTON WRAPPERS
// =============================================================================


export const resolveRowActionMeta = (actionKey: string, row: RowData, member: ActionMember): RowActionMeta | null => {
	const config = ROW_ACTIONS[actionKey];
	if (!config || config.hide?.({ row, member })) {
		return null;
	}
	const IconFromConfig = config.icon;
	const IconComponent = typeof IconFromConfig === 'function' && !(IconFromConfig as SvgIconComponent).muiName ? (IconFromConfig as (row: RowData) => SvgIconComponent)(row) : (IconFromConfig as SvgIconComponent);
	const label = typeof config.getLabel === 'function' ? config.getLabel(row) : (config.label ?? '');
	const color = typeof config.getColor === 'function' ? config.getColor(row) : (config.color ?? '');
	return { label, IconComponent, color };
};

interface UseRowActionInvokerProps {
	permittedAliases?: string[];
	[key: string]: unknown;
}

interface UseRowActionInvokerReturn {
	runAction: (actionKey: string, row: RowData) => Promise<void>;
	handleError: AlertContextValue['handleError'];
	member: ActionMember;
}

export const useRowActionInvoker = (props: UseRowActionInvokerProps = {}): UseRowActionInvokerReturn => {
	const navigate = useNavigate();
	const { showDialog } = useDialog();
	const { showAlert, handleError } = useAlert();
	const { member: authMember } = useAuth();
	const member = useMemo<ActionMember>(() => authMember ?? {}, [authMember]);
	const configContext = useConfig();
	const emailActions = useEmailActions({
		permittedAliases: props.permittedAliases,
		// Invoker members may be an empty placeholder pre-auth; the hook only reads `alias`.
		member: member as Member & { alias?: string },
		navigate,
	});

	const runAction = useCallback(
		async (actionKey: string, row: RowData) => {
			const config = ROW_ACTIONS[actionKey];
			if (!config || config.hide?.({ row, member })) return;
			await config.onClick({
				row,
				navigate,
				showDialog,
				showAlert,
				handleError,
				member,
				config: configContext,
				emailActions,
				props,
			});
		},
		[navigate, showDialog, showAlert, handleError, member, configContext, emailActions, props],
	);

	return { runAction, handleError, member };
};

interface ActionCellButtonWrapperProps {
	row: RowData;
	variant?: 'cell' | 'mobile';
	permittedAliases?: string[];
	[key: string]: unknown;
}

export const ViewAppButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='viewApp' {...props} />;
export const MarkEligibleButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='markEligible' {...props} />;
export const ViewButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='viewMember' {...props} />;
export const EditAssetButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='editMember' {...props} />;
export const ContactButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='contact' {...props} />;
export const ViewApplicantButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='viewApplicant' {...props} />;
export const EditApplicantButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='editApplicant' {...props} />;
export const ViewRequestButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='viewRequestApp' {...props} />;
export const EditRequestButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='editRequest' {...props} />;
export const ResendRequestButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='resendRequest' {...props} />;
export const InvalidateRequestButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='invalidateRequest' {...props} />;
export const JoinInterviewButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='joinInterview' {...props} />;
export const WaitingRoomButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='waitInterview' {...props} />;
export const RescheduleInterviewButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='rescheduleInterview' {...props} />;
export const DeleteInterviewButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='deleteInterview' {...props} />;
export const CreateRoomButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='createRoom' {...props} />;
export const CloseRoomButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='closeRoom' {...props} />;
export const ChangeStatusButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='changeStatus' {...props} />;
export const SendInvitationButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='sendInvite' {...props} />;
export const UpdateRsvpButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='updateRsvp' {...props} />;
export const ViewApplicantFromInterviewButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='viewApplicantFromInterview' {...props} />;
export const ContactApplicantFromInterviewButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='contactApplicantFromInterview' {...props} />;
export const ViewEmailButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='viewEmail' {...props} />;
export const ReplyButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='replyEmail' {...props} />;
export const ReplyAllButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='replyAllEmail' {...props} />;
export const ForwardButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='forwardEmail' {...props} />;
export const DeleteEmailButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='deleteEmail' {...props} />;
export const ToggleReadButton = (props: ActionCellButtonWrapperProps) => <ActionCellButton actionKey='toggleRead' {...props} />;

// =============================================================================
//  4. CUSTOM CELL COMPONENTS
// =============================================================================

/** Resolve a picture field (string URL or { home }) to a usable src. */
export const resolvePictureSrc = (picture: unknown): string | undefined => {
	if (typeof picture === 'string' && picture) return picture;
	if (picture && typeof picture === 'object' && (picture as { home?: string }).home) return (picture as { home?: string }).home;
	return undefined;
};

/** Shared in-flight/resolved cache so list rows don't N+1 the same profile docs. */
const pictureUrlCache = new Map<string, Promise<string | null>>();

/** Test-only: reset shared avatar lookup cache between cases. */
export const clearPictureUrlCache = () => {
	pictureUrlCache.clear();
};

const loadPictureUrl = (collectionName: CollectionName, userId: string): Promise<string | null> => {
	const key = `${collectionName}:${userId}`;
	const existing = pictureUrlCache.get(key);
	if (existing) return existing;

	const pending = getCollectionData(userId, collectionName, userId)
		.then((fetched) => resolvePictureSrc((fetched as Record<string, unknown> | null)?.picture) || null)
		.catch(() => null);
	pictureUrlCache.set(key, pending);
	return pending;
};

/**
 * Fixed-size avatar for list/datatable cells.
 * Always renders the 40px Avatar (never the full-page Loader) so cards/rows
 * keep stable layout while optional Firestore lookups complete.
 * Prefer passing `src` when the row already includes picture data.
 */
interface DynamicProfilePictureProps {
	user?: string;
	collectionName: CollectionName;
	src?: string;
}

const DynamicProfilePicture = ({ user, collectionName, src }: DynamicProfilePictureProps) => {
	const config = useConfig();
	const fallback = config.DEFAULT_AVATAR as string | undefined;
	const [picture, setPicture] = useState<string | undefined>(src || fallback);

	useEffect(() => {
		if (src) {
			setPicture(src);
			return undefined;
		}

		if (!user) {
			setPicture(fallback);
			return undefined;
		}

		let cancelled = false;
		loadPictureUrl(collectionName, user).then((url) => {
			if (!cancelled) setPicture(url || fallback);
		});
		return () => {
			cancelled = true;
		};
	}, [user, collectionName, src, fallback]);

	return (
		<Box sx={datatableAvatarCellSx}>
			<Avatar sx={datatableAvatarSx} src={picture} alt='avatar' />
		</Box>
	);
};

interface ProfilePictureProps {
	user?: string;
	src?: string;
}

export const DynamicApplicantProfilePicture = ({ user, src }: ProfilePictureProps) => (
	<DynamicProfilePicture user={user} collectionName={collections.applicants} src={src} />
);

export const DynamicMemberProfilePicture = ({ user, src }: ProfilePictureProps) => (
	<DynamicProfilePicture user={user} collectionName={collections.members} src={src} />
);

const pictureColumn = (renderCell: GridColDef['renderCell']): GridColDef => ({
	field: 'picture',
	headerName: '',
	width: 68,
	minWidth: 68,
	maxWidth: 68,
	flex: 0,
	align: 'center',
	headerAlign: 'center',
	sortable: false,
	filterable: false,
	renderCell,
});

interface EmailCellProps {
	row: DocumentData;
}

export const SenderSubjectCell = React.memo(({ row }: EmailCellProps) => {
	const isUnread = row.isRead === false;
	const displayName = parseDisplayName(row.sender);
	return (
		<Box sx={{ ...stackedCellSx, alignItems: 'flex-start', overflow: 'hidden' }}>
			<Typography variant='body2' noWrap sx={{ width: '100%', fontWeight: isUnread ? 700 : 400 }}>
				{displayName}
			</Typography>
			<Typography variant='body2' color='text.secondary' noWrap sx={{ width: '100%', fontWeight: isUnread ? 700 : 400 }}>
				{row.subject}
			</Typography>
		</Box>
	);
});
SenderSubjectCell.displayName = 'SenderSubjectCell';

export const RecipientSubjectCell = React.memo(({ row }: EmailCellProps) => {
	const isUnread = row.isRead === false;
	const displayName = parseDisplayName(row.to);
	return (
		<Box sx={{ ...stackedCellSx, alignItems: 'flex-start', overflow: 'hidden' }}>
			<Typography variant='body2' noWrap sx={{ width: '100%', fontWeight: isUnread ? 700 : 400 }}>
				{displayName}
			</Typography>
			<Typography variant='body2' color='text.secondary' noWrap sx={{ width: '100%', fontWeight: isUnread ? 700 : 400 }}>
				{row.subject}
			</Typography>
		</Box>
	);
});
RecipientSubjectCell.displayName = 'RecipientSubjectCell';

interface StackedDateCellProps {
	value: unknown;
	row?: DocumentData;
}

export const StackedDateCell = React.memo(({ value, row }: StackedDateCellProps) => {
	if (!value) return <Typography variant='body2'>N/A</Typography>;
	const date = dayjs(value as string | number | Date);
	if (!date.isValid()) return <Typography variant='body2'>Invalid Date</Typography>;

	return (
		<Box sx={{ ...stackedCellSx, alignItems: 'center' }}>
			<Typography variant='body2'>{date.format('MMM D, YYYY')}</Typography>
			<Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
				<Typography variant='body2' color='text.active'>
					{date.format('h:mm A')}
				</Typography>
				{row?.hasAttachment && <AttachFileIcon sx={{ fontSize: '1.1rem', color: 'text.active' }} />}
			</Box>
		</Box>
	);
});
StackedDateCell.displayName = 'StackedDateCell';

interface UserIdProps {
	userId: string;
}

export const UserLastLogin = ({ userId }: UserIdProps) => {
	const [lastLogin, setLastLogin] = useState<{ relative: string; exact: string } | string>('Loading...');
	useEffect(() => {
		if (!userId) {
			setLastLogin('N/A');
			return;
		}
		getUserAuthRecord({ uid: userId })
			.then((result) => {
				const { lastSignInTime } = result.data as { lastSignInTime: string };
				const date = new Date(lastSignInTime);
				setLastLogin({
					relative: formatRelativeTime(date),
					exact: format(date, 'M/dd/yy h:mm a'),
				});
			})
			.catch(() => {
				setLastLogin('Never');
			});
	}, [userId]);

	if (typeof lastLogin === 'string') return <>{lastLogin}</>;

	return (
		<Tooltip title={lastLogin.exact} arrow placement='top'>
			<span>{lastLogin.relative}</span>
		</Tooltip>
	);
};

export const UserLastSeen = ({ userId }: UserIdProps) => {
	const [lastSeen, setLastSeen] = useState<{ relative: string; exact: string } | string>('Loading...');

	useEffect(() => {
		if (!userId) {
			setLastSeen('N/A');
			return;
		}

		return subscribeUserLastSeen(userId, (date) => {
			if (!date) {
				setLastSeen('Never');
				return;
			}
			setLastSeen({
				relative: formatRelativeTime(date),
				exact: format(date, 'M/dd/yy h:mm a'),
			});
		});
	}, [userId]);

	if (typeof lastSeen === 'string') return <>{lastSeen}</>;

	return (
		<Tooltip title={lastSeen.exact} arrow placement='top'>
			<span>{lastSeen.relative}</span>
		</Tooltip>
	);
};

export const UserActivityStack = ({ userId }: UserIdProps) => {
	const [lastSeen, setLastSeen] = useState<{ relative: string; exact: string } | string>('Loading...');
	const [lastLogin, setLastLogin] = useState<{ exact: string } | string>('Loading...');

	useEffect(() => {
		if (!userId) {
			setLastSeen('N/A');
			setLastLogin('N/A');
			return;
		}

		return subscribeUserLastSeen(userId, (date) => {
			if (!date) {
				setLastSeen('Never');
				return;
			}
			setLastSeen({
				relative: formatRelativeTime(date),
				exact: format(date, 'M/dd/yy h:mm a'),
			});
		});
	}, [userId]);

	useEffect(() => {
		if (!userId) {
			setLastLogin('N/A');
			return;
		}

		getUserAuthRecord({ uid: userId })
			.then((result) => {
				const { lastSignInTime } = result.data as { lastSignInTime: string };
				const date = new Date(lastSignInTime);
				setLastLogin({ exact: format(date, 'M/dd/yy h:mm a') });
			})
			.catch(() => {
				setLastLogin('Never');
			});
	}, [userId]);

	const seenLabel = typeof lastSeen === 'string' ? lastSeen : lastSeen.relative;
	const loginLabel = typeof lastLogin === 'string' ? lastLogin : lastLogin.exact;
	const seenTooltip = typeof lastSeen === 'string' ? seenLabel : lastSeen.exact;

	return (
		<Tooltip title={`Last seen: ${seenTooltip}\nLast login: ${loginLabel}`} arrow placement='top'>
			<Box>
				<Typography>{seenLabel}</Typography>
				<Typography sx={{ color: 'text.secondary' }}>{loginLabel}</Typography>
			</Box>
		</Tooltip>
	);
};

// =============================================================================
//  5. TOOLBAR ACTIONS
// =============================================================================

export const getApplicationToolbarActions = ({ navigate }: ToolbarContext): ToolbarAction[] => [
	{
		label: 'Manual Upload',
		icon: UploadIcon,
		onClick: () => navigate(generatePath(paths.manualUpload)),
		variant: 'contained',
		color: 'primary',
		requiresSelection: false,
	},
	{
		label: 'Contact Selected',
		icon: ContactPageOutlined,
		onClick: (selectionModel, allRows, helpers) => {
			const { showDialog } = helpers;
			const selectedRows = allRows.filter((row) => selectionModel.includes(row.id));
			const recipients = selectedRows.map((row) => ({ id: row.id, name: row.applicantName || `${row.firstName} ${row.lastName}`, email: row.email, cell: row.cell }));
			showDialog({ id: 'contactDialog', data: { title: `Contacting ${recipients.length} Recipient(s)`, component: ContactDialog, recipients, maxWidth: 'sm' } });
		},
		variant: 'outlined',
		color: 'primary',
		requiresSelection: true,
	},
	{
		label: 'Bulk Evaluate',
		icon: DoneAllOutlined,
		onClick: (selectionModel, allRows, helpers) => {
			const { showDialog, showAlert, handleError } = helpers;
			showDialog({
				id: 'markEligibility',
				messageOverride: `You are about to change the eligibility status for ${selectionModel.length} selected applications. Please choose a new status below.`,
				callback: async (newStatus) => {
					if (newStatus) {
						try {
							const batch = writeBatch(db);
							for (const appId of selectionModel) {
								const appRef = doc(db, collections.applications, appId);
								batch.update(appRef, { status: newStatus });
							}
							await batch.commit();
							showAlert({ message: `${selectionModel.length} applications have been marked as ${newStatus}.`, type: 'success' });
						} catch (error) {
							handleError(error, 'bulk-mark-eligibility');
						}
					}
				},
			});
		},
		variant: 'outlined',
		color: 'secondary',
		requiresSelection: true,
	},
];

export const getRequestToolbarActions = (_ctx: ToolbarContext): ToolbarAction[] => [
	{
		label: 'Contact Senders',
		icon: PersonOutlined,
		requiresSelection: true,
		onClick: async (selectionModel, allRows, { showDialog, handleError, showAlert }) => {
			try {
				const selectedRequests = allRows.filter((row) => selectionModel.includes(row.id));
				const applicationIds = [...new Set(selectedRequests.map((req) => req.applicationID).filter(Boolean))];
				if (applicationIds.length === 0) {
					showAlert({ message: 'Selected requests are not linked to any applications.', type: 'warning' });
					return;
				}
				const applications = await getDocumentsByIDs(collections.applications, applicationIds);
				const applicantIds = [...new Set(applications.map((app) => app.completedBy).filter(Boolean))];
				if (applicantIds.length > 0) {
					const applicants = await getDocumentsByIDs(collections.applicants, applicantIds);
					const recipients = applicants.map((app) => ({ id: app.id, name: `${app.firstName} ${app.lastName}`, email: app.email, cell: app.cell }));
					showDialog({ id: 'contactDialog', data: { title: `Contacting ${recipients.length} Applicant(s)`, component: ContactDialog, recipients, maxWidth: 'sm' } });
				} else {
					showAlert({ message: 'Could not find applicants for the selected requests.', type: 'warning' });
				}
			} catch (error) {
				handleError(error, 'contact-applicant-bulk');
			}
		},
	},
	{
		label: 'Contact Recipents',
		icon: ContactPageOutlined,
		requiresSelection: true,
		onClick: (selectionModel, allRows, { showDialog }) => {
			const selectedRequests = allRows.filter((row) => selectionModel.includes(row.id));
			const recipients = selectedRequests.map((req) => ({ id: req.id, name: req.name, email: req.email, cell: null }));
			showDialog({ id: 'contactDialog', data: { title: `Contacting ${recipients.length} Recommender(s)`, component: ContactDialog, recipients, maxWidth: 'sm' } });
		},
	},
	{
		label: 'Resend',
		icon: SendOutlined,
		requiresSelection: true,
		onClick: (selectionModel, allRows, { showDialog, showAlert, handleError, config }) => {
			showDialog({
				id: 'adminActionConfirmation',
				messageOverride: `Are you sure you want to resend ${selectionModel.length} request(s)? This will generate new PINs and expiry dates.`,
				callback: async (confirmed) => {
					if (confirmed) {
						try {
							const selectedRequests = allRows.filter((row) => selectionModel.includes(row.id));
							const resendPromises = selectedRequests.map(async (request) => {
								const sixDigits = generate6DigitNumber();
								const updatedFields = { attempts: 0, expiryDate: config.APPLICATION_DEADLINE, pinCode: await generateSecurePin(sixDigits) };
								await updateCollectionData(collections.requests, request.id, updatedFields);
								const uploadLink = await generateUploadLink(request.id);
								await sendRequest(request, uploadLink, sixDigits);
							});
							await Promise.all(resendPromises);
							showAlert({ message: `Successfully resent ${selectionModel.length} requests.`, type: 'success' });
						} catch (error) {
							handleError(error, 'bulk-resend-requests');
						}
					}
				},
			});
		},
	},
	{
		label: 'Cancel',
		icon: CloseOutlined,
		requiresSelection: true,
		onClick: (selectionModel, allRows, { showDialog, showAlert, handleError }) => {
			showDialog({
				id: 'adminActionConfirmation',
				messageOverride: `Are you sure you want to cancel ${selectionModel.length} request(s)? This action is irreversible.`,
				callback: async (confirmed) => {
					if (confirmed) {
						try {
							const batch = writeBatch(db);
							const newExpiry = new Date().toISOString();
							for (const reqId of selectionModel) {
								const reqRef = doc(db, collections.requests, reqId);
								batch.update(reqRef, { expiryDate: newExpiry });
							}
							await batch.commit();
							showAlert({ message: `${selectionModel.length} requests have been cancelled.`, type: 'success' });
						} catch (error) {
							handleError(error, 'bulk-cancel-requests');
						}
					}
				},
			});
		},
	},
];

export const getSchedulerToolbarActions = (_ctx: ToolbarContext): ToolbarAction[] => [
	{
		label: 'Auto-Schedule',
		icon: Add,
		onClick: (selectionModel, allRows, { showDialog }) => {
			showDialog({ id: 'autoScheduleInterviews', data: { component: AutoScheduler, maxWidth: 'md' } });
		},
		variant: 'contained',
		color: 'primary',
	},
	{
		label: 'Schedule Single',
		icon: Add,
		onClick: (selectionModel, allRows, { showDialog }) => {
			showDialog({ id: 'manualScheduleInterview', data: { component: ManualScheduler, maxWidth: 'sm' } });
		},
		variant: 'contained',
		color: 'info',
	},
	{
		label: 'Send Invites',
		icon: Send,
		requiresSelection: true,
		onClick: async (selectionModel, allRows, { showAlert, handleError }) => {
			if (selectionModel.length === 0) return;
			try {
				const result = await sendInterviewInvitations({ interviewIds: selectionModel });
				showAlert({ message: (result.data as { message: string }).message, type: 'success' });
			} catch (error) {
				handleError(error, 'Failed to send invitations.');
			}
		},
		variant: 'outlined',
		color: 'secondary',
	},
	{
		label: 'Delete Selected',
		icon: Delete,
		requiresSelection: true,
		onClick: (selectionModel, allRows, { showDialog, showAlert, handleError }) => {
			if (selectionModel.length === 0) return;
			showDialog({
				id: 'deleteInterviewSlot',
				messageOverride: `Are you sure you want to delete ${selectionModel.length} selected interview slots? This action cannot be undone.`,
				callback: async (confirmed) => {
					if (confirmed) {
						try {
							await bulkDeleteInterviews({ interviewIds: selectionModel });
							showAlert({ message: `${selectionModel.length} interview(s) deleted.`, type: 'success' });
						} catch (error) {
							handleError(error, 'Failed to delete interviews.');
						}
					}
				},
			});
		},
		variant: 'outlined',
		color: 'error',
	},
];

export const getInterviewToolbarActions = ({ navigate, deliberationRoomExists }: ToolbarContext): ToolbarAction[] => {
	return [
		{
			label: 'Join Deliberation Room',
			onClick: () => navigate(paths.deliberationRoom),
			variant: 'contained',
			color: 'secondary',
			hide: !deliberationRoomExists,
		},
		{
			label: 'Close Deliberation Room',
			onClick: (selectionModel, allRows, { showDialog, showAlert, handleError }) => {
				showDialog({
					id: 'confirmAction',
					messageOverride: 'Are you sure you want to close the deliberation room? All participants will be ejected.',
					callback: async (confirmed) => {
						if (confirmed) {
							try {
								const result = await deleteDeliberationRoom();
								showAlert({ message: (result.data as { message: string }).message, type: 'success' });
							} catch (error) {
								handleError(error, 'Error deleting Deliberation Room.');
							}
						}
					},
				});
			},
			variant: 'outlined',
			color: 'error',
			hide: !deliberationRoomExists,
		},
		{
			label: 'Open Deliberation Room',
			onClick: (selectionModel, allRows, { showAlert, handleError }) => {
				const createRoom = async () => {
					try {
						const result = await createDeliberationRoom();
						showAlert({ message: (result.data as { message: string }).message, type: 'success' });
					} catch (error) {
						handleError(error, 'Error creating Deliberation Room.');
					}
				};
				createRoom();
			},
			variant: 'outlined',
			hide: deliberationRoomExists,
		},
		{
			label: 'Update Statuses',
			requiresSelection: true,
			onClick: (selectionModel, allRows, { showDialog, showAlert, handleError }) => {
				showDialog({
					id: 'changeInterviewStatus',
					data: {
						title: `Update the Status for ${selectionModel.length} Interview(s)`,
					},
					messageOverride: `Select a new status to apply to all ${selectionModel.length} selected interviews.`,
					callback: async (formData) => {
						const newStatus = (formData as { status?: string } | null)?.status;
						if (newStatus) {
							try {
								await bulkUpdateInterviewStatus({ interviewIds: selectionModel, newStatus });
								showAlert({ message: `${selectionModel.length} interview(s) updated to ${newStatus}.`, type: 'success' });
							} catch (error) {
								handleError(error, 'bulk-update-interview-status');
							}
						}
					},
				});
			},
			variant: 'contained',
			color: 'info',
		},
	];
};

export const getMemberToolbarActions = ({ navigate, member }: ToolbarContext): ToolbarAction[] => [
	{
		label: 'New Member',
		icon: Add,
		onClick: () => navigate(generatePath(paths.newMember)),
		variant: 'contained',
		color: 'primary',
		disabled: !member?.permissions?.admin,
	},
	{
		label: 'Contact Selected',
		icon: ContactPageOutlined,
		requiresSelection: true,
		onClick: (selectionModel, allRows, { showDialog }) => {
			const selectedMembers = allRows.filter((row) => selectionModel.includes(row.id));
			const recipients = selectedMembers.map((member) => ({
				id: member.id,
				name: `${member.firstName} ${member.lastName}`,
				email: member.email,
				cell: member.cell,
			}));
			showDialog({
				id: 'contactDialog',
				data: { title: `Contacting ${recipients.length} Member(s)`, component: ContactDialog, recipients: recipients, maxWidth: 'sm' },
			});
		},
	},
];

export const getApplicantToolbarActions = (_ctx: ToolbarContext): ToolbarAction[] => [
	{
		label: 'Merge Accounts',
		icon: MergeTypeOutlined,
		requiresSelection: true,
		onClick: (selectionModel, allRows, { showDialog, showAlert }) => {
			if (selectionModel.length !== 2) {
				showAlert({
					message: 'Select exactly two applicant rows to merge.',
					type: 'warning',
				});
				return;
			}

			const selectedApplicants = allRows.filter((row) => selectionModel.includes(row.id));

			showDialog({
				id: 'mergeApplicantAccountsDialog',
				data: {
					title: 'Merge Applicant Accounts',
					component: MergeApplicantAccountsDialog,
					applicants: selectedApplicants,
					maxWidth: 'lg',
				},
			});
		},
	},
	{
		label: 'Contact Selected',
		icon: ContactPageOutlined,
		requiresSelection: true,
		onClick: (selectionModel, allRows, { showDialog }) => {
			const selectedApplicants = allRows.filter((row) => selectionModel.includes(row.id));
			const recipients = selectedApplicants.map((applicant) => ({
				id: applicant.id,
				name: `${applicant.firstName} ${applicant.lastName}`,
				email: applicant.email,
				cell: applicant.cell,
			}));
			showDialog({
				id: 'contactDialog',
				data: { title: `Contacting ${recipients.length} Applicant(s)`, component: ContactDialog, recipients: recipients, maxWidth: 'sm' },
			});
		},
	},
];

export const getInboxToolbarActions = ({ navigate }: ToolbarContext): ToolbarAction[] => [
	{
		label: 'New Email',
		icon: Add,
		onClick: () => navigate(paths.composeEmail),
	},
	{
		id: 'toggleRead',
		label: 'Mark Read',
		labelAlt: 'Mark Unread',
		icon: MarkEmailReadOutlined,
		iconAlt: MarkEmailUnreadOutlined,
		requiresSelection: true,
		onClick: (selectionModel, allRows, helpers, dynamicProps) => {
			const newStatus = dynamicProps?.newStatus as string;
			const { handleError } = helpers;
			const messagesPayload = selectionModel
				.map((id) => {
					const row = allRows.find((r) => r.id === id);
					return row ? { id: row.id, tags: row.tags || [] } : null;
				})
				.filter(Boolean);
			if (messagesPayload.length === 0) return;
			updateEmailReadStatus({ messages: messagesPayload, status: newStatus })
				.then(() => { })
				.catch((error) => handleError(error, `bulk-mark-${newStatus}`));
		},
	},
	{
		label: 'Delete',
		icon: Delete,
		color: 'error',
		requiresSelection: true,
		onClick: (selectionModel, allRows, { showDialog, showAlert, handleError }) => {
			showDialog({
				id: 'confirmAction',
				messageOverride: `Are you sure you want to move ${selectionModel.length} email(s) to the trash?`,
				callback: async (confirmed) => {
					if (confirmed) {
						try {
							showAlert({ message: 'Deleting emails...', type: 'info' });
							await bulkDeleteZohoEmails({ messageIds: selectionModel });
							showAlert({ message: `${selectionModel.length} email(s) moved to trash.`, type: 'success' });
						} catch (error) {
							handleError(error, 'bulk-delete-zoho');
						}
					}
				},
			});
		},
	},
];

// =============================================================================
//  6. COLUMN DEFINITIONS
// =============================================================================

export const memberCols: GridColDef[] = [
	pictureColumn((params) => <DynamicMemberProfilePicture user={params.row.id} src={resolvePictureSrc(params.row.picture)} />),
	{
		field: 'name',
		headerName: 'Name',
		flex: 0.75,
		valueGetter: (_value, row) => `${row.firstName} ${row.lastName}`,
		renderCell: (params) => (
			<Typography>
				{params.row.firstName} {params.row.lastName}
			</Typography>
		),
	},
	{
		field: 'membership',
		headerName: 'Membership',
		flex: 0.85,
		valueGetter: (_value, row) => `${row.position} (${row.since})`,
		renderCell: (params) => (
			<Box>
				<Typography>{params.row.position}</Typography>
				<Typography>Joined {params.row.since}</Typography>
			</Box>
		),
	},
	{
		field: 'activity',
		headerName: 'Seen / Login',
		flex: 0.9,
		sortable: false,
		renderCell: (params) => <UserActivityStack userId={params.row.id} />,
	},
	{
		field: 'contacts',
		headerName: 'Contacts',
		flex: 1.2,
		renderCell: (params) => (
			<Box>
				<Typography>{params.row.email}</Typography>
				<Typography>{params.row.cell}</Typography>
			</Box>
		),
	},
];

export const applicantCols: GridColDef[] = [
	pictureColumn((params) => <DynamicApplicantProfilePicture user={params.row.id} src={resolvePictureSrc(params.row.picture)} />),
	{
		field: 'name',
		headerName: 'Name',
		flex: 1,
		valueGetter: (_value, row) => `${row.firstName} ${row.lastName}`,
		renderCell: (params) => (
			<Typography>
				{params.row.firstName} {params.row.lastName}
			</Typography>
		),
	},
	{
		field: 'education',
		headerName: 'Enrollment',
		flex: 1.75,
		valueGetter: (_value, row) => `${row.school} (${row.gradYear}) ${row.major}`,
		renderCell: (params) => (
			<Box sx={stackedCellSx}>
				<Typography>{params.row.school}</Typography>
				<Typography>{`${params.row.major} (${params.row.gradYear})`}</Typography>
			</Box>
		),
	},
	{
		field: 'organization',
		headerName: 'Organization',
		flex: 1.25,
		valueGetter: (_value, row) => row.organization || 'N/A',
		renderCell: (params) => {
			const extract = extractPipeData(params.row.organization);
			return (
				<Box sx={stackedCellSx}>
					<Typography>{extract.left}</Typography>
					<Typography>{extract.right}</Typography>
				</Box>
			);
		},
	},
	{ field: 'applications', headerName: 'Apps', flex: 0.2, valueGetter: (_value, row) => row.applications?.length || 0, renderCell: (params) => <Typography>{params.row.applications?.length || 0}</Typography> },
	{
		field: 'activity',
		headerName: 'Seen / Login',
		flex: 0.9,
		sortable: false,
		renderCell: (params) => <UserActivityStack userId={params.row.id} />,
	},
	{
		field: 'contact',
		headerName: 'Contact',
		flex: 1.75,
		valueGetter: (_value, row) => `${row.email} ${row.cell}`,
		renderCell: (params) => (
			<Box sx={stackedCellSx}>
				<Typography>{params.row.email}</Typography>
				<Typography>{params.row.cell}</Typography>
			</Box>
		),
	},
];

export const appCols: GridColDef[] = [
	pictureColumn((params) => <DynamicApplicantProfilePicture user={params.row.completedBy} src={resolvePictureSrc(params.row.picture)} />),
	{ field: 'applicantName', headerName: 'Applicant Name', flex: 1.5, minWidth: 140, valueGetter: (_value, row) => row.applicantName || '', renderCell: (params) => <Typography noWrap>{params.row.applicantName}</Typography> },
	{ field: 'type', headerName: 'App Type', flex: 1.1, minWidth: 120, renderCell: (params) => <Typography noWrap>{params.row.type}</Typography> },
	{ field: 'status', headerName: 'App Status', flex: 0.9, minWidth: 100, renderCell: (params) => <Typography noWrap>{params.row.status}</Typography> },
	{ field: 'lastUpdated', headerName: 'Last Touched', flex: 0.9, minWidth: 110, valueGetter: (_value, row) => new Date(row.lastUpdated), renderCell: (params) => <Typography noWrap>{new Date(params.row.lastUpdated).toLocaleDateString()}</Typography> },
	{
		field: 'window',
		headerName: 'Academic Year',
		flex: 0.85,
		minWidth: 120,
		valueGetter: (_value, row) => new Date(row.window).getFullYear(),
		renderCell: (params) => (
			<Typography noWrap>
				{new Date(params.row.window).getFullYear()} - {new Date(params.row.window).getFullYear() + 1}
			</Typography>
		),
	},
];

export const reqCols: GridColDef[] = [
	{
		field: 'done',
		headerName: '',
		flex: 0.1,
		sortable: false,
		filterable: false,
		renderCell: (params) => {
			const { completed, expiryDate, attempts } = params.row;
			const now = dayjs();
			const expired = dayjs(expiryDate).isBefore(now);
			const invalid = !completed && (expired || attempts > 0);
			return (
				<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
					{getStatusIcon(completed, invalid)}
				</Box>
			);
		},
	},
	{ field: 'name', headerName: 'Recommender', flex: 1.5, renderCell: (params) => <Typography>{params.row.name}</Typography> },
	{ field: 'email', headerName: 'Email', flex: 2, renderCell: (params) => <Typography>{params.row.email}</Typography> },
	{ field: 'relation', headerName: 'Relation', flex: 2, renderCell: (params) => <Typography>{params.row.relation}</Typography> },
	{ field: 'attachmentType', headerName: 'LOR', flex: 0.8, valueGetter: (_value, row) => getAttachmentLabel(row.attachmentType), renderCell: (params) => <Typography>{getAttachmentLabel(params.row.attachmentType)}</Typography> },
	{ field: 'attempts', headerName: 'Tries', flex: 0.5, type: 'number', renderCell: (params) => <Typography>{params.row.attempts}</Typography> },
	{ field: 'expiryDate', headerName: 'Expires', flex: 1, valueGetter: (_value, row) => new Date(row.expiryDate), renderCell: (params) => <Typography>{new Date(params.row.expiryDate).toLocaleDateString()}</Typography> },
];

export const interviewCols: GridColDef[] = [
	{ field: 'displayName', headerName: 'Applicant', flex: 1, renderCell: (params) => <Typography>{params.row.displayName}</Typography> },
	{
		field: 'startTime',
		headerName: 'Date & Time',
		flex: 1,
		valueGetter: (value: { toDate?: () => Date } | undefined) => (value?.toDate ? dayjs(value.toDate()).format('MM/DD/YYYY h:mm A') : 'Invalid Date'),
		renderCell: (params) => <Typography>{params.row.startTime?.toDate ? dayjs(params.row.startTime.toDate()).format('MM/DD/YYYY h:mm A') : 'Invalid Date'}</Typography>,
	},
	{ field: 'status', headerName: 'Status', flex: 0.5, renderCell: (params) => <Typography>{params.row.status}</Typography> },
	{
		field: 'rsvpStatus',
		headerName: 'RSVP',
		flex: 0.5,
		renderCell: (params) => <Typography>{getRsvpLabel(params.value)}</Typography>,
	},
];

export const schedulerCols: GridColDef[] = [
	{ field: 'applicantName', headerName: 'Applicant', flex: 1, renderCell: (params) => <Typography>{params.row.applicantName}</Typography> },
	{
		field: 'startTime',
		headerName: 'Date & Time',
		flex: 1,
		valueGetter: (value: { toDate?: () => Date } | undefined) => (value?.toDate ? dayjs(value.toDate()).format('MM/DD/YYYY h:mm A') : 'Invalid Date'),
		renderCell: (params) => <Typography>{params.row.startTime?.toDate ? dayjs(params.row.startTime.toDate()).format('MM/DD/YYYY h:mm A') : 'Invalid Date'}</Typography>,
	},
	{ field: 'status', headerName: 'Status', flex: 0.5, renderCell: (params) => <Typography>{params.row.status}</Typography> },
	{
		field: 'rsvpStatus',
		headerName: 'RSVP',
		flex: 0.5,
		renderCell: (params) => <Typography>{getRsvpLabel(params.value)}</Typography>,
	},
];

export const inboxCols: GridColDef[] = [
	{ field: 'senderSubject', headerName: 'Sender / Subject', flex: 2, sortable: false, valueGetter: (_value, row) => `${row.sender} ${row.subject}`, renderCell: (params) => <SenderSubjectCell row={params.row as RowData} /> },
	{
		field: 'timestamp',
		headerName: 'Received',
		flex: 0.75,
		valueGetter: (value: unknown) => {
			const ts = Number(value);
			return ts > 0 ? new Date(ts) : null;
		},
		renderCell: (params) => <StackedDateCell value={params.value} row={params.row} />,
	},
	{
		field: 'tags',
		headerName: 'Sent To',
		flex: 0.75,
		sortable: false,
		renderCell: (params) => (
			<Box sx={stackedCellSx}>
				{params.row.tags && params.row.tags.length > 0 && (
					<Box sx={{ display: 'flex', gap: '4px', mb: '4px', flexWrap: 'wrap' }}>
						{params.row.tags.map((tag: string) => (
							<Typography key={tag} variant='caption' sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', px: 1, py: 0.2, borderRadius: '10px', textTransform: 'uppercase', fontSize: '0.6rem', fontWeight: 'bold', lineHeight: 1.5 }}>
								{tag}
							</Typography>
						))}
					</Box>
				)}
			</Box>
		),
	},
	{
		field: 'description',
		headerName: 'Preview',
		flex: 3,
		sortable: false,
		cellClassName: 'multiline-cell',
		renderCell: (params) => (
			<Typography variant='body2' color='text.secondary' sx={{ fontWeight: params.row.isRead === false ? 'bold' : 'normal', whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
				{params.value}
			</Typography>
		),
	},
];

export const legacyFinancesCols: GridColDef[] = [
	{ field: 'year', headerName: 'Year', width: 80, type: 'number', headerAlign: 'center', align: 'center', valueFormatter: (value: number | null | undefined) => (value ? String(value) : 'N/A') },
	{ field: 'total_allotted_disbursement', headerName: 'Total Allotted', width: 130, headerAlign: 'center', align: 'center', valueFormatter: (value: number | null | undefined) => (value ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A') },
	{ field: 'prior_year_clawback', headerName: 'Clawback', width: 130, headerAlign: 'center', align: 'center', valueFormatter: (value: number | null | undefined) => (value ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A') },
	{
		field: 'renewable_scholarships',
		headerName: 'Scholarships',
		width: 170,
		headerAlign: 'center',
		align: 'center',
		valueGetter: (value: unknown[] | undefined) => value?.length || 0,
		renderCell: (params) => (
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
				<PeopleOutlined fontSize='small' />
				<Typography variant='body2'>{params.value} Recipients</Typography>
			</Box>
		),
	},
	{
		field: 'non_renewable_grants',
		headerName: 'Grants',
		width: 170,
		headerAlign: 'center',
		align: 'center',
		valueGetter: (value: unknown[] | undefined) => value?.length || 0,
		renderCell: (params) => (
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
				<PeopleOutlined fontSize='small' />
				<Typography variant='body2'>{params.value} Recipients</Typography>
			</Box>
		),
	},
	{
		field: 'sg_available',
		headerName: 'S&G Funds (80%)',
		width: 170,
		headerAlign: 'center',
		align: 'center',
		valueGetter: (_value, row) => row.financial_summary?.scholarships_grants?.amount_available,
		valueFormatter: (value: number | null | undefined) => (value ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A'),
	},
	{
		field: 'nsi_available',
		headerName: 'Non-S&G Funds (20%)',
		width: 190,
		headerAlign: 'center',
		align: 'center',
		valueGetter: (_value, row) => row.financial_summary?.non_scholarship_items?.amount_available,
		valueFormatter: (value: number | null | undefined) => (value ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A'),
	},
	{
		field: 'returns',
		headerName: 'Returned',
		width: 100,
		headerAlign: 'center',
		align: 'center',
		type: 'number',
		valueGetter: (_value, row) => (row.financial_summary?.scholarships_grants?.amount_returned ?? 0) + (row.financial_summary?.non_scholarship_items?.amount_returned ?? 0),
		valueFormatter: (value: number | null | undefined) => (value ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A'),
	},
];

// =============================================================================
//  7. ACTION ARRAYS
// =============================================================================

