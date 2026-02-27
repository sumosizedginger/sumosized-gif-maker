const { test, describe } = require('node:test');
const assert = require('node:assert');
const { formatTime } = require('../js/utils.js');

describe('formatTime', () => {
    test('formats 0 seconds correctly', () => {
        assert.strictEqual(formatTime(0), '0:00');
    });

    test('formats less than 10 seconds with padding', () => {
        assert.strictEqual(formatTime(5), '0:05');
    });

    test('formats tens of seconds without additional padding', () => {
        assert.strictEqual(formatTime(15), '0:15');
    });

    test('formats minutes correctly', () => {
        assert.strictEqual(formatTime(60), '1:00');
        assert.strictEqual(formatTime(65), '1:05');
        assert.strictEqual(formatTime(125), '2:05');
    });

    test('formats large durations correctly', () => {
        assert.strictEqual(formatTime(3600), '60:00');
        assert.strictEqual(formatTime(3661), '61:01');
    });

    test('handles float values by flooring', () => {
        assert.strictEqual(formatTime(5.9), '0:05');
        assert.strictEqual(formatTime(60.1), '1:00');
    });
});
