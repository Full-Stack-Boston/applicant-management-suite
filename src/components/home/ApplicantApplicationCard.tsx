import { Box, IconButton, Paper, Typography } from '@mui/material';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import type { ApplicationCardLayout } from '../../config/ui/applicationCardLayout';
import { StatusCapsule } from '../list/StatusCapsule';
import {
	formatApplicationSubmittedOn,
	formatApplicationTitle,
	formatAttachmentProgress,
	getApplicationNextStep,
	shouldShowApplicationNextStep,
	type ApplicantApplicationCardData,
	type ApplicationAttachmentProgress,
} from './applicationCardUtils';
import {
	homeApplicantApplicationCardSx,
	homeApplicantApplicationListRowSx,
	homeApplicantCardSplitRowSx,
	homeApplicantDetailLabelSx,
} from './homePageStyles';

export type { ApplicantApplicationCardData } from './applicationCardUtils';
export { formatApplicationSubmittedOn, formatApplicationYear } from './applicationCardUtils';

interface ApplicantApplicationCardProps {
	layout: ApplicationCardLayout;
	application: ApplicantApplicationCardData;
	attachmentProgress?: ApplicationAttachmentProgress | null;
	editable?: boolean;
	darkMode: boolean;
	primaryColor: string;
	onOpen: () => void;
	onDelete: (event: React.MouseEvent) => void;
}

const cardActionClusterSx = {
	display: 'flex',
	alignItems: 'center',
	gap: 0.25,
	flexShrink: 0,
} as const;

const DeleteButton = ({ onDelete }: { onDelete: (event: React.MouseEvent) => void }) => (
	<IconButton
		size='small'
		aria-label='Delete application'
		onClick={onDelete}
		sx={{ color: 'text.secondary' }}>
		<DeleteOutlinedIcon fontSize='small' />
	</IconButton>
);

const OpenApplicationButton = ({ editable, onOpen }: { editable: boolean; onOpen: () => void }) => (
	<IconButton
		size='small'
		aria-label={editable ? 'Edit application' : 'Review application'}
		onClick={(event) => {
			event.preventDefault();
			event.stopPropagation();
			onOpen();
		}}
		sx={{ color: 'primary.main' }}>
		{editable ? <EditOutlinedIcon fontSize='small' /> : <VisibilityOutlinedIcon fontSize='small' />}
	</IconButton>
);

const SplitField = ({ label, children, align = 'left' }: { label: string; children: React.ReactNode; align?: 'left' | 'right' }) => (
	<Box sx={{ minWidth: 0, textAlign: align }}>
		<Typography component='span' sx={homeApplicantDetailLabelSx}>
			{label}
		</Typography>
		{children}
	</Box>
);

const MetaCaption = ({ children }: { children: React.ReactNode }) => (
	<Typography variant='caption' color='text.secondary' sx={{ display: 'block', lineHeight: 1.45, mt: 1.25 }}>
		{children}
	</Typography>
);

const iconCaptionRowSx = {
	display: 'inline-flex',
	alignItems: 'center',
	gap: 0.5,
	minWidth: 0,
} as const;

const iconCaptionIconWrapSx = {
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	flexShrink: 0,
	lineHeight: 0,
} as const;

const iconCaptionTextSx = {
	lineHeight: 1.2,
	display: 'inline-flex',
	alignItems: 'center',
} as const;

const MetaIconCaption = ({
	icon,
	children,
	color = 'text.secondary',
	fontWeight,
}: {
	icon: React.ReactNode;
	children: React.ReactNode;
	color?: string;
	fontWeight?: number;
}) => (
	<Box sx={iconCaptionRowSx}>
		<Box sx={iconCaptionIconWrapSx}>{icon}</Box>
		<Typography variant='caption' color={color} component='span' sx={{ ...iconCaptionTextSx, fontWeight }}>
			{children}
		</Typography>
	</Box>
);

const AttachmentCaption = ({ progress }: { progress: ApplicationAttachmentProgress }) => (
	<MetaIconCaption
		icon={<AttachFileOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
		color={progress.complete ? 'success.main' : 'text.secondary'}
		fontWeight={500}>
		{formatAttachmentProgress(progress)}
	</MetaIconCaption>
);

function CompactApplicationCard({
	application,
	attachmentProgress,
	darkMode,
	editable = true,
	onOpen,
	onDelete,
}: Omit<ApplicantApplicationCardProps, 'layout' | 'primaryColor'>) {
	const nextStep = getApplicationNextStep(application.status, attachmentProgress ?? null);
	const showNextStep = shouldShowApplicationNextStep(application.status, attachmentProgress ?? null);

	return (
		<Paper
			variant='outlined'
			onClick={onOpen}
			sx={{
				...homeApplicantApplicationCardSx(darkMode),
				cursor: 'pointer',
			}}>
			<Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
				<Typography variant='body2' color='text.primary' sx={{ fontWeight: 700, minWidth: 0, flex: 1 }}>
					{formatApplicationTitle(application.type, application.submittedOn)}
				</Typography>
				<Box sx={cardActionClusterSx}>
					<OpenApplicationButton editable={editable} onOpen={onOpen} />
					<DeleteButton onDelete={onDelete} />
				</Box>
			</Box>

			<Box sx={homeApplicantCardSplitRowSx}>
				<SplitField label='Status'>
					<StatusCapsule status={application.status} />
				</SplitField>
				<SplitField label='Submitted on' align='right'>
					<Typography variant='body2' color='text.primary' sx={{ fontWeight: 500 }}>
						{formatApplicationSubmittedOn(application.submittedOn, true)}
					</Typography>
				</SplitField>
			</Box>

			{attachmentProgress && <AttachmentCaption progress={attachmentProgress} />}

			{showNextStep && <MetaCaption>{nextStep}</MetaCaption>}
		</Paper>
	);
}

function ListApplicationRow({
	application,
	attachmentProgress,
	darkMode,
	editable = true,
	onOpen,
	onDelete,
}: Omit<ApplicantApplicationCardProps, 'layout' | 'primaryColor'>) {
	const nextStep = getApplicationNextStep(application.status, attachmentProgress ?? null);
	const showNextStep = shouldShowApplicationNextStep(application.status, attachmentProgress ?? null);
	const submittedLabel = formatApplicationSubmittedOn(application.submittedOn, true);

	return (
		<Paper
			variant='outlined'
			onClick={onOpen}
			sx={{
				...homeApplicantApplicationListRowSx(darkMode),
				cursor: 'pointer',
			}}>
			<Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, minWidth: 0, maxWidth: '100%' }}>
				<Box sx={{ flex: 1, minWidth: 0 }}>
					<Typography variant='body2' color='text.primary' sx={{ fontWeight: 700 }}>
						{formatApplicationTitle(application.type, application.submittedOn)}
					</Typography>
					<Box
						sx={{
							display: 'flex',
							flexWrap: 'wrap',
							alignItems: 'center',
							gap: 1,
							mt: 0.5,
						}}>
						<MetaIconCaption icon={<CalendarTodayOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}>
							{submittedLabel}
						</MetaIconCaption>
						{attachmentProgress && <AttachmentCaption progress={attachmentProgress} />}
					</Box>
					{showNextStep && <MetaCaption>{nextStep}</MetaCaption>}
				</Box>

				<Box sx={cardActionClusterSx}>
					<StatusCapsule status={application.status} />
					<OpenApplicationButton editable={editable} onOpen={onOpen} />
					<DeleteButton onDelete={onDelete} />
				</Box>
			</Box>
		</Paper>
	);
}

export default function ApplicantApplicationCard({ layout, ...props }: ApplicantApplicationCardProps) {
	if (layout === 'list') {
		return <ListApplicationRow {...props} />;
	}

	return <CompactApplicationCard {...props} />;
}
