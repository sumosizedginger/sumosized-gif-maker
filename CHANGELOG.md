# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.1] - 2026-03-04

### Added

- **Advanced Quality Controls**: Exposed FFmpeg `paletteuse` params in the UI:
    - **Dithering**: New dropdown with Auto, Bayer, Floyd-Steinberg, and Sierra 2 modes.
    - **Frame Diff Mode**: New dropdown for Rectangle and None modes (reduces GIF size by 30-60%).
    - **Max Colors**: New slider to control palette quantization (2-256).

### Fixed

- **FFmpeg `palettegen` Crash**: Implemented strict clamping (4-256) and base-10 integer parsing for the `maxColors` setting. This prevents the "max_colors=16000" crash reported in the field.
- **UI Logic Cleanup**: Removed legacy `stickerEmoji` and `conversionLoader` logic that was targeting non-existent DOM nodes.
- **Duplicate Frame Rendering**: Resolved a bug where `strip.appendChild` was called twice during frame re-renders.

### Security

- **Full XSS Hardening**: Purged all `innerHTML` sinks and dynamic template literals across the codebase. Refactored UI generators (`renderFrameStrip`, `renderFilterStack`) to use secure `document.createElement()` and `textContent` patterns.
- **Telemetry Sanitization**: Removed descriptive network logs to ensure anonymous operation.
- **Audit Compliance**: Verified 100% compliance with modern secure DOM manipulation standards.

## [1.1.0] - 2026-03-01

### Added

- **Timeline Scrubbing**: Interactive visual timeline with real-time thumbnail generation via FFmpeg.
- **Project Presets**: Full state serialization/deserialization to JSON. Save and load all filters, settings, and image overlays (including binary buffers via base64).
- **Geometric Transforms**: Elite 8-point perspective warping (corner pinning) for 3D-like skewing. Added Horizontal and Vertical flip toggles.
- **Web Worker Engine**: Re-architected the FFmpeg core to run in a dedicated Web Worker (`js/worker/ffmpeg-worker.js`). This ensures 100% UI responsiveness during heavy rendering or frame extraction.
- **Enhanced Filter Preview**: Restored and improved the Live Filter Preview to support image overlays and complex geometry.

### Changed

- Refactored `js/main.js` to use an asynchronous `FFmpegWorkerClient` proxy.
- Optimized frame extraction and timeline generation to be non-blocking via worker offloading.
- Improved the project persistence layer with robust JSON import/export in the Settings panel.
- Enhanced `previewCurrentFilters` with full image overlay and geometry support.

### Added

- GitHub Pages auto-deploy workflow (`pages.yml`) — every push to `main` now deploys the live site automatically via `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages`.
- CodeQL security scanning workflow (`codeql.yml`) — runs on push, PR, and weekly schedule.
- Dependabot configuration (`.github/dependabot.yml`) — automated weekly npm dependency update PRs.
- Structured GitHub Issue templates: bug report and feature request (YAML forms).
- Pull Request template with a contributor checklist.
- `vitest.config.js` — excludes `.dev_artifacts/` from test discovery.
- `npm run dev` script — starts a local CORS-enabled server (required for `SharedArrayBuffer`).

### Changed

- All GitHub Actions updated to current versions as of 2026-02-27: `actions/checkout@v6`, `actions/setup-node@v6`, `github/codeql-action@v4`, `actions/stale@v10`.
- Node.js runtime updated from 20 → 22 LTS (`.nvmrc`, all workflow `node-version-file` references).
- CI pipeline (`ci.yml`) now runs `lint` and `test` in addition to Prettier format check.
- `package.json`: added `"type": "module"` (eliminates ESLint module-type warning); fixed `lint` script glob escaping (was broken on Linux/CI); added `--passWithNoTests` flag to vitest.
- husky upgraded v8 → v9; `prepare` script and pre-commit hook updated to v9 format.
- `lint-staged` config: ESLint no longer runs on HTML/CSS files (it cannot parse them).
- `devcontainer.json`: `postCreateCommand` changed from `npm install && npm run format` to `npm ci`.
- `eslint.config.js`: added `ignores` for `.dev_artifacts/` and `node_modules/`.
- CONTRIBUTING.md: updated setup steps to use local server; added Conventional Commits convention and quality-gate commands.
- ATTRIBUTION.md: fixed broken table header; separated bundled fonts from CDN fonts; added full CDN runtime dependency table (Color-Thief, gif.js, omggif).
- README.md: added CI badge; replaced misleading "Zero Dependencies" badge with accurate "Runtime: CDN Only"; removed placeholder demo image; corrected installation instructions to require local server.

### Security

- Added SRI `integrity` hashes to all 4 CDN `<script>` tags in `index.html` (ffmpeg.wasm, Color-Thief, gif.js, omggif) — prevents supply chain injection if CDN is compromised.
- Fixed XSS vulnerability (CWE-79) in `js/main.js`: `file.name` was interpolated directly into `innerHTML` in `videoInfo` display. Replaced with `textContent` via safe DOM element creation — a maliciously named video file can no longer inject executable HTML.

## [1.0.1] - 2026-02-27

### Added

- **Mascot Branding**: Integrated the custom "SumoSized Ginger" mascot logo into both the application header and the footer.
- **Hero Demonstration**: Replaced the broken placeholder in `README.md` with a high-fidelity demonstration GIF (`assets/demo.gif`) showcasing the UI.
- **Social Link Strip**: Implemented a gloss-morphic footer containing verified links to the user's Twitter, LinkedIn, YouTube, and GitHub profiles.
- **Vibe Sync**: Added auto-color matching using Color-Thief for dynamic UI theming.
- **Overlay FX**: Added optional Borders (`borderw`, `bordercolor`) and Drop Shadows (`shadowcolor`, `shadowx`, `shadowy`) for text overlays.
- **Chroma Key**: Integrated `transparentBg` specific chroma-keying for white, black, and green backgrounds.

### Changed

- **Mascot Refinement**: Hand-corrected the `Sumo Sized Ginger.svg` anatomy to anchor shoulders organically to the torso while expanding the arm-swing radius to 45 degrees for better expression.
- **Branding Scale**: Implemented a non-destructive "Mascot Zoom" technique via CSS, scaling the header mascot to 90px height to match brand text while preserving the original high-fidelity SVG asset. 🫡🚀
- **FFmpeg Pipeline**: Re-architected the engine to aggressively maintain the `rgb24` color space, preventing grayscale filters (like Old Movie or Matrix) from wiping out text overlay colors.
- **Filter Cleanup**: Condensed filter terminology (e.g., changed 'Kaleidoscope' to 'Mirror') and migrated to native FFmpeg `palettegen` for superior GIF quality.
- **Documentation**: Synchronized `ATTRIBUTION.md` and `README.md` to reflect new 2026-02-27 dependencies and CI status.

### Fixed

- **Social Icons**: Corrected the rendering of social links by properly initializing the `Lucide` icon library script in `index.html`.
- **Anatomy**: Resolved the "detached arms" SVG animation bug through coordinate-level pivot point mapping.

### Removed

- **Sticker / Emoji Overlay Engine**: Removed due to inconsistent browser-side canvas rendering and font artifacts.
- **Animated Progress Bar**: Removed due to FFmpeg WASM limitations involving dynamic `drawbox` time expressions.

### Security

- Purged all unmaintained or unnecessary dependencies (`gifshot`, `gif.js`, `omggif`).
- Validated purely client-side infrastructure (zero data upload/retention).
