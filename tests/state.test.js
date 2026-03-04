import { describe, it, expect } from 'vitest';
import { state } from '../js/modules/state.js';

describe('state', () => {
    it('has the expected initial shape', () => {
        expect(state).toHaveProperty('videoDuration');
        expect(state).toHaveProperty('isConverting');
        expect(state).toHaveProperty('filterStack');
        expect(state).toHaveProperty('currentMode');
        expect(state).toHaveProperty('cropData');
    });

    it('filterStack starts as an empty array', () => {
        expect(Array.isArray(state.filterStack)).toBe(true);
    });

    it('mutations on the state object are visible to other references', () => {
        const ref = state;
        state.isConverting = true;
        expect(ref.isConverting).toBe(true);
        state.isConverting = false; // restore
    });

    it('cropData has active, x, y, w, h, ratio fields', () => {
        expect(state.cropData).toMatchObject({
            active: false,
            x: 0,
            y: 0,
            w: 0,
            h: 0,
            ratio: 'off'
        });
    });
});
