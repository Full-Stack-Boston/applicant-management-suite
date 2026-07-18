/**
 * Auto Scheduler Component
 * A dialog interface for administrators to define interview availability blocks.
 * Triggers the 'autoScheduleInterviews' cloud function to match applicants to slots.
 */

import React, { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Button, TextField, Typography, Grid, IconButton, DialogContent, DialogActions, DialogTitle } from '@mui/material';
import { Add, Delete } from '@mui/icons-material';

// Context
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';

// Backend
import { autoScheduleInterviews } from '../../config/data/firebase';

interface AvailabilityBlock {
	id: string;
	start: string;
	end: string;
}

interface AutoScheduleResult {
	scheduledCount: number;
	skippedApplicants?: unknown[];
}

interface AutoSchedulerProps {
	onSuccess: () => void;
	onClose: () => void;
}

const AutoScheduler = ({ onSuccess, onClose }: AutoSchedulerProps) => {
	const { showAlert, handleError } = useAlert();
	const config = useConfig();
	const deadline = config.APPLICATION_DEADLINE;

	const [loading, setLoading] = useState(false);
	// Initialize with one empty block
	const [availability, setAvailability] = useState<AvailabilityBlock[]>([{ id: uuid(), start: '', end: '' }]);

	const handleChange = (index: number, field: 'start' | 'end', value: string) => {
		const updated = [...availability];
		updated[index][field] = value;
		setAvailability(updated);
	};

	const addBlock = () => {
		setAvailability([...availability, { id: uuid(), start: '', end: '' }]);
	};

	const removeBlock = (id: string) => {
		setAvailability(availability.filter((block) => block.id !== id));
	};

	const handleSubmit = async () => {
		setLoading(true);
		try {
			// Filter complete blocks and format dates
			const timeBlocks = availability
				.filter((b) => b.start && b.end)
				.map((b) => {
					const startDate = new Date(b.start);
					const endDate = new Date(b.end);

					if (startDate >= endDate) {
						throw new Error('Start time must be before end time.');
					}

					return {
						start: startDate.toISOString(),
						end: endDate.toISOString(),
					};
				});

			if (timeBlocks.length === 0) {
				showAlert({ message: 'Please add at least one valid availability block.', type: 'warning' });
				setLoading(false);
				return;
			}

			const res = await autoScheduleInterviews({ deadline, availability: timeBlocks });

			// The cloud function returns an object with results
			const { scheduledCount, skippedApplicants } = res.data as AutoScheduleResult;

			showAlert({
				message: `Scheduled ${scheduledCount} interviews! Skipped ${skippedApplicants?.length || 0}.`,
				type: 'success',
			});

			onSuccess();
		} catch (error) {
			handleError(error, 'autoScheduler submit error');
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<DialogTitle>Auto-Schedule Interviews</DialogTitle>
			<DialogContent>
				<Typography variant='subtitle1' sx={{ mb: 2 }}>
					Define Committee Availability Blocks
				</Typography>

				{availability.map((block, i) => (
					<Grid container spacing={2} key={block.id} sx={{ mb: 1, alignItems: 'center' }}>
						<Grid size={5}>
							<TextField label='Start' type='datetime-local' fullWidth value={block.start} onChange={(e) => handleChange(i, 'start', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
						</Grid>
						<Grid size={5}>
							<TextField label='End' type='datetime-local' fullWidth value={block.end} onChange={(e) => handleChange(i, 'end', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
						</Grid>
						<Grid size={2}>
							<IconButton onClick={() => removeBlock(block.id)} color='error'>
								<Delete />
							</IconButton>
						</Grid>
					</Grid>
				))}

				<Button variant='text' startIcon={<Add />} onClick={addBlock} sx={{ mt: 1 }}>
					Add Time Block
				</Button>
			</DialogContent>

			<DialogActions sx={{ p: '0 24px 24px' }}>
				<Button onClick={onClose} disabled={loading}>
					Close
				</Button>
				<Button variant='contained' onClick={handleSubmit} disabled={loading}>
					{loading ? 'Scheduling...' : 'Run Scheduler'}
				</Button>
			</DialogActions>
		</>
	);
};

export default AutoScheduler;
