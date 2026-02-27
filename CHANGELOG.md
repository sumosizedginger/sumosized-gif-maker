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

## [1.0.1] - 2026-02-27
### Added
- "Vibe Sync" auto-color matching using Color-Thief.
- Optional Borders (`borderw`, `bordercolor`) and Drop Shadows (`shadowcolor`, `shadowx`, `shadowy`) for text overlays.
- `transparentBg` specific chroma-keying for white, black, and green backgrounds.

### Changed
- Re-architected FFmpeg output pipeline to aggressively maintain the `rgb24` color space, preventing grayscale filters (like Old Movie or Matrix) from wiping out text overlay colors due to YUV limited-range clamping.
- Condensed filter terminology (e.g., changed 'Kaleidoscope' to 'Mirror' (`hflip`)).
- Migrated GIF encoder from `gifshot` back to native FFmpeg `palettegen` for superior quality and removed dead library dependencies.

### Removed
- **Sticker / Emoji Overlay engine** removed. The feature proved too unstable in browser-side canvas-to-FFmpeg rendering, leading to visual artifacts and inconsistent cross-platform font rendering.
- **Animated Progress Bar** removed due to FFmpeg WASM limitations involving the `drawbox` filter not correctly evaluating dynamic time (`t`) expressions for width over a linear `-vf` sequence.

### Security
- Purged all unmaintained or unnecessary dependencies (`gifshot`, `gif.js`, `omggif`).
- Validated purely client-side infrastructure (zero data upload/retention).
