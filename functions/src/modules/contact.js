const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { collections, brand } = require('../config');
const { getConfigFromDb } = require('../utils');

const TOPIC_LABELS = {
	application: 'Application question',
	technical: 'Technical support',
	general: 'General inquiry',
};

const escapeHtml = (value) =>
	String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

const stripMailto = (value) => String(value || '').replace(/^mailto:/i, '').trim();

const parseLeadCc = (value) => {
	if (!value) return [];
	if (Array.isArray(value)) return value.map(stripMailto).filter(Boolean);
	return String(value)
		.split(',')
		.map((part) => stripMailto(part))
		.filter(Boolean);
};

/**
 * Public contact form — always queues a REAL email to the project owner.
 * Does not use demo simulation (leads must reach OWNER_LEAD_EMAIL).
 */
exports.submitPublicContact = onCall(async (request) => {
	const { name, email, topic, message, website } = request.data || {};

	// Honeypot: bots fill hidden "website" field
	if (website) {
		return { success: true };
	}

	const trimmedName = String(name || '').trim();
	const trimmedEmail = String(email || '').trim().toLowerCase();
	const trimmedMessage = String(message || '').trim();
	const topicKey = String(topic || 'general');

	if (!trimmedName || trimmedName.length > 120) {
		throw new HttpsError('invalid-argument', 'Please enter your name.');
	}
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
		throw new HttpsError('invalid-argument', 'Please enter a valid email address.');
	}
	if (!trimmedMessage || trimmedMessage.length < 10 || trimmedMessage.length > 5000) {
		throw new HttpsError('invalid-argument', 'Please enter a message of at least 10 characters.');
	}

	const configData = await getConfigFromDb();
	const destination = stripMailto(configData.OWNER_LEAD_EMAIL) || brand.systemEmail;
	if (!destination) {
		throw new HttpsError('failed-precondition', 'OWNER_LEAD_EMAIL is not configured in Site Settings.');
	}

	const topicLabel = TOPIC_LABELS[topicKey] || TOPIC_LABELS.general;
	const subject = `[Website Contact] ${topicLabel}: ${trimmedName}`;

	const html = [
		`<p><strong>From:</strong> ${escapeHtml(trimmedName)} &lt;${escapeHtml(trimmedEmail)}&gt;</p>`,
		`<p><strong>Topic:</strong> ${escapeHtml(topicLabel)}</p>`,
		`<p>${escapeHtml(trimmedMessage).replace(/\n/g, '<br>')}</p>`,
	].join('');

	const text = `From: ${trimmedName} <${trimmedEmail}>\nTopic: ${topicLabel}\n\n${trimmedMessage}`;

	const leadCc = parseLeadCc(configData.OWNER_LEAD_CC);

	await admin.firestore().collection(collections.emails).add({
		to: destination,
		from: configData.SYSTEM_EMAIL,
		replyTo: `${trimmedName} <${trimmedEmail}>`,
		...(leadCc.length > 0 ? { cc: leadCc } : {}),
		message: { subject, html, text },
		tags: ['public-contact', `topic:${topicKey}`],
		createdAt: admin.firestore.FieldValue.serverTimestamp(),
	});

	return { success: true };
});
