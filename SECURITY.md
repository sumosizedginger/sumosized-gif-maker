# Security Policy

## Supported Versions

| Version              | Supported |
| -------------------- | --------- |
| Latest (main branch) | ✅        |
| Older commits        | ❌        |

Only the current `main` branch is actively maintained. If you find a vulnerability, please check that it exists in the latest version before reporting.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

This project runs entirely client-side in the browser — no servers, no databases, no user accounts. That said, vulnerabilities in the FFmpeg.wasm pipeline, `coi-serviceworker`, or any dependency that could affect users are taken seriously.

To report a vulnerability privately:

1. Go to the [Security tab](https://github.com/sumosizedginger/sumosized-gif-maker/security) of this repo
2. Click **"Report a vulnerability"** to open a private advisory
3. Describe the issue clearly: what it affects, how to reproduce it, and potential impact

You can expect an acknowledgment within **72 hours**. If confirmed, a fix will be prioritized and credited to you in the release notes (unless you prefer to stay anonymous).

## Scope

Things in scope:

- Malicious input handling in FFmpeg filter/overlay parameters
- Cross-origin isolation bypass via `coi-serviceworker`
- Dependency vulnerabilities in `ffmpeg.wasm` or core engine components

Out of scope:

- Issues in browsers themselves
- Social engineering
- Theoretical vulnerabilities with no practical impact
