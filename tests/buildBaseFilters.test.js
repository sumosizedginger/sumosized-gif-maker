/**
 * buildBaseFilters.test.js — Pure filter graph construction tests (Strike 3)
 *
 * Tests the FFmpeg filter chain builder in Node.js without any browser,
 * DOM, or WASM binary. All inputs are injected as plain objects.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (must come before any import of the module under test) ─────────────

vi.mock('../js/modules/ffmpeg-client.js', () => ({
    ffmpeg: { FS: vi.fn().mockResolvedValue(undefined), isLoaded: () => false },
    fetchFile: vi.fn()
}));

vi.mock('../js/modules/state.js', () => ({
    state: {
        filterStack: [],
        cropData: { active: false, x: 0, y: 0, w: 0, h: 0 },
        currentMode: 'video'
    }
}));

vi.mock('../js/modules/ui.js', () => ({
    dom: {
        videoPlayer: null,
        imagePlaceholder: null,
        videoContainer: null,
        rotateAngle: null,
        transparentBg: null,
        interpolation: null,
        motionBlur: null,
        textColor: null,
        borderColor: null,
        wordSpacing: null,
        lineSpacing: null,
        textBox: null,
        boxPadding: null,
        boxOpacity: null,
        hFlip: null,
        vFlip: null,
        p_x0: null,
        p_y0: null,
        p_x1: null,
        p_y1: null,
        p_x2: null,
        p_y2: null,
        p_x3: null,
        p_y3: null
    }
}));

const { buildBaseFilters } = await import('../js/modules/filters.js');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal valid options object — mirrors what readFilterOptions() produces. */
function makeOpts(overrides = {}) {
    return {
        resWidth: 480,
        currentFps: 15,
        speed: 1,
        overlayText: '',
        fontStyle: 'Arimo-Regular.ttf',
        textSize: 32,
        textPos: 'bottom',
        currentMode: 'video',
        cropData: { active: false, x: 0, y: 0, w: 0, h: 0 },
        filterStack: [],
        rotateAngle: 0,
        transparentBg: 'off',
        interpolation: 'off',
        motionBlur: 'off',
        wordSpacing: 0,
        lineSpacing: 10,
        useBox: 0,
        boxPadding: 10,
        boxOpacity: '0.5',
        textColor: '#4DFF00',
        borderColor: 'black',
        p_x0: 0,
        p_y0: 0,
        p_x1: 100,
        p_y1: 0,
        p_x2: 0,
        p_y2: 100,
        p_x3: 100,
        p_y3: 100,
        hFlip: false,
        vFlip: false,
        imagePlaceholderNaturalWidth: 0,
        imagePlaceholderNaturalHeight: 0,
        videoWidth: 1920,
        videoHeight: 1080,
        videoContainerRect: null,
        ...overrides
    };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('buildBaseFilters — baseline (no filters, no overlays)', () => {
    it('always emits scale and fps filters', async () => {
        const filters = await buildBaseFilters(makeOpts());
        const str = filters.join(',');
        expect(str).toContain('scale=480:-2:flags=lanczos');
        expect(str).toContain('fps=15');
    });

    it('returns an Array', async () => {
        const result = await buildBaseFilters(makeOpts());
        expect(Array.isArray(result)).toBe(true);
    });
});

describe('buildBaseFilters — speed', () => {
    it('adds setpts for speed != 1 in video mode', async () => {
        const filters = await buildBaseFilters(makeOpts({ speed: 2, currentMode: 'video' }));
        expect(filters.join(',')).toContain('setpts=0.5*PTS');
    });

    it('does NOT add setpts in image mode even if speed != 1', async () => {
        const filters = await buildBaseFilters(makeOpts({ speed: 2, currentMode: 'image' }));
        expect(filters.join(',')).not.toContain('setpts');
    });
});

describe('buildBaseFilters — rotate', () => {
    it('adds transpose=1 for 90°', async () => {
        const f = await buildBaseFilters(makeOpts({ rotateAngle: 90 }));
        expect(f).toContain('transpose=1');
    });

    it('adds hflip,vflip for 180°', async () => {
        const f = await buildBaseFilters(makeOpts({ rotateAngle: 180 }));
        expect(f).toContain('hflip,vflip');
    });

    it('adds transpose=2 for 270°', async () => {
        const f = await buildBaseFilters(makeOpts({ rotateAngle: 270 }));
        expect(f).toContain('transpose=2');
    });

    it('adds nothing for 0° (no rotate)', async () => {
        const f = await buildBaseFilters(makeOpts({ rotateAngle: 0 }));
        expect(f.join(',')).not.toContain('transpose');
    });
});

describe('buildBaseFilters — filter stack', () => {
    it('applies a single filter from the filter stack', async () => {
        const f = await buildBaseFilters(makeOpts({ filterStack: ['grayscale'] }));
        expect(f.join(',')).toContain('hue=s=0');
    });

    it('applies multiple stacked filters in order', async () => {
        const f = await buildBaseFilters(makeOpts({ filterStack: ['grayscale', 'invert'] }));
        const str = f.join(',');
        const posGray = str.indexOf('hue=s=0');
        const posNeg = str.indexOf('negate');
        expect(posGray).toBeGreaterThanOrEqual(0);
        expect(posNeg).toBeGreaterThan(posGray);
    });

    it('ignores unknown filter IDs without throwing', async () => {
        await expect(buildBaseFilters(makeOpts({ filterStack: ['nonexistent_filter'] }))).resolves.toBeDefined();
    });
});

describe('buildBaseFilters — transparent background', () => {
    it('adds colorkey for white background removal', async () => {
        const f = await buildBaseFilters(makeOpts({ transparentBg: 'white' }));
        expect(f.join(',')).toContain('colorkey=color=0xffffff');
    });

    it('adds colorkey for green screen', async () => {
        const f = await buildBaseFilters(makeOpts({ transparentBg: 'green' }));
        expect(f.join(',')).toContain('colorkey=color=0x00ff00');
    });

    it('adds nothing for "off"', async () => {
        const f = await buildBaseFilters(makeOpts({ transparentBg: 'off' }));
        expect(f.join(',')).not.toContain('colorkey');
    });
});

describe('buildBaseFilters — flip', () => {
    it('adds hflip when hFlip is true', async () => {
        const f = await buildBaseFilters(makeOpts({ hFlip: true }));
        expect(f.join(',')).toContain('hflip');
    });

    it('adds vflip when vFlip is true', async () => {
        const f = await buildBaseFilters(makeOpts({ vFlip: true }));
        expect(f.join(',')).toContain('vflip');
    });

    it('adds both flip filters when both are true', async () => {
        const f = await buildBaseFilters(makeOpts({ hFlip: true, vFlip: true }));
        const str = f.join(',');
        expect(str).toContain('hflip');
        expect(str).toContain('vflip');
    });
});

describe('buildBaseFilters — motion blur (video only)', () => {
    it('adds tmix for low blur in video mode', async () => {
        const f = await buildBaseFilters(makeOpts({ motionBlur: 'low', currentMode: 'video' }));
        expect(f.join(',')).toContain('tmix=frames=3');
    });

    it('adds tmix=frames=10 for high blur', async () => {
        const f = await buildBaseFilters(makeOpts({ motionBlur: 'high', currentMode: 'video' }));
        expect(f.join(',')).toContain('tmix=frames=10');
    });

    it('does NOT add tmix in image mode', async () => {
        const f = await buildBaseFilters(makeOpts({ motionBlur: 'high', currentMode: 'image' }));
        expect(f.join(',')).not.toContain('tmix');
    });
});

describe('buildBaseFilters — output format (fps vs interpolation)', () => {
    it('uses minterpolate in video mode when interpolation is set', async () => {
        const f = await buildBaseFilters(makeOpts({ interpolation: '60', currentMode: 'video' }));
        expect(f.join(',')).toContain('minterpolate=fps=60');
    });

    it('falls back to fps filter when interpolation is off', async () => {
        const f = await buildBaseFilters(makeOpts({ interpolation: 'off' }));
        expect(f.join(',')).toContain('fps=15');
    });
});
