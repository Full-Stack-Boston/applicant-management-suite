import { useEffect, useState } from 'react';
import { collections } from '../../config/data/collections';
import { getCollectionData } from '../../config/data/firebase';
import type { AttachmentRecord } from '../../config/data/applicationAttachments';
import {
	getApplicationAttachmentProgress,
	type ApplicantApplicationCardData,
	type ApplicationAttachmentProgress,
} from './applicationCardUtils';

export const useApplicationAttachmentProgress = (applications: ApplicantApplicationCardData[]) => {
	const [progressById, setProgressById] = useState<Record<string, ApplicationAttachmentProgress | null>>({});

	useEffect(() => {
		if (applications.length === 0) {
			setProgressById({});
			return;
		}

		let cancelled = false;

		const load = async () => {
			const entries = await Promise.all(
				applications.map(async (application) => {
					const fallback = getApplicationAttachmentProgress(application, null);

					if (!application.attachments || !application.completedBy) {
						return [application.id, fallback] as const;
					}

					try {
						const attachments = (await getCollectionData(
							application.completedBy,
							collections.attachments,
							application.attachments,
						)) as AttachmentRecord | null;
						return [application.id, getApplicationAttachmentProgress(application, attachments)] as const;
					} catch {
						return [application.id, fallback] as const;
					}
				}),
			);

			if (!cancelled) {
				setProgressById(Object.fromEntries(entries));
			}
		};

		void load();

		return () => {
			cancelled = true;
		};
	}, [applications]);

	return progressById;
};
