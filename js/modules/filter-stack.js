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
    list.textContent = '';
    state.filterStack.forEach((fId, index) => {
        const item = document.createElement('div');
        item.className = 'stack-item';

        const label = document.createElement('span');
        label.className = 'stack-item-label';
        label.textContent = fId;
        item.appendChild(label);

        const actions = document.createElement('div');
        actions.className = 'stack-item-actions';

        const createMoveBtn = (dir, text) => {
            const btn = document.createElement('button');
            btn.className = 'stack-item-move';
            btn.dataset.dir = dir;
            btn.setAttribute('aria-label', `Move ${fId} ${dir}`);
            btn.textContent = text;
            if ((dir === 'up' && index === 0) || (dir === 'down' && index === state.filterStack.length - 1)) {
                btn.disabled = true;
            }
            btn.addEventListener('click', () => {
                const newIdx = dir === 'up' ? index - 1 : index + 1;
                if (newIdx >= 0 && newIdx < state.filterStack.length) {
                    [state.filterStack[index], state.filterStack[newIdx]] = [
                        state.filterStack[newIdx],
                        state.filterStack[index]
                    ];
                    renderFilterStack();
                }
            });
            return btn;
        };

        const btnUp = createMoveBtn('up', '↑');
        const btnDown = createMoveBtn('down', '↓');

        const btnRemove = document.createElement('button');
        btnRemove.className = 'stack-item-remove';
        btnRemove.setAttribute('aria-label', `Remove ${fId}`);
        btnRemove.textContent = '×';
        btnRemove.addEventListener('click', () => {
            removeFromFilterStack(index);
        });

        actions.appendChild(btnUp);
        actions.appendChild(btnDown);
        actions.appendChild(btnRemove);
        item.appendChild(actions);

        list.appendChild(item);
    });
}
