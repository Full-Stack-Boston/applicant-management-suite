/**
 * Generic Dashboard Widget
 * A reusable card component for displaying key metrics.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import type { ElementType } from 'react';
import { KeyboardArrowUp as ArrowUp, KeyboardArrowDown as ArrowDown, ArrowForward as ArrowForwardIcon } from '@mui/icons-material';

import { useTheme } from '../../context/ThemeContext';

interface WidgetInfo {
	amount?: string | number;
	percent?: string | number;
	gain?: boolean;
}

interface WidgetProps {
	title: string;
	linkText: string;
	link: string;
	IconComponent: ElementType;
	color: string;
	isMoney?: boolean;
	info?: WidgetInfo;
}

const Widget = ({ title, linkText, link, IconComponent, color, isMoney = false, info }: WidgetProps) => {
	const { boxShadow, darkMode } = useTheme();
	const data = info || { amount: 'N/A', percent: 'N/A', gain: false };
	const showPercent = data.percent !== 'N/A';
	const isPositive = data.gain === true;

	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				gap: 0.75,
				px: 1.75,
				py: 1.25,
				borderRadius: '12px',
				boxShadow: boxShadow,
				bgcolor: 'background.paper',
				width: '100%',
				minWidth: 0,
				minHeight: 112,
				boxSizing: 'border-box',
				overflow: 'hidden',
			}}>
			<Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
				<Typography
					noWrap
					sx={{
						fontWeight: 700,
						fontSize: '11px',
						letterSpacing: '0.08em',
						textTransform: 'uppercase',
						lineHeight: 1.3,
						color: 'text.secondary',
						flex: 1,
						minWidth: 0,
					}}>
					{title}
				</Typography>
				{showPercent && (
					<Box
						sx={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 0.25,
							px: 0.75,
							py: 0.35,
							borderRadius: '999px',
							fontSize: '11px',
							fontWeight: 600,
							lineHeight: 1,
							flexShrink: 0,
							bgcolor: isPositive ? 'custom.green' : 'custom.red',
							color: isPositive ? 'text.light' : 'text.dark',
							boxShadow: darkMode ? 'none' : '0 1px 2px rgba(0,0,0,0.08)',
						}}>
						{`${data.percent}%`}
						{isPositive ? <ArrowUp sx={{ fontSize: 14 }} /> : <ArrowDown sx={{ fontSize: 14 }} />}
					</Box>
				)}
				{!showPercent && <Typography sx={{ fontSize: '11px', color: 'text.secondary', flexShrink: 0 }}>-</Typography>}
			</Box>

			<Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1, minWidth: 0, flex: 1 }}>
				<Typography
					component='div'
					sx={{
						fontSize: '26px',
						fontWeight: 300,
						lineHeight: 1,
						letterSpacing: '-0.02em',
						fontVariantNumeric: 'tabular-nums',
						color: 'text.primary',
						minWidth: 0,
					}}>
					{isMoney ? `$${data.amount}` : data.amount}
				</Typography>
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0,
						width: 32,
						height: 32,
						borderRadius: '8px',
						bgcolor: color,
						color: 'custom.black',
						boxShadow: darkMode ? 'none' : 'inset 0 -1px 0 rgba(0,0,0,0.12)',
					}}>
					<IconComponent sx={{ fontSize: '1.1rem' }} />
				</Box>
			</Box>

			<Box
				component={Link}
				to={link}
				sx={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 0.5,
					minWidth: 0,
					maxWidth: '100%',
					fontSize: '12px',
					lineHeight: 1.3,
					color: 'text.secondary',
					textDecoration: 'none',
					borderBottom: '1px solid',
					borderColor: 'transparent',
					width: 'fit-content',
					transition: 'color 0.15s ease, border-color 0.15s ease',
					'&:hover': {
						color: 'text.primary',
						borderColor: 'text.secondary',
					},
				}}>
				<Typography
					component='span'
					noWrap
					sx={{
						fontSize: 'inherit',
						lineHeight: 'inherit',
						color: 'inherit',
					}}>
					{linkText}
				</Typography>
				<ArrowForwardIcon sx={{ fontSize: 14, flexShrink: 0, opacity: 0.7 }} />
			</Box>
		</Box>
	);
};

Widget.propTypes = {
	title: PropTypes.string.isRequired,
	linkText: PropTypes.string.isRequired,
	link: PropTypes.string.isRequired,
	IconComponent: PropTypes.elementType.isRequired,
	color: PropTypes.string.isRequired,
	isMoney: PropTypes.bool,
	info: PropTypes.shape({
		amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		percent: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		gain: PropTypes.bool,
	}),
};

export default Widget;
