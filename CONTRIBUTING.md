# Contributing to SumoSized GIF Maker

Thanks for wanting to contribute to the undisputed king of browser-based GIF creation. Here's how to do it without making a mess.

## Getting Started

1. Fork the repo
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/sumosized-gif-maker.git`
3. Install dev tools: `npm install`
4. Start a local server: `npm run dev` (required — `file://` won't work with `SharedArrayBuffer`)
5. Open `http://localhost:3000` in Chrome, Edge, or Firefox
6. Make your changes
7. Test locally — make sure GIF output still works before submitting

## What We Welcome

- Bug fixes
- Performance improvements to the FFmpeg pipeline
- New cinematic filter presets
- UI/UX enhancements to the glassmorphic interface
- Improved cross-browser compatibility
- Better error messaging for FFmpeg failures

## Pull Request Rules

- One feature or fix per PR — don't bundle unrelated changes
- Describe _what_ you changed and _why_ in the PR description
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

Before committing, run:

```bash
npm run check   # Prettier formatting check
npm run lint    # ESLint
npm test        # Vitest
```

Pre-commit hooks will run Prettier and ESLint automatically via husky + lint-staged.

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

Types: feat | fix | docs | style | refactor | test | chore
```

Examples:

- `feat(filters): add Cyberpunk neon filter preset`
- `fix(overlay): correct shadow offset calculation for RGB output`
- `docs(readme): update local dev setup instructions`
- `chore(deps): upgrade husky to v9`

## Security Issues

Do **not** open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md) instead.
