/**
 * SumoSized GIF Maker — main.js
 */

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const CONFIG = {
    FFMPEG_CORE_URL:
        window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '') + '/js/vendor/ffmpeg-core.js',
    FFMPEG_WASM_URL:
        window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '') + '/js/vendor/ffmpeg-core.wasm',
    FFMPEG_WORKER_URL:
        window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '') + '/js/vendor/ffmpeg-core.worker.js',
    FONT_BASE_URL: window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '') + '/fonts/'
};

// ─────────────────────────────────────────────
// FFMPEG INSTANCE
// ─────────────────────────────────────────────
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({
    log: false, // Set to true to debug FFmpeg output
    corePath: CONFIG.FFMPEG_CORE_URL,
    wasmPath: CONFIG.FFMPEG_WASM_URL,
    workerPath: CONFIG.FFMPEG_WORKER_URL
});

// ─────────────────────────────────────────────
// GLOBAL STATE
// ─────────────────────────────────────────────
let videoDuration = 0;
let isConverting = false;
let currentFilter = 'none';
let currentVideoFile = null;
let currentMode = 'video';
let slideshowImages = [];
let cropData = { active: false, x: 0, y: 0, w: 0, h: 0, ratio: 'off' };
let isDragging = false;
let startX, startY;
let frameData = []; // { src: string, delay: number }[]

const colorThief = new ColorThief();

// ─────────────────────────────────────────────
// FFMPEG INIT
// ─────────────────────────────────────────────
(async () => {
    try {
        if (!ffmpeg.isLoaded()) {
            await ffmpeg.load();
            showToast('Elite Processor Ready');
        }
    } catch (e) {
        console.error(e);
        showToast('System Error: Cross-Origin Isolation Required');
    }
})();

// ─────────────────────────────────────────────
// DOM READY — wire all event listeners
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Init Lucide icons
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Mode switcher tabs
    const modeSwitcher = document.querySelector('.mode-switcher[role="tablist"]');
    if (modeSwitcher) {
        modeSwitcher.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-mode]');
            if (btn) switchMode(btn.dataset.mode);
        });
        modeSwitcher.addEventListener('keydown', handleTabListKeydown);
    }

    // Feature tabs
    const featureTabs = document.querySelector('.feature-tabs[role="tablist"]');
    if (featureTabs) {
        featureTabs.addEventListener('click', (e) => {
            const btn = e.target.closest('[role="tab"]');
            if (btn && btn.getAttribute('aria-controls')) {
                switchTab(btn.getAttribute('aria-controls'), btn);
            }
        });
        featureTabs.addEventListener('keydown', handleTabListKeydown);
    }

    // Filter cards (now <button> elements with data-filter)
    document.getElementById('filterGrid')?.addEventListener('click', (e) => {
        const card = e.target.closest('.filter-card[data-filter]');
        if (card) setFilter(card.dataset.filter, card);
    });

    // File uploads
    document.getElementById('videoUpload')?.addEventListener('change', handleVideoUpload);
    document.getElementById('imageUpload')?.addEventListener('change', handleImageUpload);

    // Range sliders
    const startRange = document.getElementById('startRange');
    const endRange = document.getElementById('endRange');
    if (startRange) startRange.addEventListener('input', (e) => updateRange(e));
    if (endRange) endRange.addEventListener('input', (e) => updateRange(e));

    // Crop ratio
    document.getElementById('cropRatio')?.addEventListener('change', (e) => toggleCropper(e.target.value));

    // Predictor updates on input changes
    [
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
        'boxOpacity'
    ].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', updatePredictor);
        document.getElementById(id)?.addEventListener('change', updatePredictor);
    });
    // Explicitly add change listeners for text box styling elements
    document.getElementById('textBox')?.addEventListener('change', updatePredictor);
    document.getElementById('textColor')?.addEventListener('change', updatePredictor);
    document.getElementById('borderColor')?.addEventListener('change', updatePredictor);
    document.getElementById('boxPadding')?.addEventListener('input', updatePredictor);

    // Action buttons
    document.getElementById('convertBtn')?.addEventListener('click', startConversion);
    document.getElementById('newVideoBtn')?.addEventListener('click', resetVideo);
    document.getElementById('closePreviewBtn')?.addEventListener('click', closePreview);
    document.getElementById('extractFramesBtn')?.addEventListener('click', extractFrames);
    document.getElementById('resetFrameDelaysBtn')?.addEventListener('click', resetFrameDelays);
    document.getElementById('globalFrameDelay')?.addEventListener('change', applyGlobalFrameDelay);

    // URL import
    document.getElementById('videoUrlBtn')?.addEventListener('click', () => {
        const url = document.getElementById('videoUrlInput')?.value?.trim();
        if (url) loadFromUrl(url, 'video');
    });
    document.getElementById('imageUrlBtn')?.addEventListener('click', () => {
        const url = document.getElementById('imageUrlInput')?.value?.trim();
        if (url) loadFromUrl(url, 'image');
    });

    // Cropper drag
    const videoContainer = document.getElementById('videoContainer');
    if (videoContainer) {
        videoContainer.addEventListener('mousedown', (e) => {
            if (!cropData.active) return;
            isDragging = true;
            startX = e.offsetX;
            startY = e.offsetY;
            if (cropData.ratio === 'original') {
                cropData.x = startX;
                cropData.y = startY;
                cropData.w = 0;
                cropData.h = 0;
            }
        });
    }
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const videoContainer = document.getElementById('videoContainer');
        if (!videoContainer) return;
        const rect = videoContainer.getBoundingClientRect();
        let curX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        let curY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
        if (cropData.ratio === 'original') {
            cropData.w = Math.abs(curX - startX);
            cropData.h = Math.abs(curY - startY);
            cropData.x = Math.min(curX, startX);
            cropData.y = Math.min(curY, startY);
        } else {
            cropData.x = Math.max(0, Math.min(curX - cropData.w / 2, rect.width - cropData.w));
            cropData.y = Math.max(0, Math.min(curY - cropData.h / 2, rect.height - cropData.h));
        }
        updateCropperUI();
    });
    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Run initial predictor state
    updatePredictor();

    // Quick Emoji Select (Hardened) - REMOVED: Emoji overlay rendering logic
    document.getElementById('quickEmojiBar')?.addEventListener('mousedown', (e) => {
        const btn = e.target.closest('.emoji-btn');
        if (!btn) return;
        e.preventDefault(); // Prevent focus loss from input

        const input = document.getElementById('stickerEmoji');
        if (input) {
            const emoji = btn.dataset.emoji || btn.textContent.trim();
            const currentVal = input.value;
            // Append with space if not empty and not already ending in space
            const spacer = currentVal && !currentVal.endsWith(' ') ? ' ' : '';
            input.value = currentVal + spacer + emoji;

            // Trigger reactivity
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.focus();
        }
    });
});

// Also init icons after defer scripts load
window.addEventListener('load', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    updatePredictor();
});

// ─────────────────────────────────────────────
// KEYBOARD — WAI-ARIA TABS PATTERN
// ─────────────────────────────────────────────
function handleTabListKeydown(e) {
    const tabs = [...e.currentTarget.querySelectorAll('[role="tab"]')];
    const idx = tabs.indexOf(document.activeElement);
    if (idx === -1) return;
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        next = (idx + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        next = (idx - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
        next = 0;
    } else if (e.key === 'End') {
        next = tabs.length - 1;
    }

    if (next === -1) return;

    e.preventDefault();
    tabs[next].focus();
    tabs[next].click();
}

// ─────────────────────────────────────────────
// MODE SWITCHING
// ─────────────────────────────────────────────
function switchMode(mode) {
    currentMode = mode;

    document.querySelectorAll('.mode-switcher [role="tab"]').forEach((btn) => {
        const isActive = btn.dataset.mode === mode;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive.toString());
    });

    const loadingPlaceholder = document.getElementById('loadingPlaceholder');
    const videoPlayer = document.getElementById('videoPlayer');
    const imagePlaceholder = document.getElementById('imagePlaceholder');
    const actionSection = document.getElementById('actionSection');

    const videoUploadSection = document.getElementById('videoUploadSection');
    const imageUploadSection = document.getElementById('imageUploadSection');

    if (mode === 'video') {
        videoUploadSection.style.display = 'block';
        imageUploadSection.style.display = 'none';
        document.getElementById('trimControls').style.display = 'block';
        document.getElementById('speedGroup').style.display = 'block';
        document.getElementById('loopGroup').style.display = 'block';
        document.getElementById('delayGroup').style.display = 'none';

        if (currentVideoFile) {
            loadingPlaceholder.style.display = 'none';
            videoPlayer.style.display = 'block';
            imagePlaceholder.style.display = 'none';
            actionSection.style.display = 'block';
        } else {
            loadingPlaceholder.style.display = 'flex';
            videoPlayer.style.display = 'none';
            actionSection.style.display = 'none';
        }
    } else {
        videoUploadSection.style.display = 'none';
        imageUploadSection.style.display = 'block';
        document.getElementById('trimControls').style.display = 'none';
        document.getElementById('speedGroup').style.display = 'none';
        document.getElementById('loopGroup').style.display = 'none';
        document.getElementById('delayGroup').style.display = 'block';

        if (slideshowImages.length > 0) {
            loadingPlaceholder.style.display = 'none';
            videoPlayer.style.display = 'none';
            imagePlaceholder.style.display = 'block';
            actionSection.style.display = 'block';
            if (!imagePlaceholder.src) imagePlaceholder.src = slideshowImages[0];
        } else {
            loadingPlaceholder.style.display = 'flex';
            imagePlaceholder.style.display = 'none';
            actionSection.style.display = 'none';
        }
    }
    closePreview();
}

// ─────────────────────────────────────────────
// TAB SWITCHING
// ─────────────────────────────────────────────
function switchTab(panelId, clickedBtn) {
    // Deactivate all panels and tabs
    document.querySelectorAll('.advanced-panel').forEach((p) => p.classList.remove('active'));
    document.querySelectorAll('.feature-tabs [role="tab"]').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
    });

    // Activate target
    document.getElementById(panelId)?.classList.add('active');
    if (clickedBtn) {
        clickedBtn.classList.add('active');
        clickedBtn.setAttribute('aria-selected', 'true');
    } else {
        // Fallback: find the button by aria-controls
        const btn = document.querySelector(`.feature-tabs [aria-controls="${panelId}"]`);
        if (btn) {
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
        }
    }
}

// ─────────────────────────────────────────────
// FILTER SELECTION
// ─────────────────────────────────────────────
function setFilter(filter, el) {
    currentFilter = filter;
    document.querySelectorAll('.filter-card').forEach((c) => c.classList.remove('active'));
    if (el) el.classList.add('active');
    updatePredictor();
}

// ─────────────────────────────────────────────
// PREDICTOR
// ─────────────────────────────────────────────
function updatePredictor() {
    const widthInput = document.getElementById('gifWidth');
    const fpsInput = document.getElementById('fps');
    const overlayInput = document.getElementById('overlayText');
    const qualityEst = document.getElementById('qualityEst');

    if (!widthInput || !fpsInput || !overlayInput || !qualityEst) return;

    const width = parseInt(widthInput.value);
    const fps = parseInt(fpsInput.value);
    const hasOverlay = overlayInput.value.length > 0;

    let quality = 'High Def';
    if (width > 800) quality = 'Ultra HD';
    else if (width < 320) quality = 'Standard';

    if (fps > 25) quality += ' (Super Smooth)';
    if (hasOverlay) quality += ' + FX';

    qualityEst.textContent = quality;
}

// ─────────────────────────────────────────────
// RANGE SLIDER
// ─────────────────────────────────────────────
function updateRange(e) {
    const startRange = document.getElementById('startRange');
    const endRange = document.getElementById('endRange');
    const rangeSelected = document.getElementById('rangeSelected');
    const startTimeDisplay = document.getElementById('startTimeDisplay');
    const endTimeDisplay = document.getElementById('endTimeDisplay');
    const durationDisplay = document.getElementById('durationDisplay');

    if (!startRange || !endRange || !videoDuration) return;

    let start = parseFloat(startRange.value);
    let end = parseFloat(endRange.value);

    if (end - start < 0.5) {
        if (e && e.target === startRange) {
            start = Math.max(0, end - 0.5);
            startRange.value = start;
        } else {
            end = Math.min(videoDuration, start + 0.5);
            endRange.value = end;
        }
    }

    if (end - start > 10) {
        if (e && e.target === startRange) {
            end = start + 10;
            endRange.value = end;
        } else {
            start = end - 10;
            startRange.value = start;
        }
    }

    if (start > end) {
        [start, end] = [end, start];
    }

    const leftPercent = (start / videoDuration) * 100;
    const widthPercent = ((end - start) / videoDuration) * 100;

    if (rangeSelected) {
        rangeSelected.style.left = leftPercent + '%';
        rangeSelected.style.width = widthPercent + '%';
    }

    if (startTimeDisplay) startTimeDisplay.textContent = start.toFixed(1) + 's';
    if (endTimeDisplay) endTimeDisplay.textContent = end.toFixed(1) + 's';
    if (durationDisplay) durationDisplay.textContent = (end - start).toFixed(1) + 's';
}

// ─────────────────────────────────────────────
// VIBE SYNC
// ─────────────────────────────────────────────
async function syncVibe() {
    const videoPlayer = document.getElementById('videoPlayer');
    if (!videoPlayer || videoPlayer.paused) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoPlayer.videoWidth;
    canvas.height = videoPlayer.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);

    try {
        const color = colorThief.getColor(canvas);
        document.documentElement.style.setProperty('--vibe-color', `rgb(${color[0]},${color[1]},${color[2]})`);
        document.documentElement.style.setProperty('--glass-border', `rgba(${color[0]},${color[1]},${color[2]},0.3)`);
    } catch (e) {
        console.warn('Vibe sync failed:', e);
    }
}

// ─────────────────────────────────────────────
// VIDEO UPLOAD HANDLER
// ─────────────────────────────────────────────
function handleVideoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    loadVideoFile(file);
}

function loadVideoFile(file) {
    const videoPlayer = document.getElementById('videoPlayer');
    const loadingPlaceholder = document.getElementById('loadingPlaceholder');
    const startRangeEl = document.getElementById('startRange');
    const endRangeEl = document.getElementById('endRange');
    const actionSection = document.getElementById('actionSection');

    if (videoPlayer.src) URL.revokeObjectURL(videoPlayer.src);
    currentVideoFile = file;
    videoPlayer.src = URL.createObjectURL(file);

    document.getElementById('videoUploadSection').style.display = 'none';
    videoPlayer.style.display = 'block';
    if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';
    if (actionSection) actionSection.style.display = 'block';

    // Enable frame extraction
    document.getElementById('extractFramesBtn')?.removeAttribute('disabled');

    videoPlayer.onloadedmetadata = function () {
        videoDuration = videoPlayer.duration;
        setTimeout(syncVibe, 500);

        const infoEl = document.getElementById('videoInfo');
        infoEl.textContent = '';
        const spans = [
            `📹 ${file.name}`,
            `⏱️ ${formatTime(videoDuration)}`,
            `📐 ${Math.round(videoPlayer.videoWidth)}x${Math.round(videoPlayer.videoHeight)}`
        ];
        spans.forEach((text) => {
            const span = document.createElement('span');
            span.textContent = text;
            infoEl.appendChild(span);
        });

        if (startRangeEl) {
            startRangeEl.max = videoDuration;
            startRangeEl.value = 0;
        }
        if (endRangeEl) {
            endRangeEl.max = videoDuration;
            const GIF_MAX = Math.min(10, videoDuration);
            endRangeEl.value = GIF_MAX;
            const label = document.getElementById('sliderMaxLabel');
            if (label) label.textContent = `max ${GIF_MAX.toFixed(1)}s (video: ${videoDuration.toFixed(1)}s)`;
        }

        updateRange(null);
        updatePredictor();
        showToast('Video Loaded! Trim & Sync Vibe.');
    };
}

// ─────────────────────────────────────────────
// IMAGE SLIDESHOW UPLOAD
// ─────────────────────────────────────────────
async function handleImageUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    slideshowImages = [];
    const grid = document.getElementById('slideshowGrid');
    grid.innerHTML = '';

    for (const file of files) {
        const url = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsDataURL(file);
        });
        slideshowImages.push(url);

        const div = document.createElement('div');
        div.className = 'img-preview';
        div.innerHTML = `<img src="${url}" alt="Slideshow frame">`;
        grid.appendChild(div);
    }

    if (slideshowImages.length > 0) {
        document.getElementById('videoUploadSection').style.display = 'none';
        document.getElementById('imageUploadSection').style.display = 'none';
        document.getElementById('videoSection').classList.add('active');
        document.getElementById('videoSection').style.display = 'block';
        document.getElementById('controlsPanel').style.display = 'block';
        document.getElementById('actionSection').style.display = 'block';

        const videoPlayer = document.getElementById('videoPlayer');
        const imagePlaceholder = document.getElementById('imagePlaceholder');
        videoPlayer.style.display = 'none';
        imagePlaceholder.style.display = 'block';
        imagePlaceholder.src = slideshowImages[0];

        showToast(`Loaded ${slideshowImages.length} images. Sync Vibe & Start FX!`);
        updatePredictor();
    }
}

// ─────────────────────────────────────────────
// FEATURE 1 — URL IMPORT
// ─────────────────────────────────────────────
async function loadFromUrl(url, type) {
    if (!url) return;

    try {
        new URL(url); // Validate format
    } catch {
        showToast('Invalid URL — please check the format.');
        return;
    }

    const btn = type === 'video' ? document.getElementById('videoUrlBtn') : document.getElementById('imageUrlBtn');
    const helpEl = document.getElementById('videoUrlHelp');

    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Loading...';
    }

    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob = await response.blob();
        const filename = url.split('/').pop().split('?')[0] || `import.${type === 'video' ? 'mp4' : 'jpg'}`;
        const file = new File([blob], filename, { type: blob.type });

        if (type === 'video') {
            loadVideoFile(file);
        } else {
            // Treat as single image added to slideshow
            slideshowImages.push(URL.createObjectURL(blob));
            const grid = document.getElementById('slideshowGrid');
            const div = document.createElement('div');
            div.className = 'img-preview';
            div.innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="Imported image">`;
            grid.appendChild(div);
            showToast('Image imported from URL!');
        }
    } catch (err) {
        let message = 'CORS blocked — direct access denied.';
        if (helpEl) helpEl.open = true;
        showToast(message);
        console.warn('URL import failed:', err);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Load URL';
        }
    }
}

// ─────────────────────────────────────────────
// CROPPER
// ─────────────────────────────────────────────
function toggleCropper(ratio) {
    const videoPlayer = document.getElementById('videoPlayer');
    const imagePlaceholder = document.getElementById('imagePlaceholder');
    const targetEl = currentMode === 'video' ? videoPlayer : imagePlaceholder;
    const overlay = document.getElementById('cropperOverlay');
    if (!targetEl || !overlay) return;

    if (ratio === 'off') {
        overlay.classList.remove('active');
        cropData.active = false;
        return;
    }

    overlay.classList.add('active');
    cropData.active = true;
    cropData.ratio = ratio;

    const rect = targetEl.getBoundingClientRect();
    let w = rect.width * 0.5;
    let h = rect.height * 0.5;

    if (ratio !== 'original') {
        const [rW, rH] = ratio.split(':').map(Number);
        const targetRatio = rW / rH;
        if (w / h > targetRatio) {
            w = h * targetRatio;
        } else {
            h = w / targetRatio;
        }
        if (w > rect.width * 0.9) {
            w = rect.width * 0.9;
            h = w / targetRatio;
        }
        if (h > rect.height * 0.9) {
            h = rect.height * 0.9;
            w = h * targetRatio;
        }
    }

    cropData.w = w;
    cropData.h = h;
    cropData.x = (rect.width - w) / 2;
    cropData.y = (rect.height - h) / 2;

    updateCropperUI();
}

function updateCropperUI() {
    const box = document.getElementById('cropperBox');
    if (!box) return;
    box.style.left = cropData.x + 'px';
    box.style.top = cropData.y + 'px';
    box.style.width = cropData.w + 'px';
    box.style.height = cropData.h + 'px';
}

// ─────────────────────────────────────────────
// FEATURE 3 — FRAME EXTRACTION
// ─────────────────────────────────────────────
async function extractFrames() {
    if (!currentVideoFile || !ffmpeg.isLoaded()) {
        showToast('Load a video first.');
        return;
    }

    const startRange = document.getElementById('startRange');
    const durationDisplay = document.getElementById('durationDisplay');
    const fps = parseInt(document.getElementById('fps')?.value) || 15;
    const start = parseFloat(startRange?.value) || 0;
    const duration = parseFloat(durationDisplay?.textContent) || 2;

    const totalFrames = Math.ceil(duration * fps);
    if (totalFrames > 300) {
        showToast(`⚠️ ${totalFrames} frames — capped at 300. Shorten clip or reduce FPS.`);
    }
    const cappedDuration = Math.min(duration, 300 / fps);

    showToast('Extracting frames...');
    document.getElementById('frameStatus').textContent = 'Extracting...';

    try {
        ffmpeg.FS('writeFile', 'input_frames.mp4', await fetchFile(currentVideoFile));

        await ffmpeg.run(
            '-ss',
            start.toString(),
            '-t',
            cappedDuration.toString(),
            '-i',
            '/input_frames.mp4',
            '-vf',
            `scale=160:-2,fps=${fps}`,
            '/frame%04d.png'
        );

        // Read back all extracted frames
        frameData = [];
        let i = 1;
        while (true) {
            const name = `/frame${i.toString().padStart(4, '0')}.png`;
            try {
                const data = ffmpeg.FS('readFile', name);
                const blob = new Blob([data.buffer], { type: 'image/png' });
                frameData.push({ src: URL.createObjectURL(blob), delay: Math.round(1000 / fps) });
                ffmpeg.FS('unlink', name);
                i++;
            } catch {
                break; // No more frames
            }
        }

        ffmpeg.FS('unlink', '/input_frames.mp4');
        renderFrameStrip();

        const count = frameData.length;
        document.getElementById('frameStatus').textContent = `${count} frames at ${fps}fps`;
        showToast(`${count} frames extracted!`);
    } catch (err) {
        console.error('Frame extraction error:', err);
        showToast('Frame extraction failed.');
        document.getElementById('frameStatus').textContent = 'Extraction failed';
    }
}

function renderFrameStrip() {
    const strip = document.getElementById('frameStrip');
    const emptyState = document.getElementById('frameEmptyState');
    if (!strip) return;

    strip.innerHTML = '';
    if (emptyState) emptyState.remove();

    frameData.forEach((frame, idx) => {
        const card = document.createElement('div');
        card.className = 'frame-card';
        card.innerHTML = `
            <img class="frame-thumb" src="${frame.src}" alt="Frame ${idx + 1}">
            <input type="number" class="frame-delay-input" value="${frame.delay}" min="10" step="10"
                data-frame-idx="${idx}" aria-label="Frame ${idx + 1} delay in ms">
            <span class="frame-delay-label">ms</span>
        `;
        strip.appendChild(card);
    });

    // Live sync delay changes back to frameData
    strip.querySelectorAll('.frame-delay-input').forEach((input) => {
        input.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.frameIdx);
            frameData[idx].delay = Math.max(10, parseInt(e.target.value) || 66);
        });
    });
}

function resetFrameDelays() {
    const globalDelay = parseInt(document.getElementById('globalFrameDelay')?.value) || 66;
    frameData.forEach((f) => (f.delay = globalDelay));
    document.querySelectorAll('.frame-delay-input').forEach((input) => {
        input.value = globalDelay;
    });
}

function applyGlobalFrameDelay() {
    const delay = parseInt(document.getElementById('globalFrameDelay')?.value) || 66;
    frameData.forEach((f) => (f.delay = delay));
    document.querySelectorAll('.frame-delay-input').forEach((input) => {
        input.value = delay;
    });
}

// ─────────────────────────────────────────────
// FILTER CHAIN BUILDER
// ─────────────────────────────────────────────
/**
 * Builds the array of FFmpeg filter strings based on user settings.
 * @async
 * @param {number} resWidth - Target width for the GIF.
 * @param {number} fps - Frames per second.
 * @param {number} speed - Playback speed multiplier.
 * @param {number} duration - Clip duration in seconds.
 * @param {string} overlayText - Caption text.
 * @param {string} fontName - Filename of the bundled font.
 * @param {number} textSize - Font size (ffmpeg units).
 * @param {string} textPos - Text position ('top', 'middle', 'bottom').
 * @returns {Promise<string[]>} Array of filter strings.
 */
async function buildBaseFilters(resWidth, currentFps, speed, duration, overlayText, fontStyle, textSize, textPos) {
    const baseFilters = [];
    const videoPlayer = document.getElementById('videoPlayer');
    const imagePlaceholder = document.getElementById('imagePlaceholder');
    const targetEl = currentMode === 'video' ? videoPlayer : imagePlaceholder;

    // A. Crop
    if (cropData.active && cropData.w > 0 && targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const realW = currentMode === 'video' ? videoPlayer.videoWidth : imagePlaceholder.naturalWidth;
        const realH = currentMode === 'video' ? videoPlayer.videoHeight : imagePlaceholder.naturalHeight;

        const elAspect = rect.width / rect.height;
        const vidAspect = realW / realH;
        let rendW, rendH, offsetX, offsetY;
        if (vidAspect > elAspect) {
            rendW = rect.width;
            rendH = rect.width / vidAspect;
            offsetX = 0;
            offsetY = (rect.height - rendH) / 2;
        } else {
            rendH = rect.height;
            rendW = rect.height * vidAspect;
            offsetX = (rect.width - rendW) / 2;
            offsetY = 0;
        }
        const scaleX = realW / rendW;
        const scaleY = realH / rendH;
        const cX = Math.round(Math.max(0, cropData.x - offsetX) * scaleX);
        const cY = Math.round(Math.max(0, cropData.y - offsetY) * scaleY);
        const cW = Math.min(Math.round(cropData.w * scaleX), realW - cX);
        const cH = Math.min(Math.round(cropData.h * scaleY), realH - cY);
        if (cW > 0 && cH > 0) baseFilters.push(`crop=${cW}:${cH}:${cX}:${cY}`);
    }

    // B. Speed
    if (speed !== 1 && currentMode === 'video') baseFilters.push(`setpts=${1 / speed}*PTS`);

    // B2. Rotate
    const rotateAngle = parseInt(document.getElementById('rotateAngle')?.value) || 0;
    if (rotateAngle === 90) baseFilters.push('transpose=1');
    if (rotateAngle === 180) baseFilters.push('hflip,vflip');
    if (rotateAngle === 270) baseFilters.push('transpose=2');

    // C. Visual Filter (Moved up - acts as "Floor")
    const filterMap = {
        grayscale: 'hue=s=0',
        sepia: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
        vibrant: 'eq=saturation=1.5:contrast=1.1',
        '8bit': 'scale=iw/4:-2,scale=iw*4:-2:flags=neighbor',
        dreamy: 'eq=contrast=0.8:brightness=0.05:saturation=0.7',
        golden: "curves=red='0/0 0.5/0.6 1/1':green='0/0 0.5/0.45 1/0.9':blue='0/0 0.5/0.3 1/0.7'",
        gladiator: 'eq=contrast=1.5:saturation=0.5:brightness=-0.05,colorchannelmixer=1.1:0:0:0:0:0.9:0:0:0:0:0.7:0',
        nightvision:
            'colorchannelmixer=0:0:0:0:0.5:0.5:0:0:0:0:0:0,eq=brightness=0.1:saturation=2,noise=alls=15:allf=t+u',
        sulphur: "curves=red='0/0 0.5/0.8 1/1':green='0/0 0.5/0.7 1/0.9':blue='0/0 0.5/0.1 1/0.2'",
        coldblue: "curves=red='0/0 0.5/0.3 1/0.7':green='0/0 0.5/0.5 1/0.8':blue='0/0 0.5/0.7 1/1'",
        vignette: 'vignette=PI/4',
        mirror: 'hflip',
        grain: 'noise=alls=20:allf=t+u',
        invert: 'negate',
        vhs: 'hue=s=0.5,noise=alls=10:allf=t+u,boxblur=lx=1:ly=1',
        psychedelic: "hue=h='t*50',eq=saturation=2",
        thermal: "curves=r='0/0 0.1/1 1/1':g='0/1 0.5/0 1/1':b='0/0.5 1/0'",
        glitch: "noise=alls=20:allf=t+u,hue=h='t*10':s=1.2,boxblur=2:1",
        cyberpunk: "eq=contrast=1.8:saturation=1.5,curves=r='0/0 0.5/1 1/1':g='0/0 0.5/0 1/0.5':b='0/0 0.5/1 1/1'",
        chrome: "format=gray,curves=all='0/0 0.25/0.5 0.5/1 0.75/0.5 1/0',eq=contrast=1.5",
        blueprint: 'negate,hue=h=240:s=1,eq=contrast=1.2',
        matrix: 'format=gray,colorlevels=rimin=0.05:gimin=0.05:bimin=0.05:rimax=0.1:gimax=0.9:bimax=0.1,eq=contrast=1.5,hue=h=120:s=1',
        oldmovie: "format=gray,noise=alls=20:allf=t+u,curves=all='0/0 0.5/0.4 1/1'",
        mirrormode: 'hflip',
        comic: 'edgedetect=low=0.1:high=0.2,negate,eq=contrast=1.5:saturation=2,format=gray,colorlevels=rimax=0.8:gimax=0.8:bimax=0.8',
        acid: "hue=h='t*180':s=2,curves=all='0/0 0.5/1 1/0'",
        sketch: 'edgedetect=low=0.1:high=0.2,negate,format=gray,noise=alls=5:allf=t+u',
        infrared: "curves=r='0/1 0.5/0 1/0':g='0/0 0.5/1 1/0':b='0/0.5 1/0'",
        seahawks: "format=gray,curves=r='0/0 1/0.3':g='0/0.1 1/1':b='0/0 1/0'",
        technicolor: 'colorchannelmixer=1.1:0:0:0:0:1.3:0:0:0:0:1.1:0',
        golden2: "curves=all='0/0 0.5/0.6 1/1',colorchannelmixer=1.2:0:0:0:0:1:0:0:0:0:0.8:0",
        posterize: 'posterize=bits=3'
    };
    if (filterMap[currentFilter]) baseFilters.push(filterMap[currentFilter]);
    // C2. Transparent BG Removal (colorkey filter)
    const transparentBg = document.getElementById('transparentBg')?.value || 'off';
    const colorKeyMap = {
        white: 'colorkey=color=0xffffff:similarity=0.3:blend=0.1',
        black: 'colorkey=color=0x000000:similarity=0.3:blend=0.1',
        green: 'colorkey=color=0x00ff00:similarity=0.4:blend=0.1'
    };
    if (colorKeyMap[transparentBg]) baseFilters.push(colorKeyMap[transparentBg]);

    // D. Scale + FPS ONLY (No format conversion here yet)
    baseFilters.push(`scale=${resWidth}:-2:flags=lanczos`);
    baseFilters.push(`fps=${currentFps}`);

    // E. Text Overlay
    if (overlayText) {
        const yPosMap = { top: '20', middle: '(h-text_h)/2', bottom: '(h-text_h-20)' };
        const yPos = yPosMap[textPos] || '(h-text_h-20)';
        const wordSpacing = parseInt(document.getElementById('wordSpacing')?.value) || 0;
        const fontName = fontStyle.split('.')[0];
        const wrapped = wrapText(overlayText.trim(), resWidth * 0.8, textSize, fontName, wordSpacing);
        ffmpeg.FS('writeFile', 'overlay_text.txt', new TextEncoder().encode(wrapped));

        const lineSpacing = parseInt(document.getElementById('lineSpacing')?.value) || 10;
        const useBox = document.getElementById('textBox')?.value === '1' ? 1 : 0;
        const boxPadding = parseInt(document.getElementById('boxPadding')?.value) || 10;
        const boxOpacity = document.getElementById('boxOpacity')?.value || '0.5';

        let textColor = document.getElementById('textColor')?.value || '#4DFF00';
        let borderColor = document.getElementById('borderColor')?.value || 'black';
        let borderW = borderColor === 'none' ? 0 : 1;
        let actualBorderColor = borderColor === 'none' ? 'black' : borderColor;

        // Keep the simple 0x conversion, no escaping needed now that color space is correct
        if (textColor.startsWith('#')) textColor = textColor.replace('#', '0x');
        if (actualBorderColor.startsWith('#')) actualBorderColor = actualBorderColor.replace('#', '0x');

        // Filters like chrome/sketch/matrix/oldmovie convert to format=gray earlier in the chain.
        // drawtext cannot render colored text on a grayscale pixel format — confirmed FFmpeg behavior.
        // Restoring rgb24 here guarantees fontcolor renders correctly regardless of prior filter.
        baseFilters.push('format=rgb24');
        baseFilters.push(
            `drawtext=fontfile=/${fontStyle}:textfile=/overlay_text.txt:fontsize=${textSize}:fontcolor=${textColor}:borderw=${borderW}:bordercolor=${actualBorderColor}:shadowcolor=black@0.4:shadowx=2:shadowy=2:line_spacing=${lineSpacing}:box=${useBox}:boxcolor=black@${boxOpacity}:boxborderw=${boxPadding}:x=(w-text_w)/2:y=${yPos}`
        );
    }

    // Convert to YUV *after* drawing the text, right before palettegen
    baseFilters.push('format=yuv420p');

    // Progress bar removed from simple filters; now handled via complex overlay in startConversion.

    return baseFilters;
}

// ─────────────────────────────────────────────
// TEXT WRAP
// ─────────────────────────────────────────────
function wrapText(text, maxWidth, fontSize, fontName, wordSpacing = 0) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontSize}px "${fontName}", Arial`;
    const spaceWidth = ctx.measureText(' ').width;
    const extraSpacingPx = wordSpacing * spaceWidth;
    const words = text.split(' ');
    let lines = [],
        currentLine = [];

    words.forEach((word) => {
        const testLine = [...currentLine, word];
        const totalWidth =
            ctx.measureText(testLine.join(' ')).width + Math.max(0, testLine.length - 1) * extraSpacingPx;
        if (totalWidth > maxWidth && currentLine.length > 0) {
            lines.push(currentLine.join(' '));
            currentLine = [word];
        } else {
            currentLine = testLine;
        }
    });
    if (currentLine.length > 0) lines.push(currentLine.join(' '));

    const spacingStr = ' '.repeat(wordSpacing + 1);
    return lines.map((l) => l.split(' ').join(spacingStr)).join('\n');
}

// ─────────────────────────────────────────────
// FEATURE 2 — CONVERSION (GIF / MP4 / WebM)
// ─────────────────────────────────────────────
/**
 * The main entry point for GIF generation. Orchestrates frame extraction,
 * filter application, and palette generation.
 * @async
 */
async function startConversion() {
    if (isConverting) return;
    // FIX: Set immediately to prevent double-click race
    isConverting = true;

    if (!ffmpeg.isLoaded()) {
        showToast('Processor Loading...');
        await ffmpeg.load();
    }

    const startRangeEl = document.getElementById('startRange');
    const durationDisplay = document.getElementById('durationDisplay');
    const gifWidthInput = document.getElementById('gifWidth');
    const fpsInput = document.getElementById('fps');
    const speedSelect = document.getElementById('speed');
    const loopModeSelect = document.getElementById('loopMode');
    const overlayTextInput = document.getElementById('overlayText');
    const textSizeInput = document.getElementById('textSize');
    const textPosSelect = document.getElementById('textPos');
    const convertBtn = document.getElementById('convertBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressStatus = document.getElementById('progressStatus');
    const progressFill = document.getElementById('progressFill');
    const progressBar = document.querySelector('.progress-bar[role="progressbar"]');

    if (!startRangeEl || !durationDisplay || !convertBtn || !progressContainer) {
        showToast('Page not ready — please reload.');
        isConverting = false;
        return;
    }

    const start = parseFloat(startRangeEl.value);
    const duration = parseFloat(durationDisplay.textContent);
    const resWidth = parseInt(gifWidthInput.value) || 480;
    const fps = parseInt(fpsInput.value) || 15;
    const speed = parseFloat(speedSelect.value) || 1;
    const loopMode = loopModeSelect?.value || 'normal';
    const overlayText = overlayTextInput?.value || '';
    const textSize = parseInt(textSizeInput?.value) || 32;
    const textPos = textPosSelect?.value || 'bottom';
    const fontStyle = document.getElementById('fontStyle')?.value || 'Arimo-Regular.ttf';

    convertBtn.disabled = true;
    convertBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Processing...';
    if (typeof lucide !== 'undefined') lucide.createIcons();

    progressContainer.classList.add('active');
    if (progressFill) progressFill.style.width = '0%';
    if (progressBar) progressBar.setAttribute('aria-valuenow', '0');

    try {
        // Load font if overlay
        if (overlayText) {
            const fontMap = {
                'Arimo-Regular.ttf': CONFIG.FONT_BASE_URL + 'Arimo-Regular.ttf',
                'LiberationSans-Regular.ttf': CONFIG.FONT_BASE_URL + 'LiberationSans-Regular.ttf',
                'Roboto-Regular.ttf': CONFIG.FONT_BASE_URL + 'Roboto-Regular.ttf',
                'Anton-Regular.ttf': CONFIG.FONT_BASE_URL + 'Anton-Regular.ttf',
                'Orbitron.ttf': CONFIG.FONT_BASE_URL + 'Orbitron-Regular.ttf',
                'PermanentMarker-Regular.ttf': CONFIG.FONT_BASE_URL + 'PermanentMarker-Regular.ttf',
                'Montserrat-Regular.ttf': CONFIG.FONT_BASE_URL + 'Montserrat-Regular.ttf'
            };
            const fontUrl = fontMap[fontStyle] || CONFIG.FONT_BASE_URL + 'Arimo-Regular.ttf';
            const fontName = fontStyle.split('.')[0];
            progressStatus.textContent = 'Loading Font...';

            if (!document.fonts.check(`${textSize}px "${fontName}"`)) {
                try {
                    const fontFace = new FontFace(fontName, `url(${fontUrl})`);
                    document.fonts.add(await fontFace.load());
                    await document.fonts.ready;
                } catch (e) {
                    console.warn('Browser font load failed:', e);
                }
            }
            ffmpeg.FS('writeFile', fontStyle, await fetchFile(fontUrl));
        }

        const baseFilters = buildBaseFilters(resWidth, fps, speed, duration, overlayText, fontStyle, textSize, textPos);
        const baseFilterStr = (await baseFilters).join(',');

        // ── GIF PRODUCTION ──
        if (frameData.length > 0 && currentMode === 'video') {
            progressStatus.textContent = 'Re-extracting full-res frames...';
            if (progressFill) progressFill.style.width = '10%';
            ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(currentVideoFile));

            await ffmpeg.run(
                '-ss',
                start.toString(),
                '-t',
                (duration / speed).toString(),
                '-i',
                '/input.mp4',
                '-vf',
                `scale=${resWidth}:-2,fps=${fps}`,
                '/fframe%04d.png'
            );

            // Build concat.txt with per-frame delays
            let concatContent = '';
            let frameIdx = 0;
            while (true) {
                const name = `/fframe${(frameIdx + 1).toString().padStart(4, '0')}.png`;
                try {
                    ffmpeg.FS('readFile', name);
                } catch {
                    break;
                }
                const delay = frameData[frameIdx] ? frameData[frameIdx].delay / 1000 : 1 / fps;
                concatContent += `file '${name}'\nduration ${delay.toFixed(4)}\n`;
                frameIdx++;
            }
            ffmpeg.FS('writeFile', '/concat.txt', new TextEncoder().encode(concatContent));

            progressStatus.textContent = 'Pass 1: Palette analysis...';
            if (progressFill) progressFill.style.width = '40%';
            if (progressBar) progressBar.setAttribute('aria-valuenow', '40');
            // Create and apply filters
            showToast('⚙️ Processing Advanced Filters...');
            const baseFiltersConfig = await buildBaseFilters(
                resWidth,
                fps,
                1,
                duration,
                overlayText,
                fontStyle,
                textSize,
                textPos
            );
            const baseFilterStr = baseFiltersConfig.join(',');

            // Standard linear chain
            const finalCommand = [
                '-f',
                'concat',
                '-safe',
                '0',
                '-i',
                '/concat.txt',
                '-vf',
                `${baseFilterStr},palettegen`,
                '-y',
                '/palette.png'
            ];

            await ffmpeg.run(...finalCommand);

            progressStatus.textContent = 'Pass 2: Encoding GIF...';
            if (progressFill) progressFill.style.width = '70%';
            if (progressBar) progressBar.setAttribute('aria-valuenow', '70');

            await ffmpeg.run(
                '-f',
                'concat',
                '-safe',
                '0',
                '-i',
                '/concat.txt',
                '-i',
                '/palette.png',
                '-filter_complex',
                `[0:v]${baseFilterStr}[vid];[vid][1:v]paletteuse`,
                '-f',
                'gif',
                '-y',
                '/output.gif'
            );

            await finalizeOutput('/output.gif', 'image/gif', progressFill, progressBar);
        } else {
            // Standard Video-to-GIF or Image Slideshow
            if (currentMode === 'video') {
                ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(currentVideoFile));

                progressStatus.textContent = 'Pass 1: Palette analysis...';
                if (progressFill) progressFill.style.width = '30%';
                if (progressBar) progressBar.setAttribute('aria-valuenow', '30');
                await ffmpeg.run(
                    '-fflags',
                    '+genpts',
                    '-ss',
                    start.toString(),
                    '-t',
                    (duration / speed).toString(),
                    '-i',
                    '/input.mp4',
                    '-vf',
                    `${baseFilterStr},palettegen`,
                    '-y',
                    '/palette.png'
                );

                progressStatus.textContent = 'Pass 2: Encoding GIF...';
                if (progressFill) progressFill.style.width = '65%';
                if (progressBar) progressBar.setAttribute('aria-valuenow', '65');
                let complexFilter = `[0:v]${baseFilterStr}`;
                if (loopMode === 'reverse') complexFilter += `,reverse[vid];[vid][1:v]paletteuse`;
                else if (loopMode === 'boomerang')
                    complexFilter += `,split[f][b];[b]reverse[r];[f][r]concat=n=2:v=1:a=0[vid];[vid][1:v]paletteuse`;
                else complexFilter += `[vid];[vid][1:v]paletteuse`;

                await ffmpeg.run(
                    '-fflags',
                    '+genpts',
                    '-ss',
                    start.toString(),
                    '-t',
                    (duration / speed).toString(),
                    '-i',
                    '/input.mp4',
                    '-i',
                    '/palette.png',
                    '-filter_complex',
                    complexFilter,
                    '-f',
                    'gif',
                    '-y',
                    '/output.gif'
                );
                await finalizeOutput('/output.gif', 'image/gif', progressFill, progressBar);
            } else {
                // Image slideshow GIF
                progressStatus.textContent = 'Preparing images...';
                for (let i = 0; i < slideshowImages.length; i++) {
                    const binary = await fetch(slideshowImages[i]).then((r) => r.arrayBuffer());
                    ffmpeg.FS('writeFile', `/img${(i + 1).toString().padStart(3, '0')}.jpg`, new Uint8Array(binary));
                }
                const frameDelay = parseInt(document.getElementById('frameDelay')?.value) || 200;
                const framerate = 1000 / frameDelay;
                if (progressFill) progressFill.style.width = '30%';
                await ffmpeg.run(
                    '-framerate',
                    framerate.toString(),
                    '-i',
                    '/img%03d.jpg',
                    '-vf',
                    `${baseFilterStr},palettegen`,
                    '-y',
                    '/palette.png'
                );
                if (progressFill) progressFill.style.width = '65%';
                await ffmpeg.run(
                    '-framerate',
                    framerate.toString(),
                    '-i',
                    '/img%03d.jpg',
                    '-i',
                    '/palette.png',
                    '-filter_complex',
                    `[0:v]${baseFilterStr}[vid];[vid][1:v]paletteuse`,
                    '-f',
                    'gif',
                    '-y',
                    '/output.gif'
                );
                await finalizeOutput('/output.gif', 'image/gif', progressFill, progressBar);
            }
        }

        // Cleanup FS
        try {
            ['input.mp4', 'palette.png', 'output.gif', 'overlay_text.txt', 'concat.txt'].forEach((f) => {
                try {
                    ffmpeg.FS('unlink', '/' + f);
                } catch {
                    // Ignore missing FS artifacts during cleanup
                }
            });
            if (currentMode !== 'video') {
                for (let i = 0; i < slideshowImages.length; i++) {
                    try {
                        ffmpeg.FS('unlink', `/img${(i + 1).toString().padStart(3, '0')}.jpg`);
                    } catch {
                        // Ignore missing frames
                    }
                }
            }
        } catch {
            // Ignore top-level FS errors
        }
    } catch (error) {
        console.error('Conversion Error:', error);
        showToast('Processing Error: ' + error.message);
    } finally {
        resetConversionState();
        try {
            ffmpeg.FS('unlink', 'input.mp4');
            ffmpeg.FS('unlink', 'input.gif');
        } catch {
            /* ignore cleanup errors */
        }
    }
}

/**
 * Finalizes the GIF output by reading the FS and updating the DOM results.
 * @async
 * @param {string} outputPath - Path in ffmpeg.wasm filesystem.
 * @param {string} mimeType - Output mime type.
 * @param {HTMLElement} progressFill - Progress bar element.
 * @param {HTMLElement} progressBar - Progress wrapper element.
 */
async function finalizeOutput(outputPath, mimeType, progressFill, progressBar) {
    try {
        if (progressFill) progressFill.style.width = '100%';
        if (progressBar) progressBar.setAttribute('aria-valuenow', '100');

        const rawData = ffmpeg.FS('readFile', outputPath);
        const stickerEmoji = document.getElementById('stickerEmoji')?.value?.trim();
        const stickerSize = parseInt(document.getElementById('stickerSize')?.value) || 64;
        const stickerPos = document.getElementById('stickerPos')?.value || 'topright';

        if (!stickerEmoji) {
            outputResult(new Uint8Array(rawData.buffer));
            return;
        }

        showToast('🎨 Applying Sticker Overlay...');

        // Decode GIF frames using omggif
        const gr = new GifReader(new Uint8Array(rawData.buffer));
        const width = gr.width;
        const height = gr.height;
        const frameCount = gr.numFrames();

        const gif = new GIF({
            workers: 2,
            quality: 10,
            width,
            height,
            workerScript: 'js/vendor/gif.worker.js' // Local same-origin script bypasses COEP block
        });

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const margin = 12;

        for (let i = 0; i < frameCount; i++) {
            const info = gr.frameInfo(i);
            const pixels = new Uint8ClampedArray(width * height * 4);
            gr.decodeAndBlitFrameRGBA(i, pixels);
            ctx.putImageData(new ImageData(pixels, width, height), 0, 0);

            // Robust Emoji Font Stack
            ctx.font = `${stickerSize}px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif`;
            ctx.textBaseline = 'top';

            const posMap = {
                topright: { x: width - margin, y: margin, align: 'right' },
                topleft: { x: margin, y: margin, align: 'left' },
                bottomright: { x: width - margin, y: height - stickerSize - margin, align: 'right' },
                bottomleft: { x: margin, y: height - stickerSize - margin, align: 'left' },
                center: { x: width / 2, y: (height - stickerSize) / 2, align: 'center' }
            };
            const pos = posMap[stickerPos] || posMap.topright;
            ctx.textAlign = pos.align;
            ctx.fillText(stickerEmoji, pos.x, pos.y);

            gif.addFrame(canvas, { delay: (info.delay || 10) * 10, copy: true });
        }

        gif.on('finished', (blob) => {
            blob.arrayBuffer().then((buf) => outputResult(new Uint8Array(buf)));
        });
        gif.render();
    } catch (e) {
        console.error('Finalize Error:', e);
        showToast('Finalize Error: Check console for details.');
        resetConversionState();
    }
}

function outputResult(uint8data) {
    const url = URL.createObjectURL(new Blob([uint8data], { type: 'image/gif' }));
    const resultGif = document.getElementById('resultGif');
    if (!resultGif) {
        console.error('outputResult: #resultGif element not found in DOM');
        return;
    }
    if (resultGif.src) URL.revokeObjectURL(resultGif.src);
    resultGif.src = url;
    resultGif.style.display = 'block';

    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.href = url;
    downloadBtn.download = `sumosized-${Date.now()}.gif`;
    downloadBtn.textContent = '⬇️ Download GIF';

    document.getElementById('previewSection').classList.add('active');
    showToast('🔥 Elite GIF Generated!');
    document.getElementById('previewSection').scrollIntoView({ behavior: 'smooth' });
    resetConversionState();
}

function resetConversionState() {
    isConverting = false;
    const convertBtn = document.getElementById('convertBtn');
    if (convertBtn) {
        convertBtn.disabled = false;
        convertBtn.innerHTML = '⚡ Convert to GIF';
    }
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) progressContainer.classList.remove('active');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─────────────────────────────────────────────
// RESET / CLOSE
// ─────────────────────────────────────────────
function resetVideo() {
    const videoPlayer = document.getElementById('videoPlayer');
    const videoSection = document.getElementById('videoSection');
    const controlsPanel = document.getElementById('controlsPanel');
    const actionSection = document.getElementById('actionSection');
    const previewSection = document.getElementById('previewSection');
    const videoUpload = document.getElementById('videoUpload');
    const resultGif = document.getElementById('resultGif');
    const resultVideo = document.getElementById('resultVideo');

    if (videoPlayer?.src) URL.revokeObjectURL(videoPlayer.src);
    if (resultGif?.src) URL.revokeObjectURL(resultGif.src);
    if (resultVideo?.src) URL.revokeObjectURL(resultVideo.src);

    videoSection?.classList.remove('active');
    if (controlsPanel) controlsPanel.style.display = 'none';
    if (actionSection) actionSection.style.display = 'none';
    previewSection?.classList.remove('active');
    if (videoUpload) videoUpload.value = '';
    if (videoPlayer) videoPlayer.src = '';

    document.getElementById('videoUploadSection').style.display = 'block';
    document.getElementById('extractFramesBtn')?.setAttribute('disabled', '');
    document.getElementById('frameStatus').textContent = 'Load a video to extract frames';
    document.getElementById('frameStrip').innerHTML =
        '<div class="frame-empty-state">No frames extracted yet — click "Extract Frames" above</div>';
    frameData = [];
    videoDuration = 0;
    currentVideoFile = null;
}

function closePreview() {
    document.getElementById('previewSection').classList.remove('active');
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
