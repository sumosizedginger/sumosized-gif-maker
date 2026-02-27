# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- **Branding Scale**: Quadrupled the header logo scale (from 60px to 240px) and centered the text alignment for maximum "Elite Studio" impact.
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
