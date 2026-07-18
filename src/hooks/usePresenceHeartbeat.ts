import { useEffect } from 'react';

import { touchUserPresence, clearUserPresence } from '../config/data/firebase';

const HEARTBEAT_MS = 45 * 1000;

interface PresencePerson {
	firstName?: string | null;
	lastName?: string | null;
}

interface PresenceUser {
	uid?: string | null;
}

const buildDisplayName = (member?: PresencePerson | null, applicant?: PresencePerson | null): string => {
	if (member?.firstName) {
		return `${member.firstName} ${member.lastName ?? ''}`.trim();
	}
	if (applicant?.firstName) {
		return `${applicant.firstName} ${applicant.lastName ?? ''}`.trim();
	}
	return 'User';
};

export const usePresenceHeartbeat = (
	user: PresenceUser | null | undefined,
	role: string | null | undefined,
	member?: PresencePerson | null,
	applicant?: PresencePerson | null
): void => {
	useEffect(() => {
		if (!user?.uid) {
			return;
		}

		const displayName = buildDisplayName(member, applicant);
		const uid = user.uid;

		const ping = () => {
			touchUserPresence({ uid, role: role ?? '', displayName }).catch(() => {});
		};

		ping();
		const intervalId = window.setInterval(ping, HEARTBEAT_MS);

		const handleVisibility = () => {
			if (document.visibilityState === 'visible') {
				ping();
			}
		};
		document.addEventListener('visibilitychange', handleVisibility);

		return () => {
			window.clearInterval(intervalId);
			document.removeEventListener('visibilitychange', handleVisibility);
			clearUserPresence(uid).catch(() => {});
		};
	}, [user?.uid, role, member, applicant]);
};
