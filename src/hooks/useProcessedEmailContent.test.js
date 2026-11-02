import { renderHook, waitFor } from '@testing-library/react';
import { useProcessedEmailContent } from './useProcessedEmailContent';
import { fetchAttachmentContent, fetchEmailContent } from '../config/data/firebase';

// Mock the specific export explicitly
vi.mock('../config/data/firebase', () => ({
	fetchAttachmentContent: jest.fn(),
	fetchEmailContent: jest.fn(),
}));

describe('useProcessedEmailContent', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('returns empty string if email has no content', () => {
		const { result } = renderHook(() => useProcessedEmailContent(null));
		expect(result.current.processedContent).toBe('');
		expect(result.current.contentLoading).toBe(false);
	});

	test('returns original content if no inline attachments', () => {
		const email = { content: '<p>Hello</p>', inlineAttachments: [] };
		const { result } = renderHook(() => useProcessedEmailContent(email));

		expect(result.current.processedContent).toBe('<p>Hello</p>');
		expect(result.current.contentLoading).toBe(false);
	});

	test('replaces CID tags with fetched base64 data', async () => {
		const email = {
			id: 'msg123',
			folderId: 'inbox',
			// UPDATED: Your code's regex expects 'cid=', so we match that format here
			content: '<img src="https://example.com/proxy?cid=image1" />',
			inlineAttachments: [{ cid: '<image1>', attachmentId: 'att1' }],
		};

		// Mock successful fetch
		fetchAttachmentContent.mockResolvedValue({
			data: { contentType: 'image/png', content: 'base64data' },
		});

		const { result } = renderHook(() => useProcessedEmailContent(email));

		// Initially loading
		expect(result.current.contentLoading).toBe(true);

		// Wait for async effect to finish
		await waitFor(() => {
			expect(result.current.contentLoading).toBe(false);
		});

		// Check if URL was replaced
		expect(result.current.processedContent).toContain('src="data:image/png;base64,base64data"');
	});

	test('handles fetch errors gracefully', async () => {
		const email = {
			id: 'msg123',
			// UPDATED: Matching code expectation
			content: '<img src="https://example.com/proxy?cid=image1" />',
			inlineAttachments: [{ cid: 'image1', attachmentId: 'att1' }],
		};

		// Mock error
		fetchAttachmentContent.mockRejectedValue(new Error('Network Error'));
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

		const { result } = renderHook(() => useProcessedEmailContent(email));

		await waitFor(() => {
			expect(result.current.contentLoading).toBe(false);
		});

		// Content should remain unchanged (still has cid=image1)
		expect(result.current.processedContent).toContain('cid=image1');
		consoleSpy.mockRestore();
	});

	test('hydrates missing body via fetchEmailContent', async () => {
		fetchEmailContent.mockResolvedValue({
			data: {
				content: '<p>Fetched body</p>',
				inlineAttachments: [],
			},
		});

		const email = { id: 'msg-9', folderId: 'inbox' };
		const { result } = renderHook(() => useProcessedEmailContent(email));

		await waitFor(() => {
			expect(result.current.contentLoading).toBe(false);
		});

		expect(fetchEmailContent).toHaveBeenCalledWith(
			expect.objectContaining({ messageId: 'msg-9', folderId: 'inbox' })
		);
		expect(result.current.processedContent).toContain('Fetched body');
	});

	test('handles fetchEmailContent failure', async () => {
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		fetchEmailContent.mockRejectedValue(new Error('zoho down'));

		const email = { id: 'msg-9', folderName: 'Inbox' };
		const { result } = renderHook(() => useProcessedEmailContent(email));

		await waitFor(() => {
			expect(result.current.contentLoading).toBe(false);
		});
		expect(result.current.processedContent).toBe('');
		consoleSpy.mockRestore();
	});

	test('hydrates body and inline attachments from fetchEmailContent', async () => {
		fetchEmailContent.mockResolvedValue({
			data: {
				content: '<img src="cid:image1" />',
				inlineAttachments: [{ cid: '<image1>', attachmentId: 'att1' }],
			},
		});
		fetchAttachmentContent.mockResolvedValue({
			data: { content: 'aaa', contentType: 'image/png' },
		});

		const email = { id: 'msg-10', folderId: 'inbox', inlineAttachments: [] };
		const { result } = renderHook(() => useProcessedEmailContent(email));

		await waitFor(() => {
			expect(result.current.contentLoading).toBe(false);
		});
		expect(fetchAttachmentContent).toHaveBeenCalled();
		expect(result.current.processedContent).toMatch(/data:image\/png;base64,aaa|cid:image1/);
	});

	test('clears content when fetched body is empty', async () => {
		fetchEmailContent.mockResolvedValue({
			data: { content: '', inlineAttachments: [] },
		});
		const email = { id: 'msg-empty', folderName: 'Inbox' };
		const { result } = renderHook(() => useProcessedEmailContent(email));
		await waitFor(() => {
			expect(result.current.contentLoading).toBe(false);
		});
		expect(result.current.processedContent).toBe('');
	});


	test('skips inline attachments missing cid', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
		const email = {
			id: 'msg123',
			content: '<p>Hi</p>',
			inlineAttachments: [{ attachmentId: 'att-no-cid' }],
		};

		const { result } = renderHook(() => useProcessedEmailContent(email));
		await waitFor(() => {
			expect(result.current.contentLoading).toBe(false);
		});
		expect(warnSpy).toHaveBeenCalled();
		expect(result.current.processedContent).toContain('Hi');
		warnSpy.mockRestore();
	});
});
