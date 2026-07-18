import { useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/data/firebase';
import { collections } from '../config/data/collections';

/** Marks applicantPresent on an interview while the applicant is in a waiting or interview room. */
export const useApplicantPresence = (interviewId: string | undefined, enabled: boolean) => {
	useEffect(() => {
		if (!interviewId || !enabled) return;

		const interviewRef = doc(db, collections.interviews, interviewId);
		updateDoc(interviewRef, { applicantPresent: true }).catch((err) => console.error('Failed to mark applicant as present:', err));

		return () => {
			updateDoc(interviewRef, { applicantPresent: false }).catch((err) => console.error('Failed to unmark applicant as present:', err));
		};
	}, [interviewId, enabled]);
};
