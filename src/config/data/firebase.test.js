/**
 * src/config/data/firebase.test.js
 * Comprehensive test suite for Firebase configuration and helper functions.
 */

// 1. POLYFILLS
if (typeof global.setImmediate === 'undefined') {
	global.setImmediate = setTimeout;
}
if (typeof global.clearImmediate === 'undefined') {
	global.clearImmediate = clearTimeout;
}
if (typeof global.performance === 'undefined') {
	global.performance = { mark: jest.fn(), measure: jest.fn() };
}
if (typeof global.fetch === 'undefined') {
	global.fetch = jest.fn(() =>
		Promise.resolve({
			ok: true,
			json: () => Promise.resolve({}),
		})
	);
}
// Mock browser alert
global.alert = jest.fn();

// 2. DEFINE SPIES
const firebaseMocks = vi.hoisted(() => ({
	mockGetDoc: vi.fn(),
	mockGetDocs: vi.fn(),
	mockSetDoc: vi.fn(),
	mockUpdateDoc: vi.fn(),
	mockAddDoc: vi.fn(),
	mockDeleteDoc: vi.fn(),
	mockQuery: vi.fn(),
	mockCollection: vi.fn(),
	mockWhere: vi.fn(),
	mockOrderBy: vi.fn(),
	mockLimit: vi.fn(),
	mockOnSnapshot: vi.fn(),
	mockDoc: vi.fn(),
	mockGetCountFromServer: vi.fn(),
	mockHttpsCallable: vi.fn(),
	mockSignIn: vi.fn(),
	mockSignOut: vi.fn(),
	mockCreateUser: vi.fn(),
	mockUploadBytes: vi.fn(),
	mockGetDownloadURL: vi.fn(),
	mockDeleteObject: vi.fn(),
	mockWriteBatch: vi.fn(),
	mockBatchDelete: vi.fn(),
	mockBatchUpdate: vi.fn(),
	mockBatchCommit: vi.fn(),
}));
const { mockGetDoc, mockGetDocs, mockSetDoc, mockUpdateDoc, mockAddDoc, mockDeleteDoc, mockQuery, mockCollection, mockWhere, mockOrderBy, mockLimit, mockOnSnapshot, mockDoc, mockGetCountFromServer, mockHttpsCallable, mockSignIn, mockSignOut, mockCreateUser, mockUploadBytes, mockGetDownloadURL, mockDeleteObject, mockWriteBatch, mockBatchDelete, mockBatchUpdate, mockBatchCommit } = firebaseMocks;
let FirebaseConfig;


// --- MOCKS ---
		vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
		vi.mock('firebase/analytics', () => ({
			getAnalytics: vi.fn(),
			isSupported: vi.fn(() => Promise.resolve(false)),
		}));

		vi.mock('firebase/auth', () => ({
			getAuth: jest.fn(() => ({ currentUser: { uid: 'test-uid' } })),
			signInWithEmailAndPassword: mockSignIn,
			createUserWithEmailAndPassword: mockCreateUser,
			signOut: mockSignOut,
		}));

		vi.mock('firebase/firestore', () => ({
			__esModule: true,
			getFirestore: jest.fn(() => ({})),
			initializeFirestore: jest.fn(() => ({})),
			doc: mockDoc.mockImplementation((db, col, id) => ({ path: `${col}/${id}`, id: id || 'test-id' })),
			collection: mockCollection.mockImplementation((db, col) => ({ path: col })),
			getDoc: mockGetDoc,
			getDocs: mockGetDocs,
			setDoc: mockSetDoc,
			updateDoc: mockUpdateDoc,
			addDoc: mockAddDoc,
			deleteDoc: mockDeleteDoc,
			query: mockQuery,
			where: mockWhere,
			orderBy: mockOrderBy,
			limit: mockLimit,
			onSnapshot: mockOnSnapshot,
			getCountFromServer: mockGetCountFromServer,
			writeBatch: mockWriteBatch.mockImplementation(() => ({
				delete: mockBatchDelete,
				update: mockBatchUpdate,
				commit: mockBatchCommit,
			})),
			collectionGroup: vi.fn(),
			arrayUnion: vi.fn(),
			arrayRemove: vi.fn(),
			and: vi.fn(),
			or: vi.fn(),
			serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
			Timestamp: { fromDate: (d) => ({ toDate: () => d }) },
			persistentLocalCache: vi.fn(),
			persistentMultipleTabManager: vi.fn(),
		}));

		vi.mock('firebase/storage', () => ({
			getStorage: vi.fn(),
			ref: jest.fn((_, path) => ({ fullPath: path || 'mock/path' })),
			uploadBytes: mockUploadBytes,
			getDownloadURL: mockGetDownloadURL,
			deleteObject: mockDeleteObject,
		}));

		vi.mock('firebase/functions', () => ({
			getFunctions: vi.fn(),
			httpsCallable: jest.fn(() => mockHttpsCallable),
		}));

		vi.mock('axios', () => {
	const get = vi.fn(() => Promise.resolve({ data: { ip: '1.2.3.4' } }));
	return { default: { get }, get };
});

		vi.mock('ua-parser-js', () => ({
			UAParser: vi.fn(function UAParser() { return { getResult: () => ({ browser: { name: 'TestBrowser' } }) }; }),
		}));

		vi.mock('./collections', () => ({
			collections: {
				users: 'users',
				members: 'members',
				applicants: 'applicants',
				applications: 'applications',
				siteConfig: 'siteConfig',
				sitelog: 'sitelog',
				legacyFinances: 'legacyFinances',
				awards: 'awards',
				requests: 'requests',
				attachments: 'attachments',
				// Added missing collections to prevent "undefined" in wipeTestCollections
				contributions: 'contributions',
				dblog: 'dblog',
				education: 'education',
				emails: 'emails',
				expenses: 'expenses',
				families: 'families',
				incomes: 'incomes',
				profiles: 'profiles',
				projections: 'projections',
				experience: 'experience',
				sms: 'sms',
				presence: 'presence',
				emailTemplates: 'emailTemplates',
				interviews: 'interviews',
			},
			ApplicationStatus: {
				started: 'Started',
				submitted: 'Submitted',
				completed: 'Completed',
				incomplete: 'Incomplete',
				eligible: 'Eligible',
				ineligible: 'Ineligible',
				invited: 'Invited',
				deferred: 'Deferred',
				awarded: 'Awarded',
				denied: 'Not Awarded',
				deleted: 'Deleted',
			},
			ApplicationType: {
				newApplication: 'New Applicant',
				returningGrant: 'Returning Grant',
				scholarship: 'Scholarship Check In',
			},
			InterviewStatus: { scheduled: 'Scheduled' },
			SearchableCollections: {
				test: { collection: 'testCol', fields: ['name'] },
			},
			applicationSpecificCollections: ['applications'],
		}));

describe('src/config/data/firebase.js', () => {
	beforeEach(async () => {
		vi.resetModules();
		vi.clearAllMocks();


		FirebaseConfig = await import('./firebase');

		// --- DEFAULT SPY BEHAVIOR ---
		mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ id: '1', firstName: 'John' }) });
		mockGetDocs.mockReset().mockResolvedValue({
			empty: false,
			size: 1,
			docs: [{ id: '1', data: () => ({ id: '1', name: 'Test Doc' }), ref: { path: 'ref/path' } }],
		});
		mockSetDoc.mockResolvedValue(true);
		mockUpdateDoc.mockResolvedValue(true);
		mockAddDoc.mockResolvedValue({ id: 'new-doc' });
		mockDeleteDoc.mockResolvedValue(true);
		mockGetCountFromServer.mockResolvedValue({ data: () => ({ count: 5 }) });
		mockHttpsCallable.mockResolvedValue({ data: { message: 'Success' } });
		mockUploadBytes.mockResolvedValue({ ref: { fullPath: 'uploaded/path' } });
		mockGetDownloadURL.mockResolvedValue('http://download.url');

		// Setup onSnapshot to execute callback immediately with dummy data
		mockOnSnapshot.mockImplementation((query, callback) => {
			callback({
				exists: () => true,
				size: 1,
				data: () => ({ id: 'snap-1' }),
				docs: [{ id: 'snap-1', data: () => ({ id: 'snap-1' }) }],
			});
			return vi.fn(); // Unsubscribe function
		});
	});

	// --- CONFIG & UTILS ---

	it('getConfigFromDb fetches config', async () => {
		await FirebaseConfig.getConfigFromDb();
		expect(mockGetDoc).toHaveBeenCalled();
	});

	it('logEvent adds a log entry', async () => {
		await FirebaseConfig.logEvent('test action');
		expect(mockAddDoc).toHaveBeenCalled();
	});

	it('updateUserPreferences updates doc', async () => {
		await FirebaseConfig.updateUserPreferences('u1', 'users', { theme: 'dark' });
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	// --- SEARCH & RETRIEVAL ---

	it('getDocumentsByIDs fetches multiple docs', async () => {
		await FirebaseConfig.getDocumentsByIDs('users', ['1', '2']);
		expect(mockGetDoc).toHaveBeenCalledTimes(2);
	});

	it('getCollection fetches all docs', async () => {
		await FirebaseConfig.getCollection('users');
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('searchCollections queries multiple fields', async () => {
		await FirebaseConfig.searchCollections(['term']);
		expect(mockGetDocs).toHaveBeenCalled();
	});

	// --- APPLICANT / MEMBER ACTIONS ---

	it('saveApplicantData / updateApplicantData', async () => {
		await FirebaseConfig.saveApplicantData('1', { name: 'Test' });
		expect(mockSetDoc).toHaveBeenCalled();

		await FirebaseConfig.updateApplicantData('1', { name: 'Test' });
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	it('getApplicant / getMember', async () => {
		await FirebaseConfig.getApplicant('1');
		expect(mockGetDoc).toHaveBeenCalled();
		await FirebaseConfig.getMember('1');
		expect(mockGetDoc).toHaveBeenCalled();
	});

	it('addApplicationToApplicant uses arrayUnion', async () => {
		await FirebaseConfig.addApplicationToApplicant('u1', 'app1');
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	it('removeApplicationFromApplicant uses arrayRemove', async () => {
		await FirebaseConfig.removeApplicationFromApplicant('u1', 'app1');
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	// --- APPLICATION ACTIONS ---

	it('saveCollectionData / updateCollectionData', async () => {
		await FirebaseConfig.saveCollectionData('col', 'id', {});
		expect(mockSetDoc).toHaveBeenCalled();
		await FirebaseConfig.updateCollectionData('col', 'id', {});
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	it('updateApplicationStatus updates status', async () => {
		await FirebaseConfig.updateApplicationStatus('u1', 'app1', 'Submitted');
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	it('updateSubmissionStatus updates status and timestamp', async () => {
		await FirebaseConfig.updateSubmissionStatus('sub1', 'Accepted');
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	it('getApplication fetches specific app', async () => {
		await FirebaseConfig.getApplication('u1', 'a1');
		expect(mockGetDoc).toHaveBeenCalled();
	});

	it('getApplicationsByIDs fetches multiple apps', async () => {
		await FirebaseConfig.getApplicationsByIDs(['1']);
		expect(mockGetDoc).toHaveBeenCalled();
	});

	it('deleteApplication updates status to deleted', async () => {
		await FirebaseConfig.deleteApplication({ id: '1' });
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	// --- FILTERED QUERIES (Window, Type, Status) ---

	it('getApplicationsByYear calls getDocs', async () => {
		mockGetDoc.mockResolvedValue({
			exists: () => true,
			data: () => ({ CYCLE_YEAR: 2026, APPLICATION_DEADLINE: '2026-12-31' }),
		});
		mockGetDocs.mockResolvedValueOnce({
			docs: [{ data: () => ({ window: '2024-07-01', status: 'completed' }) }],
		});
		const res = await FirebaseConfig.getApplicationsByYear();
		expect(mockGetDocs).toHaveBeenCalled();
		expect(res.some((row) => String(row.name) === '2024' && row.count >= 1)).toBe(true);
	});

	it('getApplicationsByWindow queries by window', async () => {
		await FirebaseConfig.getApplicationsByWindow('2024-01-01');
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('getApplicationsByType queries by type', async () => {
		await FirebaseConfig.getApplicationsByType('Type', '2024');
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('getApplicationsByStatus queries by status', async () => {
		await FirebaseConfig.getApplicationsByStatus('Status', '2024');
		expect(mockGetDocs).toHaveBeenCalled();
	});

	// --- COUNTS (Server Side) ---

	it('getPastApplicationsCountByWindow', async () => {
		mockGetDocs.mockResolvedValueOnce({
			docs: [
				{ data: () => ({ cycleYear: 2023, status: 'Eligible' }) },
				{ data: () => ({ cycleYear: 2024, status: 'Eligible' }) },
			],
		});
		const count = await FirebaseConfig.getPastApplicationsCountByWindow('2023');
		expect(mockGetDocs).toHaveBeenCalled();
		expect(count).toBe(1);
	});

	it('getCurrentApplicationCount', async () => {
		mockGetDocs.mockResolvedValueOnce({
			docs: [
				{ data: () => ({ cycleYear: 2026, status: 'Started' }) },
				{ data: () => ({ cycleYear: 2025, status: 'Started' }) },
			],
		});
		const count = await FirebaseConfig.getCurrentApplicationCount();
		expect(mockGetDocs).toHaveBeenCalled();
		expect(count).toBe(1);
	});

	it('getCurrentlyEligibleApplicationsCount', async () => {
		mockGetDocs.mockResolvedValueOnce({
			docs: [
				{ data: () => ({ cycleYear: 2026, status: 'Eligible' }) },
				{ data: () => ({ cycleYear: 2026, status: 'Started' }) },
			],
		});
		const count = await FirebaseConfig.getCurrentlyEligibleApplicationsCount();
		expect(mockGetDocs).toHaveBeenCalled();
		expect(count).toBe(1);
	});

	it('getCurrentlyEligibleApplicationsCountByType', async () => {
		mockGetDocs.mockResolvedValueOnce({
			docs: [{ data: () => ({ cycleYear: 2026, status: 'Eligible', type: 'Type' }) }],
		});
		const count = await FirebaseConfig.getCurrentlyEligibleApplicationsCountByType('Type');
		expect(mockGetDocs).toHaveBeenCalled();
		expect(count).toBe(1);
	});

	it('getEligibleApplicationsCountByTypeAndWindow', async () => {
		mockGetDocs.mockResolvedValueOnce({
			docs: [
				{ data: () => ({ cycleYear: 2024, status: 'Eligible', type: 'Type' }) },
				{ data: () => ({ cycleYear: 2025, status: 'Eligible', type: 'Type' }) },
			],
		});
		const count = await FirebaseConfig.getEligibleApplicationsCountByTypeAndWindow('Type', '2024');
		expect(mockGetDocs).toHaveBeenCalled();
		expect(count).toBe(1);
	});

	it('getMostRecentApplicationIDs', async () => {
		await FirebaseConfig.getMostRecentApplicationIDs();
		expect(mockQuery).toHaveBeenCalled();
		expect(mockOrderBy).toHaveBeenCalled();
		expect(mockLimit).toHaveBeenCalled();
	});

	// --- REALTIME LISTENERS ---

	it('getRealTimeConfigFromDb', () => {
		const cb = jest.fn();
		FirebaseConfig.getRealTimeConfigFromDb(cb);
		expect(mockOnSnapshot).toHaveBeenCalled();
		expect(cb).toHaveBeenCalled(); // Mock implementation fires immediately
	});

	it('getRealTimeLegacyFinances', () => {
		const cb = jest.fn();
		FirebaseConfig.getRealTimeLegacyFinances(cb, { collection: 'legacyFinances', orderBy: ['year', 'desc'] });
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeCollection', () => {
		FirebaseConfig.getRealTimeCollection('users', jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeCurrentApplicationCount', async () => {
		await FirebaseConfig.getRealTimeCurrentApplicationCount(jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeMostRecentApplicationIDs', () => {
		FirebaseConfig.getRealTimeMostRecentApplicationIDs(jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeCurrentEligibleApplicationsCountByType', async () => {
		mockGetDoc.mockResolvedValue({
			exists: () => true,
			data: () => ({ CYCLE_YEAR: 2026, APPLICATION_DEADLINE: '2026-12-31' }),
		});
		await FirebaseConfig.getRealTimeCurrentEligibleApplicationsCountByType('New Applicant', jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeEligibleApplicationsCountByTypeAndWindow', () => {
		FirebaseConfig.getRealTimeEligibleApplicationsCountByTypeAndWindow('New Applicant', '2024', jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeApplicationCountByStatus', () => {
		FirebaseConfig.getRealTimeApplicationCountByStatus('Submitted', jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeApplications', () => {
		FirebaseConfig.getRealTimeApplications(true, jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeRejectedApplications', () => {
		FirebaseConfig.getRealTimeRejectedApplications(jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeApplicationsByWindow', () => {
		FirebaseConfig.getRealTimeApplicationsByWindow('2024', true, jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeApplicationsByType', () => {
		FirebaseConfig.getRealTimeApplicationsByType('Type', '2024', false, jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeApplicantsByApplicationID', () => {
		FirebaseConfig.getRealTimeApplicantsByApplicationID(['1'], jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeApplicationsByStatus', () => {
		FirebaseConfig.getRealTimeApplicationsByStatus('Submitted', jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeDocument', () => {
		FirebaseConfig.getRealTimeDocument('col', '1', jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeApplicationsByIDs', () => {
		FirebaseConfig.getRealTimeApplicationsByIDs(['1'], jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeAwardsByIDs', () => {
		FirebaseConfig.getRealTimeAwardsByIDs(['1'], jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	// --- AUTH & USERS ---

	it('getUserProfiles fetches member and applicant', async () => {
		await FirebaseConfig.getUserProfiles('1');
		expect(mockGetDoc).toHaveBeenCalledTimes(2);
	});

	it('getAuthUserByEmail queries users collection', async () => {
		await FirebaseConfig.getAuthUserByEmail('test@test.com');
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('registerUser calls createUser', async () => {
		await FirebaseConfig.registerUser('a@b.com', 'pass');
		expect(mockCreateUser).toHaveBeenCalled();
	});

	it('loginUser calls signIn', async () => {
		await FirebaseConfig.loginUser('a@b.com', 'pass');
		expect(mockSignIn).toHaveBeenCalled();
	});

	it('logoutUser calls signOut', async () => {
		await FirebaseConfig.logoutUser();
		expect(mockSignOut).toHaveBeenCalled();
	});

	it('purgeUserRecords performs batch delete', async () => {
		await FirebaseConfig.purgeUserRecords({ userId: '1', expel: true });
		// It fetches owned docs, requests, then batch deletes
		expect(mockGetDocs).toHaveBeenCalled();
		expect(mockWriteBatch).toHaveBeenCalled();
		expect(mockBatchDelete).toHaveBeenCalled();
		expect(mockBatchCommit).toHaveBeenCalled();
		expect(mockHttpsCallable).toHaveBeenCalled(); // calls deleteAuthUser
	});

	// --- REQUESTS & AWARDS ---

	it('getRequestData fetches doc', async () => {
		await FirebaseConfig.getRequestData('1');
		expect(mockGetDoc).toHaveBeenCalled();
	});

	it('invalidateRequest updates doc', async () => {
		await FirebaseConfig.invalidateRequest('1');
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	it('getAwardsData fetches docs', async () => {
		await FirebaseConfig.getAwardsData('u1', ['1']);
		expect(mockGetDoc).toHaveBeenCalled();
	});

	it('getBenchmarkedAwardCounts calculates metrics', async () => {
		mockGetDoc.mockResolvedValue({
			exists: () => true,
			data: () => ({ CYCLE_YEAR: 2026, APPLICATION_DEADLINE: '2026-12-31' }),
		});
		mockGetDocs
			.mockResolvedValueOnce({
				docs: [
					{
						id: 'app1',
						data: () => ({
							cycleYear: 2025,
							type: 'New Applicant',
							status: 'Completed',
							completedBy: 'u1',
						}),
					},
				],
			})
			.mockResolvedValueOnce({
				docs: [{ id: 'u1', data: () => ({ gradYear: 2028 }) }],
			});

		const res = await FirebaseConfig.getBenchmarkedAwardCounts(2025);
		expect(res['New Applicant']).toBeDefined();
	});

	// --- STORAGE ---

	it('saveFile uploads bytes', async () => {
		await FirebaseConfig.saveFile('type', 'id', 'name', new Blob());
		expect(mockUploadBytes).toHaveBeenCalled();
	});

	it('deleteFile deletes object', async () => {
		await FirebaseConfig.deleteFile('path/to/file');
		expect(mockDeleteObject).toHaveBeenCalled();
	});

	it('getFile gets download url', async () => {
		await FirebaseConfig.getFile('path');
		expect(mockGetDownloadURL).toHaveBeenCalled();
	});

	it('getDownloadLinkForFile gets download url', async () => {
		await FirebaseConfig.getDownloadLinkForFile('path');
		expect(mockGetDownloadURL).toHaveBeenCalled();
	});

	// --- NOTES & MEETINGS ---

	it('getNotesByAuthor fetches notes', async () => {
		// Mock nested parent structure for note -> parent -> collection
		mockGetDocs.mockResolvedValueOnce({
			docs: [
				{
					id: 'note1',
					data: () => ({ text: 'test' }),
					ref: { parent: { parent: { id: 'p1', path: 'applications/p1' } } },
				},
			],
		});
		await FirebaseConfig.getNotesByAuthor('1');
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('getRealTimeNotes', () => {
		FirebaseConfig.getRealTimeNotes('col', '1', jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('addNote adds doc', async () => {
		await FirebaseConfig.addNote('col', '1', { text: 'hi' });
		expect(mockAddDoc).toHaveBeenCalled();
	});

	it('updateNote updates doc', async () => {
		await FirebaseConfig.updateNote('col', '1', 'n1', 'new');
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	it('redactNote updates doc', async () => {
		await FirebaseConfig.redactNote('col', '1', 'n1');
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	it('getMeetings fetches meetings', async () => {
		await FirebaseConfig.getMeetings('1', false);
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('getRealTimeMeetings', () => {
		FirebaseConfig.getRealTimeMeetings('1', true, jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getSchedulableInterviews', async () => {
		await FirebaseConfig.getSchedulableInterviews();
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('getInterviewsByWindow', async () => {
		await FirebaseConfig.getInterviewsByWindow('2024');
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('getRealTimeInterviewsByWindow', () => {
		FirebaseConfig.getRealTimeInterviewsByWindow('2024', jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getAllApplicantsSimple', async () => {
		await FirebaseConfig.getAllApplicantsSimple();
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('getApplicationsForApplicant', async () => {
		await FirebaseConfig.getApplicationsForApplicant('1');
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('generateICSDownloadURL handles missing file via Cloud Function', async () => {
		mockGetDownloadURL.mockRejectedValue({ code: 'storage/object-not-found' });
		try {
			await FirebaseConfig.generateICSDownloadURL({
				id: '1',
				data: () => ({ startTime: new Date(), endTime: new Date() }),
			});
		} catch (e) {}
		expect(mockHttpsCallable).toHaveBeenCalled();
	});

	// --- CYCLE YEAR / REQUEST HELPERS ---

	it('resolveApplicationCycleYear prefers cycleYear then window year', () => {
		expect(FirebaseConfig.resolveApplicationCycleYear({ cycleYear: 2026 })).toBe(2026);
		expect(FirebaseConfig.resolveApplicationCycleYear({ cycleYear: '2025' })).toBe(2025);
		expect(FirebaseConfig.resolveApplicationCycleYear({ window: '2024-07-01' })).toBe(2024);
		expect(FirebaseConfig.resolveApplicationCycleYear({})).toBeNull();
		expect(FirebaseConfig.resolveApplicationCycleYear({ window: 'not-a-date' })).toBeNull();
	});

	it('coerceCycleYear accepts years and deadline strings', () => {
		expect(FirebaseConfig.coerceCycleYear(2026)).toBe(2026);
		expect(FirebaseConfig.coerceCycleYear('2025')).toBe(2025);
		expect(FirebaseConfig.coerceCycleYear('2024-07-05T23:59:59')).toBe(2024);
		expect(FirebaseConfig.coerceCycleYear({ toDate: () => new Date('2026-02-15T17:00:00.000Z') })).toBe(2026);
		expect(FirebaseConfig.coerceCycleYear(null)).toBeNull();
	});

	it('siteConfigCycleYear prefers CYCLE_YEAR over deadline', () => {
		expect(FirebaseConfig.siteConfigCycleYear({ CYCLE_YEAR: 2026, APPLICATION_DEADLINE: '2025-01-01' })).toBe(2026);
		expect(FirebaseConfig.siteConfigCycleYear({ APPLICATION_DEADLINE: '2024-12-31' })).toBe(2024);
		expect(
			FirebaseConfig.siteConfigCycleYear({
				APPLICATION_DEADLINE: { toDate: () => new Date('2026-02-15T17:00:00.000Z') },
			})
		).toBe(2026);
	});

	it('resolveInterviewCycleYear prefers cycleYear then deadline/window', () => {
		expect(FirebaseConfig.resolveInterviewCycleYear({ cycleYear: 2026 })).toBe(2026);
		expect(FirebaseConfig.resolveInterviewCycleYear({ cycleYear: '2024' })).toBe(2024);
		expect(FirebaseConfig.resolveInterviewCycleYear({ deadline: '2023-11-01' })).toBe(2023);
		expect(FirebaseConfig.resolveInterviewCycleYear({ window: '2022-07-01' })).toBe(2022);
		expect(FirebaseConfig.resolveInterviewCycleYear({})).toBeNull();
	});

	it('getRealTimeRequestsForCycleYear filters by application cycle year', () => {
		const callback = jest.fn();
		const unsubs = [];
		mockOnSnapshot.mockImplementation((queryOrCol, onNext) => {
			const unsub = jest.fn();
			unsubs.push(unsub);
			// First subscription = requests, second = applications
			if (unsubs.length === 1) {
				onNext({
					docs: [
						{ id: 'r1', data: () => ({ applicationID: 'app1', name: 'Alpha', completed: false, attempts: 0 }) },
						{ id: 'r2', data: () => ({ applicationID: 'app2', name: 'Beta', completed: true, attempts: 0 }) },
					],
				});
			} else {
				onNext({
					docs: [
						{ id: 'app1', data: () => ({ cycleYear: 2026 }) },
						{ id: 'app2', data: () => ({ cycleYear: 2025 }) },
					],
				});
			}
			return unsub;
		});

		const cleanup = FirebaseConfig.getRealTimeRequestsForCycleYear(2026, callback);
		expect(callback).toHaveBeenCalled();
		const last = callback.mock.calls.at(-1)[0];
		expect(last.some((r) => r.id === 'r1')).toBe(true);
		expect(last.some((r) => r.id === 'r2')).toBe(false);
		cleanup();
		unsubs.forEach((u) => expect(u).toHaveBeenCalled());
	});

	it('wipeCollections clears target collections and applicant arrays', async () => {
		mockGetDocs.mockResolvedValue({
			docs: [{ id: '1', data: () => ({}), ref: { path: 'x' } }],
		});
		const ok = await FirebaseConfig.wipeCollections({ conn: 'ams-test' });
		expect(ok).toBe(true);
		expect(mockDeleteDoc).toHaveBeenCalled();
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	it('migrateEmailTemplates writes system templates', async () => {
		vi.doMock('../content/emailTemplates', () => ({
			emailTemplates: {
				welcome: { label: 'Welcome', subject: 'Hi', html: '<p>Hi</p>', group: 'Reminders' },
			},
		}));
		const res = await FirebaseConfig.migrateEmailTemplates();
		expect(res).toEqual({ success: true });
		expect(mockSetDoc).toHaveBeenCalled();
	});

	it('sendToTestDB copies collections from prod to test', async () => {
		const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
		mockGetDocs.mockResolvedValue({
			docs: [{ id: 'doc1', data: () => ({ a: 1 }) }],
		});
		await FirebaseConfig.sendToTestDB();
		expect(mockSetDoc).toHaveBeenCalled();
		expect(alertSpy).toHaveBeenCalled();
		alertSpy.mockRestore();
	});

	it('touchUserPresence and clearUserPresence write presence docs', async () => {
		await FirebaseConfig.touchUserPresence({ uid: 'u1', role: 'member', displayName: 'Ada' });
		expect(mockSetDoc).toHaveBeenCalled();
		await FirebaseConfig.clearUserPresence('u1');
		expect(mockSetDoc).toHaveBeenCalledWith(expect.anything(), { status: 'offline' }, { merge: true });
		await FirebaseConfig.touchUserPresence({ uid: '', role: 'member', displayName: 'x' });
		await FirebaseConfig.clearUserPresence('');
	});

	it('subscribeUserLastSeen returns null when missing and value when present', () => {
		const cb = jest.fn();
		mockOnSnapshot.mockImplementation((ref, onNext) => {
			onNext({ exists: () => false });
			return jest.fn();
		});
		FirebaseConfig.subscribeUserLastSeen('u1', cb);
		expect(cb).toHaveBeenCalledWith(null);

		cb.mockClear();
		mockOnSnapshot.mockImplementation((ref, onNext) => {
			onNext({
				exists: () => true,
				data: () => ({ lastSeen: { toDate: () => new Date('2026-01-01T00:00:00Z') }, status: 'online' }),
			});
			return jest.fn();
		});
		FirebaseConfig.subscribeUserLastSeen('u1', cb);
		expect(cb).toHaveBeenCalled();
		expect(cb.mock.calls[0][0]).toBeInstanceOf(Date);

		const emptyUnsub = FirebaseConfig.subscribeUserLastSeen('', cb);
		expect(typeof emptyUnsub).toBe('function');
	});

	it('getDashboardBenchmarkData aggregates current counts and trends', async () => {
		mockGetDocs
			.mockResolvedValueOnce({
				docs: [
					{
						id: 'a1',
						data: () => ({
							cycleYear: 2026,
							type: 'New Applicant',
							status: 'Completed',
							completedBy: 'u1',
						}),
					},
					{
						id: 'a2',
						data: () => ({
							cycleYear: 2025,
							type: 'Returning Grant',
							status: 'awarded',
							completedBy: 'u2',
						}),
					},
					{
						id: 'a3',
						data: () => ({
							cycleYear: 2024,
							type: 'Scholarship',
							status: 'awarded',
							completedBy: 'u3',
						}),
					},
				],
			})
			.mockResolvedValueOnce({
				docs: [
					{ id: 'u1', data: () => ({ gradYear: 2028 }) },
					{ id: 'u2', data: () => ({ gradYear: 2028 }) },
					{ id: 'u3', data: () => ({ gradYear: 2020 }) },
				],
			});

		// ApplicationType values may differ — just assert shape
		const data = await FirebaseConfig.getDashboardBenchmarkData(2026);
		expect(data).toHaveProperty('currentCounts');
		expect(data).toHaveProperty('benchmarkTargets');
		expect(Array.isArray(data.awardTrends)).toBe(true);
		expect(data.awardTrends).toHaveLength(3);
	});

	it('migrateDeadlinesToCycleYear backfills cycleYear and site config', async () => {
		mockGetDocs.mockResolvedValueOnce({
			docs: [
				{ id: 'app1', data: () => ({ window: '2025-07-01' }) },
				{ id: 'app2', data: () => ({ cycleYear: 2024, deadline: '2024-12-01' }) },
			],
		});
		mockGetDoc.mockResolvedValue({
			exists: () => true,
			data: () => ({ CONFIG_ID: 'cfg1', APPLICATION_DEADLINE: '2026-12-31' }),
		});
		mockBatchCommit.mockResolvedValue(true);
		const results = await FirebaseConfig.migrateDeadlinesToCycleYear();
		expect(results.applications).toBeGreaterThanOrEqual(1);
		expect(mockBatchUpdate).toHaveBeenCalled();
		expect(mockBatchCommit).toHaveBeenCalled();
	});

	it('backfillApplicantGradYears normalizes grad years', async () => {
		mockGetDocs.mockResolvedValueOnce({
			docs: [
				{ id: 'u1', data: () => ({ gradYear: '2028' }) },
				{ id: 'u2', data: () => ({ gradYear: 2027 }) },
				{ id: 'u3', data: () => ({ gradYear: 'bad' }) },
			],
		});
		mockBatchCommit.mockResolvedValue(true);
		const results = await FirebaseConfig.backfillApplicantGradYears();
		expect(results.updated + results.skipped).toBeGreaterThan(0);
	});

	it('purgeUserRecords requires userId and can clear applications', async () => {
		await expect(FirebaseConfig.purgeUserRecords({ userId: '' })).rejects.toThrow(/User ID/);
		mockGetDocs.mockResolvedValue({ docs: [] });
		mockBatchCommit.mockResolvedValue(true);
		const res = await FirebaseConfig.purgeUserRecords({ userId: 'u1', expel: false });
		expect(res.message).toMatch(/purged/i);
		expect(mockBatchCommit).toHaveBeenCalled();
	});

	it('getRealTimeActiveAuthenticatedUsersCount subscribes and cleans up', () => {
		jest.useFakeTimers();
		const cb = jest.fn();
		const unsubSnap = jest.fn();
		mockOnSnapshot.mockImplementation((q, onNext) => {
			onNext({
				docs: [
					{ data: () => ({ status: 'online' }) },
					{ data: () => ({ status: 'offline' }) },
				],
			});
			return unsubSnap;
		});
		const cleanup = FirebaseConfig.getRealTimeActiveAuthenticatedUsersCount(cb);
		expect(cb).toHaveBeenCalledWith(1);
		jest.advanceTimersByTime(31000);
		cleanup();
		expect(unsubSnap).toHaveBeenCalled();
		jest.useRealTimers();
	});
});
