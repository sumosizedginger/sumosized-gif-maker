/**
 * filter-stack.js — UI for Active Filter Layers
 */
import { state } from './state.js';
import { showToast } from './ui.js';

/**
 * PRESET SLOTS — localStorage-backed filter stack save/load.
 * Regular click: load if slot has data, save if slot is empty.
 * Shift+click: always save (override existing).
 */
export function handlePresetSlot(slot, shiftKey) {
    const key = `sumo_preset_${slot}`;
    if (shiftKey || !localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(state.filterStack));
        const btn = document.querySelector(`.preset-btn[data-slot="${slot}"]`);
        if (btn) btn.classList.add('preset-filled');
        showToast(`Preset ${slot} saved.`);
    } else {
        state.filterStack = JSON.parse(localStorage.getItem(key));
        renderFilterStack();
        showToast(`Preset ${slot} loaded.`);
    }
}

export function initPresetUI() {
    document.querySelectorAll('.preset-btn[data-slot]').forEach((btn) => {
        if (localStorage.getItem(`sumo_preset_${btn.dataset.slot}`)) {
            btn.classList.add('preset-filled');
        }
    });
}

export function addToFilterStack(filterId) {
    if (state.filterStack.length >= 10) {
        return; // capped at 10
    }
    state.filterStack.push(filterId);
    renderFilterStack();
}

export function removeFromFilterStack(index) {
    state.filterStack.splice(index, 1);
    renderFilterStack();
}

export function clearFilterStack() {
    state.filterStack = [];
    renderFilterStack();
}

export function renderFilterStack() {
    const list = document.getElementById('activeFilterStack');
    if (!list) return;
    list.innerHTML = '';

    state.filterStack.forEach((fId, index) => {
        const item = document.createElement('div');
        item.className = 'stack-item';
        item.innerHTML = `
            <span class="stack-item-label">${fId}</span>
            <div class="stack-item-actions">
                <button class="stack-item-move" data-dir="up" aria-label="Move ${fId} up" ${index === 0 ? 'disabled' : ''}>↑</button>
                <button class="stack-item-move" data-dir="down" aria-label="Move ${fId} down" ${index === state.filterStack.length - 1 ? 'disabled' : ''}>↓</button>
                <button class="stack-item-remove" aria-label="Remove ${fId}">×</button>
            </div>
        `;

        item.querySelectorAll('.stack-item-move').forEach((btn) => {
            btn.addEventListener('click', () => {
                const dir = btn.dataset.dir;
                const newIdx = dir === 'up' ? index - 1 : index + 1;
                if (newIdx >= 0 && newIdx < state.filterStack.length) {
                    [state.filterStack[index], state.filterStack[newIdx]] = [
                        state.filterStack[newIdx],
                        state.filterStack[index]
                    ];
                    renderFilterStack();
                }
            });
        });

        item.querySelector('.stack-item-remove').addEventListener('click', () => {
            removeFromFilterStack(index);
        });

        list.appendChild(item);
    });
}
