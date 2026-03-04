/**
 * __mocks__/ffmpeg-client.js — Vitest Manual Mock for FFmpegWorkerClient
 *
 * Replaces the live WebWorker bridge so that tests that import conversion.js
 * or filters.js can run without a browser or the 20 MB WASM binary.
 *
 * Usage:
 *   vi.mock('../js/modules/ffmpeg-client.js', () => import('./__mocks__/ffmpeg-client.js'));
 */
import { vi } from 'vitest';

export const ffmpeg = {
    load: vi.fn().mockResolvedValue(undefined),
    isLoaded: vi.fn().mockReturnValue(true),
    run: vi.fn().mockResolvedValue(new Uint8Array(0)),
    FS: vi.fn().mockResolvedValue(new Uint8Array(0)),
    setProgress: vi.fn(),
    setLogger: vi.fn()
};

export const fetchFile = vi.fn().mockResolvedValue(new Uint8Array(0));

export class FFmpegWorkerClient {
    load = ffmpeg.load;
    isLoaded = ffmpeg.isLoaded;
    run = ffmpeg.run;
    FS = ffmpeg.FS;
    setProgress = ffmpeg.setProgress;
    setLogger = ffmpeg.setLogger;
}
