/**
 * Status capsule styles for asset profile headers and mobile list cards.
 */

import type { SxProps, Theme } from '@mui/material';
import { ApplicationStatus, InterviewStatus } from '../data/collections';

// Application and interview statuses share some display labels (e.g. "Completed",
// "Invited"); spreading two literals keeps last-wins merge semantics without
// tripping the duplicate-property check.
const APPLICATION_STATUS_BACKGROUNDS: Record<string, string> = {
	[ApplicationStatus.started]: 'lightblue',
	[ApplicationStatus.submitted]: 'violet',
	[ApplicationStatus.completed]: 'palegreen',
	[ApplicationStatus.incomplete]: 'navajowhite',
	[ApplicationStatus.eligible]: 'lightgreen',
	[ApplicationStatus.ineligible]: 'lightgray',
	[ApplicationStatus.invited]: 'lightblue',
	[ApplicationStatus.deferred]: 'gold',
	[ApplicationStatus.awarded]: 'goldenrod',
	[ApplicationStatus.denied]: 'pink',
	[ApplicationStatus.deleted]: 'lightgray',
};

const INTERVIEW_STATUS_BACKGROUNDS: Record<string, string> = {
	[InterviewStatus.scheduled]: 'lightblue',
	[InterviewStatus.invited]: 'gold',
	[InterviewStatus.confirmed]: 'palegreen',
	[InterviewStatus.inProgress]: 'violet',
	[InterviewStatus.completed]: 'lightgreen',
	[InterviewStatus.cancelled]: 'pink',
	[InterviewStatus.missed]: 'red',
};

const STATUS_BACKGROUNDS: Record<string, string> = {
	...APPLICATION_STATUS_BACKGROUNDS,
	...INTERVIEW_STATUS_BACKGROUNDS,
};

const RSVP_BACKGROUNDS: Record<string, string> = {
	yes: 'palegreen',
	no: 'pink',
	unknown: 'lightgray',
};

const capsuleBaseSx: SxProps<Theme> = {
	fontWeight: 'bold',
	color: 'rgba(0, 0, 0, 0.87)',
	px: 1.5,
	py: 0.5,
	borderRadius: '16px',
	display: 'inline-block',
	fontSize: '0.8125rem',
	letterSpacing: '0.04em',
};

export const getStatusCapsuleSx = (status: string): SxProps<Theme> => ({
	...(capsuleBaseSx as Record<string, unknown>),
	bgcolor: STATUS_BACKGROUNDS[status] || 'action.hover',
});

export const getRsvpCapsuleSx = (rsvpStatus: string): SxProps<Theme> => {
	let key = 'unknown';
	if (rsvpStatus === 'yes') key = 'yes';
	else if (rsvpStatus === 'no') key = 'no';

	return {
		...(capsuleBaseSx as Record<string, unknown>),
		bgcolor: RSVP_BACKGROUNDS[key],
	};
};
