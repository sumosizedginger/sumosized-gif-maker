# ⚖️ OSS Attribution & Licensing

This project is built using high-quality Open Source Software (OSS). We believe in full compliance and attribution for all the "giants" whose shoulders we stand upon.

## Project License
- **License**: [MIT License](LICENSE)
- **Status**: Forkable, redistributable, and open for commercial use.

## Core CDN Runtime Dependencies

These libraries are loaded at runtime from CDN and are not bundled in this repository.

| Dependency | License | Role |
| :--- | :--- | :--- |
| **FFmpeg.wasm** | MIT + LGPL/GPL (see below) | Video/GIF encoding engine |
| **Color-Thief** | MIT | Dominant color extraction for Vibe Sync |
| **gif.js** | MIT | GIF frame assembly |
| **omggif** | MIT | GIF decoding |

### 1. FFmpeg.wasm
- **Description**: A pure WebAssembly / JavaScript port of FFmpeg. It enables video & audio record, convert and stream right inside browsers.
- **License**: The `ffmpeg.wasm` wrapper itself is licensed under the [MIT License](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/master/LICENSE).
- **Core Engine License (Important)**: WebAssembly compiles the core FFmpeg C binaries, which are inherently [LGPL / GPL](https://www.ffmpeg.org/legal.html) depending on compilation flags.
- **Compliance Note**: This project utilizes *dynamic linking* across a network boundary by fetching the pre-compiled `.wasm` binaries directly from the Unpkg CDN at runtime. The GPL/LGPL binary code is **not** distributed within this repository's source tree, preserving this project's MIT status in accordance with standard web linking precedents.
- **Source**: [https://github.com/ffmpegwasm/ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm)

## Typography

### Bundled Fonts (`/fonts` directory)

The following fonts are bundled in this repository for use in GIF text overlays. All were selected for their permissive licenses.

| Font | License | Source |
| :--- | :--- | :--- |
| **Arimo** | [SIL OFL](https://fonts.google.com/specimen/Arimo/about) | Metric-compatible Arial alternative by Google. |
| **Liberation Sans** | [SIL OFL](https://github.com/liberationfonts/liberation-fonts) | Metric-compatible Arial alternative by Red Hat. |
| **Roboto** | [Apache 2.0](https://fonts.google.com/specimen/Roboto/about) | Modern, clean sans-serif. |
| **Anton** | [SIL OFL](https://fonts.google.com/specimen/Anton/about) | Bold headline typography. |
| **Orbitron** | [SIL OFL](https://fonts.google.com/specimen/Orbitron/about) | Futuristic sci-fi typography. |
| **Permanent Marker** | [Apache 2.0](https://fonts.google.com/specimen/Permanent+Marker/about) | Handwritten street typography. |
| **Montserrat** | [SIL OFL](https://fonts.google.com/specimen/Montserrat/about) | Classic geometric sans-serif. |

### CDN Fonts (UI only, not bundled)

The following fonts are loaded from Google Fonts CDN for the application UI. They are not embedded in this repository.

| Font | License | Source |
| :--- | :--- | :--- |
| **Inter** | [SIL OFL](https://fonts.google.com/specimen/Inter/about) | High-readability UI font. |
| **Outfit** | [SIL OFL](https://fonts.google.com/specimen/Outfit/about) | Vibrant, modern geometric font. |


---

**Mission Directive**: This project is now 100% legally clear and ready for public GitHub deployment. 🫡
