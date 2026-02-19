# Contributing to TriageLink

Thank you for your interest in contributing to TriageLink! This is an ongoing, actively developed project and we welcome contributions of all kinds.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/Triage-Link.git
   cd Triage-Link
   ```
3. **Install dependencies:**
   ```bash
   npm ci
   ```
4. **Run the development server:**
   ```bash
   npm run dev            # Browser-only (http://localhost:5173)
   npm run electron:dev   # Full Electron app
   ```

## Development Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Run linting and tests:
   ```bash
   npm run lint
   npm test
   ```
4. Commit with a clear, descriptive message
5. Push to your fork and open a Pull Request

## What We're Looking For

### High-Priority Contributions
- **Tests** — Unit tests (Jest) and integration tests (Playwright) are needed across the board
- **Accessibility** — Improving keyboard navigation, ARIA labels, and screen reader support
- **Internationalization** — i18n support for multi-language deployments
- **Documentation** — API docs, architecture diagrams, deployment guides

### Feature Contributions
- Enhanced offline data sync strategies
- Local LLM integration improvements (Ollama, LM Studio, etc.)
- Additional compliance frameworks beyond HIPAA
- Data import/export capabilities
- Dark/light theme toggle

### Bug Fixes
- Check the [Issues](https://github.com/NeuroKoder3/Triage-Link/issues) tab for open bugs

## Code Style

- **React** — Functional components with hooks
- **Styling** — TailwindCSS utility classes; use `cn()` from `@/lib/utils` for conditional classes
- **Components** — shadcn/ui (Radix UI) primitives in `src/components/ui/`
- **State** — React Query for server/async state; React useState/useContext for local state
- **Imports** — Use the `@/` alias for `src/` paths

## Pull Request Guidelines

- Keep PRs focused on a single concern
- Include a clear description of what changed and why
- Add screenshots for UI changes
- Ensure `npm run lint` passes with zero errors
- Ensure `npm run build` succeeds

## Commit Message Convention

Use clear, descriptive commit messages:

```
feat: add patient vitals export to PDF
fix: correct triage rule sorting by priority
docs: update LLM configuration instructions
refactor: extract entity store into separate module
test: add unit tests for risk assessment scoring
```

## Reporting Issues

- Use [GitHub Issues](https://github.com/NeuroKoder3/Triage-Link/issues) for bugs and feature requests
- For security vulnerabilities, see [SECURITY.md](SECURITY.md)
- Include steps to reproduce, expected behavior, and actual behavior

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
