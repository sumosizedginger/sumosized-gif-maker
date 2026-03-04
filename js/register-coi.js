/**
 * register-coi.js — COI Service Worker Registration
 *
 * Must be loaded SYNCHRONOUSLY (no defer) so the service worker
 * is registered before any SharedArrayBuffer-dependent code runs.
 * Extracted from inline <script> to satisfy script-src 'self' CSP.
 */
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./coi-serviceworker.js').then(() => {
        if (!navigator.serviceWorker.controller) {
            window.location.reload();
        }
    });
}
