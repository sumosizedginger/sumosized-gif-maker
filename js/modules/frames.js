/**
 * frames.js — UI for Frame Strip and Extraction
 */
import { state } from './state.js';
import { dom, showToast } from './ui.js';
import { ffmpeg, fetchFile } from './ffmpeg-client.js';

/**
 * FEATURE 3 — FRAME EXTRACTION
 */
export async function extractFrames() {
    if (!state.currentVideoFile || !ffmpeg.isLoaded()) {
        showToast('Load a video first.');
        return;
    }
    if (state.isFfmpegBusy) {
        showToast('⚠️ Processor busy — try again in a moment.');
        return;
    }
    state.isFfmpegBusy = true;

    const fps = parseInt(dom.fps?.value) || 15;
    const start = parseFloat(dom.startRange?.value) || 0;
    const duration = parseFloat(dom.durationDisplay?.textContent) || 2;

    const totalFrames = Math.ceil(duration * fps);
    if (totalFrames > 300) {
        showToast(`⚠️ ${totalFrames} frames — capped at 300. Shorten clip or reduce FPS.`);
    }
    const cappedDuration = Math.min(duration, 300 / fps);

    showToast('Extracting frames...');
    const frameStatus = document.getElementById('frameStatus');
    if (frameStatus) frameStatus.textContent = 'Extracting...';

    try {
        await ffmpeg.FS('writeFile', 'input_frames.mp4', await fetchFile(state.currentVideoFile));

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
        // Revoke existing fragment URLs before clearing to prevent memory leaks
        state.frameData.forEach((f) => {
            if (f.src && f.src.startsWith('blob:')) URL.revokeObjectURL(f.src);
        });
        state.frameData = [];
        let i = 1;
        while (true) {
            const name = `/frame${i.toString().padStart(4, '0')}.png`;
            try {
                const data = await ffmpeg.FS('readFile', name);
                const blob = new Blob([data.buffer], { type: 'image/png' });
                state.frameData.push({ src: URL.createObjectURL(blob), delay: Math.round(1000 / fps) });
                await ffmpeg.FS('unlink', name);
                i++;
            } catch {
                break; // No more frames
            }
        }

        await ffmpeg.FS('unlink', '/input_frames.mp4');
        renderFrameStrip();

        const count = state.frameData.length;
        if (frameStatus) frameStatus.textContent = `${count} frames at ${fps}fps`;
        showToast(`${count} frames extracted!`);
    } catch (err) {
        console.error('Frame extraction error:', err);
        showToast('Frame extraction failed.');
        if (frameStatus) frameStatus.textContent = 'Extraction failed';
    } finally {
        state.isFfmpegBusy = false;
    }
}

/**
 * RE-RENDER THE FRAME STRIP
 */
export function renderFrameStrip() {
    const strip = document.getElementById('frameStrip');
    const emptyState = document.getElementById('frameEmptyState');
    if (!strip) return;

    strip.innerHTML = '';
    if (emptyState) emptyState.remove();

    state.frameData.forEach((frame, idx) => {
        const card = document.createElement('div');
        card.className = 'frame-card';
        card.draggable = true;
        card.dataset.index = idx;
        card.innerHTML = `
            <div class="frame-card-header">
                <span class="frame-index">#${idx + 1}</span>
                <div class="frame-actions">
                    <button class="frame-action-btn frame-action-move" data-dir="left" title="Move Left" ${idx === 0 ? 'disabled' : ''}>
                        <i data-lucide="chevron-left"></i>
                    </button>
                    <button class="frame-action-btn frame-action-move" data-dir="right" title="Move Right" ${idx === state.frameData.length - 1 ? 'disabled' : ''}>
                        <i data-lucide="chevron-right"></i>
                    </button>
                    <button class="frame-action-btn duplicate" title="Duplicate frame">
                        <i data-lucide="copy"></i>
                    </button>
                    <button class="frame-action-btn delete" title="Delete frame">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
            <img class="frame-thumb" src="${frame.src}" alt="Frame ${idx + 1}">
            <div class="frame-card-footer">
                <input type="number" class="frame-delay-input" value="${frame.delay}" min="10" step="10">
                <span class="frame-delay-label">ms</span>
            </div>
        `;

        card.querySelectorAll('.frame-action-move').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dir = btn.dataset.dir;
                const newIdx = dir === 'left' ? idx - 1 : idx + 1;
                if (newIdx >= 0 && newIdx < state.frameData.length) {
                    [state.frameData[idx], state.frameData[newIdx]] = [state.frameData[newIdx], state.frameData[idx]];
                    renderFrameStrip();
                }
            });
        });

        card.querySelector('.duplicate').addEventListener('click', (e) => {
            e.stopPropagation();
            duplicateFrame(idx);
        });

        card.querySelector('.delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteFrame(idx);
        });

        card.querySelector('.frame-delay-input').addEventListener('change', (e) => {
            state.frameData[idx].delay = Math.max(10, parseInt(e.target.value) || 66);
        });

        // Drag events
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', idx);
        });
        card.addEventListener('dragover', (e) => e.preventDefault());
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
            const toIdx = idx;
            if (fromIdx !== toIdx) {
                reorderFrames(fromIdx, toIdx);
            }
        });

        strip.appendChild(card);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

export function duplicateFrame(index) {
    if (state.frameData.length >= 500) {
        showToast('Max 500 frames allowed.');
        return;
    }
    const frame = { ...state.frameData[index] };
    state.frameData.splice(index + 1, 0, frame);
    renderFrameStrip();
    showToast('Frame duplicated.');
}

export function deleteFrame(index) {
    if (state.frameData.length <= 1) {
        showToast('Cannot delete the only frame.');
        return;
    }
    const [removed] = state.frameData.splice(index, 1);
    if (removed && removed.src && removed.src.startsWith('blob:')) {
        URL.revokeObjectURL(removed.src);
    }
    renderFrameStrip();
    showToast('Frame removed.');
}

export function reorderFrames(from, to) {
    const moved = state.frameData.splice(from, 1)[0];
    state.frameData.splice(to, 0, moved);
    renderFrameStrip();
}

export function resetFrameDelays() {
    const globalDelay = parseInt(document.getElementById('globalFrameDelay')?.value) || 66;
    state.frameData.forEach((f) => (f.delay = globalDelay));
    renderFrameStrip();
}

export function applyGlobalFrameDelay() {
    const delay = parseInt(document.getElementById('globalFrameDelay')?.value) || 66;
    state.frameData.forEach((f) => (f.delay = delay));
    renderFrameStrip();
}
