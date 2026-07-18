/**
 * AUTHENTICATION CONTEXT & STATE MANAGER
 * ---------------------------------------------------------------------------
 * Identity hub: Firebase Auth + Member/Applicant profile listeners.
 *
 * `profilesReady` becomes true after both profile listeners have delivered a
 * first result (data OR null OR error). Route guards must wait on that flag
 * instead of `user && !role`, or authenticated users with missing/unreadable
 * profiles spin forever on <Loader />.
 */

import { createContext, useState, useEffect, useMemo, useCallback, useRef, useContext, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { auth, getRealTimeDocument, logoutUser } from '../config/data/firebase';
import { usePresenceHeartbeat } from '../hooks/usePresenceHeartbeat';
import { UserType, collections, type UserTypeValue } from '../config/data/collections';
import type { Applicant, Member } from '../types/domain';
import Loader from '../components/loader/Loader';

export interface AuthContextValue {
	user: User | null;
	member: Member | null;
	applicant: Applicant | null;
	role: UserTypeValue | null;
	loading: boolean;
	profilesReady: boolean;
	logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [member, setMember] = useState<Member | null>(null);
	const [applicant, setApplicant] = useState<Applicant | null>(null);
	/** True only until the first onAuthStateChanged fires. Never re-block the whole tree after that. */
	const [bootstrapping, setBootstrapping] = useState(true);
	const [profilesReady, setProfilesReady] = useState(true);

	const applicantUnsubscribeRef = useRef<(() => void) | null>(null);
	const memberUnsubscribeRef = useRef<(() => void) | null>(null);
	const profilePendingRef = useRef({ applicant: false, member: false });

	const clearProfileListeners = useCallback(() => {
		if (applicantUnsubscribeRef.current) {
			applicantUnsubscribeRef.current();
			applicantUnsubscribeRef.current = null;
		}
		if (memberUnsubscribeRef.current) {
			memberUnsubscribeRef.current();
			memberUnsubscribeRef.current = null;
		}
	}, []);

	const clearUserData = useCallback(() => {
		clearProfileListeners();
		setUser(null);
		setMember(null);
		setApplicant(null);
	}, [clearProfileListeners]);

	const logout = useCallback(() => {
		logoutUser();
		clearUserData();
		setProfilesReady(true);
	}, [clearUserData]);

	useEffect(() => {
		const authStateSubscription = onAuthStateChanged(auth, (currentUser) => {
			// Tear down previous profile listeners without unmounting the app tree.
			clearProfileListeners();
			setMember(null);
			setApplicant(null);

			if (currentUser) {
				setUser(currentUser);
				setProfilesReady(false);
				profilePendingRef.current = { applicant: true, member: true };

				const markProfile = (key: 'applicant' | 'member') => {
					profilePendingRef.current[key] = false;
					if (!profilePendingRef.current.applicant && !profilePendingRef.current.member) {
						setProfilesReady(true);
					}
				};

				applicantUnsubscribeRef.current =
					getRealTimeDocument(collections.applicants, currentUser.uid, (data) => {
						setApplicant((data as Applicant | null) ?? null);
						markProfile('applicant');
					}) ?? null;
				memberUnsubscribeRef.current =
					getRealTimeDocument(collections.members, currentUser.uid, (data) => {
						setMember((data as Member | null) ?? null);
						markProfile('member');
					}) ?? null;

				if (!applicantUnsubscribeRef.current) {
					setApplicant(null);
					markProfile('applicant');
				}
				if (!memberUnsubscribeRef.current) {
					setMember(null);
					markProfile('member');
				}
			} else {
				setUser(null);
				setProfilesReady(true);
			}

			setBootstrapping(false);
		});

		return () => {
			if (authStateSubscription) authStateSubscription();
			clearUserData();
		};
	}, [clearProfileListeners, clearUserData]);

	const role = useMemo<UserTypeValue | null>(() => {
		if (applicant && member) return UserType.both;
		if (applicant) return UserType.applicant;
		if (member) return UserType.member;
		return null;
	}, [applicant, member]);

	const loading = bootstrapping || Boolean(user && !profilesReady);

	usePresenceHeartbeat(user, role, member, applicant);

	const values = useMemo<AuthContextValue>(
		() => ({
			user,
			member,
			applicant,
			role,
			loading,
			profilesReady,
			logout,
		}),
		[user, member, applicant, role, loading, profilesReady, logout]
	);

	// Only block the tree on the first auth resolution. Later sign-in/out keeps
	// providers mounted so Login/Alerts/Router do not remount to a blank form.
	if (bootstrapping) {
		return <Loader />;
	}

	return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};
