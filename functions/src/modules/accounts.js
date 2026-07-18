const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { collections, ApplicationStatus } = require('../config');

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

const MERGEABLE_APPLICANT_FIELDS = [
	'firstName',
	'lastName',
	'callMe',
	'name',
	'school',
	'gradYear',
	'major',
	'organization',
	'cell',
	'homePhone',
	'email',
	'picture',
	'notifications',
];

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const assertAdmin = async (callerUid) => {
	if (!callerUid) {
		throw new HttpsError('unauthenticated', 'You must be logged in.');
	}
	const memberSnap = await admin.firestore().doc(`${collections.members}/${callerUid}`).get();
	if (!memberSnap.exists || !memberSnap.data()?.permissions?.admin) {
		throw new HttpsError('permission-denied', 'You must be an admin to perform this action.');
	}
};

const hasAuthAccount = async (uid) => {
	try {
		await admin.auth().getUser(uid);
		return true;
	} catch {
		return false;
	}
};

const pickFieldValue = (field, primaryData, secondaryData, fieldSelections) => {
	const source = fieldSelections?.[field] === 'secondary' ? 'secondary' : 'primary';
	const value = source === 'secondary' ? secondaryData[field] : primaryData[field];
	const fallback = source === 'secondary' ? primaryData[field] : secondaryData[field];
	if (value !== undefined && value !== null && value !== '') return value;
	return fallback;
};

const commitInChunks = async (mutations) => {
	const CHUNK = 400;
	for (let i = 0; i < mutations.length; i += CHUNK) {
		const batch = admin.firestore().batch();
		mutations.slice(i, i + CHUNK).forEach((fn) => fn(batch));
		await batch.commit();
	}
};

const moveApplicantNotes = async (primaryId, secondaryId) => {
	const notesSnap = await admin.firestore().collection(`${collections.applicants}/${secondaryId}/notes`).get();
	if (notesSnap.empty) return 0;

	const mutations = notesSnap.docs.map((noteDoc) => (batch) => {
		const targetRef = admin.firestore().doc(`${collections.applicants}/${primaryId}/notes/${noteDoc.id}`);
		batch.set(targetRef, noteDoc.data(), { merge: true });
		batch.delete(noteDoc.ref);
	});
	await commitInChunks(mutations);
	return notesSnap.size;
};

const getLinkedRecordRefs = (appData) =>
	APPLICATION_LINKED_FIELDS.map(({ field, collection: collectionName }) => {
		const recordId = appData[field];
		if (!recordId || typeof recordId !== 'string') return null;
		return { collection: collectionName, recordId };
	}).filter(Boolean);

const summarizeApplication = (appId, appData, ownerId) => ({
	id: appId,
	type: appData.type || '',
	status: appData.status || '',
	cycleYear: appData.cycleYear || appData.window || '',
	completedBy: appData.completedBy || ownerId,
});

const loadApplicantForMerge = async (db, applicantId) => {
	const snap = await db.doc(`${collections.applicants}/${applicantId}`).get();
	if (!snap.exists) return null;

	const data = snap.data();
	const appIds = Array.isArray(data.applications) ? data.applications : [];
	const applications = [];

	for (const appId of appIds) {
		const appSnap = await db.doc(`${collections.applications}/${appId}`).get();
		if (!appSnap.exists) {
			applications.push({ id: appId, type: '', status: 'Missing', cycleYear: '', completedBy: applicantId, missing: true });
			continue;
		}
		applications.push(summarizeApplication(appId, appSnap.data(), applicantId));
	}

	return {
		id: applicantId,
		...data,
		hasAuth: await hasAuthAccount(applicantId),
		authEmail: await (async () => {
			try {
				const user = await admin.auth().getUser(applicantId);
				return user.email || null;
			} catch {
				return null;
			}
		})(),
		applicationsDetail: applications,
	};
};

const queueDiscardApplication = async (db, appId, mutations) => {
	const appRef = db.doc(`${collections.applications}/${appId}`);
	const appSnap = await appRef.get();
	if (!appSnap.exists) return;

	const appData = appSnap.data();
	mutations.push((batch) =>
		batch.update(appRef, {
			status: ApplicationStatus.deleted,
			deletedOn: admin.firestore.FieldValue.serverTimestamp(),
		}),
	);

	for (const { collection: collectionName, recordId } of getLinkedRecordRefs(appData)) {
		mutations.push((batch) => batch.delete(db.doc(`${collectionName}/${recordId}`)));
	}

	const awardsSnap = await db.collection(collections.awards).where('applicationId', '==', appId).get();
	for (const awardDoc of awardsSnap.docs) {
		mutations.push((batch) => batch.delete(awardDoc.ref));
	}

	const interviewsSnap = await db.collection(collections.interviews).where('applicationId', '==', appId).get();
	for (const interviewDoc of interviewsSnap.docs) {
		mutations.push((batch) => batch.delete(interviewDoc.ref));
	}
};

const queueReassignApplication = async (db, appId, primaryId, secondaryId, mutations) => {
	const appRef = db.doc(`${collections.applications}/${appId}`);
	const appSnap = await appRef.get();
	if (!appSnap.exists) return;

	const appData = appSnap.data();
	if (appData.completedBy === secondaryId) {
		mutations.push((batch) => batch.update(appRef, { completedBy: primaryId }));
	}

	for (const { collection: collectionName, recordId } of getLinkedRecordRefs(appData)) {
		const recordRef = db.doc(`${collectionName}/${recordId}`);
		const recordSnap = await recordRef.get();
		if (recordSnap.exists && recordSnap.data().completedBy === secondaryId) {
			mutations.push((batch) => batch.update(recordRef, { completedBy: primaryId }));
		}
	}

	const interviewsSnap = await db.collection(collections.interviews).where('applicationId', '==', appId).get();
	for (const interviewDoc of interviewsSnap.docs) {
		if (interviewDoc.data().applicantId === secondaryId) {
			mutations.push((batch) => batch.update(interviewDoc.ref, { applicantId: primaryId }));
		}
	}
};

const disableAndDeleteAuth = async (db, uid) => {
	try {
		await admin.auth().updateUser(uid, { disabled: true });
	} catch {
		// User may already be deleted.
	}
	try {
		await admin.auth().deleteUser(uid);
	} catch {
		// User may already be deleted.
	}
	await db.doc(`${collections.users}/${uid}`).delete().catch(() => {});
};

const syncAuthUserDoc = async (db, uid, authUser, merged) => {
	const userRef = db.doc(`${collections.users}/${uid}`);
	await userRef.set(
		{
			uid,
			email: normalizeEmail(merged.email) || authUser.email || null,
			displayName: merged.name || authUser.displayName || null,
			photoURL: authUser.photoURL || null,
			updatedAt: admin.firestore.FieldValue.serverTimestamp(),
		},
		{ merge: true },
	);
};

const resolveKeptAuthId = (keptAuthSource, primaryId, secondaryId, primaryHasAuth, secondaryHasAuth) => {
	if (keptAuthSource === 'secondary' && secondaryHasAuth) return secondaryId;
	if (keptAuthSource === 'primary' && primaryHasAuth) return primaryId;
	if (primaryHasAuth) return primaryId;
	if (secondaryHasAuth) return secondaryId;
	return null;
};

const reconcileAuthAfterMerge = async (db, {
	survivorId,
	primaryId,
	secondaryId,
	primaryHasAuth,
	secondaryHasAuth,
	keptAuthSource,
	merged,
}) => {
	const authIds = [];
	if (primaryHasAuth) authIds.push(primaryId);
	if (secondaryHasAuth) authIds.push(secondaryId);
	if (authIds.length === 0) {
		return 'No auth changes were needed.';
	}

	const keptAuthId = resolveKeptAuthId(keptAuthSource, primaryId, secondaryId, primaryHasAuth, secondaryHasAuth);
	const keptAuthUser = await admin.auth().getUser(keptAuthId);
	const targetEmail = normalizeEmail(merged.email) || keptAuthUser.email;
	const declinedAuthIds = authIds.filter((uid) => uid !== survivorId);
	const messages = [];

	if (keptAuthId === survivorId) {
		for (const uid of declinedAuthIds) {
			await disableAndDeleteAuth(db, uid);
			messages.push(`Removed declined login (${uid}).`);
		}

		const updates = { disabled: false };
		if (targetEmail && keptAuthUser.email !== targetEmail) {
			updates.email = targetEmail;
		}
		if (merged.name && keptAuthUser.displayName !== merged.name) {
			updates.displayName = merged.name;
		}
		await admin.auth().updateUser(survivorId, updates);
		await syncAuthUserDoc(db, survivorId, { ...keptAuthUser, ...updates }, merged);
		messages.push(`Login retained on merged account (${targetEmail}).`);
	} else {
		for (const uid of authIds) {
			await disableAndDeleteAuth(db, uid);
			messages.push(`Removed login (${uid}).`);
		}

		try {
			await admin.auth().createUser({
				uid: survivorId,
				email: targetEmail,
				emailVerified: keptAuthUser.emailVerified,
				displayName: merged.name || keptAuthUser.displayName || null,
				photoURL: keptAuthUser.photoURL || null,
				disabled: false,
			});
		} catch (error) {
			if (error.code === 'auth/email-already-exists') {
				throw new HttpsError(
					'failed-precondition',
					`Email ${targetEmail} is already registered to another Firebase account. Choose a different email or resolve the conflict first.`,
				);
			}
			throw error;
		}

		await syncAuthUserDoc(db, survivorId, keptAuthUser, merged);
		messages.push(
			`Login moved to merged account (${targetEmail}). Declined logins were removed. If password sign-in fails, use Forgot Password.`,
		);
	}

	return messages.join(' ');
};

exports.getApplicantsByEmail = onCall(async (request) => {
	await assertAdmin(request.auth?.uid);
	const email = normalizeEmail(request.data?.email);
	if (!email) {
		throw new HttpsError('invalid-argument', 'An email address is required.');
	}

	const snap = await admin.firestore().collection(collections.applicants).where('email', '==', email).get();
	const applicants = await Promise.all(
		snap.docs.map(async (docSnap) => ({
			id: docSnap.id,
			...docSnap.data(),
			hasAuth: await hasAuthAccount(docSnap.id),
		})),
	);
	return { applicants };
});

exports.getApplicantsForMerge = onCall(async (request) => {
	await assertAdmin(request.auth?.uid);

	const rawIds = request.data?.applicantIds;
	if (!Array.isArray(rawIds) || rawIds.length !== 2) {
		throw new HttpsError('invalid-argument', 'Exactly two applicantIds are required.');
	}

	const applicantIds = [...new Set(rawIds.map((id) => String(id || '').trim()).filter(Boolean))];
	if (applicantIds.length !== 2) {
		throw new HttpsError('invalid-argument', 'Two distinct applicant IDs are required.');
	}

	const db = admin.firestore();
	const applicants = await Promise.all(applicantIds.map((id) => loadApplicantForMerge(db, id)));

	if (applicants.some((applicant) => !applicant)) {
		throw new HttpsError('not-found', 'One or both applicant records were not found.');
	}

	return { applicants };
});

exports.mergeApplicantAccounts = onCall({ timeoutSeconds: 300, memory: '1GiB' }, async (request) => {
	const callerUid = request.auth?.uid;
	await assertAdmin(callerUid);

	const primaryId = String(request.data?.primaryId || '').trim();
	const secondaryId = String(request.data?.secondaryId || '').trim();
	const fieldSelections = request.data?.fieldSelections || {};
	const keptApplicationIds = Array.isArray(request.data?.keptApplicationIds)
		? [...new Set(request.data.keptApplicationIds.map((id) => String(id || '').trim()).filter(Boolean))]
		: [];
	const keptAuthSource = request.data?.keptAuthSource === 'secondary' ? 'secondary' : 'primary';

	if (!primaryId || !secondaryId) {
		throw new HttpsError('invalid-argument', 'primaryId and secondaryId are required.');
	}
	if (primaryId === secondaryId) {
		throw new HttpsError('invalid-argument', 'Primary and secondary accounts must be different.');
	}

	const db = admin.firestore();
	const primaryRef = db.doc(`${collections.applicants}/${primaryId}`);
	const secondaryRef = db.doc(`${collections.applicants}/${secondaryId}`);
	const [primarySnap, secondarySnap] = await Promise.all([primaryRef.get(), secondaryRef.get()]);

	if (!primarySnap.exists || !secondarySnap.exists) {
		throw new HttpsError('not-found', 'Both applicant records must exist before merging.');
	}

	const primaryData = primarySnap.data();
	const secondaryData = secondarySnap.data();
	const primaryApps = Array.isArray(primaryData.applications) ? primaryData.applications : [];
	const secondaryApps = Array.isArray(secondaryData.applications) ? secondaryData.applications : [];
	const allAppIds = [...new Set([...primaryApps, ...secondaryApps])];
	const keptSet = new Set(keptApplicationIds);

	if (keptApplicationIds.some((appId) => !allAppIds.includes(appId))) {
		throw new HttpsError('invalid-argument', 'keptApplicationIds must reference applications from the selected accounts.');
	}

	const [primaryHasAuth, secondaryHasAuth] = await Promise.all([
		hasAuthAccount(primaryId),
		hasAuthAccount(secondaryId),
	]);

	const merged = { ...primaryData };

	for (const field of MERGEABLE_APPLICANT_FIELDS) {
		merged[field] = pickFieldValue(field, primaryData, secondaryData, fieldSelections);
	}

	if (typeof merged.email === 'string') {
		merged.email = normalizeEmail(merged.email);
	}
	if (merged.firstName && merged.lastName) {
		merged.name = `${merged.firstName} ${merged.lastName}`;
	}

	merged.applications = keptApplicationIds;
	merged.id = primaryId;
	merged.auth = primaryId;

	const mutations = [];
	let reassignedApps = 0;
	let discardedApps = 0;

	for (const appId of allAppIds) {
		if (keptSet.has(appId)) {
			await queueReassignApplication(db, appId, primaryId, secondaryId, mutations);
			reassignedApps += 1;
		} else {
			await queueDiscardApplication(db, appId, mutations);
			discardedApps += 1;
		}
	}

	const orphanInterviewsSnap = await db.collection(collections.interviews).where('applicantId', '==', secondaryId).get();
	for (const interviewDoc of orphanInterviewsSnap.docs) {
		mutations.push((batch) => batch.update(interviewDoc.ref, { applicantId: primaryId }));
	}

	mutations.push((batch) => batch.set(primaryRef, merged, { merge: true }));
	mutations.push((batch) => batch.delete(secondaryRef));
	mutations.push((batch) => batch.delete(db.doc(`${collections.presence}/${secondaryId}`)));

	await commitInChunks(mutations);
	const movedNotes = await moveApplicantNotes(primaryId, secondaryId);

	const authMessage = await reconcileAuthAfterMerge(db, {
		survivorId: primaryId,
		primaryId,
		secondaryId,
		primaryHasAuth,
		secondaryHasAuth,
		keptAuthSource,
		merged,
	});

	return {
		message: `Merged ${secondaryId} into ${primaryId}. Kept ${reassignedApps} application(s), discarded ${discardedApps}, moved ${movedNotes} notes. ${authMessage}`,
		primaryId,
		secondaryId,
		keptApplications: reassignedApps,
		discardedApplications: discardedApps,
		movedNotes,
	};
});
