/**
 * Area Chart Component
 * Displays application submission trends over time using Recharts.
 * Fetches data dynamically from Firestore on mount.
 */

import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Box, Typography } from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';

import { getApplicationsByYear } from '../../config/data/firebase';
import Loader from '../loader/Loader';
import { dashboardModuleSurfaceSx, dashboardSectionTitleSx } from '../../config/ui/adminPageStyles';

interface GraphDataPoint {
	name: string;
	count: number;
}

interface ChartProps {
	title: string;
	variant?: 'default' | 'dashboard';
}

const Chart = ({ title, variant = 'default' }: ChartProps) => {
	const muiTheme = useMuiTheme();
	const [graphData, setGraphData] = useState<GraphDataPoint[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		const controller = new AbortController();
		const signal = controller.signal;

		const fetchApplicationsData = async () => {
			try {
				const data = await getApplicationsByYear();
				if (!signal.aborted) {
					setGraphData(data as unknown as { name: string; count: number }[]);
				}
			} catch (error) {
				if (!signal.aborted) {
					console.error('Error fetching application data:', error);
				}
			} finally {
				if (!signal.aborted) setLoading(false);
			}
		};

		fetchApplicationsData();

		return () => controller.abort();
	}, []);

	const renderGraph = (data: GraphDataPoint[]) => {
		const gradientOffset = () => {
			if (!data || data.length === 0) return 0;

			const dataMax = Math.max(...data.map((i) => i.count));
			const dataMin = Math.min(...data.map((i) => i.count));

			if (dataMax <= 0) return 0;
			if (dataMin >= 0) return 1;

			return dataMax / (dataMax - dataMin);
		};

		const off = gradientOffset();
		const axisColor = muiTheme.palette.text.secondary;
		const gridColor = muiTheme.palette.divider;
		const strokeColor = muiTheme.palette.text.primary;

		return (
			<ResponsiveContainer width='100%' height='100%'>
				<AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
					<CartesianGrid strokeDasharray='3 3' stroke={gridColor} />
					<XAxis dataKey='name' stroke={axisColor} tick={{ fill: axisColor, fontSize: 12 }} />
					<YAxis stroke={axisColor} tick={{ fill: axisColor, fontSize: 12 }} />
					<Tooltip
						contentStyle={{
							backgroundColor: muiTheme.palette.background.paper,
							borderColor: muiTheme.palette.divider,
							color: muiTheme.palette.text.primary,
							borderRadius: 8,
						}}
					/>
					<defs>
						<linearGradient id='splitColor' x1='0' y1='0' x2='0' y2='1'>
							<stop offset={off} stopColor={muiTheme.palette.success.main} stopOpacity={0.85} />
							<stop offset={off} stopColor={muiTheme.palette.error.main} stopOpacity={0.85} />
						</linearGradient>
					</defs>
					<Area type='monotone' dataKey='count' stroke={strokeColor} fill='url(#splitColor)' fillOpacity={0.9} />
				</AreaChart>
			</ResponsiveContainer>
		);
	};

	return (
		<Box
			sx={{
				...(variant === 'dashboard' ? dashboardModuleSurfaceSx : { px: 2, py: 1.5, borderRadius: '12px', boxShadow: 1 }),
				flex: variant === 'dashboard' ? undefined : 1,
				width: '100%',
				height: '100%',
				minHeight: variant === 'dashboard' ? 0 : 180,
				maxHeight: variant === 'dashboard' ? 'none' : 520,
				bgcolor: 'background.paper',
				color: 'text.secondary',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'flex-start',
				alignItems: 'stretch',
				boxSizing: 'border-box',
			}}>
			<Typography sx={dashboardSectionTitleSx}>{title}</Typography>
			<Box sx={{ flexGrow: 1, width: '100%', overflow: 'hidden', minHeight: 0 }}>{loading ? <Loader /> : renderGraph(graphData)}</Box>
		</Box>
	);
};

export default Chart;
