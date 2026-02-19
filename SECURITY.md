# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of TriageLink seriously. If you discover a security vulnerability, we appreciate your responsible disclosure.

### How to Report

1. **Do NOT open a public GitHub issue** for security vulnerabilities.
2. Email your findings to **security@triagelink.dev** (or open a [private security advisory](https://github.com/NeuroKoder3/Triage-Link/security/advisories/new) on this repository).
3. Include the following in your report:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgement** within **48 hours** of your report.
- An initial **assessment** within **5 business days**.
- We will work with you to understand the issue and coordinate a fix.
- Once resolved, we will publicly acknowledge your contribution (unless you prefer to remain anonymous).

### Scope

The following are in scope for security reports:

- Electron main process vulnerabilities (e.g., preload script bypasses, IPC exploits)
- Cross-site scripting (XSS) in the renderer process
- Local data store injection or corruption
- Authentication/authorization bypass in the local auth system
- Sensitive data exposure (e.g., localStorage leaks, log file exposure)
- Dependency vulnerabilities with a known exploit path

### Out of Scope

- Vulnerabilities in third-party dependencies without a demonstrated exploit against TriageLink
- Issues requiring physical access to the machine where TriageLink is installed
- Denial-of-service attacks against the local application
- Social engineering attacks

## Security Best Practices for Users

- Keep TriageLink updated to the latest version.
- Do not expose the application's dev server to untrusted networks.
- Store API keys (e.g., LLM endpoint keys) securely; they are kept in localStorage.
- Review Electron's [security checklist](https://www.electronjs.org/docs/latest/tutorial/security) for additional hardening.

## Security Features

TriageLink implements the following security measures:

- **Context Isolation** — Renderer processes cannot access Node.js APIs directly.
- **Sandbox Mode** — Renderer processes run in a sandboxed environment.
- **No Node Integration** — `nodeIntegration` is disabled in all browser windows.
- **Content Security Policy** — CSP headers restrict script and resource origins.
- **Preload Script** — Only explicitly exposed APIs are available to the renderer via `contextBridge`.
- **HIPAA Audit Logging** — All sensitive operations are logged for compliance review.
