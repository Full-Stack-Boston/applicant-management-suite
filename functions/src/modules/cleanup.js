/**
 * Admin cleanup / purge tools (Phase 10)
 * ---------------------------------------------------------------------------
 * Permanently delete soft-deleted applications, unowned app/component orphans,
 * Firebase Storage orphans, and sitelog/dblog entries. Admin SDK only —
 * client Firestore rules disallow deletes on these collections.
 */

const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { collections, ApplicationStatus } = require('../config');

const CALL_OPTS = { timeoutSeconds: 540, memory: '1GiB' };

const APPLICATION_LINKED_FIELDS = [
	{ field: 'profile', collection: collections.profiles },
	{ field: 'family', collection: collections.families },
	{ field: 'education', collection: collections.education },
	{ field: 'experience', collection: collections.experience },
	{ field: 'expenses', collection: collections.expenses },
	{ field: 'incomes', collection: collections.incomes },
	{ field: 'contributions', collection: collections.contributions },
	{ field: 'projections', collection: collections.projections },
	{ field: 'attachments', collection: collections.attachments },
];

const COMPONENT_COLLECTIONS = APPLICATION_LINKED_FIELDS.map((entry) => entry.collection);

const STORAGE_PREFIXES = {
	applications: 'applications/',
	applicantAvatars: 'applicants/avatars/',
	memberAvatars: 'members/avatars/',
};

const assertAdmin = async (callerUid) => {
	if (!callerUid) {
		throw new HttpsError('unauthenticated', 'You must be logged in.');
	}
	const memberSnap = await admin.firestore().doc(`${collections.members}/${callerUid}`).get();
	if (!memberSnap.exists || !memberSnap.data()?.permissions?.admin) {
		throw new HttpsError('permission-denied', 'You must be an admin to perform this action.');
	}
};

const commitInChunks = async (mutations) => {
	const CHUNK = 400;
	let committed = 0;
	for (let i = 0; i < mutations.length; i += CHUNK) {
		const batch = admin.firestore().batch();
		mutations.slice(i, i + CHUNK).forEach((fn) => fn(batch));
		await batch.commit();
		committed += mutations.slice(i, i + CHUNK).length;
	}
	return committed;
};

const collectAttachmentPaths = (attachmentsData) => {
	if (!attachmentsData || typeof attachmentsData !== 'object') return [];
	const paths = [];
	for (const value of Object.values(attachmentsData)) {
		if (value && typeof value === 'object' && typeof value.refLoc === 'string' && value.refLoc) {
			paths.push(value.refLoc);
		}
	}
	return paths;
};

const deleteStoragePaths = async (paths) => {
	if (!paths.length) return { deleted: 0, missing: 0, errors: [] };
	const bucket = admin.storage().bucket();
	let deleted = 0;
	let missing = 0;
	const errors = [];

	for (const path of [...new Set(paths)]) {
		try {
			const file = bucket.file(path);
			const [exists] = await file.exists();
			if (!exists) {
				missing += 1;
				continue;
			}
			await file.delete();
			deleted += 1;
		} catch (error) {
			errors.push(`${path}: ${error.message}`);
		}
	}

	return { deleted, missing, errors };
};

const buildOwnedApplicationIdSet = async (db) => {
	const applicantsSnap = await db.collection(collections.applicants).get();
	const ownedIds = new Set();
	const applicantIds = new Set();

	for (const docSnap of applicantsSnap.docs) {
		applicantIds.add(docSnap.id);
		const apps = Array.isArray(docSnap.data().applications) ? docSnap.data().applications : [];
		for (const appId of apps) {
			if (typeof appId === 'string' && appId) ownedIds.add(appId);
		}
	}

	return { ownedIds, applicantIds, applicantCount: applicantsSnap.size };
};

const queuePermanentApplicationDelete = async (db, appId, appData, mutations, storagePaths) => {
	const appRef = db.doc(`${collections.applications}/${appId}`);

	for (const { field, collection: collectionName } of APPLICATION_LINKED_FIELDS) {
		const recordId = appData[field];
		if (!recordId || typeof recordId !== 'string') continue;

		const recordRef = db.doc(`${collectionName}/${recordId}`);
		if (field === 'attachments') {
			const attSnap = await recordRef.get();
			if (attSnap.exists) {
				storagePaths.push(...collectAttachmentPaths(attSnap.data()));
			}
		}
		mutations.push((batch) => batch.delete(recordRef));
	}

	const awardIds = Array.isArray(appData.awards) ? appData.awards.filter((id) => typeof id === 'string') : [];
	for (const awardId of awardIds) {
		mutations.push((batch) => batch.delete(db.doc(`${collections.awards}/${awardId}`)));
	}

	const awardsSnap = await db.collection(collections.awards).where('applicationId', '==', appId).get();
	for (const awardDoc of awardsSnap.docs) {
		mutations.push((batch) => batch.delete(awardDoc.ref));
	}

	const requestsSnap = await db.collection(collections.requests).where('applicationID', '==', appId).get();
	for (const requestDoc of requestsSnap.docs) {
		mutations.push((batch) => batch.delete(requestDoc.ref));
	}

	const interviewsSnap = await db.collection(collections.interviews).where('applicationId', '==', appId).get();
	for (const interviewDoc of interviewsSnap.docs) {
		mutations.push((batch) => batch.delete(interviewDoc.ref));
	}

	const notesSnap = await db.collection(`${collections.applications}/${appId}/notes`).get();
	for (const noteDoc of notesSnap.docs) {
		mutations.push((batch) => batch.delete(noteDoc.ref));
	}

	mutations.push((batch) => batch.delete(appRef));

	if (typeof appData.completedBy === 'string' && appData.completedBy) {
		const applicantRef = db.doc(`${collections.applicants}/${appData.completedBy}`);
		const applicantSnap = await applicantRef.get();
		if (applicantSnap.exists) {
			mutations.push((batch) =>
				batch.update(applicantRef, {
					applications: admin.firestore.FieldValue.arrayRemove(appId),
				}),
			);
		}
	}

	storagePaths.push(...(await listApplicationStoragePaths(appId)));
};

const listApplicationStoragePaths = async (appId) => {
	const bucket = admin.storage().bucket();
	const prefix = `${STORAGE_PREFIXES.applications}${appId}/`;
	const [files] = await bucket.getFiles({ prefix });
	return files.map((file) => file.name);
};

const permanentlyDeleteApplicationDocs = async (db, appId) => {
	const appRef = db.doc(`${collections.applications}/${appId}`);
	const appSnap = await appRef.get();
	if (!appSnap.exists) {
		throw new HttpsError('not-found', `Application ${appId} not found.`);
	}

	const appData = appSnap.data();
	if (appData.status !== ApplicationStatus.deleted) {
		throw new HttpsError('failed-precondition', 'Only applications marked as Deleted can be permanently removed.');
	}

	const mutations = [];
	const storagePaths = [];
	await queuePermanentApplicationDelete(db, appId, appData, mutations, storagePaths);
	const deletedDocs = await commitInChunks(mutations);
	const storage = await deleteStoragePaths(storagePaths);

	return {
		success: true,
		message: `Application ${appId} permanently deleted (${deletedDocs} doc ops, ${storage.deleted} files).`,
		deletedDocs,
		storage,
	};
};

const permanentlyDeleteApplicationHandler = async (request) => {
	await assertAdmin(request.auth?.uid);
	const applicationId = request.data?.applicationId;
	if (!applicationId || typeof applicationId !== 'string') {
		throw new HttpsError('invalid-argument', 'applicationId is required.');
	}
	return permanentlyDeleteApplicationDocs(admin.firestore(), applicationId);
};

const purgeDeletedApplicationsHandler = async (request) => {
	await assertAdmin(request.auth?.uid);
	const dryRun = Boolean(request.data?.dryRun);
	const db = admin.firestore();

	const snap = await db.collection(collections.applications).where('status', '==', ApplicationStatus.deleted).get();
	const ids = snap.docs.map((docSnap) => docSnap.id);

	if (dryRun) {
		return {
			success: true,
			dryRun: true,
			count: ids.length,
			applicationIds: ids.slice(0, 100),
			message: `Found ${ids.length} Deleted application(s). Re-run with dryRun=false to permanently purge them.`,
		};
	}

	let purged = 0;
	const errors = [];
	let filesDeleted = 0;

	for (const appId of ids) {
		try {
			const result = await permanentlyDeleteApplicationDocs(db, appId);
			purged += 1;
			filesDeleted += result.storage?.deleted || 0;
		} catch (error) {
			errors.push(`${appId}: ${error.message}`);
		}
	}

	return {
		success: errors.length === 0,
		count: purged,
		filesDeleted,
		errors,
		message: `Permanently purged ${purged}/${ids.length} Deleted application(s)${errors.length ? ` with ${errors.length} error(s)` : ''}.`,
	};
};

const describeUnownedApplicationReason = (appData, applicantIds) => {
	const ownerId = typeof appData.completedBy === 'string' ? appData.completedBy : '';
	if (!ownerId) return 'missing_owner_and_unlinked';
	if (!applicantIds.has(ownerId)) return 'owner_missing_and_unlinked';
	return 'not_in_any_applicant_array';
};

const findUnownedApplications = async (db) => {
	const { ownedIds, applicantIds } = await buildOwnedApplicationIdSet(db);
	const appsSnap = await db.collection(collections.applications).get();
	const unowned = [];

	for (const docSnap of appsSnap.docs) {
		if (ownedIds.has(docSnap.id)) continue;
		const data = docSnap.data();
		unowned.push({
			id: docSnap.id,
			status: data.status || '',
			type: data.type || '',
			completedBy: data.completedBy || null,
			reason: describeUnownedApplicationReason(data, applicantIds),
		});
	}

	return unowned;
};

const findOrphanComponentRecords = async (db) => {
	const appsSnap = await db.collection(collections.applications).get();
	const referencedIdsByCollection = Object.fromEntries(COMPONENT_COLLECTIONS.map((name) => [name, new Set()]));

	for (const appDoc of appsSnap.docs) {
		const data = appDoc.data();
		for (const { field, collection: collectionName } of APPLICATION_LINKED_FIELDS) {
			const recordId = data[field];
			if (typeof recordId === 'string' && recordId) {
				referencedIdsByCollection[collectionName].add(recordId);
			}
		}
	}

	const { applicantIds } = await buildOwnedApplicationIdSet(db);
	const orphans = [];

	for (const collectionName of COMPONENT_COLLECTIONS) {
		const snap = await db.collection(collectionName).get();
		for (const docSnap of snap.docs) {
			const referenced = referencedIdsByCollection[collectionName].has(docSnap.id);
			const ownerId = docSnap.data()?.completedBy;
			const ownerExists = typeof ownerId === 'string' && applicantIds.has(ownerId);

			if (!referenced) {
				orphans.push({
					id: docSnap.id,
					collection: collectionName,
					completedBy: ownerId || null,
					reason: ownerExists ? 'unreferenced_by_any_application' : 'unreferenced_and_owner_missing',
				});
			}
		}
	}

	return orphans;
};

const findUnownedRecordsHandler = async (request) => {
	await assertAdmin(request.auth?.uid);
	const db = admin.firestore();
	const applications = await findUnownedApplications(db);
	const components = await findOrphanComponentRecords(db);

	return {
		success: true,
		applications,
		components,
		counts: {
			applications: applications.length,
			components: components.length,
		},
		message: `Found ${applications.length} unowned application(s) and ${components.length} orphan component record(s).`,
	};
};

const purgeUnownedRecordsHandler = async (request) => {
	await assertAdmin(request.auth?.uid);
	const dryRun = request.data?.dryRun !== false;
	const db = admin.firestore();

	const applications = await findUnownedApplications(db);
	const components = await findOrphanComponentRecords(db);

	if (dryRun) {
		return {
			success: true,
			dryRun: true,
			applications: applications.slice(0, 100),
			components: components.slice(0, 100),
			counts: {
				applications: applications.length,
				components: components.length,
			},
			message: `Dry run: ${applications.length} unowned app(s), ${components.length} orphan component(s). Re-run with dryRun=false to delete.`,
		};
	}

	const mutations = [];
	const storagePaths = [];
	const errors = [];
	let appsPurged = 0;

	for (const app of applications) {
		try {
			const appSnap = await db.doc(`${collections.applications}/${app.id}`).get();
			if (!appSnap.exists) continue;
			const appData = appSnap.data();
			if (appData.status !== ApplicationStatus.deleted) {
				mutations.push((batch) =>
					batch.update(appSnap.ref, {
						status: ApplicationStatus.deleted,
						deletedOn: admin.firestore.FieldValue.serverTimestamp(),
					}),
				);
			}
			await queuePermanentApplicationDelete(db, app.id, { ...appData, status: ApplicationStatus.deleted }, mutations, storagePaths);
			appsPurged += 1;
		} catch (error) {
			errors.push(`application ${app.id}: ${error.message}`);
		}
	}

	for (const component of components) {
		mutations.push((batch) => batch.delete(db.doc(`${component.collection}/${component.id}`)));
	}

	const deletedDocs = await commitInChunks(mutations);
	const storage = await deleteStoragePaths(storagePaths);

	return {
		success: errors.length === 0,
		dryRun: false,
		appsPurged,
		componentsPurged: components.length,
		deletedDocs,
		storage,
		errors,
		message: `Purged ${appsPurged} unowned application(s) and ${components.length} orphan component(s).`,
	};
};

const listAllFiles = async (prefix) => {
	const bucket = admin.storage().bucket();
	const [files] = await bucket.getFiles({ prefix });
	return files;
};

const cleanupOrphanedStorageHandler = async (request) => {
	await assertAdmin(request.auth?.uid);
	const dryRun = request.data?.dryRun !== false;
	const db = admin.firestore();

	const appsSnap = await db.collection(collections.applications).get();
	const livingAppIds = new Set(appsSnap.docs.map((docSnap) => docSnap.id));
	const livingRefLocs = new Set();

	for (const appDoc of appsSnap.docs) {
		const attachmentsId = appDoc.data().attachments;
		if (typeof attachmentsId !== 'string' || !attachmentsId) continue;
		const attSnap = await db.doc(`${collections.attachments}/${attachmentsId}`).get();
		if (attSnap.exists) {
			for (const path of collectAttachmentPaths(attSnap.data())) {
				livingRefLocs.add(path);
			}
		}
	}

	const applicantsSnap = await db.collection(collections.applicants).get();
	const livingApplicantIds = new Set(applicantsSnap.docs.map((docSnap) => docSnap.id));
	for (const applicantDoc of applicantsSnap.docs) {
		const picture = applicantDoc.data().picture;
		if (picture && typeof picture === 'object' && typeof picture.refLoc === 'string') {
			livingRefLocs.add(picture.refLoc);
		}
	}

	const membersSnap = await db.collection(collections.members).get();
	const livingMemberIds = new Set(membersSnap.docs.map((docSnap) => docSnap.id));
	for (const memberDoc of membersSnap.docs) {
		const picture = memberDoc.data().picture;
		if (picture && typeof picture === 'object' && typeof picture.refLoc === 'string') {
			livingRefLocs.add(picture.refLoc);
		}
	}

	const orphanPaths = [];

	for (const file of await listAllFiles(STORAGE_PREFIXES.applications)) {
		const parts = file.name.split('/');
		const appId = parts[1];
		if (!appId) continue;
		if (!livingAppIds.has(appId) || !livingRefLocs.has(file.name)) {
			orphanPaths.push(file.name);
		}
	}

	for (const file of await listAllFiles(STORAGE_PREFIXES.applicantAvatars)) {
		const parts = file.name.split('/');
		const applicantId = parts[2];
		if (!applicantId) continue;
		if (!livingApplicantIds.has(applicantId) || !livingRefLocs.has(file.name)) {
			orphanPaths.push(file.name);
		}
	}

	for (const file of await listAllFiles(STORAGE_PREFIXES.memberAvatars)) {
		const parts = file.name.split('/');
		const memberId = parts[2];
		if (!memberId) continue;
		if (!livingMemberIds.has(memberId) || !livingRefLocs.has(file.name)) {
			orphanPaths.push(file.name);
		}
	}

	const uniqueOrphans = [...new Set(orphanPaths)];

	if (dryRun) {
		return {
			success: true,
			dryRun: true,
			count: uniqueOrphans.length,
			sample: uniqueOrphans.slice(0, 100),
			message: `Dry run: found ${uniqueOrphans.length} orphan storage object(s). Re-run with dryRun=false to delete.`,
		};
	}

	const storage = await deleteStoragePaths(uniqueOrphans);
	return {
		success: storage.errors.length === 0,
		dryRun: false,
		count: storage.deleted,
		missing: storage.missing,
		errors: storage.errors,
		message: `Deleted ${storage.deleted} orphan storage object(s).`,
	};
};

const resolveLogTimestamp = (data) => {
	const raw = data?.timestamp ?? data?.createdAt ?? data?.dated ?? null;
	if (!raw) return null;
	if (typeof raw.toDate === 'function') return raw.toDate();
	if (raw instanceof Date) return raw;
	const parsed = new Date(raw);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const purgeLogCollection = async (db, collectionName, olderThanDays, logId) => {
	const colRef = db.collection(collectionName);

	if (logId) {
		const ref = colRef.doc(logId);
		const snap = await ref.get();
		if (!snap.exists) {
			return { deleted: 0, scanned: 0, message: `${collectionName}/${logId} not found.` };
		}
		await ref.delete();
		return { deleted: 1, scanned: 1, message: `Deleted ${collectionName}/${logId}.` };
	}

	const cutoffDays = Number(olderThanDays);
	const hasCutoff = Number.isFinite(cutoffDays) && cutoffDays > 0;
	const cutoff = hasCutoff ? new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000) : null;

	const snap = await colRef.get();
	const mutations = [];
	for (const docSnap of snap.docs) {
		if (!cutoff) {
			mutations.push((batch) => batch.delete(docSnap.ref));
			continue;
		}
		const ts = resolveLogTimestamp(docSnap.data());
		if (!ts || ts <= cutoff) {
			mutations.push((batch) => batch.delete(docSnap.ref));
		}
	}

	const deleted = await commitInChunks(mutations);
	return {
		deleted,
		scanned: snap.size,
		message: hasCutoff
			? `Deleted ${deleted}/${snap.size} ${collectionName} entr(ies) older than ${cutoffDays} day(s).`
			: `Deleted ${deleted}/${snap.size} ${collectionName} entr(ies).`,
	};
};

const purgeLogsHandler = async (request) => {
	await assertAdmin(request.auth?.uid);
	const db = admin.firestore();
	const target = String(request.data?.logCollection || 'both');
	const olderThanDays = request.data?.olderThanDays ?? 0;
	const logId = typeof request.data?.logId === 'string' && request.data.logId.trim() ? request.data.logId.trim() : null;

	const targets = [];
	if (target === 'sitelog' || target === 'both') targets.push(collections.sitelog);
	if (target === 'dblog' || target === 'both') targets.push(collections.dblog);
	if (targets.length === 0) {
		throw new HttpsError('invalid-argument', 'logCollection must be sitelog, dblog, or both.');
	}

	if (logId && targets.length !== 1) {
		throw new HttpsError('invalid-argument', 'When deleting a single logId, choose sitelog or dblog (not both).');
	}

	const results = {};
	for (const collectionName of targets) {
		results[collectionName] = await purgeLogCollection(db, collectionName, olderThanDays, logId);
	}

	const deleted = Object.values(results).reduce((sum, entry) => sum + (entry.deleted || 0), 0);
	return {
		success: true,
		results,
		deleted,
		message: `Log purge complete. Deleted ${deleted} entr(ies).`,
	};
};

exports.permanentlyDeleteApplication = onCall(CALL_OPTS, permanentlyDeleteApplicationHandler);
exports.purgeDeletedApplications = onCall(CALL_OPTS, purgeDeletedApplicationsHandler);
exports.findUnownedRecords = onCall(CALL_OPTS, findUnownedRecordsHandler);
exports.purgeUnownedRecords = onCall(CALL_OPTS, purgeUnownedRecordsHandler);
exports.cleanupOrphanedStorage = onCall(CALL_OPTS, cleanupOrphanedStorageHandler);
exports.purgeLogs = onCall(CALL_OPTS, purgeLogsHandler);

exports._test = {
	permanentlyDeleteApplicationHandler,
	purgeDeletedApplicationsHandler,
	findUnownedRecordsHandler,
	purgeUnownedRecordsHandler,
	cleanupOrphanedStorageHandler,
	purgeLogsHandler,
};
