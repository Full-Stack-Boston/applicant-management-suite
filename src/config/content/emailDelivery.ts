/**
 * Email delivery mode helpers (demo vs connected).
 * Demo: transactional mail is written with delivery already SUCCESS + simulated
 * so the Trigger Email extension skips real sends. Connected: normal queue.
 */

export const EMAIL_DELIVERY_DEMO = 'demo';
export const EMAIL_DELIVERY_CONNECTED = 'connected';

export type EmailDeliveryMode = typeof EMAIL_DELIVERY_DEMO | typeof EMAIL_DELIVERY_CONNECTED;

export const isDemoEmailMode = (config?: { emailDeliveryMode?: string } | null): boolean =>
	(config?.emailDeliveryMode ?? EMAIL_DELIVERY_DEMO) !== EMAIL_DELIVERY_CONNECTED;

export const isConnectedEmailMode = (config?: { emailDeliveryMode?: string } | null): boolean => !isDemoEmailMode(config);

/** Mark a queued email doc so Trigger Email / ESP will not deliver it. */
export const withSimulatedDelivery = <T extends Record<string, unknown>>(emailDoc: T): T & {
	simulated: true;
	delivery: { state: string; info: { simulated: boolean; reason: string }; endTime: string };
} => ({
	...emailDoc,
	simulated: true,
	delivery: {
		state: 'SUCCESS',
		info: { simulated: true, reason: 'Demo delivery mode: message was not sent outside AMS.' },
		endTime: new Date().toISOString(),
	},
});

export const DEMO_EMAIL_BANNER =
	'Demo delivery is currently active. Contact Center and mailbox actions are isolated and simulated inside AMS, and you cannot send or receive mail here until email delivery is configured. The public contact form still notifies the project owner.';
