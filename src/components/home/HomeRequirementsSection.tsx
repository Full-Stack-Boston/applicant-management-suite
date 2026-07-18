import React, { useState } from 'react';
import {
	Box,
	Button,
	Card,
	CardActionArea,
	CardContent,
	Container,
	Grid,
	Paper,
	Stack,
	Typography,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import {
	AccountBalance as AccountBalanceIcon,
	CheckCircleOutlined as CheckCircleOutlineIcon,
	Description as DescriptionIcon,
	EditNote as EditNoteIcon,
	Groups as GroupsIcon,
	MarkEmailRead as MarkEmailReadIcon,
	MenuBook as MenuBookIcon,
	PersonAdd as PersonAddIcon,
	Replay as ReplayIcon,
	RocketLaunch as RocketLaunchIcon,
	School as SchoolIcon,
	Signpost as SignpostIcon,
	WorkspacePremium as WorkspacePremiumIcon,
} from '@mui/icons-material';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { homePageContent } from '../../config/content';
import DOMPurify from 'dompurify';
import { sanitizeHtmlConfig } from '../../utils/sanitizeHtml';
import SectionHeading from './SectionHeading';
import { homeSectionPadding, homeOutlinedOnPrimaryButtonSx, homePrimaryPanelSx, homeYellowButtonSx } from './homePageStyles';

const applicantTypeIcons = [PersonAddIcon, ReplayIcon, WorkspacePremiumIcon];

const requirementIconMap: Record<string, React.ElementType> = {
	'Personal Statement': EditNoteIcon,
	'External Recommendations': MarkEmailReadIcon,
	'Academic Transcripts': MenuBookIcon,
	'Financial Aid Reporting': AccountBalanceIcon,
	'Proof of Eligibility': CheckCircleOutlineIcon,
	'Impact Statement': EditNoteIcon,
	'Updated Transcripts': MenuBookIcon,
	'Streamlined Review': DescriptionIcon,
	'Status Update': SignpostIcon,
	'Verification Documents': DescriptionIcon,
	'Personal Letter': EditNoteIcon,
	'School Recommendation Letter': SchoolIcon,
	'Community Recommendation Letter': GroupsIcon,
	'Academic Transcript': MenuBookIcon,
	'Student Aid Report': AccountBalanceIcon,
	'Acceptance Letter': MarkEmailReadIcon,
	'Active Member Status': CheckCircleOutlineIcon,
};

interface HomeRequirementsSectionProps {
	sectionId: string;
}

export default function HomeRequirementsSection({ sectionId }: HomeRequirementsSectionProps) {
	const siteConfig = useConfig();
	const { darkMode, primaryColor } = useTheme();
	const { deadlineMessage } = homePageContent;
	const requirementsTab = homePageContent.information.tabs[1];
	const childTabs = (requirementsTab.content as unknown as { childTabs: Array<{ label: string; content: Record<string, unknown> }> }).childTabs;
	const [selectedIndex, setSelectedIndex] = useState(0);
	const selectedTab = childTabs[selectedIndex];

	const rawDeadline = siteConfig.APPLICATION_DEADLINE;
	const deadlineDate =
		rawDeadline && typeof rawDeadline === 'object' && 'toDate' in rawDeadline
			? (rawDeadline as { toDate: () => Date }).toDate()
			: new Date(rawDeadline as string);

	const tabContent = selectedTab.content as {
		title: string;
		eligibilityNotice: string;
		introParagraphs?: string[];
		requirements: Array<{ title: string; description: string }>;
		applyNowSection: {
			enabled: boolean;
			title: string;
			paragraphs: string[];
			buttons: Array<{ label: string; path: string }>;
		};
	};

	return (
		<Box id={sectionId} component='section' sx={{ py: homeSectionPadding, scrollMarginTop: { xs: 80, md: 88 } }}>
			<Container maxWidth='lg'>
				<SectionHeading
					eyebrow='Application Guide'
					title={requirementsTab.label}
					subtitle='Choose the workflow that matches your demo path, then gather the documents listed below.'
				/>

				<Grid container spacing={2} sx={{ mb: 4 }}>
					{childTabs.map((tab, index) => {
						const Icon = applicantTypeIcons[index] ?? PersonAddIcon;
						const selected = selectedIndex === index;
						return (
							<Grid key={tab.label} size={{ xs: 12, md: 4 }}>
								<Card
									variant='outlined'
									sx={{
										height: '100%',
										borderColor: selected ? 'primary.main' : 'divider',
										borderWidth: selected ? 2 : 1,
										bgcolor: selected ? 'action.selected' : 'background.paper',
									}}>
									<CardActionArea onClick={() => setSelectedIndex(index)} sx={{ height: '100%' }}>
										<CardContent>
											<Icon sx={{ color: (theme) => theme.palette.contentAccent.main, mb: 1 }} />
											<Typography variant='h6' component='h3'>
												{tab.label}
											</Typography>
										</CardContent>
									</CardActionArea>
								</Card>
							</Grid>
						);
					})}
				</Grid>

				<Paper
					elevation={0}
					sx={{
						p: { xs: 2, md: 2.5 },
						mb: 2,
						borderRadius: 3,
						...homePrimaryPanelSx(primaryColor),
					}}>
					<Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
						{deadlineMessage} {deadlineDate.toLocaleDateString()}.
					</Typography>
				</Paper>

				<Paper
					elevation={0}
					sx={{
						width: '100%',
						boxSizing: 'border-box',
						p: { xs: 2.5, md: 3 },
						mb: tabContent.introParagraphs?.length ? 2 : 4,
						borderRadius: 3,
						border: '2px solid',
						borderColor: 'custom.yellow2',
						bgcolor: darkMode ? 'rgba(252, 209, 22, 0.1)' : 'rgba(252, 209, 22, 0.14)',
					}}>
					<Stack direction='row' spacing={2} sx={{ alignItems: 'flex-start' }}>
						<SignpostIcon sx={{ color: 'custom.yellow2', fontSize: 30, mt: 0.25, flexShrink: 0 }} />
						<Box sx={{ minWidth: 0 }}>
							<Typography variant='subtitle1' component='h3' sx={{ fontWeight: 700, mb: 1 }}>
								Is this the right application for you?
							</Typography>
							<Typography
								variant='body1'
								sx={{ lineHeight: 1.75, '& strong': { fontWeight: 700 } }}
								dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(tabContent.eligibilityNotice, sanitizeHtmlConfig) }}
							/>
						</Box>
					</Stack>
				</Paper>

				{tabContent.introParagraphs?.map((paragraph) => (
					<Typography
						key={paragraph.slice(0, 40)}
						variant='body2'
						component='p'
						color='text.secondary'
						sx={{ mb: 4, lineHeight: 1.75 }}
						dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(paragraph, sanitizeHtmlConfig) }}
					/>
				))}

				<Grid container rowSpacing={{ xs: 5, sm: 5, md: 4 }} columnSpacing={2.5}>
					{tabContent.requirements.map((item, index) => {
						const Icon = requirementIconMap[item.title] ?? DescriptionIcon;
						return (
							<Grid key={item.title} size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
								<Paper
									variant='outlined'
									sx={{
										p: 2.5,
										borderRadius: 2.5,
										display: 'flex',
										gap: 2,
										flex: 1,
									}}>
									<Box
										sx={{
											width: 40,
											height: 40,
											borderRadius: '50%',
											display: 'grid',
											placeItems: 'center',
											bgcolor: 'rgba(46,125,50,0.12)',
											color: (theme) => theme.palette.contentAccent.main,
											flexShrink: 0,
											fontWeight: 700,
										}}>
										{index + 1}
									</Box>
									<Box>
										<Stack direction='row' spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
											<Icon sx={{ fontSize: 20, color: (theme: Theme) => theme.palette.contentAccent.main }} />
											<Typography variant='h6' component='h4' sx={{ fontSize: '1.05rem' }}>
												{item.title}
											</Typography>
										</Stack>
										<Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.7 }}>
											{item.description}
										</Typography>
									</Box>
								</Paper>
							</Grid>
						);
					})}
				</Grid>

				{tabContent.applyNowSection.enabled && (
					<Paper
						elevation={0}
						sx={{
							mt: 5,
							p: { xs: 3, md: 4 },
							borderRadius: 3,
							textAlign: 'center',
							...homePrimaryPanelSx(primaryColor),
						}}>
						<RocketLaunchIcon sx={{ fontSize: 36, mb: 1.5, display: 'block', mx: 'auto' }} />
						<Typography variant='h5' component='h3' sx={{ mb: 1.5, fontWeight: 700 }}>
							{tabContent.applyNowSection.title}
						</Typography>
						{tabContent.applyNowSection.paragraphs.map((paragraph) => (
							<Typography
								key={paragraph.slice(0, 40)}
								variant='body1'
								component='p'
								sx={{ mb: 3, lineHeight: 1.75, maxWidth: 560, mx: 'auto', opacity: 0.95, '& strong': { fontWeight: 700 } }}
								dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(paragraph, sanitizeHtmlConfig) }}
							/>
						))}
						<Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
							<Stack
								direction={{ xs: 'column', sm: 'row' }}
								spacing={2}
								sx={{ alignItems: 'center', width: { xs: '100%', sm: 'auto' }, maxWidth: 560 }}>
								{tabContent.applyNowSection.buttons.map((button, index) => (
									<Button
										key={button.label}
										variant={index === 0 ? 'contained' : 'outlined'}
										size='large'
										href={button.path}
										sx={{
											width: { xs: '100%', sm: 'auto' },
											...(index === 0 ? homeYellowButtonSx : homeOutlinedOnPrimaryButtonSx(primaryColor)),
										}}>
										{button.label}
									</Button>
								))}
							</Stack>
						</Box>
					</Paper>
				)}
			</Container>
		</Box>
	);
}
