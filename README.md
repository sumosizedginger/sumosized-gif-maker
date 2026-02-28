# SumoSized GIF Maker — Local Browser Video to GIF Converter

Convert video to GIF locally in your browser using WebAssembly. This tool processes files entirely client-side against a locally vendored FFmpeg.wasm instance, eliminating external server dependencies. [Live Demo](https://sumosizedginger.github.io/sumosized-gif-maker/)

[![CI](https://github.com/sumosizedginger/sumosized-gif-maker/actions/workflows/ci.yml/badge.svg)](https://github.com/sumosizedginger/sumosized-gif-maker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Infrastructure: Fully Vendored](https://img.shields.io/badge/Runtime-Fully_Local-blue.svg)](#-the-tech-stack)
[![FFmpeg](https://img.shields.io/badge/Engine-FFmpeg.wasm-red.svg)](https://github.com/ffmpegwasm/ffmpeg.wasm)

<div align="center">
  <img src="assets/demo.gif" alt="SumoSized GIF Maker Dashboard preview" width="800"/>
</div>

A straightforward utility for generating high-fidelity GIFs without uploading your media to a third-party server.

## 🚀 Features

- **FFmpeg Engine**: Utilizes WebAssembly for local video encoding.
- **Filter Pre-sets**: Includes over 30 visual filters (e.g., Matrix, VHS, color isolation).
- **Editor Controls**: Frame range selection, playback speed adjustments, and aspect-ratio cropping.
- **Overlay Tools**: Custom typography overlays with independent border and drop-shadow parameters.
- **Chroma Key**: Background transparency removal natively supported.

## ⚠️ Technical Limits & Hardware Expectations (Important)

Because this tool relies on WebAssembly and `SharedArrayBuffer` within the browser ecosystem, you must be aware of the following constraints:

- **Browser Memory Caps**: Browsers strictly limit tab memory (often 2GB - 4GB). Attempting to process 4K video, highly complex multi-filter chains, or clips longer than 15-20 seconds may silently crash the tab.
- **Recommended Usage**: Keep input videos under 50MB and target GIF lengths under 10 seconds for stable execution.
- **Mobile Hardware**: Processing on iOS Safari or Android devices is highly unstable and largely unsupported due to strict mobile OS memory management. Desktop usage is strongly recommended.
- **Hardware Acceleration**: Encoding relies on your local CPU. Older machines, laptops without dedicated cooling, or Chromebooks will experience significantly slower processing times and high fan usage.

## 📦 Installation & Local Usage

This application requires `SharedArrayBuffer` to function, which mandates strict Cross-Origin Isolation (COOP/COEP) headers. **You cannot open `index.html` directly from your filesystem.**

A local server must be used. Execute the following block exactly:

```bash
git clone https://github.com/sumosizedginger/sumosized-gif-maker.git
cd sumosized-gif-maker

# Ensure you have Node.js installed
npm install

# Start the local development server (handles COOP/COEP headers via coi-serviceworker)
npm run dev

# Open http://localhost:3000 in a modern browser (Chrome, Edge, Firefox)
```

_Note: Due to the `coi-serviceworker.js` workaround for COOP/COEP, the page may automatically reload once on your very first visit to register the worker. This is expected behavior._

## 🛡️ Project Security & Supply Chain

- **Zero Server Uploads**: Your video file is never transmitted over the network.
- **Locally Vendored**: As of version 1.0.2, all critical dependencies (`ffmpeg.wasm`, `color-thief`, `gif.js`, `lucide`) have been physically downloaded and vendored into the `js/vendor/` directory. The application makes **zero external CDN requests** during operation, securing the supply chain against malicious package injection.

## ⚖️ Attribution

See [ATTRIBUTION.md](ATTRIBUTION.md) for a full list of dependencies and their respective licenses.
