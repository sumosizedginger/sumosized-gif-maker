import { describe, it, expect, beforeEach } from 'vitest';

// Stub the DOM before importing the module
beforeEach(() => {
    document.body.innerHTML = '<div id="activeFilterStack"></div>';
});

// Dynamic import after DOM is set up
const { addToFilterStack, removeFromFilterStack, clearFilterStack, renderFilterStack } =
    await import('../js/modules/filter-stack.js');
import { state } from '../js/modules/state.js';

describe('filter-stack logic', () => {
    beforeEach(() => {
        state.filterStack = [];
        document.body.innerHTML = '<div id="activeFilterStack"></div>';
    });

    it('adds a filter to the stack', () => {
        addToFilterStack('grayscale');
        expect(state.filterStack).toContain('grayscale');
    });

    it('removes a filter by index', () => {
        state.filterStack = ['grayscale', 'sepia'];
        removeFromFilterStack(0);
        expect(state.filterStack).toEqual(['sepia']);
    });

    it('clears all filters', () => {
        state.filterStack = ['grayscale', 'sepia', 'vhs'];
        clearFilterStack();
        expect(state.filterStack).toHaveLength(0);
    });

    it('caps the stack at 10 filters', () => {
        for (let i = 0; i < 12; i++) addToFilterStack('grain');
        expect(state.filterStack.length).toBeLessThanOrEqual(10);
    });

    it('reorders filters via move up', () => {
        state.filterStack = ['grayscale', 'sepia'];
        renderFilterStack();
        const downBtn = document.querySelector('.stack-item-move[data-dir="down"]');
        downBtn.click();
        expect(state.filterStack).toEqual(['sepia', 'grayscale']);
    });

    it('renders the correct number of stack items', () => {
        state.filterStack = ['grayscale', 'vhs', 'grain'];
        renderFilterStack();
        const items = document.querySelectorAll('.stack-item');
        expect(items.length).toBe(3);
    });
});
