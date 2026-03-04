import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ffmpeg-client so Worker is never constructed
vi.mock('../js/modules/ffmpeg-client.js', () => ({
    ffmpeg: { FS: vi.fn(), isLoaded: () => false },
    fetchFile: vi.fn()
}));

// Mock state and ui (filters.js imports them at module level)
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

const { filterMap, wrapText } = await import('../js/modules/filters.js');

// Provide a deterministic measureText stub via happy-dom's canvas
beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = () => ({
        font: '',
        measureText: (text) => ({ width: text.length * 10 })
    });
});

describe('filterMap', () => {
    it('exports an object', () => {
        expect(typeof filterMap).toBe('object');
    });

    it('has at least 20 filter entries', () => {
        expect(Object.keys(filterMap).length).toBeGreaterThanOrEqual(20);
    });

    it('grayscale filter uses hue saturation filter', () => {
        expect(filterMap.grayscale).toContain('hue=s=0');
    });

    it('all filter values are non-empty strings', () => {
        for (const [key, val] of Object.entries(filterMap)) {
            expect(typeof val, `filter "${key}" should be a string`).toBe('string');
            expect(val.length, `filter "${key}" should not be empty`).toBeGreaterThan(0);
        }
    });

    it('invert filter uses negate', () => {
        expect(filterMap.invert).toBe('negate');
    });

    it('mirror filter uses hflip', () => {
        expect(filterMap.mirror).toBe('hflip');
    });
});

describe('wrapText', () => {
    it('returns the text unchanged when it fits on one line', () => {
        // measureText: chars * 10, maxWidth=1000 → "Hello" = 50px, fits
        const result = wrapText('Hello', 1000, 24, 'Arial');
        expect(result).toBe('Hello');
    });

    it('wraps text into multiple lines when it exceeds maxWidth', () => {
        // maxWidth=50 → each word of 4+ chars wraps (e.g. "one"=30, "two"=30 → line breaks at 60)
        const result = wrapText('alpha beta gamma delta', 50, 24, 'Arial');
        expect(result.split('\n').length).toBeGreaterThan(1);
    });

    it('handles empty string without throwing', () => {
        expect(() => wrapText('', 480, 24, 'Arial')).not.toThrow();
    });

    it('applies word spacing as repeated spaces between words', () => {
        // wordSpacing=2 → join with 3 spaces
        const result = wrapText('hello world', 1000, 24, 'Arial', 2);
        expect(result).toContain('   ');
    });
});
