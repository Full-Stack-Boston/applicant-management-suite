const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// --- Configuration ---
// Go up two levels to find the key in project root
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../../../serviceAccountKey.json');
const PROJECT_ID = 'ams-fsb';

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

// --- Data Generators ---
const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle', 'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa', 'Edward', 'Deborah', 'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon', 'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy', 'Nicholas', 'Shirley', 'Eric', 'Angela', 'Jonathan', 'Helen', 'Stephen', 'Anna', 'Larry', 'Brenda', 'Justin', 'Pamela', 'Scott', 'Nicole', 'Brandon', 'Emma'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Patel', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper'];
const organizations = [
	'North Shore YMCA',
	'Haven From Hunger',
	'The Food Project (Lynn)',
	'Salem Public Library Friends',
	'Essex County Community Foundation',
	'Partners Healthcare Volunteer Corps',
	'House of Peace & Education (Lawrence)',
	'Groundwork Lawrence',
	'Merrimack Valley Habitat for Humanity',
	'Boys & Girls Club of Greater Salem',
	'Newburyport Chamber Youth Mentors',
	'Gloucester Maritime Heritage Center',
	'Ipswich River Watershed Association',
	'Beverly Bootstraps',
	'North Shore Community Outreach',
	'Tufts Medical Center Youth Corps',
	'Mass Audubon Ipswich River Sanctuary',
	'Greater Lawrence Community Action Council',
	'Peabody Institute Library Tutors',
	'North Shore Community College Mentors',
	'Salem State Neighbor Mentoring',
	'New England Aquarium Teen Interpreter',
	'Boston Harbor Islands Alliance',
	'Boston Cares',
	'North Shore Community Development Coalition',
	'Lynn Museum & Arts Ambassadors',
	'Amesbury Senior Center Helpers',
	'Marblehead Community Center',
	'Manchester Athletic Club Youth Assist',
	'Rockport Art Association Guides',
];
const roles = ['Team Lead', 'Volunteer Coordinator', 'Mentor', 'Project Manager', 'Outreach Specialist', 'Tutor', 'Fundraiser', 'Event Planner', 'Research Assistant', 'Camp Counselor', 'Peer Advisor', 'Site Supervisor', 'Program Aide', 'Front Desk Assistant', 'Data Entry Volunteer', 'Community Liaison', 'Shift Leader', 'Content Creator', 'Grant Writer Assistant', 'Youth Coach'];
const cities = [
	'Salem, MA',
	'Lynn, MA',
	'Peabody, MA',
	'Beverly, MA',
	'Danvers, MA',
	'Marblehead, MA',
	'Swampscott, MA',
	'Nahant, MA',
	'Saugus, MA',
	'Lynnfield, MA',
	'Middleton, MA',
	'Topsfield, MA',
	'Boxford, MA',
	'Ipswich, MA',
	'Rowley, MA',
	'Newbury, MA',
	'Newburyport, MA',
	'Amesbury, MA',
	'Salisbury, MA',
	'Georgetown, MA',
	'Groveland, MA',
	'Merrimac, MA',
	'West Newbury, MA',
	'Essex, MA',
	'Hamilton, MA',
	'Wenham, MA',
	'Manchester-by-the-Sea, MA',
	'Gloucester, MA',
	'Rockport, MA',
	'Lawrence, MA',
	'Methuen, MA',
	'Andover, MA',
	'North Andover, MA',
	'Haverhill, MA',
];
const schools = [
	'Salem State University',
	'North Shore Community College',
	'Endicott College',
	'Merrimack College',
	'Northern Essex Community College',
	'Gordon College',
	'Massachusetts College of Art and Design',
	'UMass Lowell',
	'UMass Boston',
	'UMass Amherst',
	'Boston University',
	'Northeastern University',
	'Suffolk University',
	'Emerson College',
	'Tufts University',
	'Harvard Extension School',
	'MIT',
	'Boston College',
	'Bentley University',
	'Brandeis University',
	'Wellesley College',
	'Babson College',
	'Wentworth Institute of Technology',
	'Simmons University',
	'Lesley University',
	'Bridgewater State University',
	'Framingham State University',
];
const highSchools = [
	'Salem High School',
	'Lynn Classical High School',
	'Lynn English High School',
	'Peabody Veterans Memorial High School',
	'Beverly High School',
	'Danvers High School',
	'Marblehead High School',
	'Swampscott High School',
	'Saugus High School',
	'Ipswich High School',
	'Newburyport High School',
	'Amesbury High School',
	'Gloucester High School',
	'Rockport High School',
	'Manchester Essex Regional High School',
	'Hamilton-Wenham Regional High School',
	'Triton Regional High School',
	'Pentucket Regional High School',
	'Andover High School',
	'North Andover High School',
	'Lawrence High School',
	'Methuen High School',
	'Haverhill High School',
];
const majors = ['Computer Science', 'Biology', 'History', 'Engineering', 'Psychology', 'Nursing', 'Business Administration', 'Economics', 'Political Science', 'English Literature', 'Mathematics', 'Communications', 'Marketing', 'Finance', 'Accounting', 'Sociology', 'Chemistry', 'Environmental Science', 'Education', 'Public Health', 'Marine Biology', 'Hospitality Management', 'Graphic Design', 'Criminal Justice', 'Social Work'];
const streets = ['Essex St', 'Washington St', 'Lafayette St', 'Highland Ave', 'Cabot St', 'Main St', 'Federal St', 'Bridge St', 'Ocean Ave', 'Central St', 'Market St', 'Harbor St', 'Summer St', 'Winter St', 'Chestnut St', 'Union St', 'Maple St', 'School St', 'Park St', 'Pleasant St', 'Derby St', 'Congress St', 'Bay View Ave', 'Atlantic Ave'];
const emailDomains = ['gmail.com', 'outlook.com', 'icloud.com', 'protonmail.com', 'yahoo.com', 'northeastern.edu', 'bu.edu', 'salemstate.edu', 'endicott.edu'];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomFloat = (min, max) => (Math.random() * (max - min) + min).toFixed(2);

const generateSearchTokens = (inputs = []) => {
	const tokens = new Set();
	inputs.forEach((input) => {
		if (!input) return;
		const lower = input.toString().toLowerCase();
		tokens.add(lower);
		lower.split(/[ @.\-_]/).forEach((part) => {
			if (part) for (let i = 1; i <= part.length; i++) tokens.add(part.substring(0, i));
		});
	});
	return Array.from(tokens);
};

const deleteCollection = async (collectionPath) => {
	const collectionRef = db.collection(collectionPath);
	const snapshot = await collectionRef.get();
	if (snapshot.size === 0) return;

	console.log(`Deleting ${snapshot.size} documents from ${collectionPath}...`);
	const CHUNK = 400;
	for (let i = 0; i < snapshot.docs.length; i += CHUNK) {
		const batch = db.batch();
		snapshot.docs.slice(i, i + CHUNK).forEach((doc) => {
			batch.delete(doc.ref);
		});
		await batch.commit();
		console.log(`  deleted ${Math.min(i + CHUNK, snapshot.size)}/${snapshot.size}`);
	}
};

const createMockApplicantGraph = async (i) => {
	const firstName = getRandom(firstNames);
	const lastName = getRandom(lastNames);
	const uid = `mock-user-${i}-${Date.now()}`;
	const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${getRandom(emailDomains)}`;
	const org = getRandom(organizations);
	const school = getRandom(schools);
	const major = getRandom(majors);
	const city = getRandom(cities);

	// Generate a random date from 2023 through today (demo "as of" cutover)
	const endDate = new Date('2026-07-15T23:59:59Z').getTime();
	const startDate = new Date('2023-01-01T00:00:00Z').getTime();
	const randomDate = new Date(startDate + Math.random() * (endDate - startDate));
	const randomYear = randomDate.getFullYear();
	const windowString = `7/5/${randomYear}, 11:59:59 PM`;

	const applicantData = {
		id: uid,
		firstName,
		lastName,
		email,
		cell: `555-010-${1000 + i}`,
		callMe: firstName,
		school,
		gradYear: '2028',
		major,
		picture: {},
		organization: org,
		applications: [],
		awards: [],
		searchableTerms: generateSearchTokens([firstName, lastName, email, org, school]),
		createdOn: randomDate,
	};

	await db.collection('applicants').doc(uid).set(applicantData);
	console.log(`Created Applicant: ${firstName} ${lastName} (${uid})`);

	const appId = uuidv4();
	const profileId = uuidv4();
	const familyId = uuidv4();
	const educationId = uuidv4();
	const experienceId = uuidv4();
	const expensesId = uuidv4();
	const incomeId = uuidv4();
	const contributionsId = uuidv4();
	const projectionsId = uuidv4();
	const attachmentsId = uuidv4();

	const batch = db.batch();

	batch.set(db.collection('profiles').doc(profileId), {
		id: profileId,
		applicantID: uid,
		applicantFirstName: firstName,
		applicantLastName: lastName,
		applicantEmailAddress: email,
		applicantCellPhone: applicantData.cell,
		applicantDOB: new Date('2003-01-01').toISOString(),
		applicantMailingAddress: { description: `${getRandomInt(10, 999)} ${getRandom(streets)}, ${city}, MA, USA` },
		completedBy: uid,
		searchableTerms: generateSearchTokens([firstName, lastName, email]),
	});

	batch.set(db.collection('families').doc(familyId), {
		id: familyId,
		familyID: familyId,
		familyMembers: [
			{ fullName: `Parent of ${firstName}`, relation: 'Father', age: 50, occupation: 'Manager' },
			{ fullName: `Sibling of ${firstName}`, relation: 'Sibling', age: 18, occupation: 'Student' },
		],
		completedBy: uid,
	});

	batch.set(db.collection('educationRecords').doc(educationId), {
		id: educationId,
		educationRecordID: educationId,
		schoolName: school,
		major: major,
		expectedGraduationDate: new Date('2025-05-01').toISOString(),
		currentGPA: getRandomFloat(2.5, 4.0),
		previousSchools: [getRandom(highSchools)],
		completedBy: uid,
		searchableTerms: generateSearchTokens([school, major]),
	});

	batch.set(db.collection('experienceRecords').doc(experienceId), {
		id: experienceId,
		experienceRecordID: experienceId,
		currentOrganization: getRandom(['0', '1']),
		positions: [
			{ organization: org, role: getRandom(roles), type: 'Non-Profit', location: city },
			{ organization: getRandom(organizations), role: 'Volunteer', type: 'Community', location: city },
		],
		completedBy: uid,
		searchableTerms: generateSearchTokens([org]),
	});

	batch.set(db.collection('expenseReports').doc(expensesId), {
		id: expensesId,
		expensesID: expensesId,
		tuitionCost: getRandomInt(20000, 60000),
		roomAndBoardCost: getRandomInt(10000, 20000),
		bookCost: 1200,
		commutingCost: 800,
		otherExpenses: [{ amount: getRandomInt(10, 10000), title: 'Miscellaneous Resources', id: uuidv4() }],
		completedBy: uid,
	});

	batch.set(db.collection('incomeReports').doc(incomeId), {
		id: incomeId,
		incomesReportID: incomeId,
		summerEarnings: getRandomInt(2000, 5000),
		fallEarnings: getRandomInt(1000, 3000),
		earningsAppliedToEducation: getRandomInt(3000, 8000),
		savingsAppliedToEducation: 1000,
		collegeAward: getRandomInt(10000, 30000),
		loansAmount: 5000,
		otherIncomeSources: [{ amount: getRandomInt(1000, 5000), title: 'Other Scholarships', id: uuidv4() }],
		completedBy: uid,
	});

	batch.set(db.collection('contributions').doc(contributionsId), {
		id: contributionsId,
		contributionsID: contributionsId,
		p1ExpectedAnnualIncome: getRandomInt(40000, 100000),
		p2ExpectedAnnualIncome: getRandomInt(40000, 100000),
		parentsOwnOrRentHome: getRandom(['Own', 'Rent']),
		parentsMaritalStatus: 'Married',
		siblingSchools: [{ cost: getRandomInt(10000, 30000), title: 'Sibling University', id: uuidv4() }],
		anyExtraordinaryExpenses: 'Expenses unrelated to education.',
		completedBy: uid,
	});

	batch.set(db.collection('projections').doc(projectionsId), {
		id: projectionsId,
		projectionsID: projectionsId,
		applicantEarnings: 5000,
		applicantSavings: 1000,
		applicantFamily: getRandomInt(5000, 20000),
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

	// Round-robin distribution avoids low-balling any specific application type
	const appTypes = ['New Applicant', 'Returning Grant', 'Scholarship Check In'];
	const appType = appTypes[i % appTypes.length];
	const appStatus = getRandom(['Submitted', 'Eligible', 'Invited', 'Completed', 'Incomplete', 'Awarded', 'Started']);

	const applicationData = {
		id: appId,
		applicantName: `${firstName} ${lastName}`,
		completedBy: uid,
		type: appType,
		status: appStatus,
		window: windowString,
		submittedOn: randomDate.toISOString(),
		lastUpdated: randomDate.toISOString(),
		profile: profileId,
		family: familyId,
		education: educationId,
		experience: experienceId,
		expenses: expensesId,
		incomes: incomeId,
		contributions: contributionsId,
		projections: projectionsId,
		attachments: attachmentsId,
		searchableTerms: generateSearchTokens([appType, appStatus, firstName, lastName]),
	};

	// Mock Awards — schema matches UI (awardAmount / awardID) and links onto the application
	if (appStatus === 'Awarded') {
		const awardId = uuidv4();
		const amount = getRandomInt(1000, 5000);
		const awardData = {
			awardID: awardId,
			id: awardId,
			awardAmount: amount,
			amount,
			applicantID: uid,
			applicantId: uid,
			applicationID: appId,
			applicationId: appId,
			applicantName: `${firstName} ${lastName}`,
			completedBy: uid,
			createdOn: randomDate.toISOString(),
			awardedOn: randomDate.toISOString(),
			deadline: windowString,
			message: 'Awarded by the review committee.',
			type: appType,
		};
		batch.set(db.collection('awards').doc(awardId), awardData);
		applicationData.awards = [awardId];
		applicationData.status = 'Awarded';

		await db.collection('applicants').doc(uid).update({
			awards: admin.firestore.FieldValue.arrayUnion({
				id: awardId,
				awardID: awardId,
				awardAmount: amount,
				amount,
				type: appType,
				deadline: windowString,
				awardedOn: randomDate.toISOString(),
			}),
		});
	}

	batch.set(db.collection('applications').doc(appId), applicationData);

	await batch.commit();

	await db
		.collection('applicants')
		.doc(uid)
		.update({
			applications: admin.firestore.FieldValue.arrayUnion(appId),
		});

	console.log(` -> Created Application ${appId}`);
};

const seed = async () => {
	console.log(`Wiping existing demo/makeover data in ${PROJECT_ID} (leaving members, authUsers, siteConfiguration)...`);
	const wipeTargets = [
		'applicants',
		'profiles',
		'families',
		'educationRecords',
		'experienceRecords',
		'expenseReports',
		'incomeReports',
		'contributions',
		'projections',
		'attachments',
		'applications',
		'awards',
		'interviews',
		'requests',
		'mail_cache',
		'emails',
		'sms',
		'legacy_financials',
		'sitelog',
		'dblog',
	];
	for (const name of wipeTargets) {
		await deleteCollection(name);
	}

	console.log('Starting 150-Record Seed...');
	for (let i = 1; i <= 150; i++) {
		await createMockApplicantGraph(i);
	}
	console.log('Seeding Complete. Refresh dashboard.');
};

seed();
