/**
 * app.js — Main Entry Point
 *
 * NOTE: <script type="module"> is always deferred by the browser.
 * The DOM is fully parsed before this module executes, so there is
 * no need for a DOMContentLoaded wrapper — calling initEvents() at
 * the module level is correct and avoids a race where the event fires
 * before the listener is registered.
 */
import { initEvents } from './modules/events.js';
import { ffmpeg } from './modules/ffmpeg-client.js';
import { showToast } from './modules/ui.js';

// D1 — SharedArrayBuffer / cross-origin isolation check
// ffmpeg.wasm (mt build) requires SharedArrayBuffer, which requires COOP+COEP headers.
// The coi-serviceworker.js provides these after the first page load.
if (!crossOriginIsolated) {
    console.warn('crossOriginIsolated is false — SharedArrayBuffer unavailable. FFmpeg will fail.');
    showToast('⚠️ Open via "npm run dev" (local server) for full FFmpeg support.');
}

// Init icons (lucide is loaded via defer script before this module)
if (typeof lucide !== 'undefined') lucide.createIcons();

// Attach all event listeners — DOM is ready because modules are deferred
initEvents();

// Lazy-load FFmpeg in the background after events are wired up
(async () => {
    try {
        if (!ffmpeg.isLoaded()) {
            await ffmpeg.load();
            showToast('Elite Processor Ready');
        }
    } catch (e) {
        console.error('FFmpeg Load Failed:', e);
        showToast('⚠️ FFmpeg Load Failed');
    }
})();
