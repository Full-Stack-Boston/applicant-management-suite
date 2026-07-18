/**
 * Generic Admin Form Wrapper
 * Renders a form based on a configuration object, specifically designed for
 * Member or System Admin editing tasks. Supports nested permission updates.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Grid, Box } from '@mui/material';

import DynamicField from './DynamicField';
import PermissionGroup from './PermissionGroup';
import { useAlert } from '../../context/AlertContext';

import type { GenericAdminFormProps } from './types';

const GenericAdminForm = ({ formConfig, initialData, onSubmit, onFileUpload, onFieldChange, permissions }: GenericAdminFormProps) => {
	const navigate = useNavigate();
	const { showAlert } = useAlert();
	const [formData, setFormData] = useState<GenericAdminFormProps['initialData']>(initialData);
	const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

	useEffect(() => {
		setFormData(initialData);
	}, [initialData]);

	const handleFieldUpdate = (path: string, value: unknown) => {
		// Special handling for permissions to ensure deep nesting is preserved
		if (path.startsWith('permissions.')) {
			const parts = path.split('.');

			setFormData((prev) => {
				const newPermissions = { ...((prev.permissions ?? {}) as Record<string, unknown>) };

				if (parts.length === 2) {
					// e.g. permissions.admin
					newPermissions[parts[1]] = value;
				} else if (parts.length === 3) {
					// e.g. permissions.interviews.canHost
					const group = parts[1];
					const key = parts[2];
					newPermissions[group] = {
						...((newPermissions[group] ?? {}) as Record<string, unknown>),
						[key]: value,
					};
				}

				return { ...prev, permissions: newPermissions };
			});
		} else {
			// Standard Top-Level Field
			const fieldName = path.split('.').pop() ?? path;
			setFormData((prev) => ({ ...prev, [fieldName]: value }));
		}

		// Notify parent if listener exists
		if (onFieldChange) onFieldChange(path, value);
	};

	const handleErrorUpdate = (field: string, hasError: boolean) => {
		setFieldErrors((prev) => ({ ...prev, [field]: hasError }));
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const hasErrors = Object.values(fieldErrors).some(Boolean);
		if (hasErrors) {
			showAlert({ message: 'Please fix the errors before submitting.', type: 'error' });
		} else {
			onSubmit(formData);
		}
	};

	// Helper to determine Grid column span
	const getGridSize = (field: { width?: string }) => {
		if (field.width === 'half') return { xs: 12, sm: 6 };
		if (field.width === 'third') return { xs: 12, sm: 4 };
		return { xs: 12 };
	};

	return (
		<form onSubmit={handleSubmit}>
			<Grid container spacing={2}>
				{formConfig.fields.map((fieldConfig) => {
					const gridSize = getGridSize(fieldConfig);
					const isDisabled = fieldConfig.disableOn ? fieldConfig.disableOn(permissions) : false;

					return (
						<Grid size={gridSize} key={fieldConfig.name}>
							{fieldConfig.type === 'permissionGroup' ? (
								<PermissionGroup formData={formData} onUpdate={setFormData} groups={fieldConfig.groups ?? {}} disabled={isDisabled || !permissions?.admin} />
							) : (
								<DynamicField
									fieldConfig={{ ...fieldConfig, disabled: fieldConfig.disabled || isDisabled }}
									application={{ [formConfig.name]: formData }}
									sectionName={formConfig.name}
									onFieldUpdate={handleFieldUpdate}
									onErrorUpdate={handleErrorUpdate}
									forceValidate={false}
									onFileAction={onFileUpload}
									permissions={permissions}
								/>
							)}
						</Grid>
					);
				})}

				<Box sx={{ display: 'flex', width: '100%', flexDirection: 'row', gap: 2, mt: 4, mb: 2, alignItems: 'center', justifyContent: 'flex-end' }}>
					<Button variant='outlined' onClick={() => navigate(-1)}>
						Cancel
					</Button>
					<Button type='submit' variant='contained'>
						Save Changes
					</Button>
				</Box>
			</Grid>
		</form>
	);
};

export default GenericAdminForm;
