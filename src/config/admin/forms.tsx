import React from 'react';
import type { ReactNode } from 'react';
import type { DocumentData } from 'firebase/firestore';
import { PersonOutlined } from '@mui/icons-material';
import { Typography } from '@mui/material';

import { UserType, collections } from '../data/collections';
import type { CollectionId } from '../data/collections';
import { paths } from '../navigation/paths';
import { memberFormConfig, applicantFormConfig, requestFormConfig } from '../ui/formConfig';
import type { FormConfig } from '../ui/formConfig';

// Form Components
import { EmailForm } from '../../components/forms/members/Emails';
import { MemberForm } from '../../components/forms/members/Members';
import { ApplicantForm } from '../../components/forms/members/Applicants';
import { RequestForm } from '../../components/forms/members/Requests';

// Card Components
import { Member } from '../../components/cards/Member';
import { Applicant } from '../../components/cards/Applicant';
import { Application } from '../../components/cards/Application';
import EmailCard from '../../components/cards/Email';
import type { ApplicationCardProps, EmailRecord } from '../../components/cards/types';

interface FormFieldEntry {
	component: string;
	name: string;
	label?: string;
	required?: boolean;
	autoComplete?: string;
	autoFocus?: boolean;
	type?: string;
}

interface FormButton {
	id: string;
	label: string;
	type?: 'submit' | 'button' | 'reset';
	variant?: 'outlined' | 'contained' | 'text';
	fullWidth?: boolean;
	navigationPath?: string;
}

interface FormLink {
	id: string;
	label: string;
	navigationPath: string;
}

interface RegistrationContent {
	title: ReactNode;
	icon: ReactNode;
	fields: FormFieldEntry[];
	buttons: FormButton[];
	links: FormLink[];
}

interface ViewAssetEntry {
	title: string;
	collection: CollectionId;
	renderComponent: (data: DocumentData) => ReactNode;
}

interface CreatableEntry {
	collection: CollectionId;
	formConfig: Partial<FormConfig> & { title: string };
	renderForm: ReactNode;
}

interface EditableEntry {
	collection: CollectionId;
	formConfig: Partial<FormConfig> & { title: string };
	renderForm: (data: DocumentData) => ReactNode;
}

export const memberRegistrationContent: RegistrationContent = {
	title: (
		<Typography
			component='h1'
			variant='h5'
			sx={{
				marginBottom: 2,
				textAlign: 'center',
			}}>
			Create Board Account
		</Typography>
	),
	icon: <PersonOutlined />,
	fields: [
		{ component: 'TextField', name: 'firstName', label: 'First Name', required: true, autoComplete: 'given-name', autoFocus: true },
		{ component: 'TextField', name: 'lastName', label: 'Last Name', required: true, autoComplete: 'family-name' },
		{ component: 'TextField', name: 'position', label: 'Title / Role', required: true, autoComplete: 'organization-title' },
		{ component: 'TextField', name: 'since', label: 'Start Year', required: true },
		{ component: 'ProfilePictureUpload', name: 'picture' },
		{ component: 'TextField', name: 'email', label: 'Email Address', type: 'email', required: true, autoComplete: 'email' },
		{ component: 'TextField', name: 'cell', label: 'Cell Phone', type: 'tel', autoComplete: 'tel' },
		{ component: 'TextField', name: 'password', label: 'Password', type: 'password', required: true, autoComplete: 'new-password' },
		{ component: 'TextField', name: 'confirmPassword', label: 'Confirm Password', type: 'password', required: true, autoComplete: 'new-password' },
	],
	buttons: [
		{ id: 'submit', label: 'Register Board Account', type: 'submit', variant: 'outlined', fullWidth: true },
		{ id: 'home', label: 'Cancel', variant: 'outlined', fullWidth: true, navigationPath: paths.home },
	],
	links: [{ id: 'signIn', label: 'Already have an account? Sign In', navigationPath: paths.login }],
};

export const viewAsset: Record<string, ViewAssetEntry> = {
	[UserType.member]: {
		title: 'Admin Profile',
		collection: collections.members,
		renderComponent: (data) => <Member member={data} />,
	},
	[UserType.applicant]: {
		title: 'Applicant Profile',
		collection: collections.applicants,
		renderComponent: (data) => <Applicant applicant={data} />,
	},
	application: {
		title: 'Application',
		collection: collections.applications,
		renderComponent: (data) => <Application application={data as ApplicationCardProps['application']} />,
	},
	email: {
		title: 'Email',
		collection: collections.mailCache,
		renderComponent: (data) => <EmailCard email={data as EmailRecord} />,
	},
};

export const creatableContent: Record<string, CreatableEntry> = {
	[UserType.member]: {
		collection: collections.members,
		formConfig: memberFormConfig,
		renderForm: <MemberForm />,
	},
	[UserType.applicant]: {
		collection: collections.applicants,
		formConfig: applicantFormConfig,
		renderForm: <ApplicantForm />,
	},
	email: {
		collection: collections.mailCache,
		formConfig: { title: 'Email' },
		renderForm: <EmailForm />,
	},
};

export const editableContent: Record<string, EditableEntry> = {
	[UserType.member]: {
		collection: collections.members,
		formConfig: memberFormConfig,
		renderForm: (data) => <MemberForm member={data} />,
	},
	[UserType.applicant]: {
		collection: collections.applicants,
		formConfig: applicantFormConfig,
		renderForm: (data) => <ApplicantForm applicant={data} />,
	},
	Request: {
		collection: collections.requests,
		formConfig: requestFormConfig,
		renderForm: (data) => <RequestForm request={data} />,
	},
};
