import { describe, it, expect } from 'vitest';
import { formatTime } from '../js/modules/utils.js';

describe('formatTime', () => {
    it('formats 0 seconds as 00:00', () => {
        expect(formatTime(0)).toBe('00:00');
    });

    it('formats 61 seconds as 01:01', () => {
        expect(formatTime(61)).toBe('01:01');
    });

    it('formats 3600 seconds as 60:00', () => {
        expect(formatTime(3600)).toBe('60:00');
    });

    it('truncates decimal seconds (floors)', () => {
        expect(formatTime(5.9)).toBe('00:05');
    });

    it('returns 00:00 for NaN input', () => {
        expect(formatTime(NaN)).toBe('00:00');
    });

    it('pads single-digit minutes and seconds', () => {
        expect(formatTime(9)).toBe('00:09');
        expect(formatTime(60)).toBe('01:00');
    });
});
