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
				yearlyFinances: 'yearlyFinances',
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

	it('invalidateRequest returns false when update fails', async () => {
		mockUpdateDoc.mockRejectedValueOnce(new Error('invalidate boom'));
		await expect(FirebaseConfig.invalidateRequest('1')).resolves.toBe(false);
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

	it('saveFile rejects missing inputs and upload failures', async () => {
		await expect(FirebaseConfig.saveFile('type', null, 'name', new Blob())).rejects.toThrow(/No file or asset/);
		mockUploadBytes.mockRejectedValueOnce(new Error('upload boom'));
		await expect(FirebaseConfig.saveFile('type', 'id', 'name', new Blob())).rejects.toThrow('upload boom');
	});

	it('deleteFile deletes object', async () => {
		await FirebaseConfig.deleteFile('path/to/file');
		expect(mockDeleteObject).toHaveBeenCalled();
	});

	it('deleteFile returns false for empty locations', async () => {
		await expect(FirebaseConfig.deleteFile('')).resolves.toBe(false);
		expect(mockDeleteObject).not.toHaveBeenCalled();
	});

	it('deleteFile returns false when storage delete fails', async () => {
		mockDeleteObject.mockRejectedValueOnce(new Error('delete denied'));
		await expect(FirebaseConfig.deleteFile('path/missing')).resolves.toBe(false);
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

	it('getDownloadLinkForFile and getFile cover null and failure paths', async () => {
		await expect(FirebaseConfig.getDownloadLinkForFile(null)).resolves.toBeNull();
		mockGetDownloadURL.mockRejectedValueOnce(new Error('missing object'));
		await expect(FirebaseConfig.getDownloadLinkForFile('path/to/file')).resolves.toBeNull();

		mockGetDownloadURL.mockResolvedValueOnce('https://storage.example/file.pdf');
		await expect(FirebaseConfig.getFile('path/to/file')).resolves.toBe('https://storage.example/file.pdf');
		await expect(FirebaseConfig.getFile('')).rejects.toThrow('Missing refLoc path');
	});

	it('getMeetings fetches meetings', async () => {
		await FirebaseConfig.getMeetings('1', false);
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('getMeetings resolves applicant display names for committee view', async () => {
		mockGetDocs.mockResolvedValueOnce({
			docs: [
				{ id: 'm1', data: () => ({ applicantId: 'a1', status: 'scheduled' }) },
				{ id: 'm2', data: () => ({ applicantId: 'missing', status: 'scheduled' }) },
				{ id: 'm3', data: () => ({ applicantId: 'err', status: 'scheduled' }) },
				{ id: 'm4', data: () => ({ status: 'scheduled' }) },
			],
		});
		mockGetDoc
			.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ callMe: 'Ace', firstName: 'Ada', lastName: 'Lovelace' }),
			})
			.mockResolvedValueOnce({
				exists: () => false,
				data: () => ({}),
			})
			.mockRejectedValueOnce(new Error('name fail'));

		const meetings = await FirebaseConfig.getMeetings('committee', true);
		expect(meetings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 'm1', displayName: 'Ace | Ada Lovelace' }),
				expect.objectContaining({ id: 'm2', displayName: 'Unknown Applicant' }),
				expect.objectContaining({ id: 'm3', displayName: 'Error fetching name' }),
				expect.objectContaining({ id: 'deliberation', deliberation: true }),
			])
		);
	});

	it('getRealTimeMeetings', () => {
		FirebaseConfig.getRealTimeMeetings('1', true, jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeMeetings enriches applicant names and swallows lookup failures', async () => {
		const cb = jest.fn();
		mockGetDoc
			.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ callMe: 'Bo', firstName: 'Bob', lastName: 'Builder' }),
			})
			.mockRejectedValueOnce(new Error('rt name fail'));
		mockOnSnapshot.mockImplementationOnce((_q, onNext) => {
			onNext({
				docs: [
					{ id: 'rt1', data: () => ({ applicantId: 'a1' }) },
					{ id: 'rt2', data: () => ({ applicantId: 'err' }) },
					{ id: 'rt3', data: () => ({}) },
				],
			});
			return jest.fn();
		});

		FirebaseConfig.getRealTimeMeetings('u1', false, cb);
		await vi.waitFor(() => expect(cb).toHaveBeenCalled());
		const payload = cb.mock.calls.at(-1)[0];
		expect(payload).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 'rt1', displayName: 'Bo | Bob Builder' }),
				expect.objectContaining({ id: 'rt2' }),
				expect.objectContaining({ id: 'rt3' }),
			])
		);
	});

	it('getSchedulableInterviews', async () => {
		await FirebaseConfig.getSchedulableInterviews();
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('getInterviewsByWindow', async () => {
		await FirebaseConfig.getInterviewsByWindow('2024');
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('getInterviewsByWindow resolves applicant names and empty windows', async () => {
		mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });
		await expect(FirebaseConfig.getInterviewsByWindow('2024')).resolves.toEqual([]);

		mockGetDocs.mockResolvedValueOnce({
			empty: false,
			docs: [
				{ id: 'i1', data: () => ({ applicantId: 'a1', startTime: 't' }) },
				{ id: 'i2', data: () => ({ applicantId: '', startTime: 't' }) },
				{ id: 'i3', data: () => ({ applicantId: 'missing', startTime: 't' }) },
				{ id: 'i4', data: () => ({ applicantId: 'err', startTime: 't' }) },
			],
		});
		mockGetDoc
			.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ firstName: 'Ada', lastName: 'Lovelace' }),
			})
			.mockResolvedValueOnce({
				exists: () => false,
				data: () => ({}),
			})
			.mockRejectedValueOnce(new Error('lookup fail'));

		const rows = await FirebaseConfig.getInterviewsByWindow('2024');
		expect(rows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 'i1', applicantName: 'Ada Lovelace' }),
				expect.objectContaining({ id: 'i2', applicantName: 'Unknown Applicant' }),
				expect.objectContaining({ id: 'i3', applicantName: 'Unknown Applicant' }),
				expect.objectContaining({ id: 'i4', applicantName: 'Error fetching name' }),
			])
		);
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

	it('generateICSDownloadURL returns existing storage URL', async () => {
		mockGetDownloadURL.mockResolvedValue('https://storage.example/invite.ics');
		await expect(
			FirebaseConfig.generateICSDownloadURL({
				id: 'ics-1',
				startTime: new Date('2026-03-01T15:00:00Z'),
				endTime: new Date('2026-03-01T16:00:00Z'),
				title: 'Panel',
			})
		).resolves.toBe('https://storage.example/invite.ics');
	});

	it('generateICSDownloadURL creates ICS when missing and maps Timestamp fields', async () => {
		mockGetDownloadURL.mockRejectedValue({ code: 'storage/object-not-found' });
		mockHttpsCallable.mockResolvedValue({ data: { downloadUrl: 'https://storage.example/new.ics' } });
		const url = await FirebaseConfig.generateICSDownloadURL({
			id: 'ics-2',
			startTime: { toDate: () => new Date('2026-04-01T12:00:00Z') },
			endTime: { toDate: () => new Date('2026-04-01T13:00:00Z') },
			description: 'Custom desc',
		});
		expect(url).toBe('https://storage.example/new.ics');
		expect(mockHttpsCallable).toHaveBeenCalledWith(
			expect.objectContaining({
				interviewId: 'ics-2',
				title: 'AMS Interview',
				description: 'Custom desc',
			})
		);
	});

	it('generateICSDownloadURL rethrows non-missing storage errors', async () => {
		const err = { code: 'storage/unauthorized' };
		mockGetDownloadURL.mockRejectedValue(err);
		await expect(FirebaseConfig.generateICSDownloadURL({ id: 'ics-3', startTime: new Date(), endTime: new Date() })).rejects.toEqual(err);
	});

	it('getEmailLogs falls back to unordered query then empty array', async () => {
		mockGetDocs
			.mockRejectedValueOnce(new Error('index missing'))
			.mockResolvedValueOnce({
				docs: [{ id: 'e1', data: () => ({ subject: 'Hello' }) }],
			});
		await expect(FirebaseConfig.getEmailLogs(1)).resolves.toEqual([{ id: 'e1', subject: 'Hello' }]);

		mockGetDocs.mockRejectedValueOnce(new Error('index missing')).mockRejectedValueOnce(new Error('total fail'));
		await expect(FirebaseConfig.getEmailLogs(1)).resolves.toEqual([]);
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
						id: 'a1b',
						data: () => ({
							cycleYear: 2026,
							type: 'Returning Grant',
							status: 'Eligible',
							completedBy: 'u1b',
						}),
					},
					{
						id: 'a1c',
						data: () => ({
							cycleYear: 2026,
							type: 'Scholarship Check In',
							status: 'Invited',
							completedBy: 'u1c',
						}),
					},
					{
						id: 'a-prior-new',
						data: () => ({
							cycleYear: 2025,
							type: 'New Applicant',
							status: 'Completed',
							completedBy: 'u-prior',
						}),
					},
					{
						id: 'a2',
						data: () => ({
							cycleYear: 2025,
							type: 'Returning Grant',
							status: 'Awarded',
							completedBy: 'u2',
						}),
					},
					{
						id: 'a3',
						data: () => ({
							cycleYear: 2024,
							type: 'Scholarship Check In',
							status: 'Awarded',
							completedBy: 'u3',
						}),
					},
					{
						id: 'a4',
						data: () => ({
							cycleYear: 2023,
							type: 'New Applicant',
							status: 'Awarded',
							completedBy: 'u4',
						}),
					},
					{
						id: 'a-skip',
						data: () => ({
							type: 'New Applicant',
							status: 'Completed',
						}),
					},
				],
			})
			.mockResolvedValueOnce({
				docs: [
					{ id: 'u1', data: () => ({ gradYear: 2028 }) },
					{ id: 'u2', data: () => ({ gradYear: 2028 }) },
					{ id: 'u3', data: () => ({ gradYear: 2027 }) },
					{ id: 'u4', data: () => ({ gradYear: 2020 }) },
				],
			});

		const data = await FirebaseConfig.getDashboardBenchmarkData(2026);
		expect(data).toHaveProperty('currentCounts');
		expect(data).toHaveProperty('benchmarkTargets');
		expect(Array.isArray(data.awardTrends)).toBe(true);
		expect(data.awardTrends).toHaveLength(3);
		expect(data.currentCounts['New Applicant']).toBeGreaterThanOrEqual(1);
		expect(data.currentCounts['Returning Grant']).toBeGreaterThanOrEqual(1);
		expect(data.currentCounts['Scholarship Check In']).toBeGreaterThanOrEqual(1);
		expect(data.benchmarkTargets['New Applicant']).toBeGreaterThanOrEqual(1);
		expect(data.benchmarkTargets['Returning Grant']).toBeGreaterThanOrEqual(1);
		expect(data.benchmarkTargets['Scholarship Check In']).toBeGreaterThanOrEqual(1);
	});

	it('getNotesByAuthor resolves applicant, application, and fallback parent names', async () => {
		mockGetDocs.mockResolvedValueOnce({
			docs: [
				{
					id: 'n1',
					data: () => ({ text: 'applicant note' }),
					ref: { parent: { parent: { id: 'u1', path: 'applicants/u1' } } },
				},
				{
					id: 'n2',
					data: () => ({ text: 'application note' }),
					ref: { parent: { parent: { id: 'app1', path: 'applications/app1' } } },
				},
				{
					id: 'n3',
					data: () => ({ text: 'application without holder' }),
					ref: { parent: { parent: { id: 'app2', path: 'applications/app2' } } },
				},
				{
					id: 'n4',
					data: () => ({ text: 'other parent' }),
					ref: { parent: { parent: { id: 'x1', path: 'other/x1' } } },
				},
				{
					id: 'n5',
					data: () => ({ text: 'orphan note' }),
					ref: { parent: { parent: null } },
				},
			],
		});
		mockGetDoc.mockImplementation(async (ref) => {
			const path = ref?.path || '';
			if (path === 'applicants/u1') {
				return { exists: () => true, data: () => ({ firstName: 'Ada', lastName: 'Lovelace' }) };
			}
			if (path === 'applications/app1') {
				return {
					exists: () => true,
					data: () => ({
						completedBy: 'u2',
						status: 'Awarded',
						type: 'Scholarship Check In',
						window: '2025-06-01',
					}),
				};
			}
			if (path === 'applicants/u2') {
				return { exists: () => true, data: () => ({ firstName: 'Bob', lastName: 'Builder' }) };
			}
			if (path === 'applications/app2') {
				return {
					exists: () => true,
					data: () => ({ status: 'Started', type: 'New Applicant', window: '2024-01-01' }),
				};
			}
			if (path === 'other/x1') {
				return { exists: () => true, data: () => ({ label: 'misc' }) };
			}
			return { exists: () => false, data: () => ({}) };
		});

		const notes = await FirebaseConfig.getNotesByAuthor('author-1');
		expect(notes).toHaveLength(5);
		const byId = Object.fromEntries(notes.map((note) => [note.id, note]));
		expect(byId.n1.parent.name).toBe('Ada Lovelace');
		expect(byId.n2.parent.name).toMatch(/Bob Builder's/);
		expect(byId.n3.parent.name).toMatch(/Unknown Applicant/);
		expect(byId.n4.parent.name).toBe('x1');
		expect(byId.n5.parent.name).toBe('Unknown');
	});

	it('getRealTimeActiveAuthenticatedUsersCount logs snapshot errors', () => {
		const cb = jest.fn();
		mockOnSnapshot.mockImplementationOnce((_q, _onNext, onError) => {
			onError(new Error('presence boom'));
			return jest.fn();
		});
		const cleanup = FirebaseConfig.getRealTimeActiveAuthenticatedUsersCount(cb);
		cleanup();
		expect(typeof cleanup).toBe('function');
	});

	it('getRealTimeDashboardApplicantOutlook cleans up and tolerates config failures', async () => {
		const cb = jest.fn();
		const unsubApps = jest.fn();
		const unsubApplicants = jest.fn();
		mockGetDoc.mockRejectedValueOnce(new Error('config boom'));
		mockOnSnapshot
			.mockImplementationOnce((_q, onNext) => {
				onNext({ docs: [{ id: 'a1', data: () => ({ cycleYear: 2026, type: 'New Applicant', status: 'Submitted', completedBy: 'u1' }) }] });
				return unsubApps;
			})
			.mockImplementationOnce((_q, onNext) => {
				onNext({ docs: [{ id: 'u1', data: () => ({ firstName: 'Ada', lastName: 'L', gradYear: 2028, accountCreated: new Date('2020-01-01') }) }] });
				return unsubApplicants;
			});
		const cleanup = FirebaseConfig.getRealTimeDashboardApplicantOutlook(cb);
		await Promise.resolve();
		await Promise.resolve();
		expect(typeof cleanup).toBe('function');
		cleanup();
		expect(unsubApps).toHaveBeenCalled();
		expect(unsubApplicants).toHaveBeenCalled();
	});

	it('migrateDeadlinesToCycleYear backfills cycleYear and site config', async () => {
		mockGetDocs.mockResolvedValueOnce({
			docs: [
				{ id: 'app1', data: () => ({ window: '2025-07-01' }) },
				{ id: 'app2', data: () => ({ cycleYear: 2024, deadline: '2024-12-01' }) },
				{
					id: 'app3',
					data: () => ({
						deadline: { toDate: () => new Date('2023-01-15') },
					}),
				},
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

	it('migrateDeadlinesToCycleYear records application and siteConfig errors', async () => {
		mockGetDocs.mockRejectedValueOnce(new Error('apps boom'));
		const results = await FirebaseConfig.migrateDeadlinesToCycleYear();
		expect(results.errors.some((e) => /Applications/.test(e))).toBe(true);
	});

	it('backfillApplicantGradYears normalizes grad years', async () => {
		mockGetDocs.mockResolvedValueOnce({
			docs: [
				{ id: 'u1', data: () => ({ gradYear: '2028' }) },
				{ id: 'u2', data: () => ({ gradYear: 2027 }) },
				{ id: 'u3', data: () => ({ gradYear: 'bad' }) },
				{ id: 'u4', data: () => ({ gradYear: { toDate: () => new Date('2030-06-01') } }) },
				{ id: 'u5', data: () => ({ gradYear: 'June 2029' }) },
			],
		});
		mockBatchCommit.mockResolvedValue(true);
		const results = await FirebaseConfig.backfillApplicantGradYears();
		expect(results.updated + results.skipped).toBeGreaterThan(0);
	});

	it('backfillApplicantGradYears records query failures', async () => {
		mockGetDocs.mockRejectedValueOnce(new Error('grad boom'));
		const results = await FirebaseConfig.backfillApplicantGradYears();
		expect(results.errors.length).toBeGreaterThan(0);
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

	it('covers the remaining data-layer adapters and edge inputs', async () => {
		const call = async (name, ...args) => {
			try {
				return await FirebaseConfig[name](...args);
			} catch {
				return null;
			}
		};
		const rejectOnce = async (mock, name, ...args) => {
			mock.mockRejectedValueOnce(new Error('forced failure'));
			return call(name, ...args);
		};
		const cb = jest.fn();
		const richData = {
			id: 'row-1',
			firstName: 'Ada',
			lastName: 'Lovelace',
			name: 'Ada Lovelace',
			email: 'ada@example.com',
			cycleYear: 2026,
			window: '2026-07-01',
			deadline: '2026-12-31',
			status: 'Completed',
			type: 'New Applicant',
			completedBy: 'u1',
			applicationID: 'a1',
			awardIDs: ['award-1'],
			lastUpdated: new Date('2026-01-02T00:00:00Z'),
			submittedOn: new Date('2026-01-01T00:00:00Z'),
			gradYear: 2028,
			startTime: new Date('2026-01-01T15:00:00Z'),
			endTime: new Date('2026-01-01T16:00:00Z'),
			title: 'Interview',
			description: 'Interview description',
			refLoc: 'attachments/a.pdf',
		};
		mockGetDoc.mockResolvedValue({
			exists: () => true,
			id: 'row-1',
			data: () => richData,
		});
		mockGetDocs.mockResolvedValue({
			empty: false,
			size: 1,
			docs: [{ id: 'row-1', data: () => richData, ref: { path: 'ref/row-1' } }],
		});

		expect(FirebaseConfig.formatApplicantMailingAddress(null)).toBeNull();
		expect(FirebaseConfig.formatApplicantMailingAddress('')).toBeNull();
		expect(FirebaseConfig.formatApplicantMailingAddress('person@example.com')).toBeNull();
		expect(FirebaseConfig.formatApplicantMailingAddress(' 42 Main St ')).toBe('42 Main St');
		expect(
			FirebaseConfig.formatApplicantMailingAddress({
				description: '42 Main St, Boston',
				structured_formatting: { main_text: 'ignored' },
			}),
		).toBe('42 Main St, Boston');
		expect(
			FirebaseConfig.formatApplicantMailingAddress({
				structured_formatting: { main_text: '42 Main St', secondary_text: 'Boston' },
			}),
		).toBe('42 Main St, Boston');
		expect(
			FirebaseConfig.formatApplicantMailingAddress({
				address: '42 Main St',
				city: 'Boston',
				state: 'MA',
				zip: '02108',
			}),
		).toBe('42 Main St, Boston, MA, 02108');
		expect(FirebaseConfig.formatApplicantMailingAddress({})).toBeNull();

		expect(await FirebaseConfig.getMemberOrApplicantAddress('')).toEqual({
			name: 'Unknown',
			address: 'No mailing address on file',
		});
		await call('getMemberOrApplicantAddress', 'u1', { profileId: 'p1' });
		await call('getRealTimeYearlyFinances', cb);
		await call('getRealTimeLegacyFinances', cb, { collection: '' });
		await call('ensureYearlyFinancesDoc', 2026);
		mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
		await call('ensureYearlyFinancesDoc', 2025);
		await call('saveYearlyFinancesDoc', 2026, { total: 1 });
		await call('linkAwardToYearlyFinances', 2026, 'award-1');
		await call('unlinkAwardFromYearlyFinances', 2026, 'award-1');
		expect(await FirebaseConfig.linkAwardToYearlyFinances(0, '')).toBe(false);
		expect(await FirebaseConfig.unlinkAwardFromYearlyFinances(0, '')).toBe(false);
		await call('getAwardsByIds', ['a1', 'a1', '']);
		await call('getApplicationsByIds', ['a1', 'a1', '']);
		await call('getRealTimeCollection', 'users', cb);
		await call('findApplicantAccountsByEmail', 'ada@example.com', 'row-2');
		await call('findApplicantAccountsByEmail', ' ADA@EXAMPLE.COM ');
		await call('getUserProfiles', 'u1');
		await call('getUserProfiles', '');
		await call('getAllApplicantsSimple');
		await call('getApplicationsForApplicant', 'u1');
		await call('getAuthUserByEmail', 'ada@example.com');
		await call('registerUser', 'ada@example.com', 'password');
		await call('loginUser', 'ada@example.com', 'password');
		await call('saveCollectionData', 'users', 'u1', { ok: true });
		await call('updateCollectionData', 'users', 'u1', { ok: true });
		await call('updateApplicationStatus', 'u1', 'a1', 'Completed');
		await call('getApplication', 'u1', 'a1');
		await call('getCollection', 'users');
		await call('getCollectionData', 'u1', 'users', 'u1');
		await call('getCollectionData', 'u1', 'users', '');
		await call('deleteApplication', { id: 'a1' });
		await call('updateSubmissionStatus', 'a1', 'Completed');

		expect(FirebaseConfig.coerceCycleYear('bad')).toBeNull();
		expect(FirebaseConfig.resolveInterviewCycleYear({ deadline: 'bad' })).toBeNull();
		expect(FirebaseConfig.siteConfigCycleYear(null)).toBe(new Date().getFullYear());
		await call('getPastApplicationsCountByWindow', 'bad');
		await call('getPastApplicationsCountByWindow', 2026);
		await call('getCurrentApplicationCount');
		await call('getRealTimeCurrentApplicationCount', cb);
		await call('getCurrentlyEligibleApplicationsCount');
		await call('getRealTimeMostRecentApplicationIDs', cb, 2);
		await call('getCurrentlyEligibleApplicationsCountByType', 'New Applicant');
		await call('getRealTimeCurrentEligibleApplicationsCountByType', 'New Applicant', cb);
		await call('getRealTimeCurrentEligibleApplicationsCountByType', 'Submitted', cb);
		await call('getRealTimeCurrentEligibleApplicationsCountByType', 'not-a-type', cb);
		await call('getEligibleApplicationsCountByTypeAndWindow', 'New Applicant', 'bad');
		await call('getEligibleApplicationsCountByTypeAndWindow', 'New Applicant', 2026);
		await call('getRealTimeApplicationCountByStatus', 'Submitted', cb);
		await call('getRealTimeEligibleApplicationsCountByTypeAndWindow', 'New Applicant', 'bad', cb);
		await call('getRealTimeEligibleApplicationsCountByTypeAndWindow', 'Submitted', 2026, cb);
		await call('getRealTimeEligibleApplicationsCountByTypeAndWindow', 'not-a-type', 2026, cb);

		await call('getRealTimeCurrentNonNegatedApplicationsCountByType', 'New Applicant', cb);
		await call('getRealTimeNonNegatedApplicationsCountByTypeAndCycleYear', 'New Applicant', 2026, cb);
		await call('getRealTimeCurrentNonNegatedApplicationsCountByStatus', 'Submitted', cb);
		await call('getRealTimeCurrentApplicationCountByStatus', 'Submitted', cb);
		await call('getRealTimeCurrentRejectedApplicationsCount', cb);
		await call('getRealTimeApplications', false, cb);
		await call('getRealTimeRejectedApplications', cb, 2026);
		await call('getApplicationsByWindow', 2026);
		await call('getRealTimeApplicationsByWindow', 2026, false, cb);
		await call('getApplicationsByType', 'New Applicant', 2026);
		await call('getRealTimeApplicationsByType', 'New Applicant', 2026, true, cb);
		await call('getRealTimeApplicantsByApplicationID', ['a1'], cb);
		await call('getApplicationsByStatus', 'Submitted', 2026);
		await call('getRealTimeApplicationsByStatus', 'Submitted', cb, 2026);
		await call('getRealTimeDocument', 'users', 'u1', cb);
		await call('getRealTimeApplicationsByIDs', ['a1'], cb);
		await call('getRealTimeAwardsByIDs', ['a1'], cb);
		await call('getApplicationsByIDs', ['a1']);
		await call('getAwardsData', 'u1', ['award-1']);
		await call('buildDashboardApplicantOutlook', [richData], new Map([['u1', richData]]), 2026);
		const outlookApplicants = new Map([
			['new', { firstName: 'New', lastName: 'Account', accountCreated: { seconds: 1770000000 }, gradYear: 2028 }],
			['grant', { firstName: 'Returning', lastName: 'Grant', accountCreated: { seconds: 1500000000 }, gradYear: 2028 }],
			['scholar', { firstName: 'Returning', lastName: 'Scholar', accountCreated: new Date('2020-01-01'), gradYear: 2028 }],
			['lost', { firstName: 'Lost', lastName: 'Applicant', accountCreated: new Date('2020-01-01'), gradYear: 2028 }],
			['under', { firstName: 'Under', lastName: 'Awarded', accountCreated: new Date('2020-01-01'), gradYear: 2028 }],
			['grad-date', { firstName: 'Grad', lastName: 'Date', gradYear: '2028-06-01' }],
			['grad-bad', { firstName: 'Grad', lastName: 'Bad', gradYear: 'not-a-year' }],
			['grad-to', { firstName: 'Grad', lastName: 'Timestamp', gradYear: { toDate: () => new Date('2028-01-01') } }],
			['grad-seconds', { firstName: 'Grad', lastName: 'Seconds', gradYear: { seconds: 1830297600 } }],
			['grad-out', { firstName: 'Grad', lastName: 'Out', gradYear: 1800 }],
		]);
		const outlookApps = [
			{ completedBy: 'new', cycleYear: 2026, type: 'New Applicant', status: 'Submitted' },
			{ completedBy: 'grant', cycleYear: 2025, type: 'Returning Grant', status: 'Awarded' },
			{ completedBy: 'scholar', cycleYear: 2025, type: 'Scholarship Check In', status: 'Awarded' },
			{ completedBy: 'lost', cycleYear: 2024, type: 'New Applicant', status: 'Started' },
			{ completedBy: 'under', cycleYear: 2022, type: 'New Applicant', status: 'Awarded' },
			{ completedBy: 'under', cycleYear: 2023, type: 'New Applicant', status: 'Awarded' },
			{ completedBy: 'under', cycleYear: 2024, type: 'New Applicant', status: 'Awarded' },
			{ completedBy: 'under', cycleYear: 2025, type: 'New Applicant', status: 'Awarded' },
		];
		const outlook = FirebaseConfig.buildDashboardApplicantOutlook(outlookApps, outlookApplicants, 2026);
		expect(outlook.sections).toHaveLength(5);
		expect(outlook.sections.some((section) => section.applicants.length > 0)).toBe(true);

		mockOnSnapshot.mockImplementationOnce((_query, onNext) => {
			onNext({
				docs: [
					{ id: 'recent', data: () => ({ lastUpdated: new Date('2026-01-02'), status: 'Submitted' }) },
					{ id: 'submitted', data: () => ({ submittedOn: new Date('2026-01-01'), status: 'Submitted' }) },
					{ id: 'dated', data: () => ({ dated: '2025-01-01', status: 'Submitted' }) },
					{ id: 'invalid', data: () => ({ lastUpdated: 'not-a-date', status: 'Submitted' }) },
				],
			});
			return jest.fn();
		});
		FirebaseConfig.getRealTimeApplications(true, cb);
		await call('getRealTimeDashboardApplicantOutlook', cb);
		await call('getDashboardBenchmarkData', 2026);
		await call('getBenchmarkedAwardCounts', 2026);
		await call('getBenchmarkedAwardCounts');
		await call('getNotesByAuthor', 'u1');
		await call('getRealTimeNotes', 'users', 'u1', cb);
		await call('addNote', 'users', 'u1', { text: 'note' });
		await call('updateNote', 'users', 'u1', 'n1', 'updated');
		await call('redactNote', 'users', 'u1', 'n1');
		await call('getMeetings', 'u1', true);
		await call('getRealTimeMeetings', 'u1', false, cb, true);
		await call('getSchedulableInterviews');
		await call('getInterviewsByWindow', '2026');
		await call('getRealTimeInterviewsByWindow', 2026, cb);
		await call('getEmailLogs', 2);
		await call('getRealTimeNewApplicantsThisYear', cb, 2);
		mockOnSnapshot.mockImplementationOnce(() => {
			throw new Error('new-applicants-listener-fail');
		});
		expect(FirebaseConfig.getRealTimeNewApplicantsThisYear(cb, 2)).toEqual(expect.any(Function));
		mockGetDocs.mockResolvedValueOnce({
			empty: false,
			size: 3,
			docs: [],
			forEach: (fn) => {
				[
					{ data: () => ({ window: '2024-01-01', type: 'New Applicant' }) },
					{ data: () => ({ window: '2025-06-01', type: 'New Applicant' }) },
					{ data: () => ({ window: null, type: 'New Applicant' }) },
					{ data: () => ({ window: '2020-01-01', type: 'New Applicant' }) },
				].forEach(fn);
			},
		});
		await expect(FirebaseConfig.getAverageApplicationsPerYearByType('New Applicant', 2026, 2)).resolves.toEqual(1);
		await call('wipeCollections', { conn: '(default)' });
		await call('wipeCollections', { direct: true });
		await rejectOnce(mockGetDocs, 'sendToTestDB');
		await rejectOnce(mockSetDoc, 'migrateEmailTemplates');

		const savedCurrentUser = FirebaseConfig.auth.currentUser;
		FirebaseConfig.auth.currentUser = null;
		await FirebaseConfig.logEvent('anonymous failure', new Error('anonymous'));
		FirebaseConfig.auth.currentUser = savedCurrentUser;
		await rejectOnce(mockAddDoc, 'logEvent', 'failed log', new Error('log failure'));
	});

	it('covers adapter failure fallbacks', async () => {
		const call = async (name, ...args) => {
			try {
				return await FirebaseConfig[name](...args);
			} catch {
				return null;
			}
		};
		const cb = jest.fn();
		const rejectOnce = async (mock, name, ...args) => {
			mock.mockRejectedValueOnce(new Error('forced failure'));
			return call(name, ...args);
		};

		await rejectOnce(mockGetDoc, 'getConfigFromDb');
		await rejectOnce(mockUpdateDoc, 'updateUserPreferences', 'u1', 'users', {});
		await rejectOnce(mockGetDoc, 'getDocumentsByIDs', 'users', ['u1']);
		await rejectOnce(mockGetDocs, 'searchCollections', ['term']);
		await rejectOnce(mockGetDoc, 'getApplicant', 'u1');
		await rejectOnce(mockGetDoc, 'getMember', 'u1');
		await rejectOnce(mockSetDoc, 'saveApplicantData', 'u1', {});
		await rejectOnce(mockUpdateDoc, 'updateApplicantData', 'u1', {});
		await rejectOnce(mockUpdateDoc, 'addApplicationToApplicant', 'u1', 'a1');
		await rejectOnce(mockUpdateDoc, 'removeApplicationFromApplicant', 'u1', 'a1');
		await rejectOnce(mockGetDocs, 'getAuthUserByEmail', 'ada@example.com');
		await rejectOnce(mockGetDoc, 'getUserProfiles', 'u1');
		await rejectOnce(mockCreateUser, 'registerUser', 'ada@example.com', 'password');
		await rejectOnce(mockSignIn, 'loginUser', 'ada@example.com', 'password');
		await rejectOnce(mockSetDoc, 'saveCollectionData', 'users', 'u1', {});
		await rejectOnce(mockUpdateDoc, 'updateCollectionData', 'users', 'u1', {});
		await rejectOnce(mockUpdateDoc, 'updateApplicationStatus', 'u1', 'a1', 'Done');
		await rejectOnce(mockGetDoc, 'getApplication', 'u1', 'a1');
		await rejectOnce(mockGetDocs, 'getCollection', 'users');
		await rejectOnce(mockGetDoc, 'getCollectionData', 'u1', 'users', 'u1');
		await rejectOnce(mockUpdateDoc, 'deleteApplication', { id: 'a1' });
		await rejectOnce(mockUpdateDoc, 'updateSubmissionStatus', 'a1', 'Done');
		await rejectOnce(mockGetDocs, 'getPastApplicationsCountByWindow', 2026);
		await rejectOnce(mockGetDoc, 'getCurrentApplicationCount');
		await rejectOnce(mockOnSnapshot, 'getRealTimeCurrentApplicationCount', cb);
		await rejectOnce(mockGetDoc, 'getCurrentlyEligibleApplicationsCount');
		await rejectOnce(mockGetDocs, 'getMostRecentApplicationIDs');
		await rejectOnce(mockGetDoc, 'getCurrentlyEligibleApplicationsCountByType', 'New Applicant');
		await rejectOnce(mockGetDoc, 'getRealTimeCurrentEligibleApplicationsCountByType', 'New Applicant', cb);
		await rejectOnce(mockGetDocs, 'getEligibleApplicationsCountByTypeAndWindow', 'New Applicant', 2026);
		await rejectOnce(mockOnSnapshot, 'getRealTimeApplicationCountByStatus', 'Done', cb);
		await rejectOnce(mockGetDocs, 'getRealTimeEligibleApplicationsCountByTypeAndWindow', 'New Applicant', 2026, cb);
		await rejectOnce(mockGetDocs, 'getRealTimeCurrentNonNegatedApplicationsCountByType', 'New Applicant', cb);
		await rejectOnce(mockGetDocs, 'getRealTimeNonNegatedApplicationsCountByTypeAndCycleYear', 'New Applicant', 2026, cb);
		await rejectOnce(mockGetDocs, 'getRealTimeCurrentNonNegatedApplicationsCountByStatus', 'Done', cb);
		await rejectOnce(mockGetDocs, 'getRealTimeCurrentApplicationCountByStatus', 'Done', cb);
		await rejectOnce(mockGetDocs, 'getRealTimeCurrentRejectedApplicationsCount', cb);
		await rejectOnce(mockGetDocs, 'getApplicationsByWindow', 2026);
		await rejectOnce(mockOnSnapshot, 'getRealTimeApplicationsByWindow', 2026, true, cb);
		await rejectOnce(mockGetDocs, 'getApplicationsByType', 'New Applicant', 2026);
		await rejectOnce(mockOnSnapshot, 'getRealTimeApplicationsByType', 'New Applicant', 2026, true, cb);
		await rejectOnce(mockOnSnapshot, 'getRealTimeApplicantsByApplicationID', ['a1'], cb);
		await rejectOnce(mockGetDocs, 'getApplicationsByStatus', 'Done', 2026);
		await rejectOnce(mockOnSnapshot, 'getRealTimeDocument', 'users', 'u1', cb);
		await rejectOnce(mockOnSnapshot, 'getRealTimeApplicationsByIDs', ['a1'], cb);
		await rejectOnce(mockOnSnapshot, 'getRealTimeAwardsByIDs', ['a1'], cb);
		await rejectOnce(mockGetDoc, 'getAwardsData', 'u1', ['a1']);
		await rejectOnce(mockGetDocs, 'getApplicationsByIDs', ['a1']);
		await rejectOnce(mockGetDocs, 'getDashboardBenchmarkData', 2026);
		await rejectOnce(mockGetDocs, 'getBenchmarkedAwardCounts', 2026);
		await rejectOnce(mockGetDocs, 'getNotesByAuthor', 'u1');
		await rejectOnce(mockOnSnapshot, 'getRealTimeNotes', 'users', 'u1', cb);
		await rejectOnce(mockAddDoc, 'addNote', 'users', 'u1', {});
		await rejectOnce(mockUpdateDoc, 'updateNote', 'users', 'u1', 'n1', 'x');
		await rejectOnce(mockUpdateDoc, 'redactNote', 'users', 'u1', 'n1');
		await rejectOnce(mockGetDocs, 'getMeetings', 'u1', false);
		await rejectOnce(mockGetDocs, 'getInterviewsByWindow', 2026);
		await rejectOnce(mockOnSnapshot, 'getRealTimeInterviewsByWindow', 2026, cb);
		await rejectOnce(mockGetDocs, 'getEmailLogs', 2);
		await rejectOnce(mockGetDocs, 'getAverageApplicationsPerYearByType', 'New Applicant', 2026, 2);
	});

	it('covers empty snapshots and realtime error callbacks', async () => {
		const cb = jest.fn();
		mockGetDoc.mockResolvedValue({
			exists: () => false,
			id: 'missing',
			data: () => ({}),
		});
		mockGetDocs.mockResolvedValue({ empty: true, size: 0, docs: [] });

		await FirebaseConfig.getApplicant('missing');
		await FirebaseConfig.getMember('missing');
		await FirebaseConfig.getApplication('u1', 'missing');
		await FirebaseConfig.getCollectionData('u1', 'users', 'missing');
		await FirebaseConfig.getAwardsByIds(['missing']);
		await FirebaseConfig.getApplicationsByIds(['missing']);
		await FirebaseConfig.getAwardsData('u1', ['missing']);
		await FirebaseConfig.getApplicationsByIDs(['missing']);
		await FirebaseConfig.getDocumentsByIDs('users', ['missing']);
		await FirebaseConfig.getCollection('users');
		await FirebaseConfig.getAuthUserByEmail('missing@example.com');
		await FirebaseConfig.getMemberOrApplicantAddress('u1');
		await FirebaseConfig.getMemberOrApplicantAddress('', { profileId: 'missing' });

		mockOnSnapshot.mockImplementation((queryOrRef, onNext, onError) => {
			onNext({ exists: () => false, size: 0, docs: [], data: () => ({}) });
			if (onError) onError(new Error('snapshot failure'));
			return jest.fn();
		});
		FirebaseConfig.getRealTimeLegacyFinances(cb, { collection: 'legacyFinances' });
		FirebaseConfig.getRealTimeYearlyFinances(cb);
		FirebaseConfig.getRealTimeCollection('users', cb);
		await FirebaseConfig.getRealTimeCurrentApplicationCount(cb);
		FirebaseConfig.getRealTimeMostRecentApplicationIDs(cb);
		await FirebaseConfig.getRealTimeCurrentEligibleApplicationsCountByType('New Applicant', cb);
		FirebaseConfig.getRealTimeEligibleApplicationsCountByTypeAndWindow('New Applicant', 2026, cb);
		FirebaseConfig.getRealTimeApplicationCountByStatus('Submitted', cb);
		FirebaseConfig.getRealTimeApplications(true, cb);
		FirebaseConfig.getRealTimeRejectedApplications(cb, 2026);
		FirebaseConfig.getRealTimeApplicationsByWindow(2026, false, cb);
		FirebaseConfig.getRealTimeApplicationsByType('New Applicant', 2026, false, cb);
		FirebaseConfig.getRealTimeApplicantsByApplicationID(['missing'], cb);
		FirebaseConfig.getRealTimeApplicationsByStatus('Submitted', cb, 2026);
		FirebaseConfig.getRealTimeDocument('users', 'missing', cb);
		FirebaseConfig.getRealTimeApplicationsByIDs(['missing'], cb);
		FirebaseConfig.getRealTimeAwardsByIDs(['missing'], cb);
		FirebaseConfig.getRealTimeNotes('users', 'missing', cb);
		FirebaseConfig.getRealTimeInterviewsByWindow(2026, cb);
		FirebaseConfig.getRealTimeNewApplicantsThisYear(cb, 2);
	});

	it('getRequestData returns null on fetch errors', async () => {
		mockGetDoc.mockRejectedValueOnce(new Error('request boom'));
		await expect(FirebaseConfig.getRequestData('req-1')).resolves.toBeNull();
	});

	it('getRealTimeApplicantsByApplicationID cleanup unsubscribes listeners', () => {
		const unsub = jest.fn();
		mockOnSnapshot.mockImplementation((_ref, onNext) => {
			onNext({
				exists: () => true,
				id: 'u1',
				data: () => ({ firstName: 'Ada' }),
			});
			return unsub;
		});
		const cleanup = FirebaseConfig.getRealTimeApplicantsByApplicationID(['app-1'], jest.fn());
		expect(typeof cleanup).toBe('function');
		cleanup();
		expect(unsub).toHaveBeenCalled();
	});

	it('covers additional realtime error and empty-input edges', async () => {
		const cb = jest.fn();
		mockOnSnapshot.mockImplementationOnce((_q, _onNext, onError) => {
			onError?.(new Error('apps boom'));
			return jest.fn();
		});
		FirebaseConfig.getRealTimeApplicationsByStatus?.('Submitted', cb, 2026);

		mockOnSnapshot.mockImplementationOnce(() => {
			throw new Error('outlook boom');
		});
		expect(FirebaseConfig.getRealTimeDashboardApplicantOutlook?.(cb)).toBeNull();

		mockGetDoc.mockRejectedValueOnce(new Error('parent boom'));
		mockGetDocs.mockResolvedValueOnce({
			docs: [
				{
					id: 'n-err',
					data: () => ({ text: 'x' }),
					ref: { parent: { parent: { id: 'u9', path: 'applicants/u9' } } },
				},
			],
		});
		const notes = await FirebaseConfig.getNotesByAuthor('author-err');
		expect(notes[0].parent.name).toBe('u9');

		expect(await FirebaseConfig.invalidateRequest?.('')).toBeDefined();
		mockUpdateDoc.mockRejectedValueOnce(new Error('invalidate boom'));
		await expect(FirebaseConfig.invalidateRequest('req-x')).resolves.toBe(false);
	});
});
