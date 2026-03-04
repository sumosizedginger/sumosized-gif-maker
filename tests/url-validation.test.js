import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing upload.js
vi.mock('../js/modules/state.js', () => ({
    state: {
        slideshowImages: [],
        currentVideoFile: null,
        frameData: [],
        videoDuration: 0,
        currentMode: 'video'
    }
}));
vi.mock('../js/modules/ui.js', () => ({
    dom: {},
    showToast: vi.fn(),
    switchMode: vi.fn()
}));
vi.mock('../js/modules/timeline.js', () => ({
    generateTimelineThumbnails: vi.fn()
}));
vi.mock('../js/modules/predictor.js', () => ({
    updateRange: vi.fn()
}));

const { loadFromUrl } = await import('../js/modules/upload.js');
const { showToast } = await import('../js/modules/ui.js');

describe('loadFromUrl URL validation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does nothing when url is empty string', async () => {
        await loadFromUrl('', 'video');
        expect(showToast).not.toHaveBeenCalled();
    });

    it('shows CORS error toast when fetch fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
        await loadFromUrl('https://example.com/video.mp4', 'video');
        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('URL Import Failed'));
    });

    it('shows CORS error toast when HTTP status is not ok', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
        await loadFromUrl('https://example.com/video.mp4', 'video');
        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('URL Import Failed'));
    });

    it('does nothing when url is falsy (null)', async () => {
        await loadFromUrl(null, 'video');
        expect(showToast).not.toHaveBeenCalled();
    });
});
