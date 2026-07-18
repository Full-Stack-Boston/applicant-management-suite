import React from 'react';
import { Avatar, Box, Grid, Paper, Typography } from '@mui/material';
import { displayFont, homeAccentStripe, homeCardBorder, homePrimaryForeground, homeSectionAltBg } from '../home/homePageStyles';
import { useTheme } from '../../context/ThemeContext';

interface AuthFormCardProps {
	title: React.ReactNode;
	icon?: React.ReactNode;
	eyebrow?: string;
	subtitle?: React.ReactNode;
	/** Extra intro content below the header (e.g. multi-paragraph guidance on split layouts). */
	intro?: React.ReactNode;
	children: React.ReactNode;
	/** Stacked = compact centered card; split = intro panel + form side by side on desktop. */
	layout?: 'stacked' | 'split';
	/** narrow ≈ login; wide ≈ registration; dashboard ≈ applicant portal with more content. */
	size?: 'narrow' | 'wide' | 'dashboard';
	/** Tighter padding for status/utility cards that must fit one screen. */
	compact?: boolean;
	/** Left-align stacked headers (e.g. data-heavy review pages). */
	headerAlign?: 'center' | 'left';
	/** Horizontal icon + title row with optional top-right actions. */
	denseHeader?: boolean;
	headerActions?: React.ReactNode;
	/** Narrower horizontal padding on xs (e.g. review page on mobile). */
	tightMobile?: boolean;
}

const authPanelPadding = (compact?: boolean, tightMobile?: boolean) =>
	compact
		? {
				pt: { xs: 2, sm: 2.25 },
				px: { xs: tightMobile ? 1 : 2.25, sm: 2.5 },
				pb: { xs: 2, sm: 2.25 },
			}
		: tightMobile
			? {
					pt: { xs: 2.75, md: 4 },
					px: { xs: 1, md: 4 },
					pb: { xs: 2.75, md: 4 },
				}
			: {
					pt: { xs: 3.5, md: 4 },
					px: { xs: 3, md: 4 },
					pb: { xs: 3, md: 4 },
				};

const introSpacing = (compact?: boolean) => (compact ? 1 : 1.5);

function AuthFormHeader({
	title,
	icon,
	eyebrow,
	subtitle,
	align,
	primaryColor,
	compact,
	dense,
	actions,
}: {
	title: React.ReactNode;
	icon?: React.ReactNode;
	eyebrow?: string;
	subtitle?: React.ReactNode;
	align: 'center' | 'left';
	primaryColor: string;
	compact?: boolean;
	dense?: boolean;
	actions?: React.ReactNode;
}) {
	const centered = align === 'center' && !dense;

	if (dense) {
		return (
			<Box sx={{ mb: introSpacing(compact) }}>
				<Box
					sx={{
						display: 'flex',
						flexDirection: { xs: 'column', md: 'row' },
						width: '100%',
						alignItems: { xs: 'stretch', md: 'flex-start' },
						gap: { xs: 2, md: 1.5 },
					}}>
					<Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
						{icon && (
							<Avatar
								sx={{
									flexShrink: 0,
									bgcolor: 'primary.main',
									color: homePrimaryForeground(primaryColor),
									width: 40,
									height: 40,
								}}>
								{icon}
							</Avatar>
						)}
						<Box sx={{ minWidth: 0 }}>
							{eyebrow && (
								<Typography
									variant='overline'
									sx={{
										display: 'block',
										letterSpacing: '0.18em',
										fontWeight: 700,
										color: (theme) => theme.palette.contentAccent.main,
										lineHeight: 1.2,
									}}>
									{eyebrow}
								</Typography>
							)}
							{typeof title === 'string' ? (
								<Typography
									component='h1'
									sx={{
										fontFamily: displayFont,
										fontSize: { xs: '1.35rem', sm: '1.5rem' },
										lineHeight: 1.2,
										fontWeight: 400,
										mt: eyebrow ? 0.25 : 0,
									}}>
									{title}
								</Typography>
							) : (
								<Box component='h1' sx={{ mt: eyebrow ? 0.25 : 0 }}>
									{title}
								</Box>
							)}
							{subtitle && (
								<Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, lineHeight: 1.45 }}>
									{subtitle}
								</Typography>
							)}
						</Box>
					</Box>
					{actions && (
						<Box
							sx={{
								flexShrink: 0,
								ml: { xs: 0, md: 'auto' },
								alignSelf: { xs: 'stretch', md: 'flex-start' },
								width: { xs: '100%', md: 'auto' },
							}}>
							{actions}
						</Box>
					)}
				</Box>
			</Box>
		);
	}

	return (
		<Box sx={{ textAlign: align, mb: centered ? (compact ? 1 : 2) : 0, width: '100%' }}>
			{actions && (
				<Box
					sx={{
						display: { xs: 'flex', md: 'none' },
						flexDirection: 'column',
						alignItems: 'stretch',
						gap: 1.5,
						width: '100%',
						mb: compact ? 1 : 1.5,
					}}>
					<Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>{actions}</Box>
					<Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', minWidth: 0 }}>
						{icon && (
							<Avatar
								sx={{
									flexShrink: 0,
									bgcolor: 'primary.main',
									color: homePrimaryForeground(primaryColor),
									width: 40,
									height: 40,
								}}>
								{icon}
							</Avatar>
						)}
						<Box sx={{ flex: 1, minWidth: 0, textAlign: align }}>
							{eyebrow && (
								<Typography
									variant='overline'
									sx={{
										display: 'block',
										letterSpacing: '0.18em',
										fontWeight: 700,
										color: (theme) => theme.palette.contentAccent.main,
										lineHeight: 1.2,
									}}>
									{eyebrow}
								</Typography>
							)}
							{typeof title === 'string' ? (
								<Typography
									component='h1'
									sx={{
										fontFamily: displayFont,
										fontSize: { xs: '1.35rem', sm: '1.5rem' },
										lineHeight: 1.2,
										fontWeight: 400,
										mt: eyebrow ? 0.25 : 0,
									}}>
									{title}
								</Typography>
							) : (
								<Box component='h1' sx={{ mt: eyebrow ? 0.25 : 0 }}>
									{title}
								</Box>
							)}
						</Box>
					</Box>
				</Box>
			)}
			<Box sx={{ display: actions ? { xs: 'none', md: 'block' } : 'block' }}>
				{icon && (
					<Avatar
						sx={{
							mx: centered ? 'auto' : 0,
							mb: compact ? 1 : 1.5,
							bgcolor: 'primary.main',
							color: homePrimaryForeground(primaryColor),
							width: compact ? 44 : centered ? 52 : 48,
							height: compact ? 44 : centered ? 52 : 48,
						}}>
						{icon}
					</Avatar>
				)}
				{eyebrow && (
					<Typography
						variant='overline'
						sx={{
							display: 'block',
							letterSpacing: '0.18em',
							fontWeight: 700,
							color: (theme) => theme.palette.contentAccent.main,
							mb: compact ? 0.5 : 0.75,
						}}>
						{eyebrow}
					</Typography>
				)}
				<Box sx={{ ...homeAccentStripe, mx: centered ? 'auto' : 0 }} />
				{typeof title === 'string' ? (
					<Typography
						component='h1'
						sx={{
							fontFamily: displayFont,
							fontSize: centered
								? compact
									? { xs: '1.45rem', sm: '1.6rem' }
									: { xs: '1.65rem', sm: '1.85rem' }
								: { xs: '1.75rem', md: '2.1rem' },
							lineHeight: 1.2,
							fontWeight: 400,
							mt: compact ? 1 : 1.25,
						}}>
						{title}
					</Typography>
				) : (
					<Box component='h1' sx={{ mt: 1.25 }}>
						{title}
					</Box>
				)}
				{subtitle && (
					<Typography
						variant='body1'
						color='text.secondary'
						sx={{
							mt: compact ? 0.75 : 1.25,
							lineHeight: compact ? 1.45 : 1.6,
							maxWidth: centered ? 560 : 360,
							mx: centered ? 'auto' : 0,
							textAlign: centered ? 'center' : 'left',
							fontSize: compact ? '0.9rem' : undefined,
						}}>
						{subtitle}
					</Typography>
				)}
			</Box>
			{actions && align === 'left' && (
				<Box sx={{ ...homeAccentStripe, display: { xs: 'block', md: 'none' }, mt: 0.5, mb: compact ? 1 : 1.5 }} />
			)}
		</Box>
	);
}

export default function AuthFormCard({
	title,
	icon,
	eyebrow = 'Account',
	subtitle,
	intro,
	children,
	layout = 'stacked',
	size = 'narrow',
	compact = false,
	headerAlign,
	denseHeader = false,
	headerActions,
	tightMobile = false,
}: AuthFormCardProps) {
	const { darkMode, primaryColor } = useTheme();
	const isSplit = layout === 'split';
	const stackedAlign = headerAlign ?? 'center';
	const maxWidth = isSplit
		? size === 'dashboard'
			? 1040
			: 920
		: size === 'dashboard'
			? 1040
			: size === 'wide'
				? 640
				: 440;
	const stackedPanelPadding = compact
		? {
				pt: { xs: 2, sm: 2.25 },
				px: { xs: tightMobile ? 1 : 2.25, sm: 2.5 },
				pb: { xs: 2, sm: 2.25 },
			}
		: { pt: { xs: 3.5, sm: 4 }, px: { xs: 3, sm: 3.5 }, pb: { xs: 3, sm: 3.5 } };

	const splitPanelPadding = authPanelPadding(compact, tightMobile);

	const header = (
		<AuthFormHeader
			title={title}
			icon={icon}
			eyebrow={eyebrow}
			subtitle={subtitle}
			align={isSplit ? 'left' : stackedAlign}
			primaryColor={primaryColor}
			compact={compact}
			dense={denseHeader}
			actions={headerActions}
		/>
	);

	return (
		<Paper
			variant='outlined'
			sx={{
				borderRadius: 3,
				width: '100%',
				maxWidth,
				mx: 'auto',
				boxSizing: 'border-box',
				borderColor: homeCardBorder(darkMode),
				overflow: 'hidden',
			}}>
			{isSplit ? (
				<Grid container sx={{ alignItems: 'stretch', minWidth: 0, maxWidth: '100%' }}>
					<Grid
						size={{ xs: 12, md: 5 }}
						sx={{
							...splitPanelPadding,
							bgcolor: homeSectionAltBg(darkMode),
							borderBottom: { xs: '1px solid', md: 'none' },
							borderRight: { md: '1px solid' },
							borderColor: homeCardBorder(darkMode),
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'flex-start',
						}}>
						{header}
						{intro && (
							<Box sx={{ mt: 3, width: '100%', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
								{intro}
							</Box>
						)}
					</Grid>
					<Grid
						size={{ xs: 12, md: 7 }}
						sx={{
							...splitPanelPadding,
							minWidth: 0,
							maxWidth: '100%',
							boxSizing: 'border-box',
							display: 'flex',
							flexDirection: 'column',
						}}>
						{children}
					</Grid>
				</Grid>
			) : (
				<Box sx={{ ...stackedPanelPadding, minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
					{header}
					{intro && <Box sx={{ mb: introSpacing(compact) }}>{intro}</Box>}
					{children}
				</Box>
			)}
		</Paper>
	);
}
