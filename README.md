# SumoSized GIF Maker // Local Video-to-GIF Converter

Convert video to GIF locally. In your browser. No cloud, no external servers.
This tool processes files entirely client-side using WebAssembly and a locally vendored FFmpeg.wasm instance.
Network transmission is an unacceptable risk for your media. We killed it.

[Live Demo](https://sumosizedginger.github.io/sumosized-gif-maker/)

[![CI](https://github.com/sumosizedginger/sumosized-gif-maker/actions/workflows/ci.yml/badge.svg)](https://github.com/sumosizedginger/sumosized-gif-maker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Infrastructure: Fully Vendored](https://img.shields.io/badge/Runtime-Fully_Local-blue.svg)](#-supply-chain-security)
[![Engine: FFmpeg.wasm](https://img.shields.io/badge/Engine-FFmpeg.wasm-red.svg)](https://github.com/ffmpegwasm/ffmpeg.wasm)
[![Security: XSS Hardened](https://img.shields.io/badge/Security-XSS_Hardened-green.svg)](#-security-posture)

<div align="center">
  <img src="assets/demo.gif" alt="SumoSized GIF Maker Dashboard preview" width="800"/>
</div>

A high-fidelity GIF generator built for local execution. You don't upload your media to third-party servers. We don't want your data. Keep it on your machine.

## 🚀 Arsenal

- **FFmpeg Engine**: WebAssembly-powered, running in a dedicated **Web Worker** for 100% UI responsiveness during heavy renders.
- **Advanced Quality Controls**: Elite-grade tuning including **Dithering** (Bayer, Floyd-Steinberg, Sierra), **Frame Diffing** (Rectangle mode), and **Color Quantization** (2-256 scale).
- **Geometric Warp**: 8-point perspective corner-pinning and H/V spatial flipping for precision layout.
- **Timeline Studio**: Visual scrubbing with real-time thumbnail generation and frame-level delay editing.
- **Filter Stack**: Layer up to 10 cinematic filters simultaneously with drag-and-drop reordering.
- **Live Preview**: Instant visual feedback on composite filter stacks before rendering.
- **WebP & APNG Support**: Support for modern animated formats with high-performance compression.
- **Advanced Smoothing**: Integrated motion blur and frame interpolation (mci) for cinematic results.
- **Project Presets**: Save/load entire studio states (filters, overlays, settings) via JSON for session recovery.

## 🎨 Elite Output Showcase

Behold the power of local rendering. High-fidelity, optimized, and processed entirely on your machine.

| Format            | Elite Render Example                                                          | Tech Stack                            |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------------------- |
| **Elite GIF**     | ![sumosized-1772646131123.gif](assets/examples/sumosized-1772646131123.gif)   | `palettegen` + `paletteuse` (Bayer 5) |
| **Animated WebP** | ![sumosized-1772646268386.webp](assets/examples/sumosized-1772646268386.webp) | `-loop 0` + `lossless 0`              |
| **Elite APNG**    | ![sumosized-1772646218367.png](assets/examples/sumosized-1772646218367.png)   | `-f apng` (Full Alpha Support)        |

## ⚠️ Strategic Constraints (Hardware Limits)

This tool runs on WebAssembly and `SharedArrayBuffer`. Browsers have hard limits. Acknowledge these constraints before operating:

- **Browser Memory Caps**: Tabs hard-cap memory at 2GB - 4GB. Push 4K video, complex filter chains, or clips past 15 seconds, and the tab will silently crash. Know your limits.
- **Optimal Envelope**: Keep input under 100MB. Target output under 10 seconds. Anything else is pushing the line.
- **Mobile Hardware**: iOS Safari and Android aggressively kill high-memory tabs. Mobile is unsupported. Use a desktop.
- **Hardware Acceleration**: Encoding burns your local CPU. Older rigs or laptops without dedicated cooling will throttle hard.

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

## 🛡️ Security Posture

- **Air-Gapped Operation**: Your video file never hits the network. Pure local execution.
- **XSS Hardened**: 100% compliant with modern security standards. We purged all `innerHTML` sinks and dynamic templates in favor of secure DOM APIs.
- **Locally Vendored**: Core dependencies (`ffmpeg.wasm`, `color-thief`, `gif.js`, `lucide`) live in the `js/vendor/` directory. Zero external CDN requests during operation. **We secured the supply chain by severing it from the outside world.**

## ⚖️ Attribution

See [ATTRIBUTION.md](ATTRIBUTION.md) for the full manifest of dependencies and licenses.
