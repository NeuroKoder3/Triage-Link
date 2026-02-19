# TriageLink — Offline Electron App

**TriageLink** is an offline-first smart triage support system built with Electron, React, and Vite.
It provides medical triage dashboards, rule management, AI protocol management, compliance tracking,
analytics, and reporting — all running locally with no external service dependencies.

## Features

- **Triage Dashboard** — Real-time patient triage with AI-assisted analysis
- **Rule Management** — Create, edit, and manage triage rules per hospital
- **AI Protocol Management** — AI-powered rule optimization and feedback loops
- **Paging Configuration** — Configure alert escalation and paging workflows
- **Compliance & Security** — HIPAA audit logs, security incident tracking, data retention
- **Analytics** — Trend insights, risk assessments, rule effectiveness analysis
- **Reports** — Automated reporting, anomaly detection, natural language report generation
- **Role-Based Access** — User management with custom roles and permissions

## Quick Start

```bash
# Install dependencies
npm ci

# Run in development mode (browser only)
npm run dev

# Run in Electron development mode
npm run electron:dev
```

## Production Build & Distribution

```bash
# Build the renderer (Vite) + package with Electron Builder
npm run electron:build

# Platform-specific builds
npm run electron:build:win    # Windows (NSIS + ZIP)
npm run electron:build:mac    # macOS (DMG + ZIP)
npm run electron:build:linux  # Linux (AppImage + DEB)
```

Installers are placed in the `release/` directory.

## AI / LLM Configuration

TriageLink works fully offline. To enable AI-powered analysis features,
configure a local or remote LLM endpoint:

1. Open the app
2. In the browser console (or future Settings page), set:
   ```js
   localStorage.setItem('triagelink_llm_endpoint', 'http://localhost:11434/v1/chat/completions');
   localStorage.setItem('triagelink_llm_model', 'llama3');
   ```
3. For OpenAI-compatible APIs, also set:
   ```js
   localStorage.setItem('triagelink_llm_api_key', 'sk-...');
   ```

## Data Storage

All data is stored locally in the browser/Electron renderer's `localStorage`.
Entity data is keyed under `triagelink_entity_<EntityName>`.

## Project Structure

```
├── electron/           # Electron main process + preload
│   ├── main.js
│   └── preload.cjs
├── src/
│   ├── api/            # Local data layer (entity store, auth, integrations)
│   ├── components/     # React components (UI, admin, analytics, reports, triage)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities, auth context, routing
│   ├── pages/          # Page-level components
│   ├── assets/         # Static assets
│   └── App.jsx         # Root component
├── assets/             # App icons for packaging
├── .github/workflows/  # CI/CD
├── electron-builder.json
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (browser) |
| `npm run build` | Build renderer |
| `npm run electron:dev` | Electron + Vite dev |
| `npm run electron:build` | Full Electron build |
| `npm run lint` | ESLint |
| `npm test` | Run tests |

## License

[MIT](LICENSE)
