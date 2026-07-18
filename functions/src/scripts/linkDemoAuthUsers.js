/**
 * Link real Firebase Auth users to mock AMS profiles on ams-fsb.
 *
 * - demo@fullstackboston.com  → applicants/{uid} + full application graph
 * - jonaldo@fullstackboston.com → members/{uid} (already present; verify/enrich)
 *
 * AuthContext loads profiles by Auth UID as the Firestore document ID.
 */
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../../../serviceAccountKey.json');
const PROJECT_ID = 'ams-fsb';

const DEMO_EMAIL = 'demo@fullstackboston.com';
const MEMBER_EMAIL = 'jonaldo@fullstackboston.com';

const generateSearchTokens = (inputs = []) => {
	const tokens = new Set();
	const delimiterRegex = /[ @.\-_]/;
	for (const input of inputs) {
		if (input === undefined || input === null || input === '') continue;
		const str = String(input).toLowerCase();
		tokens.add(str);
		for (const part of str.split(delimiterRegex)) {
			if (!part) continue;
			for (let i = 1; i <= part.length; i++) tokens.add(part.substring(0, i));
		}
	}
	return Array.from(tokens);
};

const serviceAccount = require(SERVICE_ACCOUNT_PATH);
if (serviceAccount.project_id !== PROJECT_ID) {
	console.error(`REFUSING: service account project_id=${serviceAccount.project_id}, expected ${PROJECT_ID}`);
	process.exit(2);
}
if (!admin.apps.length) {
	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount),
		projectId: PROJECT_ID,
	});
}

const db = admin.firestore();
const auth = admin.auth();

const createApplicantGraphForUid = async (uid, email) => {
	const firstName = 'Demo';
	const lastName = 'Applicant';
	const callMe = 'Demo';
	const school = 'Northeastern University';
	const major = 'Computer Science';
	const org = 'Full Stack Boston Mentors';
	const cell = '555-010-2000';
	const now = new Date('2026-07-10T15:00:00Z');
	const windowString = '7/5/2026, 11:59:59 PM';

	const existing = await db.collection('applicants').doc(uid).get();
	if (existing.exists) {
		console.log(`Applicant ${uid} already exists — updating identity fields only, keeping linked data.`);
		await db.collection('applicants').doc(uid).set(
			{
				email,
				firstName,
				lastName,
				callMe,
				id: uid,
				searchableTerms: generateSearchTokens([firstName, lastName, email, org, school]),
			},
			{ merge: true },
		);
		return { reused: true };
	}

	const appIdAwarded = uuidv4();
	const appIdStarted = uuidv4();
	const profileId = uuidv4();
	const familyId = uuidv4();
	const educationId = uuidv4();
	const experienceId = uuidv4();
	const expensesId = uuidv4();
	const incomeId = uuidv4();
	const contributionsId = uuidv4();
	const projectionsId = uuidv4();
	const attachmentsId = uuidv4();
	const awardId = uuidv4();
	const awardAmount = 2500;

	const batch = db.batch();

	batch.set(db.collection('applicants').doc(uid), {
		id: uid,
		firstName,
		lastName,
		callMe,
		email,
		cell,
		school,
		gradYear: '2027',
		major,
		picture: {},
		organization: org,
		applications: [appIdAwarded, appIdStarted],
		awards: [
			{
				id: awardId,
				awardID: awardId,
				awardAmount,
				amount: awardAmount,
				type: 'New Applicant',
				deadline: windowString,
				awardedOn: now.toISOString(),
			},
		],
		searchableTerms: generateSearchTokens([firstName, lastName, email, org, school]),
		createdOn: now,
		notifications: { email: true, sms: false },
		preferences: { darkMode: false, primaryColor: 'blue' },
	});

	batch.set(db.collection('profiles').doc(profileId), {
		id: profileId,
		applicantID: uid,
		applicantFirstName: firstName,
		applicantLastName: lastName,
		applicantEmailAddress: email,
		applicantCellPhone: cell,
		applicantDOB: new Date('2004-06-15').toISOString(),
		applicantMailingAddress: { description: '100 High Street, Boston, MA, USA' },
		completedBy: uid,
		searchableTerms: generateSearchTokens([firstName, lastName, email]),
	});

	batch.set(db.collection('families').doc(familyId), {
		id: familyId,
		familyID: familyId,
		familyMembers: [
			{ fullName: 'Alex Applicant', relation: 'Parent', age: 52, occupation: 'Engineer' },
			{ fullName: 'Sam Applicant', relation: 'Sibling', age: 20, occupation: 'Student' },
		],
		completedBy: uid,
	});

	batch.set(db.collection('educationRecords').doc(educationId), {
		id: educationId,
		educationRecordID: educationId,
		schoolName: school,
		major,
		gpa: '3.7',
		expectedGraduation: '2027',
		completedBy: uid,
		searchableTerms: generateSearchTokens([school, major]),
	});

	batch.set(db.collection('experienceRecords').doc(experienceId), {
		id: experienceId,
		experienceRecordID: experienceId,
		positions: [{ organization: org, title: 'Volunteer Mentor', years: 2 }],
		completedBy: uid,
		searchableTerms: generateSearchTokens([org]),
	});

	batch.set(db.collection('expenseReports').doc(expensesId), {
		id: expensesId,
		tuition: 45000,
		roomAndBoard: 16000,
		books: 1200,
		otherExpenses: [{ amount: 800, title: 'Transit Pass', id: uuidv4() }],
		completedBy: uid,
	});

	batch.set(db.collection('incomeReports').doc(incomeId), {
		id: incomeId,
		applicantIncome: 4000,
		familyIncome: 72000,
		otherIncomeSources: [{ amount: 1500, title: 'Campus Job', id: uuidv4() }],
		completedBy: uid,
	});

	batch.set(db.collection('contributions').doc(contributionsId), {
		id: contributionsId,
		applicantSavings: 2500,
		applicantFamily: 8000,
		request: 5000,
		completedBy: uid,
	});

	batch.set(db.collection('projections').doc(projectionsId), {
		id: projectionsId,
		applicantSavings: 2500,
		applicantFamily: 8000,
		request: 5000,
		completedBy: uid,
	});

	batch.set(db.collection('attachments').doc(attachmentsId), {
		id: attachmentsId,
		attachmentsID: attachmentsId,
		applicantPersonalLetter: { displayName: 'Personal_Statement.pdf', home: 'http://example.com/fake.pdf' },
		academicRecommendationLetter: { displayName: 'Academic_Rec.pdf', home: 'http://example.com/fake.pdf' },
		communityRecommendationLetter: { displayName: 'Community_Rec.pdf', home: 'http://example.com/fake.pdf' },
		experienceRecommendationLetter: { displayName: 'Experience_Rec.pdf', home: 'http://example.com/fake.pdf' },
		academicTranscript: { displayName: 'Transcript.pdf', home: 'http://example.com/fake.pdf' },
		studentAidReport: { displayName: 'SAR_Summary.pdf', home: 'http://example.com/fake.pdf' },
		completedBy: uid,
		searchableTerms: generateSearchTokens(['Essay', 'Transcript', 'Recommendation']),
	});

	const sharedAppFields = {
		applicantName: `${firstName} ${lastName}`,
		completedBy: uid,
		window: windowString,
		profile: profileId,
		family: familyId,
		education: educationId,
		experience: experienceId,
		expenses: expensesId,
		incomes: incomeId,
		contributions: contributionsId,
		projections: projectionsId,
		attachments: attachmentsId,
	};

	batch.set(db.collection('applications').doc(appIdAwarded), {
		...sharedAppFields,
		id: appIdAwarded,
		type: 'New Applicant',
		status: 'Awarded',
		submittedOn: now.toISOString(),
		lastUpdated: now.toISOString(),
		awards: [awardId],
		searchableTerms: generateSearchTokens(['New Applicant', 'Awarded', firstName, lastName, email]),
	});

	batch.set(db.collection('applications').doc(appIdStarted), {
		...sharedAppFields,
		id: appIdStarted,
		type: 'Returning Grant',
		status: 'Started',
		submittedOn: null,
		lastUpdated: now.toISOString(),
		searchableTerms: generateSearchTokens(['Returning Grant', 'Started', firstName, lastName, email]),
	});

	batch.set(db.collection('awards').doc(awardId), {
		awardID: awardId,
		id: awardId,
		awardAmount,
		amount: awardAmount,
		applicantID: uid,
		applicantId: uid,
		applicationID: appIdAwarded,
		applicationId: appIdAwarded,
		applicantName: `${firstName} ${lastName}`,
		completedBy: uid,
		createdOn: now.toISOString(),
		awardedOn: now.toISOString(),
		deadline: windowString,
		message: 'Demo award for the AMS walkthrough account.',
		type: 'New Applicant',
	});

	await batch.commit();
	return {
		reused: false,
		applications: [appIdAwarded, appIdStarted],
		awardId,
	};
};

const FULL_ADMIN_PERMISSIONS = {
	admin: true,
	email: true,
	push: true,
	message: true,
	site: true,
	finances: true,
	applications: true,
	members: true,
	audit: true,
	archives: true,
	login: true,
	interviews: {
		canHost: true,
		canAccess: true,
		canSchedule: true,
		canDeliberate: true,
	},
	emails: {
		folders: {
			inbox: true,
			sent: true,
			spam: true,
			trash: true,
			archive: true,
			outbox: true,
			applications: true,
		},
		aliases: {
			admin: true,
			webmaster: true,
			applications: true,
			committee: true,
			inquiries: true,
			chairman: true,
			noreply: true,
			test: true,
			hello: true,
			help: true,
		},
	},
};

const ensureMemberLinked = async (uid, email) => {
	const ref = db.collection('members').doc(uid);
	const snap = await ref.get();
	const existing = snap.exists ? snap.data() : {};
	const firstName = existing.firstName || 'Jonaldo';
	const lastName = existing.lastName || 'Alix';
	const position = existing.position || 'Platform Admin';

	await ref.set(
		{
			id: uid,
			email,
			firstName,
			lastName,
			callMe: existing.callMe || firstName,
			position,
			since: existing.since || 2024,
			cell: existing.cell || '',
			alias: existing.alias || email,
			picture: existing.picture || {},
			personalSignature: existing.personalSignature || '',
			permissions: {
				...FULL_ADMIN_PERMISSIONS,
				...(existing.permissions || {}),
				interviews: {
					...FULL_ADMIN_PERMISSIONS.interviews,
					...(existing.permissions?.interviews || {}),
				},
				emails: {
					folders: {
						...FULL_ADMIN_PERMISSIONS.emails.folders,
						...(existing.permissions?.emails?.folders || {}),
					},
					aliases: {
						...FULL_ADMIN_PERMISSIONS.emails.aliases,
						...(existing.permissions?.emails?.aliases || {}),
					},
				},
			},
			notifications: existing.notifications || { email: true, sms: false },
			preferences: existing.preferences || { darkMode: true, primaryColor: 'blue' },
			searchableTerms: generateSearchTokens([firstName, lastName, email, position]),
			updatedOn: admin.firestore.FieldValue.serverTimestamp(),
			...(snap.exists ? {} : { createdOn: admin.firestore.FieldValue.serverTimestamp() }),
		},
		{ merge: true },
	);

	const data = (await ref.get()).data();
	return {
		created: !snap.exists,
		email: data.email,
		name: `${data.firstName} ${data.lastName}`,
		hasAdmin: Boolean(data.permissions?.admin),
		canAccessInterviews: Boolean(data.permissions?.interviews?.canAccess),
	};
};

const ensureAuthUserDoc = async (uid, email) => {
	await db.collection('authUsers').doc(uid).set(
		{
			uid,
			email,
			createdAt: admin.firestore.FieldValue.serverTimestamp(),
		},
		{ merge: true },
	);
};

const main = async () => {
	const demoUser = await auth.getUserByEmail(DEMO_EMAIL);
	const memberUser = await auth.getUserByEmail(MEMBER_EMAIL);

	console.log(`Linking ${DEMO_EMAIL} → applicant ${demoUser.uid}`);
	const applicantResult = await createApplicantGraphForUid(demoUser.uid, DEMO_EMAIL);
	await ensureAuthUserDoc(demoUser.uid, DEMO_EMAIL);
	console.log('  applicant:', applicantResult);

	console.log(`Verifying ${MEMBER_EMAIL} → member ${memberUser.uid}`);
	const memberResult = await ensureMemberLinked(memberUser.uid, MEMBER_EMAIL);
	await ensureAuthUserDoc(memberUser.uid, MEMBER_EMAIL);
	console.log('  member:', memberResult);

	// Quick read-back the way AuthContext does
	const applicant = await db.collection('applicants').doc(demoUser.uid).get();
	const member = await db.collection('members').doc(memberUser.uid).get();
	console.log('\nAuthContext lookup check:');
	console.log('  applicants/' + demoUser.uid, applicant.exists, applicant.data()?.email);
	console.log('  members/' + memberUser.uid, member.exists, member.data()?.email);
	console.log('Done.');
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
