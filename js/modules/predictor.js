/**
 * predictor.js — Synchronous UI State Sync
 */
import { state } from './state.js';
import { dom } from './ui.js';

/**
 * PREDICTOR (Quality Estimation)
 */
export function updatePredictor() {
    const width = parseInt(dom.gifWidth?.value) || 480;
    const fps = parseInt(dom.fps?.value) || 15;
    const hasOverlay = dom.overlayText?.value.length > 0;
    const hasFlip = document.getElementById('hFlip')?.value === '1' || document.getElementById('vFlip')?.value === '1';

    // Check for non-default perspective
    const pX0 = parseFloat(document.getElementById('p_x0')?.value) || 0;
    const hasPerspective = pX0 !== 0;

    let quality = 'High Def';
    if (width > 800) quality = 'Ultra HD';
    else if (width < 320) quality = 'Standard';

    if (fps > 25) quality += ' (Super Smooth)';
    if (hasOverlay) quality += ' + FX';
    if (hasFlip || hasPerspective) quality += ' + Geometry';

    const qualityEst = document.getElementById('qualityEst');
    if (qualityEst) qualityEst.textContent = quality;
}

/**
 * RANGE SLIDER
 */
export function updateRange(e) {
    if (!dom.startRange || !dom.endRange || !state.videoDuration) return;

    let start = parseFloat(dom.startRange.value);
    let end = parseFloat(dom.endRange.value);

    // Enforce min duration 0.5s
    if (end - start < 0.5) {
        if (e && e.target === dom.startRange) {
            start = Math.max(0, end - 0.5);
            dom.startRange.value = start;
        } else {
            end = Math.min(state.videoDuration, start + 0.5);
            dom.endRange.value = end;
        }
    }

    // Enforce max duration 10s
    if (end - start > 10) {
        if (e && e.target === dom.startRange) {
            end = start + 10;
            dom.endRange.value = end;
        } else {
            start = end - 10;
            dom.startRange.value = start;
        }
    }

    if (start > end) {
        [start, end] = [end, start];
    }

    const leftPercent = (start / state.videoDuration) * 100;
    const widthPercent = ((end - start) / state.videoDuration) * 100;

    const rangeSelected = document.getElementById('rangeSelected');
    if (rangeSelected) {
        rangeSelected.style.left = leftPercent + '%';
        rangeSelected.style.width = widthPercent + '%';
    }

    const startTimeDisplay = document.getElementById('startTimeDisplay');
    const endTimeDisplay = document.getElementById('endTimeDisplay');
    const durationDisplay = document.getElementById('durationDisplay');

    if (startTimeDisplay) startTimeDisplay.textContent = start.toFixed(1) + 's';
    if (endTimeDisplay) endTimeDisplay.textContent = end.toFixed(1) + 's';
    if (durationDisplay) durationDisplay.textContent = (end - start).toFixed(1) + 's';
}

/**
 * VIBE SYNC (Active Color Extraction)
 */
export async function syncVibe() {
    if (!dom.videoPlayer || dom.videoPlayer.paused) return;

    const canvas = document.createElement('canvas');
    canvas.width = dom.videoPlayer.videoWidth;
    canvas.height = dom.videoPlayer.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(dom.videoPlayer, 0, 0, canvas.width, canvas.height);

    try {
        if (typeof ColorThief !== 'undefined') {
            const colorThief = new ColorThief();
            const color = colorThief.getColor(canvas);
            document.documentElement.style.setProperty('--vibe-color', `rgb(${color[0]},${color[1]},${color[2]})`);
            document.documentElement.style.setProperty(
                '--glass-border',
                `rgba(${color[0]},${color[1]},${color[2]},0.3)`
            );
        }
    } catch (e) {
        console.warn('Vibe sync failed:', e);
    }
}
