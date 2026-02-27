# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
