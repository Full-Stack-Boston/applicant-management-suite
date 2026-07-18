/**
 * ROUTE SECURITY & AUTHORIZATION GUARDS
 * ---------------------------------------------------------------------------
 * This file defines the "Wrapper Components" that protect the application's routes.
 * * * HOW IT WORKS:
 * Wrap any <Route> element with these components to enforce security rules.
 * * * COMPONENTS:
 * - RouteGuard: The master guard. Checks Roles AND Granular Permissions.
 * - ApplicantsOnly: Shortcut for Role === 'Applicant'.
 * - MembersOnly: Shortcut for Role === 'Member'.
 * - Protected: Basic check (User must be logged in).
 * - Unprotected: Inverse check (User must be logged OUT, e.g., Login page).
 */

import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';

// Context & Config
import { useAuth } from '../../context/AuthContext';
import { UserType } from '../data/collections';
import type { UserTypeValue } from '../data/collections';
import { generatePath } from './routeUtils';
import { paths } from './paths';

// Components
import Loader from '../../components/loader/Loader';

type AuthStatus = 'LOADING' | 'AUTHORIZED' | 'REDIRECT_LOGIN' | 'REDIRECT_ACCESS_DENIED';

interface AuthState {
	status: AuthStatus;
	redirectPath?: string;
}

interface RouteGuardProps {
	children: ReactNode;
	allowedRoles?: UserTypeValue[];
	permissions?: string[];
	allowUnauthed?: boolean;
}

/**
 * The Master Security Component.
 * Checks Authentication, Roles, and specific Permissions before rendering children.
 * * @param {node} children - The page component to render if authorized.
 * @param {string[]} allowedRoles - Array of roles allowed (e.g. ['Member', 'Applicant']).
 * @param {string[]} permissions - Array of specific permission keys required (e.g. ['admin', 'interviews.canHost']).
 * @param {boolean} allowUnauthed - If true, bypasses login check (rarely used).
 */
export const RouteGuard = ({ children, allowedRoles = [], permissions = [], allowUnauthed = false }: RouteGuardProps): ReactNode => {
	const { user, member, role, loading } = useAuth();
	const location = useLocation();

	const authState = useMemo((): AuthState => {
		// 1. Wait for Auth + first profile snapshot(s). Do NOT wait forever on `!role`
		// (missing docs / denied reads used to hang protected pages on <Loader />).
		if (loading) return { status: 'LOADING' };

		// 2. Check Basic Authentication
		if (!user) {
			return allowUnauthed ? { status: 'AUTHORIZED' } : { status: 'REDIRECT_LOGIN' };
		}

		// Authenticated but no member/applicant profile → recoverable redirect page
		if (!role) {
			const redirectPath = generatePath(paths.redirect);
			// Already on the recovery route — render it (avoid Navigate ↔ RouteGuard loop)
			if (location.pathname === redirectPath) {
				return { status: 'AUTHORIZED' };
			}
			return {
				status: 'REDIRECT_ACCESS_DENIED',
				redirectPath,
			};
		}

		// 3. Check Role (e.g. 'Member' vs 'Applicant')
		let isAuthorized = allowedRoles.length === 0 || allowedRoles.includes(role);

		// 4. Check Granular Permissions (Only applies to Members)
		if (isAuthorized && permissions.length > 0 && member) {
			const checkPermission = (permKey: string): boolean => {
				// Supports nested keys like 'interviews.canHost'
				const keys = permKey.split('.');
				let currentPerm: unknown = member.permissions;
				for (const key of keys) {
					currentPerm = (currentPerm as Record<string, unknown> | undefined)?.[key];
					if (currentPerm === undefined) return false;
				}
				return currentPerm === true;
			};

			// 'Admin' permission overrides all specific checks
			const hasAdminPermission = checkPermission('admin');
			const hasAllRequiredPermissions = permissions.every(checkPermission);

			isAuthorized = hasAdminPermission || hasAllRequiredPermissions;
		}

		if (isAuthorized) return { status: 'AUTHORIZED' };

		// 5. Handle Access Denied (Determine where to send them)
		// If they tried to access an Admin route, send to Admin Access Denied.
		const isAdminRoute = location.pathname.startsWith('/members') || location.pathname.startsWith('/applicants') || location.pathname.startsWith('/applications');

		return {
			status: 'REDIRECT_ACCESS_DENIED',
			redirectPath: generatePath(isAdminRoute ? paths.adminAccessDenied : paths.caAccessDenied),
		};
	}, [user, member, role, loading, allowedRoles, permissions, location, allowUnauthed]);

	// --- Render Logic ---

	if (authState.status === 'LOADING') return <Loader />;

	if (authState.status === 'AUTHORIZED') return children;

	if (authState.status === 'REDIRECT_LOGIN') {
		// Preserve the location they were trying to go to (state.from)
		return <Navigate to={generatePath(paths.login)} state={{ from: location }} replace />;
	}

	if (authState.status === 'REDIRECT_ACCESS_DENIED' && authState.redirectPath) {
		return <Navigate to={authState.redirectPath} state={{ from: location }} replace />;
	}

	return <Loader />;
};

RouteGuard.propTypes = {
	children: PropTypes.node.isRequired,
	allowedRoles: PropTypes.arrayOf(PropTypes.string),
	permissions: PropTypes.arrayOf(PropTypes.string),
	allowUnauthed: PropTypes.bool,
};

interface ChildrenProps {
	children: ReactNode;
}

/**
 * Guard: Only allows authenticated Applicants.
 */
export const ApplicantsOnly = ({ children }: ChildrenProps): ReactNode => {
	const { user, role, applicant, loading } = useAuth();
	if (loading) return <Loader />;

	// Must be logged in, have the 'Applicant' role, and have a loaded profile
	if (!user || (role !== UserType.applicant && role !== UserType.both) || !applicant) {
		return <Navigate to={generatePath(paths.redirect)} replace />;
	}
	return children;
};

ApplicantsOnly.propTypes = {
	children: PropTypes.node.isRequired,
};

/**
 * Guard: Only allows authenticated Members (Admins).
 */
export const MembersOnly = ({ children }: ChildrenProps): ReactNode => {
	const { user, member, role, loading } = useAuth();
	if (loading) return <Loader />;

	// Must be logged in, have the 'Member' role, and have a loaded profile
	if (!user || (role !== UserType.member && role !== UserType.both) || !member) {
		return <Navigate to={generatePath(paths.redirect)} replace />;
	}
	return children;
};

MembersOnly.propTypes = {
	children: PropTypes.node.isRequired,
};

/**
 * Guard: Only allows authenticated users (Any role).
 */
export const Protected = ({ children }: ChildrenProps): ReactNode => {
	const { user, loading } = useAuth();
	if (loading) return <Loader />;
	if (!user) {
		return <Navigate to={generatePath(paths.login)} replace />;
	}
	return children;
};

Protected.propTypes = {
	children: PropTypes.node.isRequired,
};

/**
 * Guard: Only allows Guests (Non-authenticated users).
 * Used for Login/Register pages to prevent logged-in users from seeing them.
 */
export const Unprotected = ({ children }: ChildrenProps): ReactNode => {
	const { user, loading } = useAuth();
	if (loading) return <Loader />;
	if (user) {
		return <Navigate to={generatePath(paths.redirect)} replace />;
	}
	return children;
};

Unprotected.propTypes = {
	children: PropTypes.node.isRequired,
};
