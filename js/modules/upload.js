/**
 * upload.js — Media Ingestion & Validation
 */
import { state } from './state.js';
import { dom, showToast, switchMode } from './ui.js';
import { generateTimelineThumbnails } from './timeline.js';
import { updateRange } from './predictor.js';

export function handleVideoUpload(e) {
    const file = e.target.files[0];
    if (file) loadVideoFile(file);
}

export function loadVideoFile(file) {
    if (file.size > 200 * 1024 * 1024) {
        showToast('❌ Video too large (max 200MB).');
        return;
    }
    switchMode('video');
    state.currentVideoFile = file;
    const url = URL.createObjectURL(file);
    if (dom.videoPlayer) {
        dom.videoPlayer.src = url;
        dom.videoPlayer.style.display = 'block';

        dom.videoPlayer.onloadedmetadata = () => {
            state.videoDuration = dom.videoPlayer.duration;

            if (dom.startRange) {
                dom.startRange.max = state.videoDuration;
                dom.startRange.value = 0;
            }
            if (dom.endRange) {
                dom.endRange.max = state.videoDuration;
                dom.endRange.value = Math.min(state.videoDuration, 10);
            }

            const actionSection = document.getElementById('actionSection');
            if (actionSection) actionSection.style.display = 'block';

            updateRange();
            generateTimelineThumbnails();
        };
    }
    if (dom.imagePlaceholder) dom.imagePlaceholder.style.display = 'none';
    const loadingPlaceholder = document.getElementById('loadingPlaceholder');
    if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';

    // reset frames (revoke blob URLs to prevent memory leak)
    state.frameData.forEach((f) => URL.revokeObjectURL(f.src));
    state.frameData = [];
    const slideshowGrid = document.getElementById('slideshowGrid');
    if (slideshowGrid) slideshowGrid.textContent = '';
    const frameStrip = document.getElementById('frameStrip');
    if (frameStrip) frameStrip.textContent = '';

    showToast('🎥 Video Loaded Successfully');
}

export function handleImageUpload(e) {
    switchMode('image');
    const files = Array.from(e.target.files);
    if (files.length > 50) {
        showToast('Max 50 images for slideshow.');
        return;
    }
    const oversized = files.filter((f) => f.size > 20 * 1024 * 1024);
    if (oversized.length) {
        showToast(`⚠️ ${oversized.length} image(s) skipped — max 20MB each.`);
    }
    const validFiles = files.filter((f) => f.size <= 20 * 1024 * 1024);
    if (!validFiles.length) return;

    state.slideshowImages = validFiles.map((f) => URL.createObjectURL(f));
    if (dom.imagePlaceholder) {
        dom.imagePlaceholder.src = state.slideshowImages[0];
        dom.imagePlaceholder.style.display = 'block';
    }
    if (dom.videoPlayer) dom.videoPlayer.style.display = 'none';
    const loadingPlaceholder = document.getElementById('loadingPlaceholder');
    if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';
    const actionSection = document.getElementById('actionSection');
    if (actionSection) actionSection.style.display = 'block';
    showToast(`🖼️ ${validFiles.length} image(s) loaded`);
}

export function handleImageOverlayUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
        showToast('❌ Overlay image too large (max 20MB).');
        return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
        state.imageOverlayBuffer = new Uint8Array(ev.target.result);
        state.imageOverlayName = file.name;
        const nameEl = document.getElementById('imgOverlayName');
        if (nameEl) nameEl.textContent = file.name;
        showToast(`🖼️ Overlay loaded: ${file.name}`);
    };
    reader.readAsArrayBuffer(file);
}

export function clearImageOverlay() {
    state.imageOverlayBuffer = null;
    state.imageOverlayName = '';
    const nameEl = document.getElementById('imgOverlayName');
    if (nameEl) nameEl.textContent = 'No file selected';
    showToast('Overlay cleared.');
}

export async function loadFromUrl(url, type) {
    if (!url) return;
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const file = new File([blob], 'import', { type: blob.type });
        if (type === 'video') loadVideoFile(file);
        else {
            state.slideshowImages.push(URL.createObjectURL(blob));
            showToast('🖼️ Image imported from URL');
        }
    } catch {
        showToast('❌ URL Import Failed (CORS)');
    }
}

export function clearCurrentMedia() {
    state.currentVideoFile = null;
    state.slideshowImages = [];
    state.frameData.forEach((f) => URL.revokeObjectURL(f.src));
    state.frameData = [];

    if (dom.videoPlayer) {
        dom.videoPlayer.pause();
        dom.videoPlayer.src = '';
        dom.videoPlayer.style.display = 'none';
    }
    if (dom.imagePlaceholder) {
        dom.imagePlaceholder.src = '';
        dom.imagePlaceholder.style.display = 'none';
    }

    const loadingPlaceholder = document.getElementById('loadingPlaceholder');
    if (loadingPlaceholder) loadingPlaceholder.style.display = '';

    const actionSection = document.getElementById('actionSection');
    if (actionSection) actionSection.style.display = 'none';

    const frameStrip = document.getElementById('frameStrip');
    if (frameStrip) frameStrip.textContent = '';

    const timelineTrack = document.getElementById('timelineTrack');
    if (timelineTrack) timelineTrack.textContent = '';

    showToast('Media cleared.');
}

export function handleGlobalDrop(e) {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files.length) return;

    // Separate dropped files into videos and images
    const allFiles = Array.from(files);
    const videoFile = allFiles.find((f) => f.type.startsWith('video/'));
    const imageFiles = allFiles.filter((f) => f.type.startsWith('image/'));

    if (videoFile) {
        // Video takes priority if one is present
        switchMode('video');
        loadVideoFile(videoFile);
    } else if (imageFiles.length > 0) {
        switchMode('image');
        // Collect ALL dropped images into the slideshow array
        const oversized = imageFiles.filter((f) => f.size > 20 * 1024 * 1024);
        if (oversized.length) {
            showToast(`⚠️ ${oversized.length} image(s) skipped — max 20MB each.`);
        }
        const validFiles = imageFiles.filter((f) => f.size <= 20 * 1024 * 1024).slice(0, 50);
        if (!validFiles.length) return;

        state.slideshowImages = validFiles.map((f) => URL.createObjectURL(f));
        if (dom.imagePlaceholder) {
            dom.imagePlaceholder.src = state.slideshowImages[0];
            dom.imagePlaceholder.style.display = 'block';
        }
        if (dom.videoPlayer) dom.videoPlayer.style.display = 'none';
        const loadingPlaceholder = document.getElementById('loadingPlaceholder');
        if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';
        const actionSection = document.getElementById('actionSection');
        if (actionSection) actionSection.style.display = 'block';
        showToast(`🖼️ ${validFiles.length} image(s) loaded for slideshow`);
    }
}
