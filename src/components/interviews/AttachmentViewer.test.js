import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AttachmentViewer from './AttachmentViewer';
import { getCollectionData } from '../../config/data/firebase';
import { getBlob } from 'firebase/storage';
import { createBlobUrl } from '../../config/Constants';

// Mock Dependencies
vi.mock('../../config/data/firebase', () => ({
	getCollectionData: jest.fn(),
	storage: { app: 'mock-storage' },
}));
vi.mock('firebase/storage', () => ({
	ref: jest.fn(),
	getBlob: jest.fn(),
}));
vi.mock('../../config/Constants', () => ({
	convertPDFBlobToImages: jest.fn(),
	createBlobUrl: jest.fn(),
}));
vi.mock('../../config/data/collections', () => ({
	collections: {
		attachments: 'attachments',
	},
}));

describe('AttachmentViewer Component', () => {
	const mockApplication = { attachments: 'attach_id_123', completedBy: 'user_123' };
	const mockImgBlob = new Blob(['img-content'], { type: 'image/png' });

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders a loading state initially', () => {
		getCollectionData.mockReturnValue(new Promise(() => {}));
		render(<AttachmentViewer application={mockApplication} />);
		expect(screen.getByRole('progressbar')).toBeInTheDocument();
	});

	it('renders an error message on fetch failure', async () => {
		getCollectionData.mockRejectedValue(new Error('Failed to fetch'));
		render(<AttachmentViewer application={mockApplication} />);
		expect(await screen.findByText('Failed to load attachment data.')).toBeInTheDocument();
	});

	it('fetches, processes, and renders an image attachment', async () => {
		const mockAttachmentData = {
			transcript: { refLoc: 'path/to/image.png', displayName: 'Transcript.png' },
		};
		getCollectionData.mockResolvedValue(mockAttachmentData);
		getBlob.mockResolvedValue(mockImgBlob);

        createBlobUrl.mockReturnValue('blob-image-url.jpg');

		render(<AttachmentViewer application={mockApplication} />);

		// Wait for the text to appear
		expect(await screen.findByText('Transcript.png')).toBeInTheDocument();

		// --- THIS IS THE FIX ---
		// Wait *for the assertion itself* to pass
		await waitFor(() => {
			expect(screen.getByAltText('Transcript.png - Page 1')).toHaveAttribute('src', 'blob-image-url.jpg');
		});

		// Now we can safely check other conditions
		expect(createBlobUrl).toHaveBeenCalledWith(mockImgBlob);
        expect(screen.getAllByRole('img')).toHaveLength(1);
	});

	it('converts PDF attachments into preview pages', async () => {
		const { convertPDFBlobToImages } = await import('../../config/Constants');
		getCollectionData.mockResolvedValue({
			letter: { refLoc: 'path/to/letter.pdf', displayName: 'Letter.pdf' },
		});
		getBlob.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
		convertPDFBlobToImages.mockResolvedValue(['pdf-page-1.jpg', 'pdf-page-2.jpg']);
		render(<AttachmentViewer application={mockApplication} />);
		expect(await screen.findByText('Letter.pdf')).toBeInTheDocument();
		await waitFor(() => {
			expect(screen.getByAltText('Letter.pdf - Page 1')).toHaveAttribute('src', 'pdf-page-1.jpg');
			expect(screen.getByAltText('Letter.pdf - Page 2')).toHaveAttribute('src', 'pdf-page-2.jpg');
		});
	});

	it('shows empty state when attachments payload is empty', async () => {
		getCollectionData.mockResolvedValue({});
		render(<AttachmentViewer application={mockApplication} />);
		expect(await screen.findByText('No attachments found.')).toBeInTheDocument();
	});

	it('skips entries without refLoc and swallows per-file processing errors', async () => {
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		const { convertPDFBlobToImages } = await import('../../config/Constants');
		getCollectionData.mockResolvedValue({
			empty: { displayName: 'Missing.pdf' },
			broken: { refLoc: 'path/to/broken.pdf', displayName: 'Broken.pdf' },
			photo: { refLoc: 'path/to/photo.png' },
		});
		let calls = 0;
		getBlob.mockImplementation(async () => {
			calls += 1;
			if (calls === 1) throw new Error('blob fail');
			return mockImgBlob;
		});
		convertPDFBlobToImages.mockResolvedValue(['pdf-page-1.jpg']);
		createBlobUrl.mockReturnValue('blob-photo.jpg');
		render(<AttachmentViewer application={mockApplication} />);
		expect(await screen.findByAltText(/Photo|Page 1/i)).toBeInTheDocument();
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});
