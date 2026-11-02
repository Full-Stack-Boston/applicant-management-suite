import { createContext, useContext, useEffect, useState, useMemo, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { getRealTimeCollection } from '../config/data/firebase';
import { collections } from '../config/data/collections';

export interface EmailTemplate {
	id: string;
	name?: string;
	subject?: string;
	body?: string;
	[key: string]: unknown;
}

export interface EmailTemplateContextValue {
	templates: EmailTemplate[];
	loading: boolean;
}

const EmailTemplateContext = createContext<EmailTemplateContextValue | undefined>(undefined);

/** Apply a realtime templates snapshot; isolated for unit coverage of the failure path. */
export const applyEmailTemplatesSnapshot = (
	data: unknown,
	setTemplates: Dispatch<SetStateAction<EmailTemplate[]>>,
	setLoading: Dispatch<SetStateAction<boolean>>
): void => {
	try {
		setTemplates((data as EmailTemplate[]) || []);
		setLoading(false);
	} catch (error) {
		console.error('Error setting email templates:', error);
		setLoading(false);
	}
};

export const EmailTemplateProvider = ({ children }: { children: ReactNode }) => {
	const [templates, setTemplates] = useState<EmailTemplate[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = getRealTimeCollection(collections.emailTemplates, (data) => {
			applyEmailTemplatesSnapshot(data, setTemplates, setLoading);
		});

		return () => {
			if (unsubscribe) unsubscribe();
		};
	}, []);

	const value = useMemo<EmailTemplateContextValue>(() => ({ templates, loading }), [templates, loading]);

	return <EmailTemplateContext.Provider value={value}>{children}</EmailTemplateContext.Provider>;
};

export const useEmailTemplates = (): EmailTemplateContextValue => {
	const context = useContext(EmailTemplateContext);
	if (context === undefined) {
		throw new Error('useEmailTemplates must be used within an EmailTemplateProvider');
	}
	return context;
};
