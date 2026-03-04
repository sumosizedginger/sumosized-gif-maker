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

    strip.textContent = '';
    if (emptyState) emptyState.remove();

    state.frameData.forEach((frame, idx) => {
        const card = document.createElement('div');
        card.className = 'frame-card';
        card.draggable = true;
        card.dataset.index = idx;

        // Header
        const header = document.createElement('div');
        header.className = 'frame-card-header';

        const indexSpan = document.createElement('span');
        indexSpan.className = 'frame-index';
        indexSpan.textContent = `#${idx + 1}`;
        header.appendChild(indexSpan);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'frame-actions';

        // Helper to create buttons
        const createBtn = (cls, dir, title, iconName, disabled = false) => {
            const btn = document.createElement('button');
            btn.className = `frame-action-btn ${cls}`;
            if (dir) btn.dataset.dir = dir;
            btn.title = title;
            if (disabled) btn.disabled = true;
            const icon = document.createElement('i');
            icon.setAttribute('data-lucide', iconName);
            btn.appendChild(icon);
            return btn;
        };

        const btnLeft = createBtn('frame-action-move', 'left', 'Move Left', 'chevron-left', idx === 0);
        const btnRight = createBtn(
            'frame-action-move',
            'right',
            'Move Right',
            'chevron-right',
            idx === state.frameData.length - 1
        );
        const btnDup = createBtn('duplicate', null, 'Duplicate frame', 'copy');
        const btnDel = createBtn('delete', null, 'Delete frame', 'trash-2');

        actionsDiv.appendChild(btnLeft);
        actionsDiv.appendChild(btnRight);
        actionsDiv.appendChild(btnDup);
        actionsDiv.appendChild(btnDel);

        header.appendChild(actionsDiv);
        card.appendChild(header);

        // Thumbnail
        const img = document.createElement('img');
        img.className = 'frame-thumb';
        img.src = frame.src;
        img.alt = `Frame ${idx + 1}`;
        card.appendChild(img);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'frame-card-footer';

        const delayInput = document.createElement('input');
        delayInput.type = 'number';
        delayInput.className = 'frame-delay-input';
        delayInput.value = frame.delay;
        delayInput.min = 10;
        delayInput.step = 10;
        footer.appendChild(delayInput);

        const delayLabel = document.createElement('span');
        delayLabel.className = 'frame-delay-label';
        delayLabel.textContent = 'ms';
        footer.appendChild(delayLabel);

        card.appendChild(footer);

        // Listeners for move buttons
        [btnLeft, btnRight].forEach((btn) => {
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

        btnDup.addEventListener('click', (e) => {
            e.stopPropagation();
            duplicateFrame(idx);
        });

        btnDel.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteFrame(idx);
        });

        delayInput.addEventListener('change', (e) => {
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
