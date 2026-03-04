import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyFfmpegError } from '../js/modules/utils.js';
import { sendTelemetry } from '../js/modules/telemetry.js';

describe('classifyFfmpegError', () => {
    it('detects SharedArrayBuffer / crossOriginIsolated errors', () => {
        const err = new Error('SharedArrayBuffer is not defined');
        expect(classifyFfmpegError(err)).toMatch(/Cross-Origin Isolation/i);
    });

    it('detects network / fetch errors', () => {
        const err = new Error('Failed to fetch');
        expect(classifyFfmpegError(err)).toMatch(/Network error/i);
    });

    it('detects out-of-memory errors', () => {
        const err = new Error('Cannot allocate memory: OOM');
        expect(classifyFfmpegError(err)).toMatch(/Out of memory/i);
    });

    it('detects codec errors', () => {
        const err = new Error('codec not found: libx264');
        expect(classifyFfmpegError(err)).toMatch(/Codec not supported/i);
    });

    it('returns generic message for unknown errors', () => {
        const err = new Error('something weird happened');
        const result = classifyFfmpegError(err);
        expect(result).toMatch(/Processing Error/i);
        expect(result).toContain('something weird happened');
    });
});

describe('sendTelemetry', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
    });

    it('does not throw when the network request fails', async () => {
        await expect(
            sendTelemetry({
                is_success: true,
                file_size_mb: 1,
                render_time_seconds: 2,
                device_type: 'desktop',
                error_message: null
            })
        ).resolves.toBeUndefined();
    });
});
