import { Box, Typography } from '@mui/material';
import {
	PlayArrow as StartedIcon,
	PersonAddAlt as NewIcon,
	Restore as ReturningIcon,
	WorkspacePremium as ScholarshipIcon,
	ReportProblem as IncompleteIcon,
	CheckCircleOutlined as CompletedIcon,
	ThumbUpAltOutlined as EligibleIcon,
	MailOutlined as InvitedIcon,
	MilitaryTech as AwardedIcon,
	CancelPresentation as RejectedIcon,
	DeleteOutlined as DeletedIcon,
	Sensors as LiveCountIcon,
} from '@mui/icons-material';
import type { ElementType } from 'react';
import type { SvgIconComponent } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';

import { ApplicationType, ApplicationStatus } from '../data/collections';
import type { RealtimeCallback } from '../../types/firebase';
import {
	getRealTimeCurrentNonNegatedApplicationsCountByType,
	getRealTimeNonNegatedApplicationsCountByTypeAndCycleYear,
	getRealTimeCurrentNonNegatedApplicationsCountByStatus,
	getRealTimeCurrentApplicationCountByStatus,
	getRealTimeApplicationCountByStatus,
	getRealTimeCurrentRejectedApplicationsCount,
	getRealTimeMostRecentApplicationIDs,
	getRealTimeDashboardApplicantOutlook,
	getRealTimeActiveAuthenticatedUsersCount,
} from '../data/firebase';
import { dashboardFeaturedRowSx, dashboardSectionTitleSx } from '../ui/adminPageStyles';

import Featured from '../../components/featured/Featured';
import Chart from '../../components/chart/Chart';
import InterviewStatusPanel from '../../components/interviews/StatusPanel';
import ApplicantOutlookPanel from '../../components/dashboard/ApplicantOutlookPanel';
import CollapsableTable from '../../components/table/Table';

interface DashboardWidget {
	id: string;
	category: 'potentiallyEligible' | 'status' | 'live';
	fetcher: (callback: RealtimeCallback) => unknown;
	comparisonFetcher?: (cycleYear: number, callback: RealtimeCallback) => unknown;
	isGainPositive?: (current: number, previous: number) => boolean;
	title: string;
	linkText: string;
	link: string;
	IconComponent: SvgIconComponent;
	color: string;
}

interface LayoutComponent {
	id: string;
	component: ElementType;
	props?: Record<string, unknown>;
	fetcher?: (callback: RealtimeCallback) => unknown;
	initialState?: unknown;
}

interface LayoutRow {
	id: string;
	type: 'widgets' | 'customRow';
	variant?: string;
	containerSx?: SxProps<Theme>;
	display?: Record<string, string>;
	components?: LayoutComponent[];
}

interface DashboardContent {
	widgets: DashboardWidget[];
	layout: LayoutRow[];
}

const year = new Date().getFullYear();

export const memberDashContent: DashboardContent = {
	widgets: [
		{
			id: ApplicationStatus.started,
			category: 'potentiallyEligible',
			fetcher: (callback) => getRealTimeCurrentNonNegatedApplicationsCountByStatus(ApplicationStatus.started, callback),
			isGainPositive: (current, previous) => current >= previous,
			title: 'STARTED',
			linkText: "See this year's apps",
			link: `/applications/${year}/all`,
			IconComponent: StartedIcon,
			color: 'grey.600',
		},
		{
			id: ApplicationType.newApplication,
			category: 'potentiallyEligible',
			fetcher: (callback) => getRealTimeCurrentNonNegatedApplicationsCountByType(ApplicationType.newApplication, callback),
			comparisonFetcher: (cycleYear, callback) => getRealTimeNonNegatedApplicationsCountByTypeAndCycleYear(ApplicationType.newApplication, cycleYear, callback),
			isGainPositive: (current, previous) => current >= previous,
			title: 'STANDARD GRANTS',
			linkText: 'View Queue',
			link: `/applications/${year}/newApplicants`,
			IconComponent: NewIcon,
			color: 'custom.yellow',
		},
		{
			id: ApplicationType.returningGrant,
			category: 'potentiallyEligible',
			fetcher: (callback) => getRealTimeCurrentNonNegatedApplicationsCountByType(ApplicationType.returningGrant, callback),
			comparisonFetcher: (cycleYear, callback) => getRealTimeNonNegatedApplicationsCountByTypeAndCycleYear(ApplicationType.returningGrant, cycleYear, callback),
			isGainPositive: (current, previous) => current >= previous,
			title: 'RENEWALS',
			linkText: 'View Queue',
			link: `/applications/${year}/returningGrants`,
			IconComponent: ReturningIcon,
			color: 'custom.blue',
		},
		{
			id: ApplicationType.scholarship,
			category: 'potentiallyEligible',
			fetcher: (callback) => getRealTimeCurrentNonNegatedApplicationsCountByType(ApplicationType.scholarship, callback),
			comparisonFetcher: (cycleYear, callback) => getRealTimeNonNegatedApplicationsCountByTypeAndCycleYear(ApplicationType.scholarship, cycleYear, callback),
			isGainPositive: (current, previous) => current >= previous,
			title: 'COMPLIANCE',
			linkText: 'View Check-ins',
			link: `/applications/${year}/scholarshipRecipients`,
			IconComponent: ScholarshipIcon,
			color: 'custom.brown',
		},
		{
			id: ApplicationStatus.incomplete,
			category: 'potentiallyEligible',
			fetcher: (callback) => getRealTimeCurrentApplicationCountByStatus(ApplicationStatus.incomplete, callback),
			isGainPositive: (current) => current <= 0,
			title: 'INCOMPLETE',
			linkText: 'View Stalled Apps',
			link: `/applications/incomplete`,
			IconComponent: IncompleteIcon,
			color: 'custom.red',
		},
		{
			id: ApplicationStatus.completed,
			category: 'status',
			fetcher: (callback) => getRealTimeCurrentApplicationCountByStatus(ApplicationStatus.completed, callback),
			title: 'COMPLETED',
			linkText: 'Ready for Review',
			link: `/applications/completed`,
			IconComponent: CompletedIcon,
			color: 'custom.yellow',
		},
		{
			id: ApplicationStatus.eligible,
			category: 'status',
			fetcher: (callback) => getRealTimeCurrentApplicationCountByStatus(ApplicationStatus.eligible, callback),
			title: 'ELIGIBLE',
			linkText: 'Qualified Candidates',
			link: `/applications/eligible`,
			IconComponent: EligibleIcon,
			color: 'custom.green',
		},
		{
			id: ApplicationStatus.invited,
			category: 'status',
			fetcher: (callback) => getRealTimeCurrentApplicationCountByStatus(ApplicationStatus.invited, callback),
			title: 'INVITED',
			linkText: 'Interview Queue',
			link: `/applications/invited`,
			IconComponent: InvitedIcon,
			color: 'custom.green',
		},
		{
			id: ApplicationStatus.awarded,
			category: 'status',
			fetcher: (callback) => getRealTimeCurrentApplicationCountByStatus(ApplicationStatus.awarded, callback),
			title: 'AWARDED',
			linkText: 'Finalized Grants',
			link: `/applications/awarded`,
			IconComponent: AwardedIcon,
			color: 'custom.yellow',
		},
		{
			id: 'rejected',
			category: 'status',
			fetcher: (callback) => getRealTimeCurrentRejectedApplicationsCount(callback),
			title: 'REJECTED',
			linkText: 'View Denials',
			link: `/applications/rejected`,
			IconComponent: RejectedIcon,
			color: 'custom.brown',
		},
		{
			id: ApplicationStatus.deleted,
			category: 'status',
			fetcher: (callback) => getRealTimeApplicationCountByStatus(ApplicationStatus.deleted, callback),
			title: 'DELETED',
			linkText: 'View Trash',
			link: `/applications/deleted`,
			IconComponent: DeletedIcon,
			color: 'custom.red',
		},
		{
			id: 'live-count',
			category: 'live',
			fetcher: (callback) => getRealTimeActiveAuthenticatedUsersCount(callback),
			title: 'LIVE COUNT',
			linkText: 'View members',
			link: '/members',
			IconComponent: LiveCountIcon,
			color: 'success.main',
		},
	],
	layout: [
		{ id: 'widgets', type: 'widgets' },
		{
			id: 'featuredComponent',
			variant: 'featured',
			type: 'customRow',
			containerSx: dashboardFeaturedRowSx,
			components: [
				{ id: 'featured', component: Featured, props: { variant: 'dashboard' } },
				{ id: 'chart', component: Chart, props: { title: 'PROGRAM HISTORY', variant: 'dashboard' } },
				{ id: 'interviews', component: InterviewStatusPanel, props: { variant: 'dashboard' } },
			],
		},
		{
			id: 'applicantOutlookComponent',
			variant: 'panel',
			type: 'customRow',
			display: { xs: 'none', sm: 'flex' },
			containerSx: { flexDirection: 'column', mb: 2 },
			components: [
				{
					id: 'applicantOutlook',
					component: ApplicantOutlookPanel,
					fetcher: (callback) => getRealTimeDashboardApplicantOutlook(callback),
					initialState: null,
				},
			],
		},
		{
			id: 'recentAppsComponent',
			variant: 'panel',
			type: 'customRow',
			display: { xs: 'none', sm: 'flex' },
			containerSx: { flexDirection: 'column' },
			components: [
				{
					id: 'recentAppsTable',
					component: ({ data }: { data: unknown }) => (
						<Box sx={{ width: '100%', minWidth: 0, px: 2, pt: 1.5, pb: 1.5 }}>
							<Typography sx={dashboardSectionTitleSx}>RECENT ACTIVITY</Typography>
							<CollapsableTable data={data as string[]} />
						</Box>
					),
					fetcher: (callback) => getRealTimeMostRecentApplicationIDs(callback, 5),
					initialState: [],
				},
			],
		},
	],
};
