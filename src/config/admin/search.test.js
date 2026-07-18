import { searchConfig } from './search';

describe('admin/searchConfig', () => {
	it('defines expected collections with path and text helpers', () => {
		expect(Object.keys(searchConfig)).toEqual(
			expect.arrayContaining(['members', 'applicants', 'profiles', 'applications', 'requests', 'mail', 'attachments'])
		);

		const memberPath = searchConfig.members.getPath({ id: 'm1' });
		expect(typeof memberPath).toBe('string');
		expect(memberPath.length).toBeGreaterThan(0);

		const text = searchConfig.members.getText({ firstName: 'Ada', lastName: 'Lovelace', position: 'Chair', since: '2020' }, 'Ada');
		expect(text.primary).toBeTruthy();
		expect(text.secondary).toBeTruthy();

		const applicant = searchConfig.applicants.getText({ firstName: 'A', lastName: 'B', email: 'a@b.c', cell: '1' }, 'a');
		expect(applicant.primary).toBeTruthy();

		const mail = searchConfig.mail.getText({ subject: 'Hello', from: 'x@y.z' }, 'Hello');
		expect(mail.primary).toBeTruthy();
	});
});
