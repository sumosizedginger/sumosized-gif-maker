/**
 * project.js — Project Export/Import Persistence
 */
import { state } from './state.js';
import { dom, showToast } from './ui.js';
import { updatePredictor } from './predictor.js';

export function exportProject() {
    const project = {
        version: '1.0',
        timestamp: Date.now(),
        settings: {
            width: dom.gifWidth.value,
            fps: dom.fps.value,
            speed: dom.speed.value,
            loopMode: dom.loopMode.value
            // ... more
        },
        filterStack: state.filterStack
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sumosized-project-${Date.now()}.json`;
    a.click();
    showToast('💾 Project Exported');
}

export function importProject(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const project = JSON.parse(event.target.result);
            state.filterStack = project.filterStack || [];
            // update UI...
            updatePredictor();
            showToast('📂 Project Imported');
        } catch {
            showToast('❌ Failed to import project');
        }
    };
    reader.readAsText(file);
}
