/**
 * cropper.js — Image/Video Cropping Logic
 */
import { state } from './state.js';
import { dom } from './ui.js';

export function toggleCropper(ratio) {
    state.cropData.active = ratio !== 'off';
    state.cropData.ratio = ratio;

    if (state.cropData.active) {
        dom.cropperOverlay?.classList.add('active');
        if (ratio !== 'original') {
            const [rw, rh] = ratio.split(':').map(Number);
            const side = Math.min(dom.videoContainer.offsetWidth, dom.videoContainer.offsetHeight) * 0.5;
            state.cropData.w = side;
            state.cropData.h = (side * rh) / rw;
            state.cropData.x = (dom.videoContainer.offsetWidth - state.cropData.w) / 2;
            state.cropData.y = (dom.videoContainer.offsetHeight - state.cropData.h) / 2;
        }
    } else {
        dom.cropperOverlay?.classList.remove('active');
    }
    updateCropperUI();
}

export function handleCropperMouseDown(e) {
    if (!state.cropData.active) return;
    state.isDragging = true;
    state.startX = e.offsetX;
    state.startY = e.offsetY;
    if (state.cropData.ratio === 'original') {
        state.cropData.x = state.startX;
        state.cropData.y = state.startY;
        state.cropData.w = 0;
        state.cropData.h = 0;
    }
}

export function handleCropperMouseMove(e) {
    if (!state.isDragging || !dom.videoContainer) return;
    const rect = dom.videoContainer.getBoundingClientRect();
    let curX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    let curY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    if (state.cropData.ratio === 'original') {
        state.cropData.w = Math.abs(curX - state.startX);
        state.cropData.h = Math.abs(curY - state.startY);
        state.cropData.x = Math.min(curX, state.startX);
        state.cropData.y = Math.min(curY, state.startY);
    } else {
        state.cropData.x = Math.max(0, Math.min(curX - state.cropData.w / 2, rect.width - state.cropData.w));
        state.cropData.y = Math.max(0, Math.min(curY - state.cropData.h / 2, rect.height - state.cropData.h));
    }
    updateCropperUI();
}

export function handleCropperMouseUp() {
    state.isDragging = false;
}

export function updateCropperUI() {
    if (!state.cropData.active || !dom.cropperBox) return;
    dom.cropperBox.style.left = `${state.cropData.x}px`;
    dom.cropperBox.style.top = `${state.cropData.y}px`;
    dom.cropperBox.style.width = `${state.cropData.w}px`;
    dom.cropperBox.style.height = `${state.cropData.h}px`;
}
