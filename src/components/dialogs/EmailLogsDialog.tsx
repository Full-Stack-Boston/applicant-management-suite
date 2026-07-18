import { useState, useEffect } from 'react';
import {
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Box,
	Typography,
	Chip,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	CircularProgress,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ErrorOutlined, CheckCircleOutlined, HourglassEmpty } from '@mui/icons-material';
import { getEmailLogs } from '../../config/data/firebase';

interface EmailDelivery {
	state?: string;
	error?: string;
}

interface EmailLog {
	id: string;
	to?: string;
	from?: string;
	cc?: string[];
	replyTo?: string;
	message?: { subject?: string };
	delivery?: EmailDelivery;
	createdAt?: { toDate: () => Date };
	[key: string]: unknown;
}

interface EmailLogsDialogProps {
	onClose?: () => void;
}

const EmailLogsDialog = ({ onClose }: EmailLogsDialogProps) => {
	const [logs, setLogs] = useState<EmailLog[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchLogs = async () => {
			const data = await getEmailLogs(50);
			setLogs((data as EmailLog[]) || []);
			setLoading(false);
		};
		fetchLogs();
	}, []);

	const getStatusIcon = (delivery?: EmailDelivery) => {
		if (!delivery) return <HourglassEmpty color="warning" />;
		if (delivery.state === 'SUCCESS') return <CheckCircleOutlined color="success" />;
		if (delivery.state === 'ERROR') return <ErrorOutlined color="error" />;
		return <HourglassEmpty color="info" />;
	};

	const getStatusLabel = (delivery?: EmailDelivery): string => {
		if (!delivery) return 'QUEUED';
		return delivery.state || 'PROCESSING';
	};

	return (
		<>
			<DialogTitle>Email Delivery Logs (Last 50)</DialogTitle>
			<DialogContent>
				{loading ? (
					<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
						<CircularProgress />
					</Box>
				) : logs.length === 0 ? (
					<Typography sx={{ p: 2 }}>No email logs found.</Typography>
				) : (
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
						{logs.map((log) => (
							<Accordion key={log.id} variant="outlined" sx={{ bgcolor: 'background.paper' }}>
								<AccordionSummary expandIcon={<ExpandMoreIcon />}>
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
										{getStatusIcon(log.delivery)}
										<Box sx={{ flex: 1 }}>
											<Typography variant="subtitle2" sx={{ color: 'text.active' }}>
												{log.message?.subject || '(No Subject)'}
											</Typography>
											<Typography variant="caption" sx={{ color: 'text.secondary' }}>
												To: {log.to} {log.createdAt && ` | ${log.createdAt.toDate().toLocaleString()}`}
											</Typography>
										</Box>
										<Chip 
											size="small" 
											label={getStatusLabel(log.delivery)} 
											color={log.delivery?.state === 'SUCCESS' ? 'success' : log.delivery?.state === 'ERROR' ? 'error' : 'default'}
										/>
									</Box>
								</AccordionSummary>
								<AccordionDetails>
									<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
										<Typography variant="body2"><strong>From:</strong> {log.from}</Typography>
										{log.cc && log.cc.length > 0 && (
											<Typography variant="body2"><strong>CC:</strong> {log.cc.join(', ')}</Typography>
										)}
										<Typography variant="body2"><strong>Reply-To:</strong> {log.replyTo || 'None'}</Typography>
										
										{log.delivery?.error && (
											<Box sx={{ mt: 1, p: 1, bgcolor: 'error.main', opacity: 0.1, borderRadius: 1 }}>
												<Typography variant="caption" color="error" sx={{ fontWeight: 'bold' }}>
													Error Details:
												</Typography>
												<Typography variant="body2" color="error" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
													{log.delivery.error}
												</Typography>
											</Box>
										)}
										
										<Box sx={{ mt: 1 }}>
											<Typography variant="caption" sx={{ color: 'text.secondary' }}>
												Document ID: {log.id}
											</Typography>
										</Box>
									</Box>
								</AccordionDetails>
							</Accordion>
						))}
					</Box>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</>
	);
};

export default EmailLogsDialog;
