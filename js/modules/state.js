/**
 * state.js — Shared Application State
 */
export const state = {
    videoDuration: 0,
    isConverting: false,
    isFfmpegBusy: false,
    filterStack: [], // Array of filter IDs
    currentVideoFile: null,
    currentMode: 'video',
    slideshowImages: [],
    cropData: { active: false, x: 0, y: 0, w: 0, h: 0, ratio: 'off' },
    isDragging: false,
    isScrubbing: false,
    startX: 0,
    startY: 0,
    frameData: [], // { src: string, delay: number }[]
    _telemetryStartTime: 0,
    imageOverlayBuffer: null,
    imageOverlayName: ''
};

/**
 * Resets the conversion state to allow a new process.
 */
export function resetConversionState() {
    state.isConverting = false;
    const btn = document.getElementById('convertBtn');
    if (btn) {
        btn.disabled = false;
        btn.textContent = ' Elite Conversion';
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', 'zap');
        btn.prepend(icon);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}
