/**
 * Interview Layout
 * A specialized layout wrapper for the Interview subsystem.
 * Features:
 * - Wraps child routes in the MeetingProvider context.
 * - Ensures video call state management is available to all interview pages.
 */

import type { ReactNode } from 'react';

// Context
import { MeetingProvider } from '../../context/MeetingContext';

const InterviewLayout = ({ children }: { children: ReactNode }) => {
	return <MeetingProvider>{children}</MeetingProvider>;
};

export default InterviewLayout;