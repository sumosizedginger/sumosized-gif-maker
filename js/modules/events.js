/**
 * events.js — Event Orchestration
 *
 * Click handlers use document-level delegation rather than per-element
 * addEventListener calls. Delegation is immune to DOM-timing races:
 * document always exists and click events always bubble up to it.
 */
import { dom, switchMode, switchTab, handleTabListKeydown } from './ui.js';
import {
    handleVideoUpload,
    handleImageUpload,
    handleImageOverlayUpload,
    clearImageOverlay,
    loadFromUrl,
    handleGlobalDrop,
    clearCurrentMedia
} from './upload.js';
import { startConversion } from './conversion.js';
import { addToFilterStack, clearFilterStack, handlePresetSlot, initPresetUI } from './filter-stack.js';
import { resetPerspective } from './filters.js';
import { toggleCropper, handleCropperMouseDown, handleCropperMouseMove, handleCropperMouseUp } from './cropper.js';
import { exportProject, importProject } from './project.js';
import { updatePredictor, updateRange } from './predictor.js';
import { extractFrames, resetFrameDelays } from './frames.js';
import { handleTimelineScrub, updateTimelineUI } from './timeline.js';
import { state } from './state.js';

export function initEvents() {
    // ── Delegated click handler ──────────────────────────────────────────────
    // One listener on document handles all button clicks via bubbling.
    // This is guaranteed to work regardless of when specific elements exist.
    document.addEventListener('click', (e) => {
        const t = e.target;

        // Primary actions
        if (t.closest('#convertBtn')) {
            startConversion();
            return;
        }
        if (t.closest('#extractFramesBtn')) {
            extractFrames();
            return;
        }
        if (t.closest('#resetFrameDelaysBtn')) {
            resetFrameDelays();
            return;
        }
        if (t.closest('#clearStackBtn')) {
            clearFilterStack();
            return;
        }
        if (t.closest('#exportProjectBtn')) {
            exportProject();
            return;
        }
        if (t.closest('#clearImageOverlayBtn')) {
            clearImageOverlay();
            return;
        }
        if (t.closest('#resetPerspectiveBtn')) {
            resetPerspective();
            return;
        }
        if (t.closest('#newVideoBtn')) {
            clearCurrentMedia();
            return;
        }

        // Preset slots — shift+click to override-save, regular click to load-or-save
        const presetBtn = t.closest('.preset-btn[data-slot]');
        if (presetBtn) {
            handlePresetSlot(presetBtn.dataset.slot, e.shiftKey);
            return;
        }

        // Import project — triggers hidden file input
        if (t.closest('#importProjectBtn')) {
            document.getElementById('projectImportFile')?.click();
            return;
        }

        // URL imports
        if (t.closest('#imageUrlBtn')) {
            const url = document.getElementById('imageUrlInput')?.value?.trim();
            if (url) loadFromUrl(url, 'image');
            return;
        }
        if (t.closest('#videoUrlBtn')) {
            const url = document.getElementById('videoUrlInput')?.value?.trim();
            if (url) loadFromUrl(url, 'video');
            return;
        }

        // Filter cards
        const filterCard = t.closest('.filter-card[data-filter]');
        if (filterCard) {
            addToFilterStack(filterCard.dataset.filter);
            return;
        }

        // Mode switcher tabs
        const modeBtn = t.closest('.mode-switcher [data-mode]');
        if (modeBtn) {
            switchMode(modeBtn.dataset.mode);
            return;
        }

        // Feature tabs
        const featureTab = t.closest('.feature-tabs [role="tab"]');
        if (featureTab) {
            switchTab(featureTab.getAttribute('aria-controls'), featureTab);
            return;
        }
    });

    // ── Keyboard navigation (tablist) ────────────────────────────────────────
    dom.modeSwitcher?.addEventListener('keydown', handleTabListKeydown);
    const featureTabs = document.querySelector('.feature-tabs[role="tablist"]');
    featureTabs?.addEventListener('keydown', handleTabListKeydown);

    // ── File inputs (change events — cannot delegate reliably) ───────────────
    dom.videoUpload?.addEventListener('change', handleVideoUpload);
    dom.imageUpload?.addEventListener('change', handleImageUpload);
    document.getElementById('imageOverlayUpload')?.addEventListener('change', handleImageOverlayUpload);
    document.getElementById('projectImportFile')?.addEventListener('change', importProject);

    // ── Range sliders ────────────────────────────────────────────────────────
    dom.startRange?.addEventListener('input', updateRange);
    dom.endRange?.addEventListener('input', updateRange);

    // ── Crop ─────────────────────────────────────────────────────────────────
    dom.cropRatio?.addEventListener('change', (e) => toggleCropper(e.target.value));
    dom.videoContainer?.addEventListener('mousedown', handleCropperMouseDown);
    window.addEventListener('mousemove', handleCropperMouseMove);
    window.addEventListener('mouseup', handleCropperMouseUp);

    // ── Predictor inputs ─────────────────────────────────────────────────────
    const predictorInputs = [
        'gifWidth',
        'fps',
        'speed',
        'overlayText',
        'fontStyle',
        'textSize',
        'textColor',
        'borderColor',
        'textPos',
        'lineSpacing',
        'wordSpacing',
        'textBox',
        'boxPadding',
        'boxOpacity',
        'maxColors',
        'p_x0',
        'p_y0',
        'p_x1',
        'p_y1',
        'p_x2',
        'p_y2',
        'p_x3',
        'p_y3',
        'hFlip',
        'vFlip'
    ];
    predictorInputs.forEach((id) => {
        document.getElementById(id)?.addEventListener('input', updatePredictor);
        document.getElementById(id)?.addEventListener('change', updatePredictor);
    });

    // ── Timeline ─────────────────────────────────────────────────────────────
    dom.timelineTrack?.addEventListener('mousedown', (e) => {
        state.isScrubbing = true;
        handleTimelineScrub(e);
    });
    window.addEventListener('mousemove', (e) => {
        if (state.isScrubbing) handleTimelineScrub(e);
    });
    window.addEventListener('mouseup', () => {
        state.isScrubbing = false;
    });
    dom.videoPlayer?.addEventListener('timeupdate', updateTimelineUI);

    // ── Global Drag & Drop ───────────────────────────────────────────────────
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', handleGlobalDrop);

    // ── Initialise mode ───────────────────────────────────────────────────────
    switchMode('video');

    // ── Initialise preset slot indicators ────────────────────────────────────
    initPresetUI();
}
