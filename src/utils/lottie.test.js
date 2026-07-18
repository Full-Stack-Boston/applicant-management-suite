import { describe, it, expect, vi } from 'vitest';

describe('lottie resolver', () => {
	it('uses a direct function export', async () => {
		vi.resetModules();
		vi.doMock('lottie-react', () => ({
			default: function MockLottie() {
				return null;
			},
		}));
		const mod = await import('./lottie');
		expect(typeof mod.default).toBe('function');
	});

	it('unwraps nested default exports', async () => {
		vi.resetModules();
		const Inner = function NestedLottie() {
			return null;
		};
		vi.doMock('lottie-react', () => ({
			default: { default: Inner },
		}));
		const mod = await import('./lottie');
		expect(mod.default).toBe(Inner);
	});

	it('unwraps deeply nested default exports', async () => {
		vi.resetModules();
		const Deep = function DeepLottie() {
			return null;
		};
		vi.doMock('lottie-react', () => ({
			default: { default: { default: Deep } },
		}));
		const mod = await import('./lottie');
		expect(mod.default).toBe(Deep);
	});
});
