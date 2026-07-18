/**
 * NOTIFICATION DISPATCHER
 * ---------------------------------------------------------------------------
 * This file handles the generation and queuing of system notifications (Email & SMS).
 * * * ARCHITECTURE NOTE:
 * This frontend code does NOT send emails directly. It writes "Message Requests"
 * to specific Firestore collections ('emails', 'sms').
 * Backend Cloud Functions listen to these collections and trigger the actual
 * delivery via providers like SendGrid or Twilio.
 *
 * * KEY FUNCTIONS:
 * - send(): Bulk dispatch to multiple recipients (used by Contact Center).
 * - pushNotice(): Send a specific template to a single user.
 * - sendRequest(): Specialized dispatch for Letter of Recommendation requests.
 */

import { db, getConfigFromDb } from '../data/firebase';
import { doc, getDoc, setDoc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { brand, emailHeader, emailFooter, unsubscribeLink, staticEmailFooter, LettersOfRecommendation } from '../Constants';
import { collections } from '../data/collections';
import { emailTemplates } from './emailTemplates';
import { isDemoEmailMode, withSimulatedDelivery } from './emailDelivery';
import type { SiteConfig } from '../../types/firebase';

/** Firestore/static email template document: subject + html with {{placeholders}}. */
interface EmailTemplateDoc {
	subject?: string;
	html?: string;
	[key: string]: unknown;
}

/** Contact Center recipient: name/email (and cell for SMS) plus per-recipient template data. */
interface Recipient {
	name?: string;
	email?: string;
	cell?: string;
	firstName?: string;
	lastName?: string;
	id?: string;
	[key: string]: unknown;
}

const queueEmailDoc = (email: Record<string, unknown>, config: SiteConfig | null) =>
	isDemoEmailMode(config as { emailDeliveryMode?: string } | null) ? withSimulatedDelivery(email) : email;

/**
 * Enumeration of available Email Template Keys.
 * Must match keys in 'emailTemplates.js'.
 */
export const ContactTemplate = {
	incompleteReminder: 'incompleteReminder',
	appAdvancedToInterview: 'appAdvancedToInterview',
	appDenied: 'appDenied',
	appApproved: 'appApproved',
	appIncomplete: 'appIncomplete',
	appCompleted: 'appCompleted',
	appSubmitted: 'appSubmitted',
	windowClosed: 'windowClosed',
	windowClosing: 'windowClosing',
	windowOpen: 'windowOpen',
	welcome: 'welcome',
	interviewInvitation: 'interviewInvitation',
	memberActivitySummary: 'memberActivitySummary',
	incompleteCountAlert: 'incompleteCountAlert',
	reminderToApply: 'reminderToApply',
};

// --- Helper Functions ---

/**
 * Replaces {{handlebars}} placeholders in a string with actual data.
 * Supports nested object paths like 'award.type'.
 * * @param {string} templateString - The raw string containing {{placeholders}}.
 * @param {object} data - The data context to resolve values from.
 * @returns {string} The processed string with values inserted.
 */
const processTemplate = (templateString: string | undefined, data: Record<string, unknown>): string => {
	if (!templateString) return '';
	const regex = /{{\s*([\w.]+)\s*}}/g;
	return templateString.replace(regex, (match, key: string) => {
		const keys = key.split('.');
		let value: unknown = data;
		for (const k of keys) {
			value = (value as Record<string, unknown> | null | undefined)?.[k];
			if (value === undefined) return match;
		}

		if (value === null) return 'null';
		if (typeof value === 'object' && !Array.isArray(value)) return match;

		return String(value);
	});
};

/**
 * Compiles a complete message object (Subject, Text, HTML) from a template key.
 * Injects the standard Header and Footer automatically.
 * * @param {string} templateKey - The ID of the template to use.
 * @param {object} data - Dynamic data for the specific recipient.
 * @returns {Promise<object>} { subject, text, html }
 */
const resolveTemplate = async (templateKey: string): Promise<EmailTemplateDoc | null> => {
	try {
		const snap = await getDoc(doc(db, collections.emailTemplates, templateKey));
		if (snap.exists()) return snap.data() as EmailTemplateDoc;
	} catch (error) {
		console.warn('Falling back to static email template', templateKey, error);
	}
	return (emailTemplates as Record<string, EmailTemplateDoc>)[templateKey] || null;
};

const generateMessage = async (templateKey: string, data: Record<string, unknown>, config: SiteConfig | null) => {
	const template = await resolveTemplate(templateKey);
	if (!template) throw new Error(`Template not found for key: ${templateKey}`);

	// Combine global brand details with specific user data
	const context = { brand, config, ...data };

	const subject = processTemplate(template.subject, context);
	let htmlBody = processTemplate(template.html, context);

	// Add standard sign-off
	htmlBody += `<p>Best regards,<br>${brand.boardName}</p>`;

	// Create a plain text version for SMS/Accessibility
	const plainText = htmlBody
		.replace(/<[^>]+>/g, ' ')
		.replace(/ {2,}/g, ' ')
		.trim();

	// Wrap content with standard Branding Header & Footer (w/ Unsubscribe Link)
	const unsub = await unsubscribeLink(data.id as string);
	const finalHtml = emailHeader + `<main style="font-family: Arial, Helvetica, sans-serif; color: #333; padding: 5px; margin: 5px;">${htmlBody}</main>` + emailFooter(unsub);

	return { subject, text: plainText, html: finalHtml };
};

const formatEmail = (name: string | null | undefined, email: string | null | undefined): string | null => {
	const cleanName = name?.trim() || '';
	const cleanEmail = email?.trim() || '';
	if (!cleanEmail) return null;
	return cleanName && cleanName !== 'undefined undefined' ? `${cleanName} <${cleanEmail}>` : cleanEmail;
};

// --- Dispatch Functions ---

/**
 * Bulk dispatch function. Sends a templated message to lists of recipients.
 * Used primarily by the Admin Contact Center.
 * * @param {string} templateKey - The template to use.
 * @param {Array} to - Primary recipients [{ name, email, ...data }].
 * @param {object} from - Sender details { name, email }.
 * @param {Array} cc - CC recipients.
 * @param {Array} smsTo - SMS recipients.
 * @param {object} data - Common data shared across all messages (e.g. custom note).
 */
export const send = async (templateKey: string, to: Recipient[], from: Recipient | null | undefined, cc: Recipient[], smsTo: Recipient[], data: Record<string, unknown>) => {
	try {
		// Filter out invalid contacts
		to = to.filter((email) => email?.email);
		cc = cc.filter((email) => email?.email);
		smsTo = smsTo.filter((cell) => cell?.cell);

		const ccEmails = cc.map((ccRecipient) => formatEmail(ccRecipient.name, ccRecipient.email)).filter((entry): entry is string => Boolean(entry));
		let ccRecipients: string[] = [...ccEmails];

		// Fetch System CCs (e.g. archive email)
		const config = await getConfigFromDb();
		if (!config) throw new Error('Site configuration unavailable');
		const systemCc = config.SYSTEM_CC_EMAILS;
		if (Array.isArray(systemCc) && systemCc.length > 0) {
			ccRecipients = [...ccRecipients, ...(systemCc as string[])];
		}

		const batch = writeBatch(db);
		let emailCount = 0;
		let smsCount = 0;

		// 1. Process Emails
		if (to.length > 0 && from) {
			for (const recipient of to) {
				// Merge general data with recipient-specific data (allows {{name}} to work)
				const messageData = { ...data, ...recipient };
				const generatedMessage = await generateMessage(templateKey, messageData, config);

				const email = queueEmailDoc(
					{
						to: formatEmail(recipient.name, recipient.email),
						from: formatEmail(from.name, from.email),
						replyTo: config.SYSTEM_REPLY_TO,
						cc: ccRecipients,
						message: generatedMessage,
						createdAt: serverTimestamp(),
					},
					config
				);

				// Writing to this collection triggers Trigger Email (or is marked simulated in demo mode)
				const emailRef = doc(collection(db, collections.emails));
				batch.set(emailRef, email);
				emailCount++;
			}
		}

		// 2. Process SMS
		if (smsTo.length > 0) {
			for (const recipient of smsTo) {
				const messageData = { ...data, ...recipient };
				const generatedMessage = await generateMessage(templateKey, messageData, config);
				const sms = {
					body: generatedMessage.text,
					to: `+1${recipient.cell}`,
					createdAt: serverTimestamp(),
				};
				const smsRef = doc(collection(db, collections.sms));
				batch.set(smsRef, sms);
				smsCount++;
			}
		}

		if (emailCount > 0 || smsCount > 0) {
			await batch.commit();
		}
		
		return { success: true };
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		return { success: false, error: error };
	}
};

/**
 * Generates a specialized email payload for Reference Requests (LORs).
 * This uses a hardcoded template structure rather than the dynamic `emailTemplates.js`
 * because it requires complex link/pin logic.
 */
const uploadRequest = async (data: Record<string, unknown>) => {
	const subject = 'Letter of Recommendation Request';
	const typeName = LettersOfRecommendation[String(data.attachmentType)]?.name || 'Recommendation';
	const purpose = LettersOfRecommendation[String(data.attachmentType)]?.purpose || 'support the application';

	const plainText = `\nDear ${data.name},\n\nThis is a request sent from ${brand.theOrganizationName} on behalf of ${data.fromName} for a letter of recommendation. The applicant requests you submit a(n) ${typeName} to ${purpose}. Please contact the applicant to cancel this request or follow the link to make your submission. You can only submit an upload once. Please use the following pin to complete the upload.\n\nPin: ${data.pin}\nLink: ${data.link}\nRequest Expires: ${data.expiryDate}\n\nBest regards,\n${brand.boardName}`;

	const content = `<main style="font-family: Arial, Helvetica, sans-serif; color: #333; padding: 5px; margin: 5px;">
						<h3>Letter of Recommendation Request</h3>
						<p>Dear ${data.name},</p>
						<p>This is a request sent from ${brand.theOrganizationName} on behalf of ${data.fromName} for a letter of recommendation. The applicant requests you submit a(n) ${typeName} to ${purpose}. Please contact the applicant to cancel this request or follow the link to make your submission. You can only submit an upload once. Please use the following pin to complete the upload.</p>
						<ul><li><strong>Pin:</strong> ${data.pin}</li>
						<li><strong>Link:</strong> <a href="${data.link}">Ready to Submit?</a></li>
						<li><strong>Request Expires:</strong> ${data.expiryDate}</li></ul>
						<p>If you have any questions or need help, don't hesitate to reach out to us at <a href="mailto:${brand.contactEmail}">${brand.contactEmail}</a>.</p>
						<p>Best regards,<br>
						${brand.boardName}</p>
					</main>`;

	const htmlContent = emailHeader + content + staticEmailFooter;
	return { subject, text: plainText, html: htmlContent };
};

/**
 * Dispatches a Letter of Recommendation Request email.
 */
export const sendRequest = async (request: Record<string, unknown>, link: string, pin: string) => {
	try {
		const config = await getConfigFromDb();
		if (!config) throw new Error('Site configuration unavailable');
		const email = queueEmailDoc(
			{
				to: `${request.name} <${request.email}>`,
				from: config.SYSTEM_EMAIL,
				replyTo: config.SYSTEM_REPLY_TO,
				cc: config.SYSTEM_CC_EMAILS,
				message: await uploadRequest({ ...request, link, pin }),
			},
			config
		);

		const emailRef = doc(collection(db, collections.emails));
		await setDoc(emailRef, email);
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
	}
};

/**
 * Sends a single notification to a specific user (System Alert).
 * Used for automated triggers (e.g., "Application Submitted" confirmation).
 */
export const pushNotice = async (templateKey: string, user: Recipient, data: Record<string, unknown>) => {
	try {
		const config = await getConfigFromDb();
		if (!config) throw new Error('Site configuration unavailable');
		const messageData = { ...data, ...user };
		const generatedMessage = await generateMessage(templateKey, messageData, config);

		const email = queueEmailDoc(
			{
				to: formatEmail(`${user.firstName} ${user.lastName}`, user.email),
				from: config.SYSTEM_EMAIL,
				replyTo: config.SYSTEM_REPLY_TO,
				cc: config.SYSTEM_CC_EMAILS,
				message: generatedMessage,
				createdAt: serverTimestamp(),
			},
			config
		);

		const emailRef = doc(collection(db, collections.emails));
		await setDoc(emailRef, email);
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
	}
};

// --- UI Configuration ---

/**
 * Defines which templates are visible in the Admin "Contact Center".
 * Grouped by category for the dropdown menu.
 */
export const templates = [
	{
		title: 'Canned Notifications',
		options: [
			{ name: ContactTemplate.welcome, label: 'Welcome Email' },
			{ name: ContactTemplate.memberActivitySummary, label: 'Activity Summary' },
		],
	},
	{
		title: 'Reminders',
		options: [
			{ name: ContactTemplate.incompleteReminder, label: 'App Incomplete Reminder' },
			{ name: ContactTemplate.interviewInvitation, label: 'Interview Invitation' },
			{ name: ContactTemplate.incompleteCountAlert, label: 'Incomplete App Summary Alert' },
			{ name: ContactTemplate.reminderToApply, label: 'Reminder to Apply' },
		],
	},
	{
		title: 'Deadline',
		options: [
			{ name: ContactTemplate.windowClosed, label: 'Window Closed' },
			{ name: ContactTemplate.windowClosing, label: 'Window Closing' },
			{ name: ContactTemplate.windowOpen, label: 'Window Open' },
		],
	},
	{
		title: 'Application Status',
		options: [
			{ name: ContactTemplate.appAdvancedToInterview, label: 'App Advanced To Interview' },
			{
				name: ContactTemplate.appDenied,
				label: 'App Denied',
				requiredFields: [{ label: 'Denial Reason', name: 'reason', type: 'text' }],
			},
			{
				name: ContactTemplate.appApproved,
				label: 'App Approved',
				requiredFields: [
					{ label: 'Award Type', name: 'award.type', type: 'text' },
					{ label: 'Award Amount', name: 'award.amount', type: 'text' },
					{ label: 'Follow Up Note', name: 'award.followUp', type: 'text' },
				],
			},
			{ name: ContactTemplate.appIncomplete, label: 'App Incomplete' },
			{ name: ContactTemplate.appCompleted, label: 'App Completed' },
			{ name: ContactTemplate.appSubmitted, label: 'App Submitted' },
		],
	},
];
