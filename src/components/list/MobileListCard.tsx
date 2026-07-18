import React, { useMemo, useState } from 'react';
import { Box, CardActions, CircularProgress, Divider, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

import { adminMobileCardSx } from '../../config/ui/adminPageStyles';
import { ActionCellButton, resolveRowActionMeta, useRowActionInvoker } from '../../config/ui/tableConfig';
import type { NavigateFunction } from 'react-router-dom';
import type { SvgIconComponent } from '@mui/icons-material';

const DEFAULT_PRIMARY_COUNT = 3;

interface MobileListCardProps {
	children: React.ReactNode;
	actionKeys?: string[];
	primaryCount?: number;
	isUnread?: boolean;
	item: Record<string, unknown>;
	navigate?: NavigateFunction;
	permittedAliases?: string[];
	member?: Record<string, unknown>;
	boxShadow?: string;
}

const MobileListCard = ({ children, actionKeys = [], primaryCount = DEFAULT_PRIMARY_COUNT, isUnread = false, item, navigate, permittedAliases, member, boxShadow }: MobileListCardProps) => {
	const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
	const [loadingKey, setLoadingKey] = useState<string | null>(null);
	const { runAction, handleError, member: authMember } = useRowActionInvoker({ permittedAliases });

	const needsOverflow = actionKeys.length > primaryCount;
	const primaryKeys = needsOverflow ? actionKeys.slice(0, primaryCount) : actionKeys;

	const overflowItems = useMemo(
		() => {
			const keys = needsOverflow ? actionKeys.slice(primaryCount) : [];
			return keys
				.map((key) => {
					const meta = resolveRowActionMeta(key, item as Record<string, unknown> & { id: string }, authMember);
					return meta ? { actionKey: key, ...meta } : null;
				})
				.filter(Boolean) as Array<{ actionKey: string; label: string; IconComponent: SvgIconComponent; color?: string }>;
		},
		[needsOverflow, actionKeys, primaryCount, item, authMember],
	);

	const handleOverflowClick = async (event: React.MouseEvent, actionKey: string) => {
		event.stopPropagation();
		setMenuAnchor(null);
		setLoadingKey(actionKey);
		try {
			await runAction(actionKey, item as Record<string, unknown> & { id: string });
		} catch (error) {
			console.error(error);
			handleError(error, `action-${actionKey}`);
		} finally {
			setLoadingKey(null);
		}
	};

	const actionProps = {
		row: item,
		navigate,
		permittedAliases,
		member,
	};

	const hasActions = actionKeys.length > 0;

	return (
		<Box
			sx={{
				...adminMobileCardSx(boxShadow ?? ''),
				mb: 1.5,
				borderLeft: isUnread ? '5px solid' : 'none',
				borderColor: 'primary.main',
			}}>
			<Box sx={{ flex: 1, minWidth: 0, maxWidth: '100%', overflow: 'hidden', p: { xs: 1.5, sm: 2 }, pb: hasActions ? 0 : 2 }}>
				{children}
			</Box>

			{hasActions && (
				<>
					<Divider sx={{ mx: 1.5, borderColor: 'divider', opacity: 0.5 }} />
					<CardActions
						sx={{
							display: 'flex',
							justifyContent: 'space-evenly',
							alignItems: 'flex-start',
							width: '100%',
							maxWidth: '100%',
							minWidth: 0,
							boxSizing: 'border-box',
							pt: 0.5,
							px: { xs: 0.5, sm: 1 },
							pb: { xs: 0.5, sm: 0.75 },
						}}>
					{primaryKeys.map((key) => (
						<ActionCellButton key={key} actionKey={key} variant='mobile' {...(actionProps as any)} />
					))}

						{needsOverflow && overflowItems.length > 0 && (
							<>
								<Box
									onClick={(e: React.MouseEvent<HTMLDivElement>) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); }}
									aria-label='More actions'
									sx={{
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
										opacity: loadingKey ? 0.5 : 1,
									}}>
									<Box sx={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										width: 36,
										height: 36,
										borderRadius: '10px',
										bgcolor: 'action.hover',
									}}>
										{loadingKey ? (
											<CircularProgress size={18} color='inherit' />
										) : (
											<MoreHorizIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
										)}
									</Box>
									<Typography variant='caption' sx={{
										fontSize: '10px',
										fontWeight: 500,
										color: 'text.secondary',
										lineHeight: 1.2,
									}}>
										More
									</Typography>
								</Box>
								<Menu
									anchorEl={menuAnchor}
									open={Boolean(menuAnchor)}
									onClose={() => setMenuAnchor(null)}
									onClick={(e: React.MouseEvent) => e.stopPropagation()}
									slotProps={{ paper: { sx: { minWidth: 180 } } }}>
									{overflowItems.map(({ actionKey, label, IconComponent, color }) => (
										<MenuItem
											key={actionKey}
											onClick={(e: React.MouseEvent) => handleOverflowClick(e, actionKey)}
											disabled={loadingKey === actionKey}>
											<ListItemIcon>
												<IconComponent fontSize='small' sx={{ color }} />
											</ListItemIcon>
											<ListItemText>{label}</ListItemText>
										</MenuItem>
									))}
								</Menu>
							</>
						)}
					</CardActions>
				</>
			)}
		</Box>
	);
};

export default MobileListCard;
