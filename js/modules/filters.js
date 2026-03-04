/**
 * filters.js — FFmpeg Filter Chain Construction
 */
import { state } from './state.js';
import { dom } from './ui.js';
import { ffmpeg } from './ffmpeg-client.js';

export const filterMap = {
    grayscale: 'hue=s=0',
    sepia: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
    vibrant: 'eq=saturation=1.5:contrast=1.1',
    '8bit': 'scale=iw/4:-2,scale=iw*4:-2:flags=neighbor',
    dreamy: 'eq=contrast=0.8:brightness=0.05:saturation=0.7',
    golden: "curves=red='0/0 0.5/0.6 1/1':green='0/0 0.5/0.45 1/0.9':blue='0/0 0.5/0.3 1/0.7'",
    gladiator: 'eq=contrast=1.5:saturation=0.5:brightness=-0.05,colorchannelmixer=1.1:0:0:0:0:0.9:0:0:0:0:0.7:0',
    nightvision: 'colorchannelmixer=0:0:0:0:0.5:0.5:0:0:0:0:0:0,eq=brightness=0.1:saturation=2,noise=alls=15:allf=t+u',
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
    comic: 'edgedetect=low=0.1:high=0.2,negate,eq=contrast=1.5:saturation=2,format=gray,colorlevels=rimax=0.8:gimax=0.8:bimax=0.8',
    acid: "hue=h='t*180':s=2,curves=all='0/0 0.5/1 1/0'",
    sketch: 'edgedetect=low=0.1:high=0.4,negate,format=gray,curves=all="0/0 0.5/0.8 1/1"',
    infrared: 'curves=red="0/0.5 1/1":blue="0/0 1/0.2":green="0/0.5 1/0.8",eq=saturation=1.5',
    seahawks: 'colorchannelmixer=0.2:0.5:0.1:0:0.1:0.8:0.1:0:0.1:0.2:0.5',
    technicolor: 'colorchannelmixer=1:0:0:0:0:1:0.5:0:0:0.5:1,eq=saturation=1.2:contrast=1.1',
    golden2: 'curves=all="0/0 0.5/0.6 1/1",colorchannelmixer=1:0.1:0:0:0.1:0.9:0:0:0:0:0.6',
    posterize: 'elbg=codebook_length=8'
};

/**
 * Builds the array of FFmpeg filter strings based on user settings.
 */
export async function buildBaseFilters(
    resWidth,
    currentFps,
    speed,
    duration,
    overlayText,
    fontStyle,
    textSize,
    textPos
) {
    const baseFilters = [];
    const targetEl = state.currentMode === 'video' ? dom.videoPlayer : dom.imagePlaceholder;

    // A. Crop
    if (state.cropData.active && state.cropData.w > 0 && targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const realW = state.currentMode === 'video' ? dom.videoPlayer.videoWidth : dom.imagePlaceholder.naturalWidth;
        const realH = state.currentMode === 'video' ? dom.videoPlayer.videoHeight : dom.imagePlaceholder.naturalHeight;

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
        const cX = Math.round(Math.max(0, state.cropData.x - offsetX) * scaleX);
        const cY = Math.round(Math.max(0, state.cropData.y - offsetY) * scaleY);
        const cW = Math.min(Math.round(state.cropData.w * scaleX), realW - cX);
        const cH = Math.min(Math.round(state.cropData.h * scaleY), realH - cY);
        if (cW > 0 && cH > 0) baseFilters.push(`crop=${cW}:${cH}:${cX}:${cY}`);
    }

    // B. Speed
    if (speed !== 1 && state.currentMode === 'video') baseFilters.push(`setpts=${1 / speed}*PTS`);

    // B2. Rotate
    const rotateAngle = parseInt(dom.rotateAngle?.value) || 0;
    if (rotateAngle === 90) baseFilters.push('transpose=1');
    if (rotateAngle === 180) baseFilters.push('hflip,vflip');
    if (rotateAngle === 270) baseFilters.push('transpose=2');

    // C. Filter Stack
    state.filterStack.forEach((fId) => {
        if (filterMap[fId]) baseFilters.push(filterMap[fId]);
    });

    // C2. Transparent BG
    const transparentBg = dom.transparentBg?.value || 'off';
    const colorKeyMap = {
        white: 'colorkey=color=0xffffff:similarity=0.3:blend=0.1',
        black: 'colorkey=color=0x000000:similarity=0.3:blend=0.1',
        green: 'colorkey=color=0x00ff00:similarity=0.4:blend=0.1'
    };
    if (colorKeyMap[transparentBg]) baseFilters.push(colorKeyMap[transparentBg]);

    // D. Scale + FPS / Interpolation
    baseFilters.push(`scale=${resWidth}:-2:flags=lanczos`);
    const interpVal = dom.interpolation?.value || 'off';
    if (interpVal !== 'off' && state.currentMode === 'video') {
        baseFilters.push(`minterpolate=fps=${interpVal}:mi_mode=mci`);
    } else {
        baseFilters.push(`fps=${currentFps}`);
    }

    // D3. Motion Blur
    const blurVal = dom.motionBlur?.value || 'off';
    if (blurVal !== 'off' && state.currentMode === 'video') {
        const blurFrames = blurVal === 'low' ? 3 : blurVal === 'med' ? 5 : 10;
        baseFilters.push(`tmix=frames=${blurFrames}:weights=1`);
    }

    // E. Text Overlay
    if (overlayText) {
        const yPosMap = { top: '20', middle: '(h-text_h)/2', bottom: '(h-text_h-20)' };
        const yPos = yPosMap[textPos] || '(h-text_h-20)';
        const wordSpacing = parseInt(dom.wordSpacing?.value) || 0;
        const fontName = fontStyle.split('.')[0];
        const wrapped = wrapText(overlayText.trim(), resWidth * 0.8, textSize, fontName, wordSpacing);
        ffmpeg.FS('writeFile', 'overlay_text.txt', new TextEncoder().encode(wrapped));

        const lineSpacing = parseInt(dom.lineSpacing?.value) || 10;
        const useBox = dom.textBox?.value === '1' ? 1 : 0;
        const boxPadding = parseInt(dom.boxPadding?.value) || 10;
        const boxOpacity = dom.boxOpacity?.value || '0.5';

        let textColor = dom.textColor?.value || '#4DFF00';
        let borderColor = dom.borderColor?.value || 'black';
        let borderW = borderColor === 'none' ? 0 : 1;
        let actualBorderColor = borderColor === 'none' ? 'black' : borderColor;

        if (textColor.startsWith('#')) textColor = textColor.replace('#', '0x');
        if (actualBorderColor.startsWith('#')) actualBorderColor = actualBorderColor.replace('#', '0x');

        baseFilters.push('format=rgb24');
        baseFilters.push(
            `drawtext=fontfile=/${fontStyle}:textfile=/overlay_text.txt:fontsize=${textSize}:fontcolor=${textColor}:borderw=${borderW}:bordercolor=${actualBorderColor}:shadowcolor=black@0.4:shadowx=2:shadowy=2:line_spacing=${lineSpacing}:box=${useBox}:boxcolor=black@${boxOpacity}:boxborderw=${boxPadding}:x=(w-text_w)/2:y=${yPos}`
        );
    }

    // F. Perspective Warp
    const p_x0 = parseFloat(dom.p_x0?.value) ?? 0;
    const p_y0 = parseFloat(dom.p_y0?.value) ?? 0;
    const p_x1 = parseFloat(dom.p_x1?.value) ?? 100;
    const p_y1 = parseFloat(dom.p_y1?.value) ?? 0;
    const p_x2 = parseFloat(dom.p_x2?.value) ?? 0; // Bot-L in UI
    const p_y2 = parseFloat(dom.p_y2?.value) ?? 100; // Bot-L in UI
    const p_x3 = parseFloat(dom.p_x3?.value) ?? 100; // Bot-R in UI
    const p_y3 = parseFloat(dom.p_y3?.value) ?? 100; // Bot-R in UI

    const isChanged =
        p_x0 !== 0 ||
        p_y0 !== 0 ||
        p_x1 !== 100 ||
        p_y1 !== 0 ||
        p_x2 !== 0 ||
        p_y2 !== 100 ||
        p_x3 !== 100 ||
        p_y3 !== 100;

    if (isChanged) {
        // Validation: Ensure the quad is not collapsed or inverted too far
        // A basic check: Top-R should be to the right of Top-L, Bot-R to the right of Bot-L
        if (p_x1 > p_x0 && p_x3 > p_x2 && p_y2 > p_y0 && p_y3 > p_y1) {
            // Note: Map p_x3/y3 (Bot-R) to FFmpeg x2/y2, and p_x2/y2 (Bot-L) to FFmpeg x3/y3
            baseFilters.push('format=rgba');
            baseFilters.push(
                `perspective=x0=${p_x0}*W/100:y0=${p_y0}*H/100:x1=${p_x1}*W/100:y1=${p_y1}*H/100:x2=${p_x3}*W/100:y2=${p_y3}*H/100:x3=${p_x2}*W/100:y3=${p_y2}*H/100:sense=destination:interpolation=linear`
            );
        }
    }

    // G. H/V Flip
    if (dom.hFlip?.value === '1') baseFilters.push('hflip');
    if (dom.vFlip?.value === '1') baseFilters.push('vflip');

    return baseFilters;
}

/**
 * Resets perspective sliders to defaults.
 */
export function resetPerspective() {
    if (!dom.p_x0) return;
    dom.p_x0.value = 0;
    dom.p_y0.value = 0;
    dom.p_x1.value = 100;
    dom.p_y1.value = 0;
    dom.p_x2.value = 0; // Bot-L
    dom.p_y2.value = 100; // Bot-L
    dom.p_x3.value = 100; // Bot-R
    dom.p_y3.value = 100; // Bot-R

    // Trigger update
    import('./predictor.js').then((m) => m.updatePredictor?.());
}

export function wrapText(text, maxWidth, fontSize, fontName, wordSpacing = 0) {
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
