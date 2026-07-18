import { type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	Link,
	Stack,
	Typography,
} from '@mui/material';
import {
	ExpandMore as ExpandMoreIcon,
	PersonAddAlt as BrandNewIcon,
	PersonAddAlt as NewIcon,
	Restore as ReturningIcon,
	WorkspacePremium as ScholarshipIcon,
	OpenInNew as OpenInNewIcon,
	School as SchoolIcon,
	EmojiEvents as AwardIcon,
	HelpOutlined as LostIcon,
	CheckCircleOutlined as CheckCircleIcon,
	ErrorOutlined as ErrorOutlineIcon,
} from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';


import { UserLastLogin } from '../../config/ui/tableConfig';
import { dashboardEmbeddedTableSx, dashboardModuleSurfaceSx, dashboardSectionTitleSx } from '../../config/ui/adminPageStyles';
import type { OutlookSectionId, DashboardApplicantOutlook, DashboardApplicantOutlookRow } from '../../config/data/firebase';

const SECTION_ICONS: Record<OutlookSectionId, SvgIconComponent> = {
	brandNewAccounts: BrandNewIcon,
	expectedNewApplications: NewIcon,
	lostInTheWeeds: LostIcon,
	expectedReturningGrants: ReturningIcon,
	expectedReturningScholarships: ScholarshipIcon,
};

interface ApplicantOutlookPanelProps {
	data?: DashboardApplicantOutlook | null;
	variant?: 'default' | 'dashboard';
}

const emptyOutlook: DashboardApplicantOutlook = {
	cycleYear: new Date().getFullYear(),
	sections: [],
};

const CycleStatusIcon = ({ status }: { status: DashboardApplicantOutlookRow['cycleStatus'] }) => {
	if (status === 'correct') {
		return <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} aria-label='Correct application type started' />;
	}
	if (status === 'wrong') {
		return <ErrorOutlineIcon sx={{ fontSize: 18, color: 'warning.main' }} aria-label='Wrong application type started' />;
	}
	return null;
};

const OutlookRow = ({ row }: { row: DashboardApplicantOutlookRow }) => (
	<Box
		sx={{
			display: 'grid',
			gridTemplateColumns: { xs: 'auto 1fr', md: 'auto minmax(140px, 1.2fr) repeat(3, minmax(0, 1fr))' },
			gap: { xs: 0.75, md: 1.5 },
			alignItems: 'center',
			px: { xs: 0.75, md: 1 },
			py: 0.85,
			borderBottom: '1px solid',
			borderColor: 'divider',
		}}>
		<Box sx={{ display: 'flex', justifyContent: 'center', width: 22 }}>
			<CycleStatusIcon status={row.cycleStatus} />
		</Box>

		<Link
			component={RouterLink}
			to={`/applicants/view/${row.applicantId}`}
			underline='hover'
			color='text.primary'
			sx={{ fontWeight: 600, minWidth: 0, fontSize: '0.9rem' }}>
			{row.name}
		</Link>

		<Stack direction='row' spacing={0.75} sx={{ alignItems: 'center', minWidth: 0, color: 'text.secondary' }}>
			<SchoolIcon sx={{ fontSize: 15, flexShrink: 0, opacity: 0.8 }} />
			<Typography variant='body2' noWrap>
				{row.gradYear ? `Class of ${row.gradYear}` : 'Unknown'}
			</Typography>
		</Stack>

		<Stack direction='row' spacing={0.75} sx={{ alignItems: 'center', minWidth: 0, color: 'text.secondary' }}>
			<AwardIcon sx={{ fontSize: 15, flexShrink: 0, opacity: 0.8 }} />
			<Typography variant='body2' noWrap>
				{row.awardDisplay}
			</Typography>
		</Stack>

		<Typography variant='body2' color='text.secondary' sx={{ minWidth: 0 }}>
			Last login: <UserLastLogin userId={row.applicantId} />
		</Typography>
	</Box>
);

const SectionAccordion = ({
	id,
	title,
	count,
	link,
	Icon,
	isComplete,
	defaultExpanded = false,
	children,
}: {
	id: string;
	title: string;
	count: number;
	link: string;
	Icon: SvgIconComponent;
	isComplete: boolean;
	defaultExpanded?: boolean;
	children: ReactNode;
}) => (
	<Accordion
		defaultExpanded={defaultExpanded}
		disableGutters
		elevation={0}
		sx={{
			bgcolor: 'transparent',
			border: 1,
			borderColor: 'divider',
			borderRadius: '10px !important',
			overflow: 'hidden',
			'&:before': { display: 'none' },
		}}>
		<AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`${id}-content`} id={`${id}-header`} sx={{ px: 1.5 }}>
			<Stack direction='row' spacing={1.5} sx={{ alignItems: 'center', minWidth: 0, flex: 1, pr: 1 }}>
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						width: 32,
						height: 32,
						borderRadius: 1,
						bgcolor: 'action.selected',
						flexShrink: 0,
					}}>
					<Icon sx={{ fontSize: 18, color: 'text.secondary' }} />
				</Box>
				<Box sx={{ minWidth: 0, flex: 1 }}>
					<Stack direction='row' spacing={0.75} sx={{ alignItems: 'center' }}>
						<Typography sx={{ fontWeight: 700, fontSize: '14px', color: 'text.primary' }}>{title}</Typography>
						{isComplete ? (
							<CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} aria-label='Section complete' />
						) : null}
					</Stack>
					<Typography variant='caption' color='text.secondary'>
						{count} expected this cycle
					</Typography>
				</Box>
				<Link
					component={RouterLink}
					to={link}
					onClick={(event) => event.stopPropagation()}
					sx={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 0.5,
						fontSize: '12px',
						flexShrink: 0,
					}}>
					View list
					<OpenInNewIcon sx={{ fontSize: 14 }} />
				</Link>
			</Stack>
		</AccordionSummary>
		<AccordionDetails sx={{ pt: 0, pb: 1.5, px: 1 }}>{children}</AccordionDetails>
	</Accordion>
);

const EMPTY_MESSAGES: Record<OutlookSectionId, string> = {
	brandNewAccounts: 'No brand-new accounts waiting to start an application.',
	expectedNewApplications: 'No expected new applicant applications this cycle.',
	lostInTheWeeds: 'No dormant accounts lost in the weeds.',
	expectedReturningGrants: 'No prior grant awardees expected this cycle.',
	expectedReturningScholarships: 'No prior scholarship awardees expected this cycle.',
};

const ApplicantOutlookPanel = ({ data, variant = 'default' }: ApplicantOutlookPanelProps) => {
	const outlook = data ?? emptyOutlook;

	return (
		<Box
			sx={{
				...(variant === 'dashboard' ? dashboardModuleSurfaceSx : { px: 2, py: 1.5 }),
				width: '100%',
				minWidth: 0,
			}}>
			<Typography sx={dashboardSectionTitleSx}>APPLICANT OUTLOOK ({outlook.cycleYear})</Typography>
			<Typography variant='body2' color='text.secondary' sx={{ mb: 1.25 }}>
				Pipeline from new accounts through returning awardees.
			</Typography>

			<Box sx={{ ...dashboardEmbeddedTableSx, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
				{outlook.sections.map((section) => (
					<SectionAccordion
						key={section.id}
						id={section.id}
						title={section.title}
						count={section.applicants.length}
						link={section.link}
						Icon={SECTION_ICONS[section.id]}
						isComplete={section.isComplete}
						defaultExpanded={section.id === 'brandNewAccounts'}>
						{section.applicants.length > 0 ? (
							<Stack spacing={0}>
								{section.applicants.map((row) => (
									<OutlookRow key={row.applicantId} row={row} />
								))}
							</Stack>
						) : (
							<Typography variant='body2' color='text.secondary' sx={{ px: 1, py: 0.5 }}>
								{EMPTY_MESSAGES[section.id]}
							</Typography>
						)}
					</SectionAccordion>
				))}
			</Box>
		</Box>
	);
};

export default ApplicantOutlookPanel;
