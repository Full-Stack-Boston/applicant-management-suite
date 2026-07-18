/**
 * Email delivery mode helpers (demo vs connected).
 * Shared by contact, automations, interview invites, and Zoho mailbox modules.
 */

const EMAIL_DELIVERY_DEMO = 'demo';
const EMAIL_DELIVERY_CONNECTED = 'connected';

const isDemoEmailMode = (config) => (config?.emailDeliveryMode ?? EMAIL_DELIVERY_DEMO) !== EMAIL_DELIVERY_CONNECTED;

const isConnectedEmailMode = (config) => !isDemoEmailMode(config);

const isZohoConfigured = () =>
	Boolean(process.env.ZOHO_CLIENTID && process.env.ZOHO_CLIENTSECRET && process.env.ZOHO_REFRESHTOKEN && process.env.ZOHO_ACCOUNTID);

/**
 * True when Settings are Connected and Zoho env secrets are present.
 * Mailbox live path should only run when this returns true.
 */
const isMailboxLive = (config) => isConnectedEmailMode(config) && isZohoConfigured();

/** Mark a queued email so Trigger Email extension skips real delivery. */
const withSimulatedDelivery = (emailDoc) => ({
	...emailDoc,
	simulated: true,
	delivery: {
		state: 'SUCCESS',
		info: { simulated: true, reason: 'Demo delivery mode — message was not sent outside AMS.' },
		endTime: new Date().toISOString(),
	},
});

/**
 * Apply simulation when in demo mode; pass through when connected.
 * Public contact leads should NOT use this — they always deliver for real.
 */
const maybeSimulateEmail = (emailDoc, config) => (isDemoEmailMode(config) ? withSimulatedDelivery(emailDoc) : emailDoc);

const connectedMailboxRequiredMessage =
	'Mailbox is in Connected mode but Zoho credentials are missing. Set ZOHO_* in Functions env, or switch Settings → Email delivery to Demo.';

module.exports = {
	EMAIL_DELIVERY_DEMO,
	EMAIL_DELIVERY_CONNECTED,
	isDemoEmailMode,
	isConnectedEmailMode,
	isZohoConfigured,
	isMailboxLive,
	withSimulatedDelivery,
	maybeSimulateEmail,
	connectedMailboxRequiredMessage,
};
