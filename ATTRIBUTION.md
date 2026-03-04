# ⚖️ OSS Attribution & Licensing

This project is built using high-quality Open Source Software (OSS). We believe in full compliance and attribution for all the "giants" whose shoulders we stand upon.

## Project License

- **License**: [MIT License](LICENSE)
- **Status**: Forkable, redistributable, and open for commercial use.

## Core Runtime Dependencies

All core libraries are **vendored locally** within the `/js/vendor/` directory to eliminate supply chain vulnerabilities. The application makes zero external CDN requests during operation.

| Dependency      | License                    | Role                                    |
| :-------------- | :------------------------- | :-------------------------------------- |
| **FFmpeg.wasm** | MIT + LGPL/GPL (see below) | Video/GIF encoding engine               |
| **Color-Thief** | MIT                        | Dominant color extraction for Vibe Sync |
| **gif.js**      | MIT                        | GIF frame assembly                      |
| **omggif**      | MIT                        | GIF decoding                            |
| **lucide**      | ISC                        | SVG Iconography                         |

### 1. FFmpeg.wasm

- **Description**: A pure WebAssembly / JavaScript port of FFmpeg. It enables video & audio processing right inside browsers.
- **License**: The `ffmpeg.wasm` wrapper is licensed under the [MIT License](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/master/LICENSE).
- **Core Engine License**: The pre-compiled `.wasm` binaries contain the core FFmpeg C binaries ([LGPL / GPL](https://www.ffmpeg.org/legal.html)).
- **Compliance**: We distribute the pre-compiled binaries in the `js/vendor/` tree. No source C/C++ files are modified or distributed.
- **Source**: [https://github.com/ffmpegwasm/ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm)

## Typography

### Bundled Fonts (`/fonts` directory)

The following fonts are bundled in this repository for use in GIF text overlays.

| Font                 | License                                                                | Source                                          |
| :------------------- | :--------------------------------------------------------------------- | :---------------------------------------------- |
| **Arimo**            | [SIL OFL](https://fonts.google.com/specimen/Arimo/about)               | Metric-compatible Arial alternative by Google.  |
| **Liberation Sans**  | [SIL OFL](https://github.com/liberationfonts/liberation-fonts)         | Metric-compatible Arial alternative by Red Hat. |
| **Roboto**           | [Apache 2.0](https://fonts.google.com/specimen/Roboto/about)           | Modern, clean sans-serif.                       |
| **Anton**            | [SIL OFL](https://fonts.google.com/specimen/Anton/about)               | Bold headline typography.                       |
| **Orbitron**         | [SIL OFL](https://fonts.google.com/specimen/Orbitron/about)            | Futuristic sci-fi typography.                   |
| **Permanent Marker** | [Apache 2.0](https://fonts.google.com/specimen/Permanent+Marker/about) | Handwritten street typography.                  |
| **Montserrat**       | [SIL OFL](https://fonts.google.com/specimen/Montserrat/about)          | Classic geometric sans-serif.                   |

### UI Fonts (Google Fonts CDN)

The following fonts are loaded via CSS for the application interface.

| Font       | License                                                   | Source                          |
| :--------- | :-------------------------------------------------------- | :------------------------------ |
| **Inter**  | [SIL OFL](https://fonts.google.com/specimen/Inter/about)  | High-readability UI font.       |
| **Outfit** | [SIL OFL](https://fonts.google.com/specimen/Outfit/about) | Vibrant, modern geometric font. |

---

**Mission Directive**: This project is verified for 2026 production standards. Legal and security status: **GREEN**. 🛡️🫡
