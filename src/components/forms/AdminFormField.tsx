import React from 'react';
import { Box, FormHelperText, FormLabel } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { adminFormFieldSx, adminFormHelperSx, adminFormLabelSx } from '../../config/ui/adminFormStyles';

interface AdminFormFieldProps {
	id: string;
	label: string;
	required?: boolean;
	helperText?: string;
	disabled?: boolean;
	children: React.ReactNode;
	sx?: SxProps<Theme>;
}

const AdminFormField: React.FC<AdminFormFieldProps> = ({ id, label, required, helperText, disabled, children, sx }) => (
	<Box
		component='fieldset'
		disabled={disabled}
		sx={[
			{
				...adminFormFieldSx,
				border: 'none',
				m: 0,
				p: 0,
				opacity: disabled ? 0.72 : 1,
			},
			...(Array.isArray(sx) ? sx : [sx]),
		]}>
		<FormLabel htmlFor={id} required={required} sx={adminFormLabelSx}>
			{label}
		</FormLabel>
		<Box sx={{ mt: 0.75, width: '100%' }}>{children}</Box>
		{helperText && (
			<FormHelperText component='div' sx={adminFormHelperSx}>
				{helperText}
			</FormHelperText>
		)}
	</Box>
);

export default AdminFormField;
