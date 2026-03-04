/**
 * config.js — Application Constants & Paths
 */
const BASE_URL = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');

export const CONFIG = {
    FFMPEG_CORE_URL: `${BASE_URL}/js/vendor/ffmpeg-core.js`,
    FFMPEG_WASM_URL: `${BASE_URL}/js/vendor/ffmpeg-core.wasm`,
    FFMPEG_WORKER_URL: `${BASE_URL}/js/vendor/ffmpeg-core.worker.js`,
    FONT_BASE_URL: `${BASE_URL}/fonts/`
};

export { BASE_URL };
