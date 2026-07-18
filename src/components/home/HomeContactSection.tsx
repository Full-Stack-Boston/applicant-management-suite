import React from 'react';
import { Box, Container, Divider, Grid, Link, Paper, Stack, Typography } from '@mui/material';
import {
	Email as EmailIcon,
	InfoOutlined as InfoOutlinedIcon,
	LocationOn as LocationOnIcon,
	Phone as PhoneIcon,
} from '@mui/icons-material';
import { useConfig } from '../../context/ConfigContext';
import { homePageContent } from '../../config/content';
import { useTheme } from '../../context/ThemeContext';
import HomeContactForm from './HomeContactForm';
import SectionHeading from './SectionHeading';
import { homeCardBorder, homeSectionAltBg, homeSectionPadding } from './homePageStyles';

interface HomeContactSectionProps {
	sectionId: string;
}

export default function HomeContactSection({ sectionId }: HomeContactSectionProps) {
	const siteConfig = useConfig() as Record<string, unknown>;
	const { darkMode } = useTheme();
	const contactTab = homePageContent.information.tabs[2];
	const content = contactTab.content as {
		title: string;
		subtitle: string;
		scamNotice: string;
		address: { enabled: boolean; title: string; lines: string[] };
		emails: { enabled: boolean; title: string; items: Array<{ label: string; email?: string; configKey?: string }> };
		phones: { enabled: boolean; title: string; items: Array<{ label: string; configKey: string }> };
	};

	const mapQuery = encodeURIComponent(content.address.lines.join(', '));
	const resolveMailto = (item: { email?: string; configKey?: string }) => {
		if (item.email) return `mailto:${item.email}`;
		return String(siteConfig[item.configKey ?? ''] ?? '');
	};
	const displayEmail = (item: { email?: string; configKey?: string }) => {
		if (item.email) return item.email;
		return String(siteConfig[item.configKey ?? ''] ?? '').replace(/^mailto:/i, '');
	};

	return (
		<Box
			id={sectionId}
			component='section'
			sx={{
				py: homeSectionPadding,
				bgcolor: homeSectionAltBg(darkMode),
				scrollMarginTop: { xs: 96, md: 104 },
				overflowX: 'hidden',
			}}>
			<Container maxWidth='lg' sx={{ minWidth: 0 }}>
				<SectionHeading eyebrow='Get In Touch' title={content.title} subtitle={content.subtitle} />

				<Box
					sx={{
						display: 'flex',
						alignItems: 'flex-start',
						gap: 1.25,
						width: '100%',
						maxWidth: 720,
						minWidth: 0,
						boxSizing: 'border-box',
						mx: 'auto',
						mb: { xs: 4, md: 5 },
						px: 2,
						py: 1.5,
						borderRadius: 2,
						border: '1px solid',
						borderColor: homeCardBorder(darkMode),
						bgcolor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(2,136,209,0.03)',
					}}>
					<InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.15, flexShrink: 0 }} />
					<Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.65, minWidth: 0, overflowWrap: 'anywhere' }}>
						{content.scamNotice}
					</Typography>
				</Box>

				<Grid container rowSpacing={{ xs: 3, md: 0 }} columnSpacing={{ xs: 0, md: 4 }} sx={{ alignItems: 'stretch', minWidth: 0, width: '100%' }}>
					<Grid size={{ xs: 12, md: 5 }} sx={{ display: { md: 'flex' }, minWidth: 0, maxWidth: '100%' }}>
						<Paper
							variant='outlined'
							sx={{
								p: { xs: 3, md: 3.5 },
								borderRadius: 3,
								height: { md: '100%' },
								width: '100%',
								minWidth: 0,
								maxWidth: '100%',
								boxSizing: 'border-box',
								overflow: 'hidden',
							}}>
							<Stack spacing={3} divider={<Divider flexItem />} sx={{ minWidth: 0 }}>
								{content.address.enabled && (
									<Box sx={{ minWidth: 0 }}>
										<Stack direction='row' spacing={1.25} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
											<LocationOnIcon sx={{ color: (theme) => theme.palette.contentAccent.main, mt: 0.25, flexShrink: 0 }} />
											<Box sx={{ minWidth: 0, flex: 1 }}>
												<Typography variant='subtitle1' component='h3' sx={{ mb: 1, fontWeight: 700 }}>
													{content.address.title}
												</Typography>
												{content.address.lines.map((line) => (
													<Typography key={line} variant='body2' color='text.secondary'>
														{line}
													</Typography>
												))}
												<Link
													href={`https://maps.google.com/?q=${mapQuery}`}
													target='_blank'
													rel='noopener noreferrer'
													sx={{ display: 'inline-block', mt: 1.5, fontWeight: 600 }}>
													Open in Maps
												</Link>
											</Box>
										</Stack>
									</Box>
								)}

								{content.emails.enabled && (
									<Box sx={{ minWidth: 0 }}>
										<Stack direction='row' spacing={1.25} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
											<EmailIcon sx={{ color: (theme) => theme.palette.contentAccent.main, mt: 0.25, flexShrink: 0 }} />
											<Box sx={{ minWidth: 0, flex: 1 }}>
												<Typography variant='subtitle1' component='h3' sx={{ mb: 1.5, fontWeight: 700 }}>
													{content.emails.title}
												</Typography>
												<Stack spacing={1.5}>
													{content.emails.items.map((item) => (
														<Box key={item.label}>
															<Typography variant='body2' color='text.secondary'>
																{item.label}
															</Typography>
															<Link
																href={resolveMailto(item)}
																sx={{
																	fontWeight: 600,
																	display: 'inline-block',
																	maxWidth: '100%',
																	overflowWrap: 'anywhere',
																	wordBreak: 'break-word',
																}}>
																{displayEmail(item)}
															</Link>
														</Box>
													))}
												</Stack>
											</Box>
										</Stack>
									</Box>
								)}

								{content.phones.enabled && (
									<Box sx={{ minWidth: 0 }}>
										<Stack direction='row' spacing={1.25} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
											<PhoneIcon sx={{ color: (theme) => theme.palette.contentAccent.main, mt: 0.25, flexShrink: 0 }} />
											<Box sx={{ minWidth: 0, flex: 1 }}>
												<Typography variant='subtitle1' component='h3' sx={{ mb: 1.5, fontWeight: 700 }}>
													{content.phones.title}
												</Typography>
												<Stack spacing={1.5}>
													{content.phones.items.map((item) => (
														<Box key={item.label}>
															<Typography variant='body2' color='text.secondary'>
																{item.label}
															</Typography>
															<Link href={String(siteConfig[item.configKey] ?? '')} sx={{ fontWeight: 600 }}>
																{String(siteConfig[item.configKey] ?? '').replace('tel:', '')}
															</Link>
														</Box>
													))}
												</Stack>
											</Box>
										</Stack>
									</Box>
								)}
							</Stack>
						</Paper>
					</Grid>

					<Grid size={{ xs: 12, md: 7 }} sx={{ display: { md: 'flex' }, minWidth: 0, maxWidth: '100%' }}>
						<HomeContactForm fillHeight />
					</Grid>
				</Grid>
			</Container>
		</Box>
	);
}
