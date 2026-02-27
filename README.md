# SumoSized GIF Maker — Free Browser-Based Video to GIF Converter

Convert video to GIF directly in your browser. No uploads, no server, no dependency vulnerabilities. Powered by FFmpeg.wasm. [Live Demo](https://sumosizedginger.github.io/sumosized-gif-maker/)

[![CI](https://github.com/sumosizedginger/sumosized-gif-maker/actions/workflows/ci.yml/badge.svg)](https://github.com/sumosizedginger/sumosized-gif-maker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Runtime: CDN Only](https://img.shields.io/badge/Runtime-CDN_Only-orange.svg)](#-the-tech-stack)
[![Client Side Processing](https://img.shields.io/badge/Processing-100%25_Browser-blue.svg)](#)
[![FFmpeg](https://img.shields.io/badge/Engine-FFmpeg.wasm-red.svg)](https://github.com/ffmpegwasm/ffmpeg.wasm)

The undisputed king of browser-based GIF creation. No servers, no tracking, just professional-grade GIF processing directly in your browser using **FFmpeg.wasm**.

## 🚀 The "Jealousy" Features
- **Elite FFmpeg Engine**: High-fidelity video encoding without server lag.
- **Cinematic Filters**: 30+ pro-grade presets including Matrix, VHS, and Action Green.
- **Precision Control**: Frame-level editor, variable speed, and aspect-ratio cropping.
- **Pro Overlays**: High-readability text with independent Border & Shadow controls.
- **Vibe Sync**: Dynamic UI color-matching based on your video content.


## 🛠️ The Tech Stack
- **Core**: HTML5, Vanilla CSS3, Modern JavaScript
- **Engine**: [FFmpeg.wasm](https://ffmpegwasm.netlify.app/)
- **Security**: Cross-Origin Isolation via `coi-serviceworker`

## 📦 Local Installation

This app uses `SharedArrayBuffer`, which requires COOP/COEP security headers. A local server is needed — opening `index.html` directly from the filesystem will not work.

```bash
git clone https://github.com/sumosizedginger/sumosized-gif-maker.git
cd sumosized-gif-maker
npm install
npm run dev
# Open http://localhost:3000 in Chrome, Edge, or Firefox
```

Or without Node.js:
```bash
npx serve . --cors
# Open http://localhost:3000
```

## 🛡️ Privacy & Security
- **Zero Server Uploads**: Your video never leaves your machine. All processing happens in your browser's memory using WebAssembly.
- **No Tracking**: No analytics, no cookies, no BS.
- **Cross-Origin Isolated**: Built with high-security headers to protect your local environment.

## 📜 Legal & Disclaimer
- **License**: This project is licensed under the [MIT License](LICENSE).
- **Disclaimer**: **USE AT YOUR OWN RISK.** The creators of this tool are not responsible for the content you generate. Users must ensure they have the legal right to any video they process and comply with all copyright laws. This software is provided "as is", without warranty of any kind. 🫡

## ⚖️ Attribution
See [ATTRIBUTION.md](ATTRIBUTION.md) for a full list of dependencies and their respective licenses.
