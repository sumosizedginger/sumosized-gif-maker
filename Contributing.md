# Contributing to SumoSized GIF Maker

Thanks for wanting to contribute to the undisputed king of browser-based GIF creation. Here's how to do it without making a mess.

## Getting Started

1. Fork the repo
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/sumosized-gif-maker.git`
3. Open `index.html` in Chrome, Edge, or Firefox (must support `SharedArrayBuffer`)
4. Make your changes
5. Test locally — make sure GIF output still works before submitting

## What We Welcome

- Bug fixes
- Performance improvements to the FFmpeg pipeline
- New cinematic filter presets
- UI/UX enhancements to the glassmorphic interface
- Improved cross-browser compatibility
- Better error messaging for FFmpeg failures

## Pull Request Rules

- One feature or fix per PR — don't bundle unrelated changes
- Describe *what* you changed and *why* in the PR description
- If you're fixing a bug, reference the issue number: `Fixes #42`
- Don't commit `node_modules`, build artifacts, or test screenshots to main

## Reporting Bugs

Open an issue and include:
- What you were trying to do
- What actually happened
- Your browser and OS
- Any console errors (F12 → Console)

## Code Style

This is vanilla HTML/CSS/JS. Keep it that way. No frameworks, no bundlers, no build steps. If your contribution requires a build pipeline, it's probably not the right fit for this project.

## Security Issues

Do **not** open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md) instead.
