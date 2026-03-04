/**
 * conversion.js — Core FFmpeg Processing & Output
 */
import { state, resetConversionState } from './state.js';
import { dom, showToast } from './ui.js';
import { ffmpeg, fetchFile } from './ffmpeg-client.js';
import { buildBaseFilters } from './filters.js';
import { sendTelemetry } from './telemetry.js';
import { CONFIG } from './config.js';
import { classifyFfmpegError, safeUnlinkAll } from './utils.js';

/**
 * Main entry point for GIF generation.
 */
export async function startConversion() {
    if (state.isConverting) return;
    state.isConverting = true;

    state._telemetryStartTime = performance.now();

    if (!dom.startRange || !dom.durationDisplay || !dom.convertBtn || !dom.progressContainer) {
        showToast('Page not ready — please reload.');
        state.isConverting = false;
        return;
    }

    if (state.currentMode === 'video' && !state.currentVideoFile) {
        showToast('⚠️ Load a video first.');
        state.isConverting = false;
        return;
    }
    if (state.currentMode === 'image' && !state.slideshowImages.length) {
        showToast('⚠️ Load images first.');
        state.isConverting = false;
        return;
    }
    if (state.isFfmpegBusy) {
        showToast('⚠️ Processor busy — wait for current operation to finish.');
        state.isConverting = false;
        return;
    }
    const start = parseFloat(dom.startRange.value);
    const duration = parseFloat(dom.durationDisplay.textContent);
    const resWidth = parseInt(dom.gifWidth.value) || 480;
    const fps = parseInt(dom.fps.value) || 15;
    const speed = parseFloat(dom.speed.value) || 1;
    const overlayText = dom.overlayText?.value || '';
    const textSize = parseInt(dom.textSize?.value) || 32;
    const textPos = dom.textPos?.value || 'bottom';
    const fontStyle = dom.fontStyle?.value || 'Arimo-Regular.ttf';
    const outputFormat = dom.outputFormat?.value || 'gif';

    dom.convertBtn.disabled = true;
    if (dom.convertBtn) {
        dom.convertBtn.textContent = ' Processing...';
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', 'loader-2');
        icon.classList.add('animate-spin');
        dom.convertBtn.prepend(icon);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();

    dom.progressContainer.classList.add('active');
    if (dom.progressFill) dom.progressFill.style.width = '0%';
    const progressBar = document.querySelector('.progress-bar[role="progressbar"]');
    if (progressBar) progressBar.setAttribute('aria-valuenow', '0');

    try {
        state.isFfmpegBusy = true;
        if (!ffmpeg.isLoaded()) {
            showToast('Processor Loading...');
            await ffmpeg.load();
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
            const fontUrl = fontMap[fontStyle] || CONFIG.FONT_BASE_URL + 'Arimo-Regular.ttf';
            const fontName = fontStyle.split('.')[0];
            if (dom.progressStatus) dom.progressStatus.textContent = 'Loading Font...';

            if (!document.fonts.check(`${textSize}px "${fontName}"`)) {
                try {
                    const fontFace = new FontFace(fontName, `url(${fontUrl})`);
                    document.fonts.add(await fontFace.load());
                    await document.fonts.ready;
                } catch (e) {
                    console.warn('Browser font load failed:', e);
                }
            }
            await ffmpeg.FS('writeFile', fontStyle, await fetchFile(fontUrl));
        }

        const baseFilters = await buildBaseFilters(
            resWidth,
            fps,
            speed,
            duration,
            overlayText,
            fontStyle,
            textSize,
            textPos
        );
        const baseFilterStr = baseFilters.join(',');

        if (state.frameData.length > 0 && state.currentMode === 'video') {
            if (dom.progressStatus) dom.progressStatus.textContent = 'Re-extracting full-res frames...';
            if (dom.progressFill) dom.progressFill.style.width = '10%';
            await ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(state.currentVideoFile));

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

            let concatContent = '';
            for (let i = 0; i < state.frameData.length; i++) {
                const frame = state.frameData[i];
                const response = await fetch(frame.src);
                const blob = await response.blob();
                const buffer = await blob.arrayBuffer();
                const internalName = `/frame_tmp_${i}.png`;
                await ffmpeg.FS('writeFile', internalName, new Uint8Array(buffer));
                const delay = frame.delay / 1000;
                concatContent += `file '${internalName}'\nduration ${delay.toFixed(4)}\n`;
            }
            // FFmpeg concat demuxer requires the last file listed again without duration
            if (state.frameData.length > 0) {
                concatContent += `file '/frame_tmp_${state.frameData.length - 1}.png'\n`;
            }
            await ffmpeg.FS('writeFile', '/concat.txt', new TextEncoder().encode(concatContent));

            if (outputFormat === 'gif') {
                if (dom.progressStatus) dom.progressStatus.textContent = 'Pass 1: Palette analysis...';
                if (dom.progressFill) dom.progressFill.style.width = '40%';

                const dithering = dom.dithering?.value || 'auto';
                const diffMode = dom.diffMode?.value || 'auto';
                const rawColors = parseInt(dom.maxColors?.value, 10);
                const maxColors = isNaN(rawColors) ? 256 : Math.max(4, Math.min(256, rawColors));

                let paletteInputs = ['-f', 'concat', '-safe', '0', '-i', '/concat.txt'];
                let paletteFilters = baseFilterStr;

                if (state.imageOverlayBuffer) {
                    await ffmpeg.FS('writeFile', 'overlay.png', state.imageOverlayBuffer);
                    paletteInputs.push('-i', 'overlay.png');
                    const oScale = (parseInt(dom.overlayScale?.value) || 100) / 100;
                    const oRot = dom.overlayRotation?.value || 0;
                    const oPosX = dom.overlayPosX?.value || 50;
                    const oPosY = dom.overlayPosY?.value || 50;
                    const oBlend = dom.overlayBlend?.value || 'normal';

                    let preOvl = `[1:v]scale=iw*${oScale}:-1`;
                    if (oRot !== 0) preOvl += `,rotate=${oRot}*PI/180:c=none`;
                    preOvl += `[ovl]`;

                    if (oBlend !== 'normal') {
                        paletteFilters = `[0:v]${baseFilterStr}[vid];${preOvl};[vid]split=3[vid1][vid2][vid3];[vid2]colorchannelmixer=aa=0[canvas];[canvas][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100:format=auto[full_ovl];[full_ovl]split[full_ovl1][full_ovl2];[vid3][full_ovl1]blend=all_mode='${oBlend}':all_opacity=1[vid_blended];[vid1][vid_blended][full_ovl2]maskedmerge,palettegen`;
                    } else {
                        paletteFilters = `[0:v]${baseFilterStr}[vid];${preOvl};[vid][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100,palettegen`;
                    }
                    if (maxColors !== '256') paletteFilters += `=max_colors=${maxColors}`;
                    await ffmpeg.run(...paletteInputs, '-filter_complex', paletteFilters, '-y', '/palette.png');
                } else {
                    let pf = `${baseFilterStr},palettegen`;
                    if (maxColors !== '256') pf += `=max_colors=${maxColors}`;
                    await ffmpeg.run(...paletteInputs, '-vf', pf, '-y', '/palette.png');
                }

                let paletteuseFilters = `paletteuse`;
                if (dithering !== 'auto' || diffMode !== 'auto') {
                    paletteuseFilters += '=';
                    let opts = [];
                    if (dithering !== 'auto') opts.push(`dither=${dithering}`);
                    if (diffMode !== 'auto') opts.push(`diff_mode=${diffMode}`);
                    paletteuseFilters += opts.join(':');
                }

                if (dom.progressStatus) dom.progressStatus.textContent = 'Pass 2: Encoding GIF...';
                if (dom.progressFill) dom.progressFill.style.width = '70%';

                let finalInputs = ['-f', 'concat', '-safe', '0', '-i', '/concat.txt', '-i', '/palette.png'];
                let complexFilter = `[0:v]${baseFilterStr}[vid]`;

                if (state.imageOverlayBuffer) {
                    await ffmpeg.FS('writeFile', 'overlay.png', state.imageOverlayBuffer);
                    finalInputs.push('-i', 'overlay.png');
                    const oScale = (parseInt(dom.overlayScale?.value) || 100) / 100;
                    const oRot = dom.overlayRotation?.value || 0;
                    const oPosX = dom.overlayPosX?.value || 50;
                    const oPosY = dom.overlayPosY?.value || 50;
                    const oBlend = dom.overlayBlend?.value || 'normal';

                    let preOvl = `[2:v]scale=iw*${oScale}:-1`;
                    if (oRot !== 0) preOvl += `,rotate=${oRot}*PI/180:c=none`;
                    preOvl += `[ovl]`;
                    if (oBlend !== 'normal') {
                        complexFilter += `;${preOvl};[vid]split=3[vid1][vid2][vid3];[vid2]colorchannelmixer=aa=0[canvas];[canvas][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100:format=auto[full_ovl];[full_ovl]split[full_ovl1][full_ovl2];[vid3][full_ovl1]blend=all_mode='${oBlend}':all_opacity=1[vid_blended];[vid1][vid_blended][full_ovl2]maskedmerge[vid_merged]`;
                    } else {
                        complexFilter += `;${preOvl};[vid][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100[vid_merged]`;
                    }
                    complexFilter += `;[vid_merged][1:v]${paletteuseFilters}`;
                } else {
                    complexFilter += `;[vid][1:v]${paletteuseFilters}`;
                }

                await ffmpeg.run(...finalInputs, '-filter_complex', complexFilter, '-f', 'gif', '-y', '/output.gif');
                await finalizeOutput('/output.gif', 'image/gif');
            } else if (outputFormat === 'webp') {
                if (dom.progressStatus) dom.progressStatus.textContent = 'Encoding WebP...';
                if (dom.progressFill) dom.progressFill.style.width = '60%';
                let finalWebpInputs = ['-f', 'concat', '-safe', '0', '-i', '/concat.txt'];
                let complexWebpFilter = `[0:v]${baseFilterStr}[vid]`;
                if (state.imageOverlayBuffer) {
                    await ffmpeg.FS('writeFile', 'overlay.png', state.imageOverlayBuffer);
                    finalWebpInputs.push('-i', 'overlay.png');
                    const oScale = (parseInt(dom.overlayScale?.value) || 100) / 100;
                    const oRot = dom.overlayRotation?.value || 0;
                    const oPosX = dom.overlayPosX?.value || 50;
                    const oPosY = dom.overlayPosY?.value || 50;
                    const oBlend = dom.overlayBlend?.value || 'normal';
                    let preOvl = `[1:v]scale=iw*${oScale}:-1`;
                    if (oRot !== 0) preOvl += `,rotate=${oRot}*PI/180:c=none`;
                    preOvl += `[ovl]`;
                    if (oBlend !== 'normal')
                        complexWebpFilter += `;${preOvl};[vid]split=3[vid1][vid2][vid3];[vid2]colorchannelmixer=aa=0[canvas];[canvas][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100:format=auto[full_ovl];[full_ovl]split[full_ovl1][full_ovl2];[vid3][full_ovl1]blend=all_mode='${oBlend}':all_opacity=1[vid_blended];[vid1][vid_blended][full_ovl2]maskedmerge[out]`;
                    else
                        complexWebpFilter += `;${preOvl};[vid][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100[out]`;
                } else {
                    complexWebpFilter += `;[vid]copy[out]`;
                }
                await ffmpeg.run(
                    ...finalWebpInputs,
                    '-filter_complex',
                    complexWebpFilter,
                    '-map',
                    '[out]',
                    '-loop',
                    '0',
                    '-lossless',
                    '0',
                    '-q:v',
                    '75',
                    '-f',
                    'webp',
                    '-y',
                    '/output.webp'
                );
                await finalizeOutput('/output.webp', 'image/webp');
            } else if (outputFormat === 'apng') {
                if (dom.progressStatus) dom.progressStatus.textContent = 'Encoding APNG...';
                if (dom.progressFill) dom.progressFill.style.width = '60%';

                let apngInputs = ['-f', 'concat', '-safe', '0', '-i', '/concat.txt'];
                let apngFilters = `[0:v]${baseFilterStr}[out]`;

                if (state.imageOverlayBuffer) {
                    await ffmpeg.FS('writeFile', 'overlay.png', state.imageOverlayBuffer);
                    apngInputs.push('-i', 'overlay.png');
                    const oScale = (parseInt(dom.overlayScale?.value) || 100) / 100;
                    const oRot = dom.overlayRotation?.value || 0;
                    const oPosX = dom.overlayPosX?.value || 50;
                    const oPosY = dom.overlayPosY?.value || 50;
                    const oBlend = dom.overlayBlend?.value || 'normal';

                    let preOvl = `[1:v]scale=iw*${oScale}:-1`;
                    if (oRot !== 0) preOvl += `,rotate=${oRot}*PI/180:c=none`;
                    preOvl += `[ovl]`;

                    if (oBlend !== 'normal') {
                        apngFilters = `[0:v]${baseFilterStr}[vid];${preOvl};[vid]split=3[vid1][vid2][vid3];[vid2]colorchannelmixer=aa=0[canvas];[canvas][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100:format=auto[full_ovl];[full_ovl]split[full_ovl1][full_ovl2];[vid3][full_ovl1]blend=all_mode='${oBlend}':all_opacity=1[vid_blended];[vid1][vid_blended][full_ovl2]maskedmerge[out]`;
                    } else {
                        apngFilters = `[0:v]${baseFilterStr}[vid];${preOvl};[vid][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100[out]`;
                    }
                }
                await ffmpeg.run(
                    ...apngInputs,
                    '-filter_complex',
                    apngFilters,
                    '-map',
                    '[out]',
                    '-f',
                    'apng',
                    '-plays',
                    '0',
                    '-y',
                    '/output.png'
                );
                await finalizeOutput('/output.png', 'image/png');
            }
        } else {
            // Standard paths (no manual frames)
            if (state.currentMode === 'video') {
                await ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(state.currentVideoFile));
                if (outputFormat === 'gif') {
                    if (dom.progressStatus) dom.progressStatus.textContent = 'Pass 1: Palette analysis...';
                    if (dom.progressFill) dom.progressFill.style.width = '40%';

                    let paletteInputs = [
                        '-ss',
                        start.toString(),
                        '-t',
                        (duration / speed).toString(),
                        '-i',
                        '/input.mp4'
                    ];
                    let paletteFilters = baseFilterStr;

                    if (state.imageOverlayBuffer) {
                        await ffmpeg.FS('writeFile', 'overlay.png', state.imageOverlayBuffer);
                        paletteInputs.push('-i', 'overlay.png');
                        const oScale = (parseInt(dom.overlayScale?.value) || 100) / 100;
                        const oRot = dom.overlayRotation?.value || 0;
                        const oPosX = dom.overlayPosX?.value || 50;
                        const oPosY = dom.overlayPosY?.value || 50;
                        const oBlend = dom.overlayBlend?.value || 'normal';

                        let preOvl = `[1:v]scale=iw*${oScale}:-1`;
                        if (oRot !== 0) preOvl += `,rotate=${oRot}*PI/180:c=none`;
                        preOvl += `[ovl]`;

                        if (oBlend !== 'normal') {
                            paletteFilters = `[0:v]${baseFilterStr}[vid];${preOvl};[vid]split=3[vid1][vid2][vid3];[vid2]colorchannelmixer=aa=0[canvas];[canvas][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100:format=auto[full_ovl];[full_ovl]split[full_ovl1][full_ovl2];[vid3][full_ovl1]blend=all_mode='${oBlend}':all_opacity=1[vid_blended];[vid1][vid_blended][full_ovl2]maskedmerge,palettegen`;
                        } else {
                            paletteFilters = `[0:v]${baseFilterStr}[vid];${preOvl};[vid][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100,palettegen`;
                        }
                        await ffmpeg.run(...paletteInputs, '-filter_complex', paletteFilters, '-y', '/palette.png');
                    } else {
                        await ffmpeg.run(...paletteInputs, '-vf', paletteFilters + ',palettegen', '-y', '/palette.png');
                    }

                    if (dom.progressStatus) dom.progressStatus.textContent = 'Pass 2: Encoding GIF...';
                    if (dom.progressFill) dom.progressFill.style.width = '70%';

                    let finalInputs = [
                        '-ss',
                        start.toString(),
                        '-t',
                        (duration / speed).toString(),
                        '-i',
                        '/input.mp4',
                        '-i',
                        '/palette.png'
                    ];
                    let finalFilters = '';

                    if (state.imageOverlayBuffer) {
                        finalInputs.push('-i', 'overlay.png');
                        const oScale = (parseInt(dom.overlayScale?.value) || 100) / 100;
                        const oRot = dom.overlayRotation?.value || 0;
                        const oPosX = dom.overlayPosX?.value || 50;
                        const oPosY = dom.overlayPosY?.value || 50;
                        const oBlend = dom.overlayBlend?.value || 'normal';

                        let preOvl = `[2:v]scale=iw*${oScale}:-1`;
                        if (oRot !== 0) preOvl += `,rotate=${oRot}*PI/180:c=none`;
                        preOvl += `[ovl]`;

                        if (oBlend !== 'normal') {
                            finalFilters = `[0:v]${baseFilterStr}[vid];${preOvl};[vid]split=3[vid1][vid2][vid3];[vid2]colorchannelmixer=aa=0[canvas];[canvas][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100:format=auto[full_ovl];[full_ovl]split[full_ovl1][full_ovl2];[vid3][full_ovl1]blend=all_mode='${oBlend}':all_opacity=1[vid_blended];[vid1][vid_blended][full_ovl2]maskedmerge[m];[m][1:v]paletteuse`;
                        } else {
                            finalFilters = `[0:v]${baseFilterStr}[vid];${preOvl};[vid][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100[m];[m][1:v]paletteuse`;
                        }
                    } else {
                        finalFilters = `[0:v]${baseFilterStr}[v];[v][1:v]paletteuse`;
                    }

                    await ffmpeg.run(...finalInputs, '-filter_complex', finalFilters, '-y', '/output.gif');
                    await finalizeOutput('/output.gif', 'image/gif');
                } else if (outputFormat === 'webp') {
                    if (dom.progressStatus) dom.progressStatus.textContent = 'Encoding WebP...';
                    if (dom.progressFill) dom.progressFill.style.width = '60%';

                    let webpInputs = ['-ss', start.toString(), '-t', (duration / speed).toString(), '-i', '/input.mp4'];
                    let webpFilters = `[0:v]${baseFilterStr}[out]`;

                    if (state.imageOverlayBuffer) {
                        await ffmpeg.FS('writeFile', 'overlay.png', state.imageOverlayBuffer);
                        webpInputs.push('-i', 'overlay.png');
                        const oScale = (parseInt(dom.overlayScale?.value) || 100) / 100;
                        const oRot = dom.overlayRotation?.value || 0;
                        const oPosX = dom.overlayPosX?.value || 50;
                        const oPosY = dom.overlayPosY?.value || 50;
                        const oBlend = dom.overlayBlend?.value || 'normal';

                        let preOvl = `[1:v]scale=iw*${oScale}:-1`;
                        if (oRot !== 0) preOvl += `,rotate=${oRot}*PI/180:c=none`;
                        preOvl += `[ovl]`;

                        if (oBlend !== 'normal') {
                            webpFilters = `[0:v]${baseFilterStr}[vid];${preOvl};[vid]split=3[vid1][vid2][vid3];[vid2]colorchannelmixer=aa=0[canvas];[canvas][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100:format=auto[full_ovl];[full_ovl]split[full_ovl1][full_ovl2];[vid3][full_ovl1]blend=all_mode='${oBlend}':all_opacity=1[vid_blended];[vid1][vid_blended][full_ovl2]maskedmerge[out]`;
                        } else {
                            webpFilters = `[0:v]${baseFilterStr}[vid];${preOvl};[vid][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100[out]`;
                        }
                    }

                    await ffmpeg.run(
                        ...webpInputs,
                        '-filter_complex',
                        webpFilters,
                        '-map',
                        '[out]',
                        '-loop',
                        '0',
                        '-lossless',
                        '0',
                        '-q:v',
                        '75',
                        '-f',
                        'webp',
                        '-y',
                        '/output.webp'
                    );
                    await finalizeOutput('/output.webp', 'image/webp');
                } else if (outputFormat === 'apng') {
                    if (dom.progressStatus) dom.progressStatus.textContent = 'Encoding APNG...';
                    if (dom.progressFill) dom.progressFill.style.width = '60%';

                    let apngInputs = ['-ss', start.toString(), '-t', (duration / speed).toString(), '-i', '/input.mp4'];
                    let apngFilters = `[0:v]${baseFilterStr}[out]`;

                    if (state.imageOverlayBuffer) {
                        await ffmpeg.FS('writeFile', 'overlay.png', state.imageOverlayBuffer);
                        apngInputs.push('-i', 'overlay.png');
                        const oScale = (parseInt(dom.overlayScale?.value) || 100) / 100;
                        const oRot = dom.overlayRotation?.value || 0;
                        const oPosX = dom.overlayPosX?.value || 50;
                        const oPosY = dom.overlayPosY?.value || 50;
                        const oBlend = dom.overlayBlend?.value || 'normal';

                        let preOvl = `[1:v]scale=iw*${oScale}:-1`;
                        if (oRot !== 0) preOvl += `,rotate=${oRot}*PI/180:c=none`;
                        preOvl += `[ovl]`;

                        if (oBlend !== 'normal') {
                            apngFilters = `[0:v]${baseFilterStr}[vid];${preOvl};[vid]split=3[vid1][vid2][vid3];[vid2]colorchannelmixer=aa=0[canvas];[canvas][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100:format=auto[full_ovl];[full_ovl]split[full_ovl1][full_ovl2];[vid3][full_ovl1]blend=all_mode='${oBlend}':all_opacity=1[vid_blended];[vid1][vid_blended][full_ovl2]maskedmerge[out]`;
                        } else {
                            apngFilters = `[0:v]${baseFilterStr}[vid];${preOvl};[vid][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100[out]`;
                        }
                    }

                    await ffmpeg.run(
                        ...apngInputs,
                        '-filter_complex',
                        apngFilters,
                        '-map',
                        '[out]',
                        '-f',
                        'apng',
                        '-plays',
                        '0',
                        '-y',
                        '/output.png'
                    );
                    await finalizeOutput('/output.png', 'image/png');
                }
            } else if (state.currentMode === 'image') {
                if (dom.progressStatus) dom.progressStatus.textContent = 'Preparing slideshow images...';
                if (dom.progressFill) dom.progressFill.style.width = '15%';

                // ── Normalized Slideshow Collection ──────────────────────────
                // To avoid black screens, all images must have identical dimensions.
                // We'll standardize them using an offscreen canvas.
                const targetW = parseInt(dom.gifWidth?.value) || 800;
                let targetH = 0;

                let concatContent = '';
                for (let i = 0; i < state.slideshowImages.length; i++) {
                    if (dom.progressStatus) {
                        dom.progressStatus.textContent = `Normalizing Slide ${i + 1}/${state.slideshowImages.length}...`;
                    }

                    const img = new Image();
                    img.src = state.slideshowImages[i];
                    await img.decode().catch(() => {}); // decode() resolves even for cached blobs; img.onload would hang

                    // First image defines the aspect ratio/canvas height
                    if (targetH === 0) {
                        targetH = Math.round(targetW * (img.naturalHeight / img.naturalWidth));
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = targetW;
                    canvas.height = targetH;
                    const ctx = canvas.getContext('2d');

                    // Draw image with "contain" strategy (letterbox/pillarbox)
                    const sAspect = img.naturalWidth / img.naturalHeight;
                    const tAspect = targetW / targetH;
                    let drawW, drawH, dx, dy;

                    if (sAspect > tAspect) {
                        drawW = targetW;
                        drawH = targetW / sAspect;
                        dx = 0;
                        dy = (targetH - drawH) / 2;
                    } else {
                        drawH = targetH;
                        drawW = targetH * sAspect;
                        dx = (targetW - drawW) / 2;
                        dy = 0;
                    }

                    // Clear with transparency if possible
                    ctx.clearRect(0, 0, targetW, targetH);
                    ctx.drawImage(img, dx, dy, drawW, drawH);

                    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
                    const buffer = await blob.arrayBuffer();
                    const internalName = `/slide_${String(i).padStart(4, '0')}.png`;
                    await ffmpeg.FS('writeFile', internalName, new Uint8Array(buffer));

                    concatContent += `file '${internalName}'\nduration 0.5\n`;
                }
                const lastSlide = `/slide_${String(state.slideshowImages.length - 1).padStart(4, '0')}.png`;
                concatContent += `file '${lastSlide}'\n`;
                await ffmpeg.FS('writeFile', '/concat.txt', new TextEncoder().encode(concatContent));

                const dithering = dom.dithering?.value || 'auto';
                const diffMode = dom.diffMode?.value || 'auto';
                const rawColors = parseInt(dom.maxColors?.value, 10);
                const maxColors = isNaN(rawColors) ? 256 : Math.max(4, Math.min(256, rawColors));

                let paletteuseFilters = `paletteuse`;
                if (dithering !== 'auto' || diffMode !== 'auto') {
                    paletteuseFilters += '=';
                    let opts = [];
                    if (dithering !== 'auto') opts.push(`dither=${dithering}`);
                    if (diffMode !== 'auto') opts.push(`diff_mode=${diffMode}`);
                    paletteuseFilters += opts.join(':');
                }

                const safeBaseFilter = baseFilterStr || 'null';

                if (outputFormat === 'gif' || !outputFormat) {
                    if (dom.progressStatus) dom.progressStatus.textContent = 'Pass 1: Palette analysis...';
                    if (dom.progressFill) dom.progressFill.style.width = '40%';

                    let paletteInputs = ['-f', 'concat', '-safe', '0', '-i', '/concat.txt'];
                    let paletteFilters = '';

                    if (state.imageOverlayBuffer) {
                        await ffmpeg.FS('writeFile', 'overlay.png', state.imageOverlayBuffer);
                        paletteInputs.push('-i', 'overlay.png');
                        const oScale = (parseInt(dom.overlayScale?.value) || 100) / 100;
                        const oRot = dom.overlayRotation?.value || 0;
                        const oPosX = dom.overlayPosX?.value || 50;
                        const oPosY = dom.overlayPosY?.value || 50;
                        const oBlend = dom.overlayBlend?.value || 'normal';

                        let preOvl = `[1:v]scale=iw*${oScale}:-1`;
                        if (oRot !== 0) preOvl += `,rotate=${oRot}*PI/180:c=none`;
                        preOvl += `[ovl]`;

                        if (oBlend !== 'normal') {
                            paletteFilters = `[0:v]${safeBaseFilter}[vid];${preOvl};[vid]split=3[vid1][vid2][vid3];[vid2]colorchannelmixer=aa=0[canvas];[canvas][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100:format=auto[full_ovl];[full_ovl]split[full_ovl1][full_ovl2];[vid3][full_ovl1]blend=all_mode='${oBlend}':all_opacity=1[vid_blended];[vid1][vid_blended][full_ovl2]maskedmerge,palettegen`;
                        } else {
                            paletteFilters = `[0:v]${safeBaseFilter}[vid];${preOvl};[vid][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100,palettegen`;
                        }
                    } else {
                        paletteFilters = `${safeBaseFilter},palettegen`;
                    }

                    if (maxColors !== '256') paletteFilters += `=max_colors=${maxColors}`;
                    await ffmpeg.run(...paletteInputs, '-filter_complex', paletteFilters, '-y', '/palette.png');

                    if (dom.progressStatus) dom.progressStatus.textContent = 'Pass 2: Encoding GIF...';
                    if (dom.progressFill) dom.progressFill.style.width = '70%';

                    let finalInputs = ['-f', 'concat', '-safe', '0', '-i', '/concat.txt', '-i', '/palette.png'];
                    let finalFilters = '';

                    if (state.imageOverlayBuffer) {
                        finalInputs.push('-i', 'overlay.png');
                        const oScale = (parseInt(dom.overlayScale?.value) || 100) / 100;
                        const oRot = dom.overlayRotation?.value || 0;
                        const oPosX = dom.overlayPosX?.value || 50;
                        const oPosY = dom.overlayPosY?.value || 50;
                        const oBlend = dom.overlayBlend?.value || 'normal';

                        let preOvl = `[2:v]scale=iw*${oScale}:-1`;
                        if (oRot !== 0) preOvl += `,rotate=${oRot}*PI/180:c=none`;
                        preOvl += `[ovl]`;

                        if (oBlend !== 'normal') {
                            finalFilters = `[0:v]${safeBaseFilter}[vid];${preOvl};[vid]split=3[vid1][vid2][vid3];[vid2]colorchannelmixer=aa=0[canvas];[canvas][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100:format=auto[full_ovl];[full_ovl]split[full_ovl1][full_ovl2];[vid3][full_ovl1]blend=all_mode='${oBlend}':all_opacity=1[vid_blended];[vid1][vid_blended][full_ovl2]maskedmerge[m];[m][1:v]${paletteuseFilters}`;
                        } else {
                            finalFilters = `[0:v]${safeBaseFilter}[vid];${preOvl};[vid][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100[m];[m][1:v]${paletteuseFilters}`;
                        }
                    } else {
                        finalFilters = `[0:v]${safeBaseFilter}[v];[v][1:v]${paletteuseFilters}`;
                    }

                    await ffmpeg.run(...finalInputs, '-filter_complex', finalFilters, '-y', '/output.gif');
                    await finalizeOutput('/output.gif', 'image/gif');
                } else if (outputFormat === 'webp') {
                    if (dom.progressStatus) dom.progressStatus.textContent = 'Encoding WebP...';
                    if (dom.progressFill) dom.progressFill.style.width = '60%';

                    let webpInputs = ['-f', 'concat', '-safe', '0', '-i', '/concat.txt'];
                    let webpFilters = `[0:v]${baseFilterStr}[out]`;

                    if (state.imageOverlayBuffer) {
                        await ffmpeg.FS('writeFile', 'overlay.png', state.imageOverlayBuffer);
                        webpInputs.push('-i', 'overlay.png');
                        const oScale = (parseInt(dom.overlayScale?.value) || 100) / 100;
                        const oRot = dom.overlayRotation?.value || 0;
                        const oPosX = dom.overlayPosX?.value || 50;
                        const oPosY = dom.overlayPosY?.value || 50;
                        const oBlend = dom.overlayBlend?.value || 'normal';

                        let preOvl = `[1:v]scale=iw*${oScale}:-1`;
                        if (oRot !== 0) preOvl += `,rotate=${oRot}*PI/180:c=none`;
                        preOvl += `[ovl]`;

                        if (oBlend !== 'normal') {
                            webpFilters = `[0:v]${baseFilterStr}[vid];${preOvl};[vid]split=3[vid1][vid2][vid3];[vid2]colorchannelmixer=aa=0[canvas];[canvas][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100:format=auto[full_ovl];[full_ovl]split[full_ovl1][full_ovl2];[vid3][full_ovl1]blend=all_mode='${oBlend}':all_opacity=1[vid_blended];[vid1][vid_blended][full_ovl2]maskedmerge[out]`;
                        } else {
                            webpFilters = `[0:v]${baseFilterStr}[vid];${preOvl};[vid][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100[out]`;
                        }
                    }

                    await ffmpeg.run(
                        ...webpInputs,
                        '-filter_complex',
                        webpFilters,
                        '-map',
                        '[out]',
                        '-loop',
                        '0',
                        '-lossless',
                        '0',
                        '-q:v',
                        '75',
                        '-f',
                        'webp',
                        '-y',
                        '/output.webp'
                    );
                    await finalizeOutput('/output.webp', 'image/webp');
                } else if (outputFormat === 'apng') {
                    if (dom.progressStatus) dom.progressStatus.textContent = 'Encoding APNG...';
                    if (dom.progressFill) dom.progressFill.style.width = '60%';

                    let apngInputs = ['-f', 'concat', '-safe', '0', '-i', '/concat.txt'];
                    let apngFilters = `[0:v]${baseFilterStr}[out]`;

                    if (state.imageOverlayBuffer) {
                        await ffmpeg.FS('writeFile', 'overlay.png', state.imageOverlayBuffer);
                        apngInputs.push('-i', 'overlay.png');
                        const oScale = (parseInt(dom.overlayScale?.value) || 100) / 100;
                        const oRot = dom.overlayRotation?.value || 0;
                        const oPosX = dom.overlayPosX?.value || 50;
                        const oPosY = dom.overlayPosY?.value || 50;
                        const oBlend = dom.overlayBlend?.value || 'normal';

                        let preOvl = `[1:v]scale=iw*${oScale}:-1`;
                        if (oRot !== 0) preOvl += `,rotate=${oRot}*PI/180:c=none`;
                        preOvl += `[ovl]`;

                        if (oBlend !== 'normal') {
                            apngFilters = `[0:v]${baseFilterStr}[vid];${preOvl};[vid]split=3[vid1][vid2][vid3];[vid2]colorchannelmixer=aa=0[canvas];[canvas][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100:format=auto[full_ovl];[full_ovl]split[full_ovl1][full_ovl2];[vid3][full_ovl1]blend=all_mode='${oBlend}':all_opacity=1[vid_blended];[vid1][vid_blended][full_ovl2]maskedmerge[out]`;
                        } else {
                            apngFilters = `[0:v]${baseFilterStr}[vid];${preOvl};[vid][ovl]overlay=x=(W-w)*${oPosX}/100:y=(H-h)*${oPosY}/100[out]`;
                        }
                    }

                    await ffmpeg.run(
                        ...apngInputs,
                        '-filter_complex',
                        apngFilters,
                        '-map',
                        '[out]',
                        '-f',
                        'apng',
                        '-plays',
                        '0',
                        '-y',
                        '/output.png'
                    );
                    await finalizeOutput('/output.png', 'image/png');
                }

                // Cleanup slide files safely
                const slideFiles = state.slideshowImages.map((_, i) => `/slide_${String(i).padStart(4, '0')}.png`);
                await safeUnlinkAll(ffmpeg, '/', slideFiles);
            }
        }

        // Cleanup
        const artifacts = [
            '/input.mp4',
            '/palette.png',
            '/output.gif',
            '/output.webp',
            '/output.png',
            '/overlay_text.txt',
            '/concat.txt',
            '/overlay.png'
        ];
        await safeUnlinkAll(ffmpeg, '/', artifacts);
    } catch (error) {
        console.error('Conversion Error:', error);
        showToast(classifyFfmpegError(error));
        sendTelemetry({
            device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
            file_size_mb: 0,
            render_time_seconds: Number(((performance.now() - state._telemetryStartTime) / 1000).toFixed(2)),
            is_success: false,
            error_message: error.message || 'Unknown FFmpeg Error'
        });
    } finally {
        state.isFfmpegBusy = false;
        resetConversionState();
    }
}

/**
 * Finalizes the output by reading from FFmpeg FS and displaying it.
 */
export async function finalizeOutput(outputPath, mimeType) {
    try {
        const rawData = await ffmpeg.FS('readFile', outputPath);
        outputResult(new Uint8Array(rawData.buffer), mimeType);
    } catch (e) {
        console.error('Finalize Error:', e);
        throw e;
    }
}

/**
 * Displays result and handles telemetry
 */
export function outputResult(uint8data, mimeType = 'image/gif') {
    const formatLabel = mimeType === 'image/gif' ? 'GIF' : mimeType === 'image/webp' ? 'WebP' : 'APNG';
    const extension = mimeType === 'image/gif' ? 'gif' : mimeType === 'image/webp' ? 'webp' : 'png';
    const url = URL.createObjectURL(new Blob([uint8data], { type: mimeType }));

    if (dom.resultGif) {
        if (dom.resultGif.src) URL.revokeObjectURL(dom.resultGif.src);
        dom.resultGif.src = url;
        dom.resultGif.style.display = 'block';
    }
    if (dom.downloadBtn) {
        dom.downloadBtn.href = url;
        dom.downloadBtn.download = `sumosized-${Date.now()}.${extension}`;
        dom.downloadBtn.textContent = `⬇️ Download ${formatLabel}`;
    }
    dom.previewSection?.classList.add('active');
    showToast(`🔥 Elite ${formatLabel} Generated!`);
    if (dom.previewSection) dom.previewSection.scrollIntoView({ behavior: 'smooth' });

    // Ensure telemetry is sent for all successful conversions
    const fileSizeMb = uint8data.length / (1024 * 1024);
    sendTelemetry({
        device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        file_size_mb: Number(fileSizeMb.toFixed(2)),
        render_time_seconds: Number(((performance.now() - state._telemetryStartTime) / 1000).toFixed(2)),
        is_success: true,
        error_message: null
    });

    resetConversionState();
}
