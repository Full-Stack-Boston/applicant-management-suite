/**
 * Featured Dashboard Widget
 * Displays key metrics: Countdown timer, Progress vs Benchmarks, and 3-Year Award Trends.
 */

import React, { useEffect, useState } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';

// Config & Context
import { ApplicationType } from '../../config/data/collections';
import { getDashboardBenchmarkData } from '../../config/data/firebase';
import { useConfig } from '../../context/ConfigContext';
import { dashboardModuleSurfaceSx, dashboardSectionTitleSx } from '../../config/ui/adminPageStyles';

// Components
import Timer from '../timer/Timer';

// --- Helpers ---

const getAlertLevel = (daysLeft: number, percent: number): string => {
	if (percent >= 100) return 'success';
	if (daysLeft <= 5 && percent < 50) return 'error';
	if (daysLeft <= 10 && percent < 75) return 'warning';
	return 'neutral';
};

const progressColor = (daysLeft: number, percent: number): string => {
	const level = getAlertLevel(daysLeft, percent);
	switch (level) {
		case 'success':
			return 'success.main';
		case 'warning':
			return 'warning.main';
		case 'error':
			return 'error.main';
		default:
			return 'grey.500';
	}
};

const formatDaysRemaining = (days: number): string => {
	if (days > 0) return `${days} day${days === 1 ? '' : 's'} left`;
	if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
	return 'today';
};

const TREND_STACK_HEIGHT = 72;
const TREND_SEGMENT_MIN = 20;

const trendSegmentHeight = (count: number, maxCount: number): number => {
	if (count === 0) return TREND_SEGMENT_MIN;
	if (maxCount <= 0) return TREND_SEGMENT_MIN;
	return Math.max((count / maxCount) * TREND_STACK_HEIGHT, TREND_SEGMENT_MIN);
};

interface TrendSegmentProps {
	count: number;
	maxCount: number;
	bgcolor: string;
	textColor: string;
	label: string;
}

const TrendSegment = ({ count, maxCount, bgcolor, textColor, label }: TrendSegmentProps) => (
	<Box
		title={`${label}: ${count}`}
		sx={{
			width: 26,
			height: trendSegmentHeight(count, maxCount),
			bgcolor,
			borderRadius: 1,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			flexShrink: 0,
			border: 1,
			borderColor: 'divider',
		}}>
		<Typography
			variant='caption'
			sx={{
				fontSize: '0.7rem',
				fontWeight: 700,
				lineHeight: 1,
				color: textColor,
			}}>
			{count}
		</Typography>
	</Box>
);

interface AwardTrendYear {
	year: number;
	New: number;
	Returning: number;
	Scholarship: number;
}

interface FeaturedProps {
	variant?: 'default' | 'dashboard';
}

const Featured = ({ variant = 'default' }: FeaturedProps) => {
	const config = useConfig();
	const [currentCounts, setCurrentCounts] = useState<Record<string, number>>({});
	const [benchmarks, setBenchmarks] = useState<Record<string, number>>({});
	const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
	const [daysLeft, setDaysLeft] = useState<number>(0);
	const [awardTrends, setAwardTrends] = useState<AwardTrendYear[]>([]);

	useEffect(() => {
		const controller = new AbortController();
		const signal = controller.signal;

		const fetchData = async () => {
			if (!config.APPLICATION_DEADLINE) return;

			const rawDeadline = config.APPLICATION_DEADLINE;
			const deadline =
				rawDeadline && typeof rawDeadline === 'object' && 'toDate' in rawDeadline
					? (rawDeadline as { toDate: () => Date }).toDate()
					: new Date(rawDeadline as string);

			const cycleYear = typeof config.CYCLE_YEAR === 'number' ? config.CYCLE_YEAR : deadline.getFullYear();

			if (!signal.aborted) {
				setDeadlineDate(deadline);
				const now = new Date();
				const daysDiff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
				setDaysLeft(daysDiff);
			}

			try {
				const data = await getDashboardBenchmarkData(cycleYear);

				if (!signal.aborted) {
					setCurrentCounts(data.currentCounts);
					setBenchmarks(data.benchmarkTargets);
					setAwardTrends(data.awardTrends);
				}
			} catch (error) {
				if (!signal.aborted) {
					console.error('Error fetching featured data:', error);
				}
			}
		};

		fetchData();

		return () => controller.abort();
	}, [config.APPLICATION_DEADLINE, config.CYCLE_YEAR]);

	const types = [
		{ key: ApplicationType.newApplication, label: 'New Applicants' },
		{ key: ApplicationType.returningGrant, label: 'Returning Grants' },
		{ key: ApplicationType.scholarship, label: 'Scholarships' },
	];

	return (
		<Box
			sx={{
				...(variant === 'dashboard' ? dashboardModuleSurfaceSx : { px: 2, py: 1.5 }),
				display: 'flex',
				flexDirection: 'column',
				width: '100%',
				height: variant === 'dashboard' ? '100%' : 'auto',
				bgcolor: 'background.paper',
				minHeight: variant === 'dashboard' ? 0 : 280,
				overflow: variant === 'dashboard' ? 'auto' : 'visible',
			}}>
			<Typography sx={dashboardSectionTitleSx}>BENCHMARK PROGRESS</Typography>
			<Typography
				variant='subtitle2'
				gutterBottom
				sx={{
					color: 'text.active',
					alignSelf: 'center',
				}}>
				<Timer />
			</Typography>
			{deadlineDate && (
				<Typography
					variant='caption'
					align='center'
					sx={{
						width: '100%',
						display: 'block',
						color: 'text.primary',
						mb: 1.25,
					}}>
					Deadline: {deadlineDate.toLocaleDateString()} ({formatDaysRemaining(daysLeft)})
				</Typography>
			)}
			{types.map(({ key, label }) => {
				const actual = currentCounts[key] || 0;
				const goal = typeof benchmarks[key] === 'number' ? benchmarks[key] : 0;
				const rawPercent = goal > 0 ? (actual / goal) * 100 : 0;
				const percent = Math.min(Math.round(rawPercent), 100);

				return (
					<Box
						key={key}
						sx={{
							mb: 1.25,
							width: '100%',
						}}>
						<Typography variant='body2' sx={{ color: 'text.primary', mb: 0.35 }}>
							{label}: {actual} / {goal} ({goal > 0 ? `${percent}%` : '—'})
						</Typography>
						<LinearProgress
							variant='determinate'
							value={goal > 0 ? percent : 0}
							sx={{
								width: '100%',
								height: 8,
								borderRadius: 5,
								backgroundColor: 'grey.300',
								'& .MuiLinearProgress-bar': {
									backgroundColor: progressColor(daysLeft, percent),
								},
							}}
						/>
					</Box>
				);
			})}
			{awardTrends.length > 0 && (() => {
				const maxSegment = Math.max(
					...awardTrends.flatMap((entry) => [entry.New, entry.Returning, entry.Scholarship]),
					1
				);

				return (
					<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', mt: 1, alignSelf: 'center' }}>
						<Typography variant='body2' sx={{ color: 'text.primary', mb: 0.75, fontWeight: 600 }}>
							3-Year Award Trends
						</Typography>
						<Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-end', justifyContent: 'center', minHeight: TREND_STACK_HEIGHT + 20 }}>
							{awardTrends.map((entry) => (
								<Box key={entry.year} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: 34 }}>
									<Box
										sx={{
											display: 'flex',
											flexDirection: 'column',
											alignItems: 'center',
											justifyContent: 'flex-end',
											gap: 0.4,
											minHeight: TREND_STACK_HEIGHT,
										}}>
										<TrendSegment count={entry.New} maxCount={maxSegment} bgcolor='primary.main' textColor='primary.contrastText' label='New' />
										<TrendSegment count={entry.Returning} maxCount={maxSegment} bgcolor='grey.700' textColor='common.white' label='Returning' />
										<TrendSegment count={entry.Scholarship} maxCount={maxSegment} bgcolor='success.main' textColor='common.white' label='Scholarship' />
									</Box>
									<Typography variant='caption' sx={{ mt: 0.5, color: 'text.primary', fontSize: '0.65rem' }}>
										{entry.year}
									</Typography>
								</Box>
							))}
						</Box>
						<Box sx={{ display: 'flex', justifyContent: 'center', gap: 2.5, mt: 0.75 }}>
							<Typography variant='caption' sx={{ color: 'primary.main' }}>
								⬤ New
							</Typography>
							<Typography variant='caption' sx={{ color: 'grey.700' }}>
								⬤ Returning
							</Typography>
							<Typography variant='caption' sx={{ color: 'success.main' }}>
								⬤ Scholarship
							</Typography>
						</Box>
					</Box>
				);
			})()}
		</Box>
	);
};

export default Featured;
