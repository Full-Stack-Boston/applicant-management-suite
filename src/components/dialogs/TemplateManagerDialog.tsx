import React, { useState } from 'react';
import {
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Box,
	Typography,
	IconButton,
	List,
	ListItem,
	ListItemText,
	ListItemSecondaryAction,
	Divider,
	type SelectChangeEvent,
} from '@mui/material';
import { DeleteOutlined, AddCircleOutlined } from '@mui/icons-material';
import { useEmailTemplates } from '../../context/EmailTemplateContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/data/firebase';
import { collections } from '../../config/data/collections';
import { useAlert } from '../../context/AlertContext';

const groupOptions = ['Canned Notifications', 'Reminders', 'Deadline', 'Application Status'];

interface RequiredField {
	name: string;
	label: string;
	type: string;
}

interface EditableTemplate {
	key: string;
	id?: string;
	label: string;
	group: string;
	subject: string;
	html: string;
	requiredFields: RequiredField[];
	isSystem: boolean;
	[key: string]: unknown;
}

interface TemplateManagerDialogProps {
	onClose?: () => void;
}

const TemplateManagerDialog = ({ onClose }: TemplateManagerDialogProps) => {
	const { templates } = useEmailTemplates();
	const { showAlert, handleError } = useAlert();
	const [view, setView] = useState<'list' | 'edit'>('list');
	const [editingTemplate, setEditingTemplate] = useState<EditableTemplate | null>(null);

	const handleAddClick = () => {
		setEditingTemplate({
			key: '',
			label: '',
			group: groupOptions[0],
			subject: '',
			html: '',
			requiredFields: [],
			isSystem: false,
		});
		setView('edit');
	};

	const handleEditClick = (template: Record<string, unknown>) => {
		setEditingTemplate({ ...template, key: (template.key || template.id) as string } as EditableTemplate);
		setView('edit');
	};

	const handleSave = async () => {
		if (!editingTemplate?.key || !editingTemplate.label || !editingTemplate.subject) {
			showAlert({ message: 'Key, Label, and Subject are required.', type: 'warning' });
			return;
		}

		try {
			const templateRef = doc(db, collections.emailTemplates, editingTemplate.key);
			await setDoc(templateRef, { ...editingTemplate, id: editingTemplate.key });
			showAlert({ message: 'Template saved successfully!', type: 'success' });
			setView('list');
		} catch (error) {
			handleError(error, 'saveTemplate');
		}
	};

	const handleFieldChange = (field: keyof EditableTemplate & string, value: string) => {
		setEditingTemplate((prev) => (prev ? { ...prev, [field]: value } : null));
	};

	const addRequiredField = () => {
		setEditingTemplate((prev) =>
			prev
				? {
						...prev,
						requiredFields: [...(prev.requiredFields || []), { name: '', label: '', type: 'text' }],
				  }
				: null
		);
	};

	const updateRequiredField = (index: number, field: keyof RequiredField, value: string) => {
		const newFields = [...(editingTemplate?.requiredFields || [])];
		newFields[index] = { ...newFields[index], [field]: value };
		setEditingTemplate((prev) => (prev ? { ...prev, requiredFields: newFields } : null));
	};

	const removeRequiredField = (index: number) => {
		const newFields = [...(editingTemplate?.requiredFields || [])];
		newFields.splice(index, 1);
		setEditingTemplate((prev) => (prev ? { ...prev, requiredFields: newFields } : null));
	};

	if (view === 'list') {
		return (
			<>
				<DialogTitle>Manage Email Templates</DialogTitle>
				<DialogContent>
					<Button variant='contained' color='primary' startIcon={<AddCircleOutlined />} onClick={handleAddClick} sx={{ mb: 2 }}>
						Add New Template
					</Button>
					<List>
						{(templates || []).map((template) => (
							<ListItem key={(template.id || template.key) as string} divider>
								<ListItemText primary={template.label as string} secondary={`${template.group} | Key: ${template.id || template.key}`} slotProps={{ primary: { color: 'text.active' } }} />
								<ListItemSecondaryAction>
									<Button variant='outlined' size='small' onClick={() => handleEditClick(template)}>
										Edit
									</Button>
								</ListItemSecondaryAction>
							</ListItem>
						))}
					</List>
				</DialogContent>
				<DialogActions>
					<Button onClick={onClose}>Close</Button>
				</DialogActions>
			</>
		);
	}

	return (
		<>
			<DialogTitle>{editingTemplate?.isSystem ? 'Edit System Template' : 'Edit Template'}</DialogTitle>
			<DialogContent>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
					<TextField label='Template Key (Unique ID)' value={editingTemplate?.key || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('key', e.target.value)} disabled={editingTemplate?.isSystem} fullWidth />
					<TextField label='Label (Button Text)' value={editingTemplate?.label || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('label', e.target.value)} fullWidth />
					<FormControl fullWidth>
						<InputLabel>Group</InputLabel>
						<Select value={editingTemplate?.group || groupOptions[0]} label='Group' onChange={(e: SelectChangeEvent) => handleFieldChange('group', e.target.value)}>
							{groupOptions.map((opt) => (
								<MenuItem key={opt} value={opt}>
									{opt}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<TextField label='Email Subject' value={editingTemplate?.subject || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('subject', e.target.value)} fullWidth />
					<TextField label='HTML Body' value={editingTemplate?.html || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('html', e.target.value)} multiline rows={8} fullWidth />

					<Divider sx={{ my: 2 }} />
					<Typography variant='h6' sx={{ color: 'text.active' }}>
						Required Inputs (Dynamic Fields)
					</Typography>
					{(editingTemplate?.requiredFields || []).map((field, index) => (
						<Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
							<TextField label='Variable Name (e.g., amount)' value={field.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRequiredField(index, 'name', e.target.value)} size='small' />
							<TextField label='Display Label' value={field.label} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRequiredField(index, 'label', e.target.value)} size='small' />
							<FormControl size='small'>
								<Select value={field.type || 'text'} onChange={(e: SelectChangeEvent) => updateRequiredField(index, 'type', e.target.value)}>
									<MenuItem value='text'>Text</MenuItem>
									<MenuItem value='number'>Number</MenuItem>
								</Select>
							</FormControl>
							<IconButton onClick={() => removeRequiredField(index)} color='error'>
								<DeleteOutlined />
							</IconButton>
						</Box>
					))}
					<Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
						<Button startIcon={<AddCircleOutlined />} onClick={addRequiredField}>
							Add Required Field
						</Button>
					</Box>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => setView('list')}>Back</Button>
				<Button variant='contained' onClick={handleSave}>
					Save Template
				</Button>
			</DialogActions>
		</>
	);
};

export default TemplateManagerDialog;
