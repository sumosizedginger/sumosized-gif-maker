/**
 * utils.js — Shared UI & Logic Helpers
 */

/**
 * Translates a raw FFmpeg/worker error into a user-friendly message.
 * @param {Error} error
 * @returns {string}
 */
export function classifyFfmpegError(error) {
    const msg = error?.message || '';
    if (msg.includes('SharedArrayBuffer') || msg.includes('crossOriginIsolated')) {
        return 'Cross-Origin Isolation required. Reopen from the local dev server.';
    }
    if (msg.includes('fetch') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        return 'Network error — FFmpeg core failed to load. Check your connection.';
    }
    if (msg.includes('OOM') || msg.includes('out of memory') || msg.includes('Cannot allocate')) {
        return 'Out of memory — try a shorter clip or lower resolution.';
    }
    if (msg.includes('No space') || msg.includes('ENOSPC')) {
        return 'Virtual filesystem full — reduce clip length and try again.';
    }
    if (msg.includes('codec not found') || msg.includes('encoder')) {
        return 'Codec not supported in this build. Try GIF or WebP instead.';
    }
    if (msg.includes('Invalid data') || msg.includes('moov atom')) {
        return 'Corrupt or unsupported video file. Re-encode and try again.';
    }
    return `Processing Error: ${msg || 'Unknown error'}`;
}

/**
 * Safely scrolls an element into view, guarding against hidden elements.
 * @param {Element|null} el
 */
export function scrollIntoViewSafe(el) {
    if (!el) return;
    try {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch {
        /* ignore scroll errors on hidden elements */
    }
}

/**
 * Helper to show temporary UI notifications.
 * Assumes a global showToast exists or will be moved to UI module.
 * For now, just logging or relying on the global.
 */
export function showToast(msg) {
    if (window.showToast) {
        window.showToast(msg);
    }
}

/**
 * Helper to format time in mm:ss.
 */
export function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Safely unlinks multiple files from FFmpeg FS without triggering worker errors.
 */
export async function safeUnlinkAll(ffmpeg, dir, files) {
    const getPath = (f) => (f.startsWith('/') ? f : dir.endsWith('/') ? `${dir}${f}` : `${dir}/${f}`);
    try {
        const existingFiles = await ffmpeg.FS('readdir', dir);
        for (const f of files) {
            // Strip leading slash for comparison with readdir output
            const fileName = f.startsWith('/') ? f.substring(1) : f;
            if (existingFiles.includes(fileName)) {
                try {
                    await ffmpeg.FS('unlink', getPath(f));
                } catch {
                    // ignore noise
                }
            }
        }
    } catch {
        // Fallback if readdir fails for some reason
        for (const f of files) {
            try {
                await ffmpeg.FS('unlink', getPath(f));
            } catch {
                // ignore noise
            }
        }
    }
}
