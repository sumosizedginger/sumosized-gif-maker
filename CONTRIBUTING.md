# Contributing to SumoSized GIF Maker

Thanks for wanting to contribute to the undisputed king of browser-based GIF creation. Here's how to do it without making a mess.

## Getting Started

1. Fork the repo
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/sumosized-gif-maker.git`
3. Install dependencies: `npm install`
4. Start a local server: `npm run dev` (required — `file://` won't work with `SharedArrayBuffer`)
5. Open `http://localhost:3000`
6. Make your changes
7. **Verify Everything**: Run `npm run check` and `npm run lint`. If these fail, your PR will be rejected by the CI.

## Our Philosophy

- **100% Client-Side**: No new feature should ever require a backend server.
- **Privacy First**: Zero data transmission. If you add a feature that pings an external API, it must be opt-in and anonymous.
- **FFmpeg Excellence**: We push the limits of WASM. Optimizing the pipeline is always a priority.
- **Zero Frameworks**: This is a vanilla HTML/JS/CSS sanctuary. Keep it lean.

## What We Welcome

- Bug fixes
- Performance improvements to the FFmpeg pipeline
- New cinematic filter presets
- UI/UX enhancements to the glassmorphic interface
- Improved cross-browser compatibility
- Better error messaging for FFmpeg failures

## Pull Request Rules

- One feature or fix per PR — don't bundle unrelated changes.
- Describe _what_ you changed and _why_ in the PR description.
- **Conventional Commits**: We strictly follow the `feat:`, `fix:`, `docs:` convention.
- **Security Standards**: Never use `innerHTML`. We are XSS hardened. Use `textContent` or `createElement`.
- **Quality Gates**: Ensure `npm run check` and `npm run lint` pass perfectly. We hold the line on code formatting.
- Don't commit `node_modules`, build artifacts, or temporary files to the repository.

## Reporting Bugs

Open an issue and include:

- What you were trying to do.
- What actually happened.
- Your browser and OS.
- Any console errors (F12 → Console). If FFmpeg crashed, please check for the specific `palettegen` or `paletteuse` failure message.

## Code Style

This is vanilla HTML/CSS/JS. Keep it that way. No frameworks, no bundlers, no build steps. If your contribution requires a complex build pipeline, it's not the right fit.

Before committing, run:

```bash
npm run check   # Prettier formatting check
npm run lint    # ESLint
npm test        # Vitest
```

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>
Types: feat | fix | docs | style | refactor | test | chore
```

## Security

Do **not** open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md) instead.
