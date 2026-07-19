/**
 * ADMIN DASHBOARD (MemberDash)
 * ---------------------------------------------------------------------------
 * Shell that orchestrates data fetching for child components.
 * Layout tokens match PF adminPageStyles (responsive widget grid + featured row).
 */

import { createElement, useEffect, useState, useMemo, useCallback } from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { useAlert } from '../../context/AlertContext';
import { toJsDate } from '../../config/data/dateValue';

import { memberDashContent as dashboardConfig } from '../../config/admin';
import { dashboardPanelSx, dashboardWidgetGridSx } from '../../config/ui/adminPageStyles';
import Widget from '../../components/widget/Widget';
import Loader from '../../components/loader/Loader';

const WIDGETS_PER_ROW = 4;

type Unsubscribe = () => void;
type MaybePromiseUnsub = Unsubscribe | Promise<Unsubscribe | void | undefined> | void | null | undefined;

interface WidgetAmounts {
	amount?: number;
	comparisonAmount?: number;
}

type DashboardData = Record<string, WidgetAmounts | unknown>;

type DashboardWidget = (typeof dashboardConfig.widgets)[number];
type LayoutRow = (typeof dashboardConfig.layout)[number];
type LayoutComponent = NonNullable<LayoutRow['components']>[number];

const getWidgetGridSpan = (index: number, total: number): number => {
	const remainder = total % WIDGETS_PER_ROW;
	if (remainder === 0) return 1;
	const lastRowStart = total - remainder;
	if (index < lastRowStart) return 1;
	return WIDGETS_PER_ROW / remainder;
};

const MemberDash = () => {
	useTitle({ title: 'Dashboard', appear: false });
	const { boxShadow } = useTheme();
	const config = useConfig();
	const { showAnnouncement, handleError } = useAlert();

	const [loading, setLoading] = useState(true);
	const [dashboardData, setDashboardData] = useState<DashboardData>({});

	const setupDataFetcher = useCallback((comp: LayoutComponent): Unsubscribe | null => {
		if (!comp.fetcher) return null;

		setDashboardData((prev) => ({ ...prev, [comp.id]: comp.initialState }));

		const handler = (data: unknown) => {
			setDashboardData((prev) => ({ ...prev, [comp.id]: data }));
		};

		const result = comp.fetcher(handler) as MaybePromiseUnsub;
		if (result && typeof (result as Promise<unknown>).then === 'function') {
			let asyncUnsub: Unsubscribe | undefined;
			void (result as Promise<Unsubscribe | void | undefined>).then((unsub) => {
				asyncUnsub = typeof unsub === 'function' ? unsub : undefined;
			});
			return () => {
				if (typeof asyncUnsub === 'function') asyncUnsub();
			};
		}

		return typeof result === 'function' ? result : null;
	}, []);

	const pushUnsub = (unsubs: Unsubscribe[], result: MaybePromiseUnsub) => {
		if (!result) return;
		if (typeof result === 'function') {
			unsubs.push(result);
			return;
		}
		if (typeof (result as Promise<unknown>).then === 'function') {
			let asyncUnsub: Unsubscribe | undefined;
			void (result as Promise<Unsubscribe | void | undefined>).then((unsub) => {
				asyncUnsub = typeof unsub === 'function' ? unsub : undefined;
			});
			unsubs.push(() => {
				if (typeof asyncUnsub === 'function') asyncUnsub();
			});
		}
	};

	const setupWidgetListeners = useCallback((widget: DashboardWidget, priorCycleYear: number, unsubs: Unsubscribe[]) => {
		if (widget.fetcher) {
			pushUnsub(
				unsubs,
				widget.fetcher((count) => {
					setDashboardData((prev) => ({
						...prev,
						[widget.id]: { ...(prev[widget.id] as WidgetAmounts | undefined), amount: count as number },
					}));
				}) as MaybePromiseUnsub
			);
		}

		if (widget.comparisonFetcher) {
			pushUnsub(
				unsubs,
				widget.comparisonFetcher(priorCycleYear, (count) => {
					setDashboardData((prev) => ({
						...prev,
						[widget.id]: { ...(prev[widget.id] as WidgetAmounts | undefined), comparisonAmount: count as number },
					}));
				}) as MaybePromiseUnsub
			);
		}
	}, []);

	const setupCustomRowListeners = useCallback(
		(row: LayoutRow, unsubs: Unsubscribe[]) => {
			if (row.type === 'customRow' && row.components) {
				for (const comp of row.components) {
					const unsub = setupDataFetcher(comp);
					if (typeof unsub === 'function') unsubs.push(unsub);
				}
			}
		},
		[setupDataFetcher]
	);

	useEffect(() => {
		if (config.MEMBER_MESSAGE) {
			showAnnouncement({ message: String(config.MEMBER_MESSAGE) });
		}
	}, [config.MEMBER_MESSAGE, showAnnouncement]);

	useEffect(() => {
		if (!config.APPLICATION_DEADLINE && config.CYCLE_YEAR === undefined) return;

		setLoading(true);
		const unsubs: Unsubscribe[] = [];
		const currentYear =
			typeof config.CYCLE_YEAR === 'number' && Number.isFinite(config.CYCLE_YEAR)
				? config.CYCLE_YEAR
				: (toJsDate(config.APPLICATION_DEADLINE)?.getFullYear() ?? new Date().getFullYear());
		const priorCycleYear = currentYear - 1;

		try {
			for (const widget of dashboardConfig.widgets) {
				setupWidgetListeners(widget, priorCycleYear, unsubs);
			}
			for (const row of dashboardConfig.layout) {
				setupCustomRowListeners(row, unsubs);
			}
		} catch (error) {
			handleError(error, 'Dashboard Data Fetch');
		} finally {
			setLoading(false);
		}

		return () => {
			for (const unsub of unsubs) {
				unsub?.();
			}
		};
	}, [config.APPLICATION_DEADLINE, config.CYCLE_YEAR, handleError, setupWidgetListeners, setupCustomRowListeners]);

	const widgetCalculations = useMemo(() => {
		const totals = { potentiallyEligible: 0, status: 0 };
		// PF parity: status % denominator is the sum of the three type widgets (pipeline volume).
		const typeIds = new Set(['New Applicant', 'Returning Grant', 'Scholarship Check In']);

		for (const widget of dashboardConfig.widgets) {
			const amount = (dashboardData[widget.id] as WidgetAmounts | undefined)?.amount ?? 0;
			if (widget.category === 'potentiallyEligible') {
				totals.potentiallyEligible += amount;
			}
			if (typeIds.has(widget.id)) {
				totals.status += amount;
			}
		}

		const baseForStatus = totals.status > 0 ? totals.status : 1;
		const infoMap: Record<string, { amount: number; percent: number | string; gain?: boolean }> = {};

		for (const widget of dashboardConfig.widgets) {
			const { amount = 0, comparisonAmount = 0 } = (dashboardData[widget.id] as WidgetAmounts | undefined) ?? {};
			if (widget.category === 'live') {
				infoMap[widget.id] = { amount, percent: 'N/A' };
				continue;
			}
			const total = widget.category === 'potentiallyEligible' ? totals.potentiallyEligible : baseForStatus;
			const percent = total > 0 ? Number.parseFloat(((amount / total) * 100).toFixed(2)) : 0;
			const gain = widget.isGainPositive ? widget.isGainPositive(amount, comparisonAmount) : undefined;
			infoMap[widget.id] = { amount, percent, gain };
		}

		return infoMap;
	}, [dashboardData]);

	if (loading) return <Loader />;

	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'column',
				gap: { xs: 1.5, md: 2 },
				width: '100%',
				maxWidth: '100%',
				minWidth: 0,
				flexShrink: 0,
				boxSizing: 'border-box',
			}}>
			{dashboardConfig.layout.map((row) => {
				if (row.type === 'widgets') {
					const widgetCount = dashboardConfig.widgets.length;
					return (
						<Box key={row.id} sx={dashboardWidgetGridSx}>
							{dashboardConfig.widgets.map((widget, index) => (
								<Box
									key={widget.id}
									sx={{
										gridColumn: { md: `span ${getWidgetGridSpan(index, widgetCount)}` },
										minWidth: 0,
									}}>
									<Widget title={widget.title} linkText={widget.linkText} link={widget.link} IconComponent={widget.IconComponent} color={widget.color} info={widgetCalculations[widget.id]} />
								</Box>
							))}
						</Box>
					);
				}

				if (row.type === 'customRow') {
					const isFeaturedRow = row.variant === 'featured';
					const isPanelRow = row.variant === 'panel';

					const rowSx = {
						width: '100%',
						maxWidth: '100%',
						minWidth: 0,
						boxSizing: 'border-box' as const,
						...(isPanelRow ? dashboardPanelSx(boxShadow) : {}),
						...(row.containerSx && typeof row.containerSx === 'object' && !Array.isArray(row.containerSx) ? (row.containerSx as Record<string, unknown>) : {}),
						...(row.display ? { display: row.display } : {}),
					} as SxProps<Theme>;

					return (
						<Box key={row.id} sx={rowSx}>
							{row.components?.map((comp) => {
								const wrapperSx = (comp as LayoutComponent & { wrapperSx?: Record<string, unknown> }).wrapperSx;
								return (
								<Box
									key={comp.id}
									sx={{
										display: 'flex',
										flexDirection: 'column',
										borderRadius: isFeaturedRow ? '12px' : 0,
										overflow: 'hidden',
										boxShadow: isFeaturedRow ? boxShadow : 'none',
										bgcolor: isFeaturedRow ? 'background.paper' : 'transparent',
										minWidth: 0,
										width: '100%',
										minHeight: isFeaturedRow ? { xs: 280, md: '100%' } : 0,
										height: isFeaturedRow ? '100%' : 'auto',
										boxSizing: 'border-box',
										...wrapperSx,
									}}>
									{createElement(comp.component, {
										...comp.props,
										data: dashboardData[comp.id],
									})}
								</Box>
								);
							})}
						</Box>
					);
				}
				return null;
			})}
		</Box>
	);
};

export default MemberDash;
