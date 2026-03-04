/**
 * ui.js — Centralized DOM References & UI Helpers
 */
import { state } from './state.js';

export const dom = {
    // Mode / Upload
    modeSwitcher: document.querySelector('.mode-switcher'),
    videoUpload: document.getElementById('videoUpload'),
    imageUpload: document.getElementById('imageUpload'),

    // Media Players
    videoPlayer: document.getElementById('videoPlayer'),
    imagePlaceholder: document.getElementById('imagePlaceholder'),
    videoContainer: document.getElementById('videoContainer'),

    // Panels
    settingsPanel: document.getElementById('settingsPanel'),
    filtersPanel: document.getElementById('filtersPanel'),
    overlaysPanel: document.getElementById('overlaysPanel'),
    framesPanel: document.getElementById('framesPanel'),
    geometryPanel: document.getElementById('geometryPanel'),

    // Inputs (Settings)
    gifWidth: document.getElementById('gifWidth'),
    fps: document.getElementById('fps'),
    speed: document.getElementById('speed'),
    loopMode: document.getElementById('loopMode'),
    interpolation: document.getElementById('interpolation'),
    motionBlur: document.getElementById('motionBlur'),
    cropRatio: document.getElementById('cropRatio'),
    rotateAngle: document.getElementById('rotateAngle'),
    transparentBg: document.getElementById('transparentBg'),
    outputFormat: document.getElementById('outputFormat'),

    // Inputs (Overlays)
    overlayText: document.getElementById('overlayText'),
    fontStyle: document.getElementById('fontStyle'),
    textSize: document.getElementById('textSize'),
    textColor: document.getElementById('textColor'),
    borderColor: document.getElementById('borderColor'),
    textPos: document.getElementById('textPos'),
    lineSpacing: document.getElementById('lineSpacing'),
    wordSpacing: document.getElementById('wordSpacing'),
    textBox: document.getElementById('textBox'),
    boxPadding: document.getElementById('boxPadding'),
    boxOpacity: document.getElementById('boxOpacity'),

    // Inputs (Geometry)
    p_x0: document.getElementById('p_x0'),
    p_y0: document.getElementById('p_y0'),
    p_x1: document.getElementById('p_x1'),
    p_y1: document.getElementById('p_y1'),
    p_x2: document.getElementById('p_x2'),
    p_y2: document.getElementById('p_y2'),
    p_x3: document.getElementById('p_x3'),
    p_y3: document.getElementById('p_y3'),
    hFlip: document.getElementById('hFlip'),
    vFlip: document.getElementById('vFlip'),

    // Actions
    convertBtn: document.getElementById('convertBtn'),
    resetPerspectiveBtn: document.getElementById('resetPerspectiveBtn'),

    // Feedback
    toast: document.getElementById('toast'),
    progressFill: document.getElementById('progressFill'),
    progressStatus: document.getElementById('progressStatus'),
    progressContainer: document.getElementById('progressContainer'),

    // Time/Trim
    startRange: document.getElementById('startRange'),
    endRange: document.getElementById('endRange'),
    durationDisplay: document.getElementById('durationDisplay'),
    resultGif: document.getElementById('resultGif'),
    downloadBtn: document.getElementById('downloadBtn'),
    previewSection: document.getElementById('previewSection'),
    dithering: document.getElementById('dithering'),
    diffMode: document.getElementById('diffMode'),
    maxColors: document.getElementById('maxColors'),
    overlayScale: document.getElementById('overlayScale'),
    overlayRotation: document.getElementById('overlayRotation'),
    overlayPosX: document.getElementById('overlayPosX'),
    overlayPosY: document.getElementById('overlayPosY'),
    overlayBlend: document.getElementById('overlayBlend'),

    // Timeline
    timelineTrack: document.getElementById('timelineTrack'),
    scrubHandle: document.getElementById('scrubHandle'),

    // Cropper
    cropperOverlay: document.getElementById('cropperOverlay'),
    cropperBox: document.getElementById('cropperBox'),

    // Setting groups
    speedGroup: document.getElementById('speedGroup'),
    loopGroup: document.getElementById('loopGroup')
};

/**
 * Global Toast helper using the DOM ref.
 */
export function showToast(message) {
    if (!dom.toast) return;
    dom.toast.textContent = message;
    dom.toast.classList.add('active');
    setTimeout(() => {
        dom.toast.classList.remove('active');
    }, 3000);
}

// Make showToast available globally for vendor scripts if needed
window.showToast = showToast;

export function switchMode(mode) {
    state.currentMode = mode;

    document.querySelectorAll('.mode-switcher [role="tab"]').forEach((btn) => {
        const isActive = btn.dataset.mode === mode;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive.toString());
    });

    const videoUploadSection = document.getElementById('videoUploadSection');
    const imageUploadSection = document.getElementById('imageUploadSection');
    const loadingPlaceholder = document.getElementById('loadingPlaceholder');
    const actionSection = document.getElementById('actionSection');

    if (mode === 'video') {
        if (videoUploadSection) videoUploadSection.style.display = 'block';
        if (imageUploadSection) imageUploadSection.style.display = 'none';
        const trimControls = document.getElementById('trimControls');
        if (trimControls) trimControls.style.display = 'block';
        if (dom.speedGroup) dom.speedGroup.style.display = 'block';
        if (dom.loopGroup) dom.loopGroup.style.display = 'block';
        const delayGroup = document.getElementById('delayGroup');
        if (delayGroup) delayGroup.style.display = 'none';

        if (state.currentVideoFile) {
            if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';
            if (dom.videoPlayer) dom.videoPlayer.style.display = 'block';
            if (dom.imagePlaceholder) dom.imagePlaceholder.style.display = 'none';
            if (actionSection) actionSection.style.display = 'block';
        } else {
            if (loadingPlaceholder) loadingPlaceholder.style.display = 'flex';
            if (dom.videoPlayer) dom.videoPlayer.style.display = 'none';
            if (dom.imagePlaceholder) dom.imagePlaceholder.style.display = 'none';
            if (actionSection) actionSection.style.display = 'none';
        }
    } else {
        if (videoUploadSection) videoUploadSection.style.display = 'none';
        if (imageUploadSection) imageUploadSection.style.display = 'block';
        const trimControls = document.getElementById('trimControls');
        if (trimControls) trimControls.style.display = 'none';
        if (dom.speedGroup) dom.speedGroup.style.display = 'none';
        if (dom.loopGroup) dom.loopGroup.style.display = 'none';
        const delayGroup = document.getElementById('delayGroup');
        if (delayGroup) delayGroup.style.display = 'block';

        if (state.slideshowImages.length > 0) {
            if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';
            if (dom.videoPlayer) dom.videoPlayer.style.display = 'none';
            if (dom.imagePlaceholder) dom.imagePlaceholder.style.display = 'block';
            if (actionSection) actionSection.style.display = 'block';
            if (dom.imagePlaceholder && !dom.imagePlaceholder.src) {
                dom.imagePlaceholder.src = state.slideshowImages[0];
            }
        } else {
            if (loadingPlaceholder) loadingPlaceholder.style.display = 'flex';
            if (dom.imagePlaceholder) dom.imagePlaceholder.style.display = 'none';
            if (actionSection) actionSection.style.display = 'none';
        }
    }
    closePreview();
}

export function switchTab(panelId, clickedBtn) {
    document.querySelectorAll('.advanced-panel').forEach((p) => p.classList.remove('active'));
    document.querySelectorAll('.feature-tabs [role="tab"]').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
    });

    const target = document.getElementById(panelId);
    if (target) target.classList.add('active');

    if (clickedBtn) {
        clickedBtn.classList.add('active');
        clickedBtn.setAttribute('aria-selected', 'true');
    } else {
        const btn = document.querySelector(`.feature-tabs [aria-controls="${panelId}"]`);
        if (btn) {
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
        }
    }
}

export function handleTabListKeydown(e) {
    const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]'));
    const index = tabs.indexOf(e.target);
    if (index === -1) return;

    let nextIndex;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
        nextIndex = 0;
    } else if (e.key === 'End') {
        nextIndex = tabs.length - 1;
    } else {
        return;
    }

    e.preventDefault();
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
}

export function closePreview() {
    dom.previewSection?.classList.remove('active');
}
