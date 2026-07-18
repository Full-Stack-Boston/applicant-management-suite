/**
 * Seed legacy_financials on ams-fsb only, intermingled with live awards.
 * - Ensures Awarded applications have proper award docs (awardAmount, awardID, linked IDs)
 * - Builds yearly finance docs from those awards + Essex/New England padding
 * Never run against other Firebase projects.
 */
const admin = require('firebase-admin');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../../../serviceAccountKey.json');
const PROJECT_ID = 'ams-fsb';
const TARGET_COLLECTION = 'legacy_financials';
const START_YEAR = 2003;
/** Inclusive end year for ledger books; keep current through today. */
const END_YEAR = 2026;
const AS_OF = new Date('2026-07-15T23:59:59Z');

const firstNames = [
	'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth',
	'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
	'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',
];
const lastNames = [
	'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
	'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
	'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Nguyen',
];

const nonSgPrograms = [
	'North Shore Leadership Seminar',
	'Essex County Summer Intensive',
	'Salem Harbor Founders Award',
	'Lynn Youth Enrichment',
	'Beverly Mentoring Stipend',
	'Gloucester Maritime Workshop',
	'Ipswich River Stewardship Grant',
	'Newburyport Civic Fellows',
	'Lawrence Community Build Day',
	'Andover STEM Lab Materials',
	'Haverhill After-School Tutoring',
	'Peabody Arts Access Fund',
	'Marblehead Civic Internship',
	'Merrimack Valley Career Fair',
	'North Shore Regional Retreat',
];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomName = () => `${getRandom(lastNames)}, ${getRandom(firstNames)}`;
const getRandomAmount = (min, max, step = 500) => {
	const steps = Math.floor((max - min) / step);
	return min + Math.floor(Math.random() * (steps + 1)) * step;
};
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const toLegacyName = (fullName = '') => {
	const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return getRandomName();
	if (parts.length === 1) return parts[0];
	const last = parts[parts.length - 1];
	const first = parts.slice(0, -1).join(' ');
	return `${last}, ${first}`;
};

const dateFromMaybe = (raw) => {
	if (!raw) return null;
	if (raw?.toDate) return raw.toDate();
	if (typeof raw === 'string' && raw.includes('/') && !raw.includes('T')) {
		const parsed = new Date(raw);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}
	const d = new Date(raw);
	return Number.isNaN(d.getTime()) ? null : d;
};

/** Snap future-dated demo awards back onto/before AS_OF so books end "today". */
const normalizeAwardDate = (award, app = {}) => {
	const candidates = [award.awardedOn, award.createdOn, app.submittedOn, award.deadline, app.window];
	for (const raw of candidates) {
		const d = dateFromMaybe(raw);
		if (d) return d > AS_OF ? AS_OF : d;
	}
	return AS_OF;
};

try {
	const serviceAccount = require(SERVICE_ACCOUNT_PATH);
	if (serviceAccount.project_id !== PROJECT_ID) {
		console.error(`REFUSING: service account project_id=${serviceAccount.project_id}, expected ${PROJECT_ID}`);
		process.exit(2);
	}
	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount),
		projectId: PROJECT_ID,
	});
	console.log(`Firebase Admin initialized for ${PROJECT_ID} only.`);
} catch (e) {
	console.error('Initialization Error:', e.message);
	process.exit(1);
}

const db = admin.firestore();

const deleteCollectionChunked = async (collectionPath) => {
	const snapshot = await db.collection(collectionPath).get();
	if (snapshot.size === 0) {
		console.log(`No existing docs in ${collectionPath}.`);
		return;
	}
	console.log(`Deleting ${snapshot.size} documents from ${collectionPath}...`);
	const CHUNK = 400;
	for (let i = 0; i < snapshot.docs.length; i += CHUNK) {
		const batch = db.batch();
		snapshot.docs.slice(i, i + CHUNK).forEach((doc) => batch.delete(doc.ref));
		await batch.commit();
	}
};

/**
 * Promote additional 2024–2026 (through AS_OF) applications to Awarded so
 * recent ledger years have live award rows, not only synthetic padding.
 */
const promoteRecentCycleAwards = async () => {
	const [appsSnap, applicantsSnap] = await Promise.all([
		db.collection('applications').get(),
		db.collection('applicants').get(),
	]);
	const applicantsById = new Map(applicantsSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));

	const counts = { 2024: 0, 2025: 0, 2026: 0 };
	const candidates = { 2024: [], 2025: [], 2026: [] };

	for (const appDoc of appsSnap.docs) {
		const app = { id: appDoc.id, ...appDoc.data() };
		const submitted = dateFromMaybe(app.submittedOn || app.lastUpdated);
		if (!submitted || submitted > AS_OF) continue;
		const year = submitted.getFullYear();
		if (![2024, 2025, 2026].includes(year)) continue;
		if (app.status === 'Awarded') {
			counts[year] += 1;
			continue;
		}
		if (['Started', 'Incomplete', 'Ineligible', 'Not Awarded', 'Deleted'].includes(app.status)) continue;
		candidates[year].push({ app, submitted });
	}

	const TARGET_PER_YEAR = { 2024: 10, 2025: 12, 2026: 8 };
	let promoted = 0;

	for (const year of [2024, 2025, 2026]) {
		const need = Math.max(0, TARGET_PER_YEAR[year] - counts[year]);
		const pool = candidates[year].sort((a, b) => a.submitted - b.submitted);
		for (const { app, submitted } of pool.slice(0, need)) {
			const applicant = applicantsById.get(app.completedBy) || {};
			const awardId = uuidv4();
			const amount = getRandomAmount(1500, 5000, 500);
			const awardedOn = submitted > AS_OF ? AS_OF.toISOString() : submitted.toISOString();
			const window = `7/5/${year}, 11:59:59 PM`;
			const awardData = {
				awardID: awardId,
				id: awardId,
				awardAmount: amount,
				amount,
				applicantID: app.completedBy,
				applicantId: app.completedBy,
				applicationID: app.id,
				applicationId: app.id,
				applicantName: app.applicantName || `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim(),
				completedBy: app.completedBy,
				createdOn: awardedOn,
				awardedOn,
				deadline: app.window || window,
				message: 'Awarded by the review committee.',
				type: app.type || 'New Applicant',
			};
			await db.collection('awards').doc(awardId).set(awardData);
			await db.collection('applications').doc(app.id).update({
				status: 'Awarded',
				awards: admin.firestore.FieldValue.arrayUnion(awardId),
				lastUpdated: awardedOn,
			});
			await db.collection('applicants').doc(app.completedBy).update({
				awards: admin.firestore.FieldValue.arrayUnion({
					id: awardId,
					awardID: awardId,
					awardAmount: amount,
					amount,
					type: awardData.type,
					deadline: awardData.deadline,
					awardedOn,
				}),
			});
			promoted += 1;
		}
	}

	console.log(`Promoted ${promoted} recent-cycle applications to Awarded (targets through ${AS_OF.toISOString().slice(0, 10)}).`);
};

/**
 * Make Awarded applications actually carry award docs the UI can render,
 * and return normalized award rows for finance intermingling.
 */
const ensureAwardsLinked = async () => {
	await promoteRecentCycleAwards();

	const [appsSnap, awardsSnap, applicantsSnap] = await Promise.all([
		db.collection('applications').get(),
		db.collection('awards').get(),
		db.collection('applicants').get(),
	]);

	const awardsById = new Map(awardsSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));
	const applicantsById = new Map(applicantsSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));

	const normalized = [];
	let created = 0;
	let repaired = 0;

	for (const appDoc of appsSnap.docs) {
		const app = { id: appDoc.id, ...appDoc.data() };
		const isAwarded = app.status === 'Awarded';
		const linkedIds = Array.isArray(app.awards) ? app.awards.filter((x) => typeof x === 'string') : [];

		let awardRecords = linkedIds.map((id) => awardsById.get(id)).filter(Boolean);

		// Also pick up orphan awards pointing at this application/applicant
		if (awardRecords.length === 0) {
			awardRecords = [...awardsById.values()].filter(
				(a) => a.applicationId === app.id || a.applicationID === app.id || a.applicantID === app.completedBy || a.applicantId === app.completedBy,
			);
		}

		if (!isAwarded && awardRecords.length === 0) continue;

		if (isAwarded && awardRecords.length === 0) {
			const applicant = applicantsById.get(app.completedBy) || {};
			const awardId = uuidv4();
			const amount = getRandomAmount(1000, 5000, 500);
			const snapped = normalizeAwardDate({}, app);
			const createdOn = snapped.toISOString();
			const awardData = {
				awardID: awardId,
				id: awardId,
				awardAmount: amount,
				amount,
				applicantID: app.completedBy,
				applicantId: app.completedBy,
				applicationID: app.id,
				applicationId: app.id,
				applicantName: app.applicantName || `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim(),
				completedBy: app.completedBy,
				createdOn,
				awardedOn: createdOn,
				deadline: app.window || createdOn,
				message: 'Awarded by the review committee.',
				type: app.type || 'New Applicant',
			};
			await db.collection('awards').doc(awardId).set(awardData);
			await db.collection('applications').doc(app.id).update({
				awards: admin.firestore.FieldValue.arrayUnion(awardId),
				status: 'Awarded',
			});
			const applicantAwards = Array.isArray(applicant.awards) ? applicant.awards : [];
			const nextApplicantAwards = [
				...applicantAwards.filter((a) => (a?.id || a?.awardID) !== awardId),
				{ id: awardId, awardID: awardId, awardAmount: amount, amount, type: awardData.type, deadline: awardData.deadline, awardedOn: createdOn },
			];
			await db.collection('applicants').doc(app.completedBy).update({ awards: nextApplicantAwards });
			awardRecords = [awardData];
			awardsById.set(awardId, awardData);
			created += 1;
		} else {
			// Repair schema / linkage for existing awards; snap future dates back to AS_OF
			for (const award of awardRecords) {
				const awardId = award.id || award.awardID;
				const amount = Number(award.awardAmount ?? award.amount ?? getRandomAmount(1000, 5000, 500));
				const snapped = normalizeAwardDate(award, app);
				const createdOn = snapped.toISOString();
				const repairedAward = {
					...award,
					awardID: awardId,
					id: awardId,
					awardAmount: amount,
					amount,
					applicantID: award.applicantID || award.applicantId || app.completedBy,
					applicantId: award.applicantId || award.applicantID || app.completedBy,
					applicationID: award.applicationID || award.applicationId || app.id,
					applicationId: award.applicationId || award.applicationID || app.id,
					applicantName: award.applicantName || app.applicantName,
					createdOn,
					awardedOn: createdOn,
					deadline: award.deadline || app.window || `7/5/${snapped.getFullYear()}, 11:59:59 PM`,
					message: award.message || 'Awarded by the review committee.',
					type: award.type || app.type || 'New Applicant',
				};
				await db.collection('awards').doc(awardId).set(repairedAward, { merge: true });
				awardsById.set(awardId, repairedAward);
				awardRecords = awardRecords.map((a) => ((a.id || a.awardID) === awardId ? repairedAward : a));
				repaired += 1;
			}

			const ids = awardRecords.map((a) => a.id || a.awardID);
			await db.collection('applications').doc(app.id).update({
				awards: ids,
				status: 'Awarded',
			});
		}

		for (const award of awardRecords) {
			const snapped = normalizeAwardDate(award, app);
			const year = snapped.getFullYear();
			if (year < START_YEAR || year > END_YEAR) continue;
			normalized.push({
				award: { ...award, awardedOn: snapped.toISOString(), createdOn: snapped.toISOString() },
				app,
				year,
			});
		}
	}

	console.log(`Awards linked/created: created=${created}, repaired=${repaired}, usable=${normalized.length}`);
	return normalized;
};

const syntheticRecipient = () => ({
	recipient_name: getRandomName(),
	grade: getRandomInt(9, 16),
});

const buildNonSgItems = () => {
	const programPool = [...nonSgPrograms].sort(() => Math.random() - 0.5);
	return programPool.slice(0, getRandomInt(4, 8)).map((program) => {
		const request = getRandomAmount(1000, 8000, 100);
		const disbursement = getRandomAmount(500, request, 100);
		return { program, request, disbursement };
	});
};

const buildYearDoc = (year, yearAwards) => {
	const renewables = [];
	const nonRenewables = [];

	for (const { award, app } of yearAwards) {
		const amount = Number(award.awardAmount ?? award.amount ?? 0);
		const name = toLegacyName(award.applicantName || app.applicantName);
		const grade = getRandomInt(11, 16);
		const isRenewable = String(app.type || award.type || '').toLowerCase().includes('returning');

		if (isRenewable) {
			const committed = Math.round(amount * 0.7 / 500) * 500 || amount;
			const oneTime = Math.max(0, amount - committed);
			renewables.push({
				recipient_name: name,
				grade,
				committed_renewal: committed,
				one_time_grant: oneTime,
				total_disbursement: amount,
				source_award_id: award.id || award.awardID,
				source_application_id: app.id,
			});
		} else {
			nonRenewables.push({
				recipient_name: name,
				grade,
				grant_amount: amount,
				source_award_id: award.id || award.awardID,
				source_application_id: app.id,
			});
		}
	}

	// Pad so every year looks populated like real historical books
	while (renewables.length < getRandomInt(6, 12)) {
		const oneTime = getRandomAmount(0, 2000, 500);
		const committed = getRandomAmount(1000, 3000, 500);
		renewables.push({
			...syntheticRecipient(),
			committed_renewal: committed,
			one_time_grant: oneTime,
			total_disbursement: oneTime + committed,
		});
	}
	while (nonRenewables.length < getRandomInt(4, 9)) {
		nonRenewables.push({
			...syntheticRecipient(),
			grant_amount: getRandomAmount(1000, 3500, 500),
		});
	}

	const nonSgItems = buildNonSgItems();
	const sgDistributed =
		renewables.reduce((sum, item) => sum + item.total_disbursement, 0) +
		nonRenewables.reduce((sum, item) => sum + item.grant_amount, 0);
	const nonSgDistributed = nonSgItems.reduce((sum, item) => sum + (item.disbursement || 0), 0);

	const sgAvailable = sgDistributed + getRandomAmount(0, 5000, 500) + Math.random() * 100;
	const sgReturned = sgAvailable - sgDistributed;
	const nonSgAvailable = nonSgDistributed + getRandomAmount(0, 2000, 100) + Math.random() * 10;
	const nonSgReturned = nonSgAvailable - nonSgDistributed;

	return {
		year,
		total_allotted_disbursement: parseFloat((sgAvailable + nonSgAvailable).toFixed(2)),
		prior_year_clawback: getRandomAmount(1000, 8000, 100),
		financial_summary: {
			scholarships_grants: {
				amount_available: parseFloat(sgAvailable.toFixed(2)),
				amount_distributed: sgDistributed,
				amount_returned: parseFloat(sgReturned.toFixed(2)),
			},
			non_scholarship_items: {
				amount_available: parseFloat(nonSgAvailable.toFixed(2)),
				amount_distributed: nonSgDistributed,
				amount_returned: parseFloat(nonSgReturned.toFixed(2)),
			},
		},
		non_sg_items: nonSgItems,
		renewable_scholarships: renewables,
		non_renewable_grants: nonRenewables,
	};
};

const seed = async () => {
	const linkedAwards = await ensureAwardsLinked();

	await deleteCollectionChunked(TARGET_COLLECTION);

	const byYear = new Map();
	for (let year = START_YEAR; year <= END_YEAR; year++) byYear.set(year, []);
	for (const row of linkedAwards) {
		if (!byYear.has(row.year)) byYear.set(row.year, []);
		byYear.get(row.year).push(row);
	}

	const years = [];
	for (let year = START_YEAR; year <= END_YEAR; year++) {
		years.push(buildYearDoc(year, byYear.get(year) || []));
	}

	console.log(`Uploading ${years.length} year docs to ${TARGET_COLLECTION} on ${PROJECT_ID}...`);
	const batch = db.batch();
	for (const yearData of years) {
		batch.set(db.collection(TARGET_COLLECTION).doc(String(yearData.year)), yearData);
	}
	await batch.commit();

	const liveYears = [...byYear.entries()].filter(([, rows]) => rows.length > 0).map(([y]) => y);
	console.log(`Success: ${years.length} finance years seeded; live award years: ${liveYears.join(', ') || 'none'}`);
};

seed().catch((err) => {
	console.error(err);
	process.exit(1);
});
