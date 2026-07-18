import {
	EMAIL_DELIVERY_CONNECTED,
	EMAIL_DELIVERY_DEMO,
	DEMO_EMAIL_BANNER,
	isConnectedEmailMode,
	isDemoEmailMode,
	withSimulatedDelivery,
} from './emailDelivery';

describe('emailDelivery', () => {
	it('defaults to demo mode when config is missing', () => {
		expect(isDemoEmailMode()).toBe(true);
		expect(isConnectedEmailMode()).toBe(false);
	});

	it('detects connected mode', () => {
		expect(isDemoEmailMode({ emailDeliveryMode: EMAIL_DELIVERY_CONNECTED })).toBe(false);
		expect(isConnectedEmailMode({ emailDeliveryMode: EMAIL_DELIVERY_CONNECTED })).toBe(true);
	});

	it('detects explicit demo mode', () => {
		expect(isDemoEmailMode({ emailDeliveryMode: EMAIL_DELIVERY_DEMO })).toBe(true);
	});

	it('adds simulated delivery metadata', () => {
		const result = withSimulatedDelivery({ to: 'a@example.com', subject: 'Hi' });
		expect(result.simulated).toBe(true);
		expect(result.delivery.state).toBe('SUCCESS');
		expect(result.to).toBe('a@example.com');
	});

	it('exports demo banner copy without emdashes', () => {
		expect(DEMO_EMAIL_BANNER).toMatch(/Demo delivery/i);
		expect(DEMO_EMAIL_BANNER).toMatch(/isolated and simulated/i);
		expect(DEMO_EMAIL_BANNER).toMatch(/until email delivery is configured/i);
		expect(DEMO_EMAIL_BANNER).not.toMatch(/—/);
	});

	it('marks simulated delivery reason without emdashes', () => {
		const result = withSimulatedDelivery({ to: 'a@example.com' });
		expect(result.delivery.info.reason).not.toMatch(/—/);
	});
});
