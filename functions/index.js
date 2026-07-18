/**
 * Backend Entry Point
 * Flat exports so client httpsCallable names match (e.g. changeUserEmail).
 */

const admin = require('firebase-admin');

admin.initializeApp();

	module.exports = {
	...require('./src/modules/auth'),
	...require('./src/modules/audit'),
	...require('./src/modules/interviews'),
	...require('./src/modules/dailyCo'),
	...require('./src/modules/zoho'),
	...require('./src/modules/search'),
	...require('./src/modules/twilio'),
	...require('./src/modules/backfill'),
	...require('./src/modules/automations'),
	...require('./src/modules/contact'),
	...require('./src/modules/accounts'),
	...require('./src/modules/cleanup'),
	...require('./src/modules/demoWindows'),
	...require('./src/modules/videoBudget'),
};
