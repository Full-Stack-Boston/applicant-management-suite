/**
 * EXTERNAL UPLOAD PORTAL
 * ---------------------------------------------------------------------------
 * Third parties (recommenders) upload documents via a tokenized link + PIN.
 *
 * Security: URL token (requests collection), PIN validation, max 5 attempts,
 * and expiry. On success, attachments/requests update and the application may
 * be promoted to Completed when all required files are present.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, TextField, Stack, CircularProgress } from '@mui/material';
import { UploadOutlined, LinkOffOutlined, CheckCircleOutlined, HelpOutlined } from '@mui/icons-material';
import { VisuallyHiddenInput } from '../../components/visuallyHiddenInput/VisuallyHiddenInput';
import { validateRequest, validatePin, LettersOfRecommendation, brand } from '../../config/Constants';
import { saveFile, getRequestData, saveCollectionData, getDownloadLinkForFile, getApplication } from '../../config/data/firebase';
import { UploadType, collections } from '../../config/data/collections';
import { maybePromoteApplicationToCompleted } from '../../config/data/applicationAttachments';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { useTitle } from '../../context/HelmetContext';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import PublicPageLayout from '../../components/home/PublicPageLayout';
import PublicStatusPage from '../../components/home/PublicStatusPage';
import AuthFormCard from '../../components/auth/AuthFormCard';
import { homeAuthSecondaryButtonSx, homeAuthSubmitButtonSx, homeDashboardIntroBodySx } from '../../components/home/homePageStyles';

interface AttachmentInfo {
	name: string;
	purpose: string;
	[key: string]: unknown;
}

interface RequestData {
	id: string;
	applicationID: string;
	attachmentType: string;
	attachmentsID: string;
	attempts: number;
	completed: boolean;
	expiryDate: string;
	fromName: string;
	[key: string]: unknown;
}

interface UploadCenterContentProps {
	validToken: boolean | null;
	uploadComplete: boolean;
	request: RequestData | null;
	attachmentInfo: AttachmentInfo | null;
	givenPin: string;
	setGivenPin: (pin: string) => void;
	uploading: boolean;
	primaryColor: string;
	handleUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
	handleNavigateHome: () => void;
	handleClosePage: () => void;
}

const invalidLinkSubtitle =
	'This upload link may be expired, already used, or entered incorrectly. If an applicant asked you to submit a recommendation, contact them for a fresh link. If you believe this is an error, the review board can help.';

const uploadRequirementsCopy =
	'Upload one PDF file (25 MB maximum). You may try up to five times. Use the pin from the email that brought you here.';

const UploadCenterContent = ({
	validToken,
	uploadComplete,
	request,
	attachmentInfo,
	givenPin,
	setGivenPin,
	uploading,
	primaryColor,
	handleUpload,
	handleNavigateHome,
	handleClosePage,
}: UploadCenterContentProps) => {
	if (!validToken) {
		return (
			<PublicStatusPage eyebrow='Upload Center' title='This Link Is Not Valid' icon={<LinkOffOutlined />} subtitle={invalidLinkSubtitle} cardSize='wide' fitViewport>
				<Stack spacing={1.5} sx={{ mt: { xs: 2.5, sm: 4 } }}>
					<Button variant='contained' fullWidth onClick={handleNavigateHome} sx={homeAuthSubmitButtonSx(primaryColor)}>
						Return home
					</Button>
					<Button
						variant='outlined'
						fullWidth
						startIcon={<HelpOutlined sx={{ fontSize: 18 }} />}
						href={`mailto:${brand?.helpEmail}?subject=${encodeURIComponent('Upload link help')}`}
						sx={{
							...homeAuthSecondaryButtonSx,
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							minHeight: 36.5,
							py: 0.75,
							lineHeight: 1.75,
							'& .MuiButton-startIcon': {
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								marginTop: 0,
								marginBottom: 0,
								marginRight: 1,
								'& > *:nth-of-type(1)': {
									fontSize: 18,
								},
							},
						}}>
						Contact the board
					</Button>
				</Stack>
			</PublicStatusPage>
		);
	}

	if (uploadComplete || request?.completed) {
		return (
			<PublicStatusPage
				eyebrow='Upload Center'
				title='Upload Complete'
				icon={<CheckCircleOutlined />}
				subtitle={`Thank you. We received your ${attachmentInfo?.name?.toLowerCase() ?? 'file'}, and the applicant's record has been updated.`}
				cardSize='wide'
				fitViewport>
				<Stack spacing={1.5}>
					<Button variant='contained' fullWidth onClick={handleNavigateHome} sx={homeAuthSubmitButtonSx(primaryColor)}>
						Return home
					</Button>
					<Button variant='outlined' fullWidth onClick={handleClosePage} sx={homeAuthSecondaryButtonSx}>
						Close this page
					</Button>
				</Stack>
			</PublicStatusPage>
		);
	}

	const uploadLabel = attachmentInfo?.name ?? 'Recommendation Letter';

	return (
		<PublicPageLayout maxWidth='sm' compact>
			<AuthFormCard
				title={`Upload ${uploadLabel} for ${request!.fromName}`}
				icon={<UploadOutlined />}
				eyebrow='Upload Center'
				subtitle={`${brand.theOrganizationName} has asked you to submit a letter on behalf of this applicant. Your letter should ${attachmentInfo!.purpose}.`}
				size='wide'
				compact>
				<Stack spacing={2.5} sx={{ width: '100%' }}>
					<TextField
						label='Enter pin'
						type='text'
						placeholder='123456'
						required
						value={givenPin}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGivenPin(e.target.value)}
						helperText="Enter the pin from the applicant's request email."
						fullWidth
					/>
					<Typography variant='body2' color='text.secondary' sx={homeDashboardIntroBodySx}>
						{uploadRequirementsCopy}
					</Typography>
					<Typography variant='body2' color='text.secondary' sx={homeDashboardIntroBodySx}>
						Thank you for supporting this applicant and {brand.theOrganizationName}.
					</Typography>
					<Button variant='contained' component='label' disabled={uploading} fullWidth sx={homeAuthSubmitButtonSx(primaryColor)}>
						{uploading ? 'Uploading…' : `Upload ${uploadLabel}`}
						<VisuallyHiddenInput type='file' accept='application/pdf,.pdf' onChange={handleUpload} />
					</Button>
				</Stack>
			</AuthFormCard>
		</PublicPageLayout>
	);
};

const UploadCenter = () => {
	useTitle({ title: 'Upload Center', appear: false });
	const { token } = useParams<{ token: string }>();
	const [request, setRequest] = useState<RequestData | null>(null);
	const [givenPin, setGivenPin] = useState<string>('');
	const [validToken, setValidToken] = useState<boolean | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [uploading, setUploading] = useState<boolean>(false);
	const [uploadComplete, setUploadComplete] = useState<boolean>(false);
	const { primaryColor } = useTheme();
	const { showAlert } = useAlert();
	const navigate = useNavigate();

	useEffect(() => {
		const validateToken = async () => {
			try {
				setLoading(true);
				const isValid = await validateRequest(token!);

				if (isValid.result) {
					const fetchedRequest = (await getRequestData(isValid.id!)) as RequestData;
					const attempts = typeof fetchedRequest?.attempts === 'number' ? fetchedRequest.attempts : Number(fetchedRequest?.attempts) || 0;
					if (fetchedRequest && attempts < 5) {
						setRequest({ ...fetchedRequest, attempts });
						if (new Date(fetchedRequest.expiryDate) > new Date()) {
							setValidToken(true);
							if (fetchedRequest.completed) {
								setUploadComplete(true);
							}
						} else {
							setValidToken(false);
						}
					} else {
						setValidToken(false);
					}
				} else {
					setValidToken(false);
				}
			} catch (error) {
				console.error((error as Error).message);
				setValidToken(false);
			} finally {
				setLoading(false);
			}
		};

		validateToken();
	}, [token]);

	const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		event.preventDefault();
		const file = event.target.files?.[0];

		if (!file) return;

		const pin = givenPin.trim();
		if (!pin) {
			showAlert({ message: 'Please enter the 6-digit PIN.', type: 'warning' });
			return;
		}

		const isPin = await validatePin(pin);
		if (!isPin) {
			showAlert({ message: 'Invalid PIN. Please check your email/request for the correct code.', type: 'error' });
			return;
		}

		if (!file.type.match('application/pdf')) {
			showAlert({ message: 'Please select a PDF file.', type: 'warning' });
			return;
		}

		const maxSizeInBytes = 25 * 1024 * 1024;
		if (file.size > maxSizeInBytes) {
			showAlert({ message: 'File size exceeds the limit. Please select a file smaller than 25MB.', type: 'warning' });
			return;
		}

		if (!request!.attachmentsID) {
			showAlert({ message: 'This request is missing attachment information. Ask the applicant to send a new request.', type: 'error' });
			return;
		}

		try {
			// getApplication ignores userID and looks up by applicationID directly.
			const appData = await getApplication('', request!.applicationID);
			if (!appData || appData.attachments !== request!.attachmentsID) {
				showAlert({ message: 'Attachment ID mismatch. Please contact support.', type: 'error' });
				return;
			}
		} catch (error) {
			console.error('Error fetching application data:', error);
			return;
		}

		setUploading(true);

		try {
			const newAttempts = (request!.attempts ?? 0) + 1;
			await saveCollectionData(collections.requests, request!.id, { attempts: newAttempts });
			setRequest((prev) => (prev ? { ...prev, attempts: newAttempts } : prev));

			const savedFilePath = await saveFile(UploadType.applicationAttachment, request!.applicationID, request!.attachmentType, file);
			const fileLink = await getDownloadLinkForFile(savedFilePath);
			if (savedFilePath) {
				await saveCollectionData(collections.attachments, request!.attachmentsID, {
					[request!.attachmentType]: { displayName: file.name, home: fileLink, refLoc: savedFilePath, uploadedBy: 'request' },
				});
				await saveCollectionData(collections.requests, request!.id, { completed: true, uploadedAt: new Date() });
				await maybePromoteApplicationToCompleted(request!.applicationID);
				setRequest((prev) => (prev ? { ...prev, completed: true } : prev));
				setUploadComplete(true);
			} else {
				showAlert({ message: 'Failed to upload the file. Please try again.', type: 'error' });
			}
		} catch (error) {
			console.error('Upload Error:', (error as Error).message);
			showAlert({ message: 'An unexpected error occurred during upload.', type: 'error' });
		} finally {
			setUploading(false);
		}
	};

	const handleNavigateHome = () => {
		navigate(generatePath(paths.home));
	};

	const handleClosePage = () => {
		window.close();
	};

	const attachmentInfo: AttachmentInfo | null = request
		? ((LettersOfRecommendation as unknown as Record<string, AttachmentInfo>)[request.attachmentType] ?? null)
		: null;

	const resolvedValidToken = validToken === true && !attachmentInfo ? false : validToken;

	if (loading) {
		return (
			<PublicStatusPage eyebrow='Upload Center' title='Verifying Your Link' subtitle='Please wait while we confirm your upload request.' cardSize='wide' fitViewport>
				<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
					<CircularProgress />
				</Box>
			</PublicStatusPage>
		);
	}

	return (
		<UploadCenterContent
			validToken={resolvedValidToken}
			uploadComplete={uploadComplete}
			request={request}
			attachmentInfo={attachmentInfo}
			givenPin={givenPin}
			setGivenPin={setGivenPin}
			uploading={uploading}
			primaryColor={primaryColor}
			handleUpload={handleUpload}
			handleNavigateHome={handleNavigateHome}
			handleClosePage={handleClosePage}
		/>
	);
};

export default UploadCenter;
