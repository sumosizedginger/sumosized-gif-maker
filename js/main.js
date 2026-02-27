const CONFIG = {
    FFMPEG_CORE_URL: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    // Default Font (OSS Arimo - Arial compatible)
    FONT_URL: window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '') + '/fonts/Arimo-Regular.ttf',
    FONT_BASE_URL: window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '') + '/fonts/'
};

const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({
    log: true,
    corePath: CONFIG.FFMPEG_CORE_URL
});

let videoDuration = 0;
let isConverting = false;
let currentFilter = 'none';
let currentVideoFile = null;
let currentMode = 'video';
let slideshowImages = [];

// *** CRITICAL: Must be declared early — HTML `onchange` calls toggleCropper before script execution reaches later `let` declarations ***
let cropData = { active: false, x: 0, y: 0, w: 0, h: 0, ratio: 'off' };
let isDragging = false;
let startX, startY;

const colorThief = new ColorThief();

function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));

    const targetBtn = Array.from(document.querySelectorAll('.mode-btn'))
        .find(btn => btn.innerText.toLowerCase().includes(mode));
    if (targetBtn) targetBtn.classList.add('active');

    const loadingPlaceholder = document.getElementById('loadingPlaceholder');
    const videoPlayer = document.getElementById('videoPlayer');
    const imagePlaceholder = document.getElementById('imagePlaceholder');
    const actionSection = document.getElementById('actionSection');

    if (mode === 'video') {
        document.getElementById('videoUploadSection').style.display = 'block';
        document.getElementById('imageUploadSection').style.display = 'none';
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
    } else { // Image mode
        document.getElementById('videoUploadSection').style.display = 'none';
        document.getElementById('imageUploadSection').style.display = 'block';
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

// Image Slideshow Logic
document.getElementById('imageUpload').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    slideshowImages = [];
    const grid = document.getElementById('slideshowGrid');
    grid.innerHTML = '';

    for (const file of files) {
        const url = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
        slideshowImages.push(url);

        const div = document.createElement('div');
        div.className = 'img-preview';
        div.innerHTML = `<img src="${url}">`;
        grid.appendChild(div);
    }

    if (slideshowImages.length > 0) {
        document.getElementById('videoUploadSection').style.display = 'none';
        document.getElementById('imageUploadSection').style.display = 'none';
        document.getElementById('videoSection').classList.add('active');
        document.getElementById('videoSection').style.display = 'block';
        document.getElementById('controlsPanel').style.display = 'block';
        document.getElementById('actionSection').style.display = 'block';

        // Display first image in preview area for cropping logic
        const videoPlayer = document.getElementById('videoPlayer');
        const imagePlaceholder = document.getElementById('imagePlaceholder');
        videoPlayer.style.display = 'none';
        imagePlaceholder.style.display = 'block';
        imagePlaceholder.src = slideshowImages[0];

        showToast(`Loaded ${slideshowImages.length} images. Sync Vibe & Start FX!`);
        updatePredictor();
    }
});

// Initialize Lucide Icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

async function syncVibe() {
    const videoPlayer = document.getElementById('videoPlayer');
    if (!videoPlayer) return;

    if (!videoPlayer.paused || videoPlayer.currentTime > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = videoPlayer.videoWidth;
        canvas.height = videoPlayer.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);

        try {
            const color = colorThief.getColor(canvas);
            const rgb = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
            document.documentElement.style.setProperty('--vibe-color', rgb);
            document.documentElement.style.setProperty('--glass-border', `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.3)`);
        } catch (e) {
            console.warn("Vibe sync failed:", e);
        }
    }
}

// Global authoritative handler for video uploads.
document.getElementById('videoUpload').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

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

    videoPlayer.onloadedmetadata = function () {
        videoDuration = videoPlayer.duration;

        setTimeout(syncVibe, 500);

        document.getElementById('videoInfo').innerHTML = `
            <span>📹 ${file.name}</span>
            <span>⏱️ ${formatTime(videoDuration)}</span>
            <span>📐 ${Math.round(videoPlayer.videoWidth)}x${Math.round(videoPlayer.videoHeight)}</span>
        `;

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

        updateRange();
        updatePredictor();
        showToast('Video Loaded! Trim & Sync Vibe.');
    };
});

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function switchTab(tabId) {
    document.querySelectorAll('.advanced-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId + 'Panel').classList.add('active');
    event.target.classList.add('active');
}

function setFilter(filter, el) {
    currentFilter = filter;
    document.querySelectorAll('.filter-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    updatePredictor();
}

function updatePredictor() {
    const widthInput = document.getElementById('gifWidth');
    const fpsInput = document.getElementById('fps');
    const speedSelect = document.getElementById('speed');
    const overlayInput = document.getElementById('overlayText');
    const qualityEst = document.getElementById('qualityEst');

    if (!widthInput || !fpsInput || !speedSelect || !overlayInput || !qualityEst) return;

    const width = parseInt(widthInput.value);
    const fps = parseInt(fpsInput.value);
    const hasOverlay = overlayInput.value.length > 0;

    let quality = "High Def";
    if (width > 800) quality = "Ultra HD";
    else if (width < 320) quality = "Standard";

    if (fps > 25) quality += " (Super Smooth)";
    if (hasOverlay) quality += " + FX";

    qualityEst.textContent = quality;
}

function updateRange() {
    const startRange = document.getElementById('startRange');
    const endRange = document.getElementById('endRange');
    const rangeSelected = document.getElementById('rangeSelected');
    const startTimeDisplay = document.getElementById('startTimeDisplay');
    const endTimeDisplay = document.getElementById('endTimeDisplay');
    const durationDisplay = document.getElementById('durationDisplay');

    if (!startRange || !endRange) return;

    let start = parseFloat(startRange.value);
    let end = parseFloat(endRange.value);

    // Ensure minimum 0.5s duration and maximum 10s duration
    if (end - start < 0.5) {
        if (event && event.target === startRange) {
            start = Math.max(0, end - 0.5);
            startRange.value = start;
        } else {
            end = Math.min(videoDuration, start + 0.5);
            endRange.value = end;
        }
    }

    if (end - start > 10) {
        if (event && event.target === startRange) {
            end = start + 10;
            endRange.value = end;
        } else {
            start = end - 10;
            startRange.value = start;
        }
    }

    if (start > end) {
        const temp = start;
        start = end;
        end = temp;
    }

    // Update visual range
    const leftPercent = (start / videoDuration) * 100;
    const widthPercent = ((end - start) / videoDuration) * 100;

    if (rangeSelected) {
        rangeSelected.style.left = leftPercent + '%';
        rangeSelected.style.width = widthPercent + '%';
    }

    // Update displays
    if (startTimeDisplay) startTimeDisplay.textContent = start.toFixed(1) + 's';
    if (endTimeDisplay) endTimeDisplay.textContent = end.toFixed(1) + 's';
    if (durationDisplay) durationDisplay.textContent = (end - start).toFixed(1) + 's';
}

const startRange = document.getElementById('startRange');
const endRange = document.getElementById('endRange');
if (startRange) startRange.addEventListener('input', updateRange);
if (endRange) endRange.addEventListener('input', updateRange);

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

    // Reset box to center
    const rect = targetEl.getBoundingClientRect();
    let w = rect.width * 0.5; // Default to 50% width
    let h = rect.height * 0.5; // Default to 50% height

    if (ratio !== 'original') {
        const [rW, rH] = ratio.split(':').map(Number);
        const targetRatio = rW / rH;
        if (w / h > targetRatio) {
            w = h * targetRatio;
        } else {
            h = w / targetRatio;
        }

        // Clamp to element bounds
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

const videoContainer = document.getElementById('videoContainer');
if (videoContainer) {
    videoContainer.addEventListener('mousedown', e => {
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

    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
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

    window.addEventListener('mouseup', () => isDragging = false);
}

// FFmpeg Initialization with Logger
let ffmpegLogs = [];
(async () => {
    try {
        ffmpeg.setLogger(({ type, message }) => {
            console.log(`[FFmpeg ${type}] ${message}`);
            if (type === 'fferr') {
                ffmpegLogs.push(message);
                if (ffmpegLogs.length > 5) ffmpegLogs.shift();
            }
        });

        if (!ffmpeg.isLoaded()) {
            await ffmpeg.load();
            showToast("Elite Processor Ready");
        }
    } catch (e) {
        console.error(e);
        showToast("System Error: Cross-Origin Isolation Required");
    }
})();

function wrapText(text, maxWidth, fontSize, fontName, wordSpacing = 0) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontSize}px "${fontName}", Arial`;

    const spaceWidth = ctx.measureText(' ').width;
    const extraSpacingPx = wordSpacing * spaceWidth;

    const words = text.split(' ');
    let lines = [];
    let currentLine = [];

    words.forEach(word => {
        const testLine = [...currentLine, word];
        const testText = testLine.join(' ');
        const metrics = ctx.measureText(testText);
        const totalWidth = metrics.width + (Math.max(0, testLine.length - 1) * extraSpacingPx);

        if (totalWidth > maxWidth && currentLine.length > 0) {
            lines.push(currentLine.join(' '));
            currentLine = [word];
        } else {
            currentLine = testLine;
        }
    });
    if (currentLine.length > 0) {
        lines.push(currentLine.join(' '));
    }

    const spacingStr = ' '.repeat(wordSpacing + 1);
    return lines.map(l => l.split(' ').join(spacingStr)).join('\n');
}

async function startConversion() {
    if (isConverting) return;
    if (!ffmpeg.isLoaded()) {
        showToast("Processor Loading...");
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
    const progressFill = document.getElementById('progressFill');
    const progressStatus = document.getElementById('progressStatus');
    const videoPlayer = document.getElementById('videoPlayer');
    const imagePlaceholder = document.getElementById('imagePlaceholder');
    const targetEl = currentMode === 'video' ? videoPlayer : imagePlaceholder;

    if (!startRangeEl || !durationDisplay || !convertBtn || !progressContainer || !videoPlayer) {
        showToast("Page not ready — please reload.");
        return;
    }

    const start = parseFloat(startRangeEl.value);
    const duration = parseFloat(durationDisplay.textContent);
    const width = parseInt(gifWidthInput.value);
    const fps = parseInt(fpsInput.value);
    const speed = parseFloat(speedSelect.value);
    const loopMode = loopModeSelect.value;
    const overlayText = overlayTextInput.value;
    const textSize = parseInt(textSizeInput.value);
    const textPos = textPosSelect.value;
    const fontStyle = document.getElementById('fontStyle').value;

    convertBtn.disabled = true;
    convertBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Processing...';
    if (typeof lucide !== 'undefined') lucide.createIcons();

    progressContainer.classList.add('active');

    try {
        if (currentMode === 'video') {
            ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(currentVideoFile));
        }

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

            const fontUrl = fontMap[fontStyle] || CONFIG.FONT_URL;
            const fontName = fontStyle.split('.')[0];
            progressStatus.textContent = 'Loading Font...';

            if (!document.fonts.check(`${textSize}px "${fontName}"`)) {
                try {
                    const fontFace = new FontFace(fontName, `url(${fontUrl})`);
                    const loadedFace = await fontFace.load();
                    document.fonts.add(loadedFace);
                    await document.fonts.ready;
                } catch (e) {
                    console.warn("Browser font load failed:", e);
                }
            }
            ffmpeg.FS('writeFile', fontStyle, await fetchFile(fontUrl));
        }

        const baseFilters = [];
        const resWidth = width || 480;
        const currentFps = fps || 15;

        // A. Cropping
        if (cropData.active && cropData.w > 0) {
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
            const cW = Math.round(cropData.w * scaleX);
            const cH = Math.round(cropData.h * scaleY);
            const safeCW = Math.min(cW, realW - cX);
            const safeCH = Math.min(cH, realH - cY);
            if (safeCW > 0 && safeCH > 0) baseFilters.push(`crop=${safeCW}:${safeCH}:${cX}:${cY}`);
        }

        // B. Speed
        if (speed !== 1 && currentMode === 'video') baseFilters.push(`setpts=${1 / speed}*PTS`);

        // C. Visual Filters
        if (currentFilter === 'grayscale') baseFilters.push('hue=s=0');
        if (currentFilter === 'sepia') baseFilters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
        if (currentFilter === 'vibrant') baseFilters.push('eq=saturation=1.5:contrast=1.1');
        if (currentFilter === '8bit') baseFilters.push('scale=iw/4:-2,scale=iw*4:-2:flags=neighbor');
        if (currentFilter === 'dreamy') baseFilters.push('eq=contrast=0.8:brightness=0.05:saturation=0.7');
        if (currentFilter === 'golden') baseFilters.push('curves=red=\'0/0 0.5/0.6 1/1\':green=\'0/0 0.5/0.45 1/0.9\':blue=\'0/0 0.5/0.3 1/0.7\'');
        if (currentFilter === 'gladiator') baseFilters.push('eq=contrast=1.5:saturation=0.5:brightness=-0.05,colorchannelmixer=1.1:0:0:0:0:0.9:0:0:0:0:0.7:0');
        if (currentFilter === 'nightvision') baseFilters.push('colorchannelmixer=0:0:0:0:0.5:0.5:0:0:0:0:0:0,eq=brightness=0.1:saturation=2,noise=alls=15:allf=t+u');
        if (currentFilter === 'sulphur') baseFilters.push('curves=red=\'0/0 0.5/0.8 1/1\':green=\'0/0 0.5/0.7 1/0.9\':blue=\'0/0 0.5/0.1 1/0.2\'');
        if (currentFilter === 'coldblue') baseFilters.push('curves=red=\'0/0 0.5/0.3 1/0.7\':green=\'0/0 0.5/0.5 1/0.8\':blue=\'0/0 0.5/0.7 1/1\'');
        if (currentFilter === 'vignette') baseFilters.push('vignette=PI/4');
        if (currentFilter === 'mirror') baseFilters.push('hflip');
        if (currentFilter === 'grain') baseFilters.push('noise=alls=20:allf=t+u');
        if (currentFilter === 'invert') baseFilters.push('negate');
        if (currentFilter === 'vhs') baseFilters.push('hue=s=0.5,noise=alls=10:allf=t+u,boxblur=lx=1:ly=1');
        if (currentFilter === 'psychedelic') baseFilters.push('hue=h=\'t*50\',eq=saturation=2');
        if (currentFilter === 'thermal') baseFilters.push('curves=r=\'0/0 0.1/1 1/1\':g=\'0/1 0.5/0 1/1\':b=\'0/0.5 1/0\'');
        if (currentFilter === 'glitch') baseFilters.push('noise=alls=20:allf=t+u,hue=h=\'t*10\':s=1.2,boxblur=2:1');
        if (currentFilter === 'cyberpunk') baseFilters.push('eq=contrast=1.8:saturation=1.5,curves=r=\'0/0 0.5/1 1/1\':g=\'0/0 0.5/0 1/0.5\':b=\'0/0 0.5/1 1/1\'');
        if (currentFilter === 'chrome') baseFilters.push('format=gray,curves=all=\'0/0 0.25/0.5 0.5/1 0.75/0.5 1/0\',eq=contrast=1.5');
        if (currentFilter === 'blueprint') baseFilters.push('negate,hue=h=240:s=1,eq=contrast=1.2');
        if (currentFilter === 'matrix') baseFilters.push('format=gray,colorlevels=rimin=0.05:gimin=0.05:bimin=0.05:rimax=0.1:gimax=0.9:bimax=0.1,eq=contrast=1.5,hue=h=120:s=1');
        if (currentFilter === 'oldmovie') baseFilters.push('format=gray,noise=alls=20:allf=t+u,curves=all=\'0/0 0.5/0.4 1/1\'');
        if (currentFilter === 'mirrormode') baseFilters.push('split[main][tmp];[tmp]hflip[left];[main][left]hstack');
        if (currentFilter === 'comic') baseFilters.push('edgedetect=low=0.1:high=0.2,negate,eq=contrast=1.5:saturation=2,format=gray,colorlevels=rimax=0.8:gimax=0.8:bimax=0.8');
        if (currentFilter === 'acid') baseFilters.push('hue=h=\'t*180\':s=2,curves=all=\'0/0 0.5/1 1/0\'');
        if (currentFilter === 'sketch') baseFilters.push('edgedetect=low=0.1:high=0.2,negate,format=gray,noise=alls=5:allf=t+u');
        if (currentFilter === 'infrared') baseFilters.push('curves=r=\'0/1 0.5/0 1/0\':g=\'0/0 0.5/1 1/0\':b=\'0/0 0.5/0 1/1\'');
        if (currentFilter === 'seahawks') baseFilters.push('format=gray,curves=r=\'0/0 1/0.3\':g=\'0/0.1 1/1\':b=\'0/0 1/0\'');
        if (currentFilter === 'technicolor') baseFilters.push('colorchannelmixer=1.1:0:0:0:0:1.3:0:0:0:0:1.1:0');
        if (currentFilter === 'golden2') baseFilters.push('curves=all=\'0/0 0.5/0.6 1/1\',colorchannelmixer=1.2:0:0:0:0:1:0:0:0:0:0.8:0');
        if (currentFilter === 'posterize') baseFilters.push('posterize=bits=3');

        // D. Sizing & FPS
        baseFilters.push(`scale=${resWidth}:-2:flags=lanczos`);
        baseFilters.push(`fps=${currentFps}`);

        // E. Text Overlay
        if (overlayText) {
            let yPos;
            switch (textPos) {
                case 'top': yPos = '20'; break;
                case 'middle': yPos = '(h-text_h)/2'; break;
                case 'bottom': yPos = '(h-text_h-20)'; break;
                default: yPos = '(h-text_h-20)';
            }

            const wordSpacing = parseInt(document.getElementById('wordSpacing').value) || 0;
            const wrapped = wrapText(overlayText.trim(), resWidth * 0.8, textSize, fontStyle.split('.')[0], wordSpacing);
            ffmpeg.FS('writeFile', 'overlay_text.txt', new TextEncoder().encode(wrapped));

            const lineSpacing = parseInt(document.getElementById('lineSpacing').value) || 10;
            const useBox = document.getElementById('textBox').value === "1" ? 1 : 0;
            const boxPadding = parseInt(document.getElementById('boxPadding').value) || 10;
            const textColor = document.getElementById('textColor').value;
            const boxOpacity = document.getElementById('boxOpacity').value;

            baseFilters.push(`drawtext=fontfile=/${fontStyle}:textfile=/overlay_text.txt:fontsize=${textSize}:fontcolor=${textColor}:borderw=2:bordercolor=black:line_spacing=${lineSpacing}:box=${useBox}:boxcolor=black@${boxOpacity}:boxborderw=${boxPadding}:x=(w-text_w)/2:y=${yPos}`);
        }

        const baseFilterStr = baseFilters.join(',');

        if (currentMode === 'video') {
            progressStatus.textContent = 'Pass 1: Analyzing...';
            await ffmpeg.run('-fflags', '+genpts', '-ss', start.toString(), '-t', (duration / speed).toString(), '-i', '/input.mp4', '-vf', `${baseFilterStr},palettegen`, '-y', '/palette.png');

            progressStatus.textContent = 'Pass 2: Encoding...';
            let complexFilter = `[0:v]${baseFilterStr}`;
            if (loopMode === 'reverse') complexFilter += `,reverse[vid];[vid][1:v]paletteuse`;
            else if (loopMode === 'boomerang') complexFilter += `,split[f][b];[b]reverse[r];[f][r]concat=n=2:v=1:a=0[vid];[vid][1:v]paletteuse`;
            else complexFilter += `[vid];[vid][1:v]paletteuse`;

            await ffmpeg.run('-fflags', '+genpts', '-ss', start.toString(), '-t', (duration / speed).toString(), '-i', '/input.mp4', '-i', '/palette.png', '-filter_complex', complexFilter, '-f', 'gif', '-y', '/output.gif');
        } else {
            progressStatus.textContent = 'Preparing images...';
            for (let i = 0; i < slideshowImages.length; i++) {
                const dataURL = slideshowImages[i];
                const binary = await fetch(dataURL).then(res => res.arrayBuffer());
                ffmpeg.FS('writeFile', `/img${(i + 1).toString().padStart(3, '0')}.jpg`, new Uint8Array(binary));
            }

            const frameDelay = parseInt(document.getElementById('frameDelay').value) || 200;
            const framerate = 1000 / frameDelay;

            progressStatus.textContent = 'Pass 1: Analyzing...';
            await ffmpeg.run('-framerate', framerate.toString(), '-i', '/img%03d.jpg', '-vf', `${baseFilterStr},palettegen`, '-y', '/palette.png');

            progressStatus.textContent = 'Pass 2: Stitching FX...';
            await ffmpeg.run('-framerate', framerate.toString(), '-i', '/img%03d.jpg', '-i', '/palette.png', '-filter_complex', `[0:v]${baseFilterStr}[vid];[vid][1:v]paletteuse`, '-f', 'gif', '-y', '/output.gif');
        }

        const data = ffmpeg.FS('readFile', '/output.gif');
        const resultGif = document.getElementById('resultGif');
        if (resultGif.src) URL.revokeObjectURL(resultGif.src);
        resultGif.src = URL.createObjectURL(new Blob([data.buffer], { type: 'image/gif' }));

        const downloadBtn = document.getElementById('downloadBtn');
        downloadBtn.href = resultGif.src;
        downloadBtn.download = `sumosized-${Date.now()}.gif`;

        document.getElementById('previewSection').classList.add('active');
        showToast('Elite GIF Generated!');
        document.getElementById('previewSection').scrollIntoView({ behavior: 'smooth' });

        // Cleanup
        try {
            if (currentMode === 'video') ffmpeg.FS('unlink', '/input.mp4');
            else {
                for (let i = 0; i < slideshowImages.length; i++) {
                    ffmpeg.FS('unlink', `/img${(i + 1).toString().padStart(3, '0')}.jpg`);
                }
            }
            ffmpeg.FS('unlink', '/palette.png');
            ffmpeg.FS('unlink', '/output.gif');
            if (overlayText) ffmpeg.FS('unlink', '/overlay_text.txt');
        } catch (e) { }

    } catch (error) {
        console.error("Conversion Error:", error);
        showToast('Processing Error: ' + error.message);
    } finally {
        isConverting = false;
        convertBtn.disabled = false;
        convertBtn.innerHTML = '⚡ Convert to GIF';
        progressContainer.classList.remove('active');
    }
}

function resetVideo() {
    const videoPlayer = document.getElementById('videoPlayer');
    const videoSection = document.getElementById('videoSection');
    const controlsPanel = document.getElementById('controlsPanel');
    const actionSection = document.getElementById('actionSection');
    const previewSection = document.getElementById('previewSection');
    const videoUpload = document.getElementById('videoUpload');
    const resultGif = document.getElementById('resultGif');

    if (videoPlayer && videoPlayer.src) URL.revokeObjectURL(videoPlayer.src);
    if (resultGif && resultGif.src) URL.revokeObjectURL(resultGif.src);

    if (videoSection) videoSection.classList.remove('active');
    if (controlsPanel) controlsPanel.style.display = 'none';
    if (actionSection) actionSection.style.display = 'none';
    if (previewSection) previewSection.classList.remove('active');
    if (videoUpload) videoUpload.value = '';

    document.getElementById('videoUploadSection').style.display = 'block';
    videoDuration = 0;
    currentVideoFile = null;
}

function resetSlideshow() {
    slideshowImages = [];
    document.getElementById('slideshowGrid').innerHTML = '';
    document.getElementById('imageUpload').value = '';
    document.getElementById('previewSection').classList.remove('active');
    switchMode('images');
}

function closePreview() {
    document.getElementById('previewSection').classList.remove('active');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initial update for quality predictor
window.addEventListener('load', () => {
    updatePredictor();
});
