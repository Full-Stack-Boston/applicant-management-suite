const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
	normalizeVideoBudget,
	allowedMinutes,
	percentUsed,
	thresholdsCrossed,
	modeLabel,
} = require('./videoBudgetLogic');

describe('videoBudgetLogic', () => {
	it('allowedMinutes for off / 10 / 50 / 100', () => {
		assert.equal(allowedMinutes({ mode: 'off' }), 0);
		assert.equal(allowedMinutes({ mode: '10' }), 1000);
		assert.equal(allowedMinutes({ mode: '50' }), 5000);
		assert.equal(allowedMinutes({ mode: '100' }), 10000);
	});

	it('normalizeVideoBudget rejects invalid mode', () => {
		assert.deepEqual(normalizeVideoBudget({ mode: 'bogus', monthlyBaseMinutes: 10000 }), {
			mode: 'off',
			monthlyBaseMinutes: 10000,
		});
	});

	it('thresholdsCrossed fires once per band', () => {
		assert.deepEqual(thresholdsCrossed(0, 499, 1000), []);
		assert.deepEqual(thresholdsCrossed(0, 500, 1000), [50]);
		assert.deepEqual(thresholdsCrossed(499, 801, 1000), [50, 80]);
		assert.deepEqual(thresholdsCrossed(799, 1000, 1000), [80, 100]);
		assert.deepEqual(thresholdsCrossed(500, 600, 1000), []);
	});

	it('percentUsed and modeLabel', () => {
		assert.equal(percentUsed(250, 1000), 25);
		assert.equal(modeLabel('10'), '10% of free monthly minutes');
		assert.equal(modeLabel('off'), 'Off');
	});
});
