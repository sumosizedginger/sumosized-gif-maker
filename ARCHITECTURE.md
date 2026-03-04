# SumoSized GIF Maker — Architecture & Data Flow

This document maps the structural boundaries, data flow, and security constraints of the SumoSized GIF Maker.
Read this before touching `js/modules/`.

## 🏗️ Core Principles

1.  **Browser Native**: No bundlers. Pure ES Modules (`<script type="module">`).
2.  **Air-Gapped**: Zero external network calls. All dependencies (FFmpeg, UI icons) are fully locally vendored in `js/vendor/`.
3.  **Strict Isolation**: `SharedArrayBuffer` requires Cross-Origin Isolation (`COOP`/`COEP`). This is enforced via `coi-serviceworker.js`.

---

## 🗺️ Module Boundaries (`js/modules/`)

The application is structured into strict domains to maintain Model-View separation and testability.

### 1. State & UI (The "View")

- `ui.js`: Centralized DOM references and visual transitions (tabs, modes). Exposes the `dom` object.
- `events.js`: The central nervous system. Uses document-level event delegation (`document.addEventListener('click')`) to route user actions to the correct module.
- `state.js`: The shared singleton source of truth (video duration, crop coordinates, current mode). Minimal logic.

### 2. The Engine (FFmpeg Orchestration)

- `conversion.js`: The heavily orchestrated state machine that runs the GIF generation sequence. It triggers UI progress updates and interacts with the worker client.
- `ffmpeg-client.js`: A lightweight, Promise-based wrapper around the raw `js/worker/ffmpeg-worker.js`. _Mocked in Vitest for CI pipelines._

### 3. Pure Logic (The "Brain")

- `filters.js`: Contains `filterMap` and `buildBaseFilters()`. Operates entirely as pure functions receiving an `options` object. **Do not introduce DOM reads here.**
- `frames.js`: Logic for extracting individual frames and assembling them into the slideshow sequence.
- `utils.js`: Formatting, error classification, and file cleanup (`safeUnlinkAll`).

### 4. Interactive Tools

- `cropper.js`: Manages the visual crop overlay dragging and aspect ratio calculations.
- `timeline.js`: Manages precise scrubbing, thumbnail generation, and playhead synchronization.
- `predictor.js`: Live-updates the "Estimated Size" readout based on user inputs.

---

## 🌊 Data Flow: The Conversion Pipeline

When a user initiates a render, the data flows in a strict, predictable sequence:

1.  **Initiation**: User clicks "Elite Conversion" → `events.js` intercepts and calls `startConversion()` in `conversion.js`.
2.  **State Snapshot**: `conversion.js` calls `readFilterOptions()` from `filters.js` to freeze the current DOM/State into a pure `options` object.
3.  **Graph Generation**: The `options` object is passed to `buildBaseFilters()`. This returns an array of raw FFmpeg filter strings (e.g., `['scale=480:-2', 'vflip']`).
4.  **Worker Execution**: `conversion.js` writes necessary files to the internal FFmpeg filesystem (fonts, videos, frames) via `ffmpeg.FS()`.
5.  **Render Loop**:
    - _Pass 1_: FFmpeg generates a dynamic color palette (`palettegen`).
    - _Pass 2_: FFmpeg applies the palette (`paletteuse`) and composite filters to generate the final file.
6.  **Yield**: The binary buffer is read from `ffmpeg.FS()`, converted to a Blob URL, mapped to the output `<img>`, and `safeUnlinkAll()` wipes the virtual filesystem clean.

---

## 🧪 Testing Philosophy (Vitest)

- **Logic is Unit Tested**: Files like `filters.js` and `utils.js` must maintain 100% coverage.
- **The Engine is Headless**: `conversion.js` and pipeline integrations are tested using the manual `tests/__mocks__/ffmpeg-client.js`. This allows the full conversion flow to execute in Node.js (via Happy DOM) without needing the 20MB WASM binary or a real browser.
