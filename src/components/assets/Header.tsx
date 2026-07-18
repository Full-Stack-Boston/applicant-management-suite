/**
 * Header Component
 * Profile header with avatar, title, status badge, and optional edit action.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar, Button } from '@mui/material';
import PropTypes from 'prop-types';
import type { HeaderProps } from './types';

const Header = ({ image, title, status, editPath, config = {}, children, compact = false }: HeaderProps) => {
	const navigate = useNavigate();

	return (
		<>
			{editPath && (
				<Button
					variant='contained'
					size='small'
					onClick={() => navigate(editPath)}
					sx={{
						position: 'absolute',
						top: 0,
						right: 0,
						minWidth: 0,
						px: 1.5,
						py: 0.5,
						borderRadius: '0 12px 0 12px',
						zIndex: 1,
						boxShadow: 'none',
					}}>
					Edit
				</Button>
			)}

			<Box
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					mb: compact ? 1.5 : 2.5,
					mt: compact ? 0.5 : 1.5,
					gap: 2,
				}}>
				<Typography variant='subtitle1' component='span' sx={{ ml: 1 }}>
					Information
				</Typography>

				{status && (
					<Typography
						sx={{
							fontSize: '14px',
							letterSpacing: '1px',
							fontWeight: 600,
							borderRadius: '14px',
							bgcolor: 'primary.main',
							color: 'primary.contrastText',
							textAlign: 'center',
							padding: '3px 10px',
						}}>
						{status}
					</Typography>
				)}
			</Box>

			<Box
				sx={{
					display: 'flex',
					gap: { xs: 1.5, md: compact ? 1.5 : '20px' },
					mt: compact ? 1.5 : 3,
					flexDirection: { xs: 'column', sm: 'row' },
					alignItems: { xs: 'center', sm: 'flex-start' },
					minWidth: 0,
				}}>
				<Avatar
					src={image || config.DEFAULT_AVATAR}
					alt='Profile'
					sx={{
						width: compact ? { xs: 80, sm: 88 } : 100,
						height: compact ? { xs: 80, sm: 88 } : 100,
						flexShrink: 0,
						objectFit: 'cover',
						borderRadius: '50%',
						mt: { xs: 0, sm: compact ? 0 : '-15px' },
						border: '2px solid',
						borderColor: 'background.paper',
					}}
				/>
				<Box sx={{ minWidth: 0, flex: 1, width: '100%' }}>
					<Typography
						variant='h3'
						sx={{
							mb: compact ? 0.75 : '10px',
							fontSize: compact ? { xs: '1.6rem', md: '2rem' } : { xs: '1.5rem', md: '2.5rem' },
							color: 'text.primary',
							wordBreak: 'break-word',
							overflowWrap: 'anywhere',
						}}>
						{title}
					</Typography>
					{children}
				</Box>
			</Box>
		</>
	);
};

Header.propTypes = {
	image: PropTypes.string,
	title: PropTypes.string,
	status: PropTypes.string,
	editPath: PropTypes.string,
	config: PropTypes.object,
	children: PropTypes.node,
	compact: PropTypes.bool,
};

export default Header;
