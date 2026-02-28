# SumoSized GIF Maker // Local Video-to-GIF Converter

Convert video to GIF locally. In your browser. No cloud, no external servers.
This tool processes files entirely client-side using WebAssembly and a locally vendored FFmpeg.wasm instance.
Network transmission is an unacceptable risk for your media. We killed it.

[Live Demo](https://sumosizedginger.github.io/sumosized-gif-maker/)

[![CI](https://github.com/sumosizedginger/sumosized-gif-maker/actions/workflows/ci.yml/badge.svg)](https://github.com/sumosizedginger/sumosized-gif-maker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Infrastructure: Fully Vendored](https://img.shields.io/badge/Runtime-Fully_Local-blue.svg)](#-supply-chain-security)
[![FFmpeg](https://img.shields.io/badge/Engine-FFmpeg.wasm-red.svg)](https://github.com/ffmpegwasm/ffmpeg.wasm)

<div align="center">
  <img src="assets/demo.gif" alt="SumoSized GIF Maker Dashboard preview" width="800"/>
</div>

A high-fidelity GIF generator built for local execution. You don't upload your media to third-party servers. We don't want your data. Keep it on your machine.

## 🚀 Arsenal

- **FFmpeg Engine**: WebAssembly drives the video encoding locally. Pure client-side execution.
- **Filter Pre-sets**: Over 30 visual filters (e.g., Matrix, VHS, color isolation) ready to deploy.
- **Editor Controls**: Precision frame limits, playback speed adjustments, and aspect-ratio cropping.
- **Overlay Tools**: Custom typography with independent border and drop-shadow parameters.
- **Chroma Key**: Native background transparency removal.

## ⚠️ Strategic Constraints (Hardware Limits)

This tool runs on WebAssembly and `SharedArrayBuffer`. Browsers have hard limits. Acknowledge these constraints before operating:

- **Browser Memory Caps**: Tabs hard-cap memory at 2GB - 4GB. Push 4K video, complex filter chains, or clips past 15 seconds, and the tab will silently crash. Know your limits.
- **Optimal Envelope**: Keep input under 50MB. Target output under 10 seconds. Anything else is pushing the line.
- **Mobile Hardware**: iOS Safari and Android aggressively kill high-memory tabs. Mobile is unsupported. Use a desktop.
- **Hardware Acceleration**: Encoding burns your local CPU. Older rigs or laptops without dedicated cooling will throttle hard and max out their fans.

## 📦 Deployment

`SharedArrayBuffer` mandates strict Cross-Origin Isolation (COOP/COEP) headers. **Do not open `index.html` directly from your filesystem. It will fail.**

You need a local server. Execute this exact sequence:

```bash
git clone https://github.com/sumosizedginger/sumosized-gif-maker.git
cd sumosized-gif-maker

# Install Node.js dependencies
npm install

# Start local server. Handles COOP/COEP via coi-serviceworker
npm run dev

# Access at http://localhost:3000
```

_Note: The `coi-serviceworker.js` forces a reload on your first visit to register the worker. Let it run._

## 🛡️ Supply Chain Security

- **Air-Gapped Operation**: Your video file never hits the network. Pure local execution.
- **Locally Vendored**: Core dependencies (`ffmpeg.wasm`, `color-thief`, `gif.js`, `lucide`) live in the `js/vendor/` directory. Zero external CDN requests during operation. We secured the supply chain by severing it from the outside world.

## ⚖️ Attribution

See [ATTRIBUTION.md](ATTRIBUTION.md) for the full manifest of dependencies and licenses.
