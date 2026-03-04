/**
 * timeline.js — Timeline Scrubbing & Thumbnails
 */
import { state } from './state.js';
import { dom } from './ui.js';
import { ffmpeg, fetchFile } from './ffmpeg-client.js';
import { formatTime, safeUnlinkAll } from './utils.js';

export function handleTimelineScrub(e) {
    if (!state.videoDuration || !dom.timelineTrack) return;
    const rect = dom.timelineTrack.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = x / rect.width;
    if (dom.videoPlayer) {
        dom.videoPlayer.currentTime = pct * state.videoDuration;
    }
    updateTimelineUI();
}

export function updateTimelineUI() {
    if (!state.videoDuration || !dom.videoPlayer) return;
    const pct = (dom.videoPlayer.currentTime / state.videoDuration) * 100;
    if (dom.scrubHandle) dom.scrubHandle.style.left = `${pct}%`;
    const currentTimeDisplay = document.getElementById('currentTimeDisplay');
    if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(dom.videoPlayer.currentTime);
}

export async function generateTimelineThumbnails() {
    if (!state.currentVideoFile || !ffmpeg.isLoaded()) return;
    if (state.isFfmpegBusy) return;

    const strip = document.getElementById('thumbnailStrip');
    if (strip) strip.innerHTML = '';

    try {
        state.isFfmpegBusy = true;
        if (dom.progressContainer) dom.progressContainer.classList.add('active');
        if (dom.progressStatus) dom.progressStatus.textContent = 'Generating Timeline...';

        // Revoke existing thumbnail URLs
        const existingThumbs = strip.querySelectorAll('img');
        existingThumbs.forEach((img) => {
            if (img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
        });
        strip.innerHTML = '';

        await ffmpeg.FS('writeFile', 'timeline_input.mp4', await fetchFile(state.currentVideoFile));

        const duration = Math.max(state.videoDuration, 0.1);
        const thumbFps = 10 / duration;
        await ffmpeg.run(
            '-i',
            'timeline_input.mp4',
            '-vf',
            `fps=${thumbFps.toFixed(4)},scale=120:-1`,
            '-frames:v',
            '10',
            '-y',
            'thumb_%d.jpg'
        );

        const readPromises = Array.from({ length: 10 }, (_, i) =>
            ffmpeg
                .FS('readFile', `thumb_${i + 1}.jpg`)
                .then((data) => {
                    const url = URL.createObjectURL(new Blob([data.buffer], { type: 'image/jpeg' }));
                    const img = document.createElement('img');
                    img.src = url;
                    strip?.appendChild(img);
                    return `thumb_${i + 1}.jpg`;
                })
                .catch(() => null)
        );
        const names = await Promise.all(readPromises);

        await safeUnlinkAll(ffmpeg, '/', ['timeline_input.mp4', ...names.filter(Boolean)]);

        if (dom.progressStatus) dom.progressStatus.textContent = 'Timeline Ready';
        setTimeout(() => {
            if (dom.progressContainer) dom.progressContainer.classList.remove('active');
        }, 1000);
    } catch (e) {
        console.error('Timeline generation failed:', e);
        if (dom.progressContainer) dom.progressContainer.classList.remove('active');
    } finally {
        state.isFfmpegBusy = false;
    }
}
