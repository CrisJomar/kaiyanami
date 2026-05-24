# Contributing to Kaiyanami

Thank you for your interest in contributing! Here's how to get started.

## Development Workflow

1. **Fork** the repository and clone your fork
2. Create a feature branch: `git checkout -b feat/your-feature-name`
3. Make your changes (see guidelines below)
4. Push to your fork and **open a Pull Request** against `main`

## Code Guidelines

- Follow the existing TypeScript/ESLint config — run `npm run lint` before committing
- Backend: keep business logic in `services/`, keep route files thin
- Keep `.env` files **out of git** — update `.env.example` if you add a new variable
- Write descriptive commit messages: `feat: add wishlist sorting`, `fix: cart total rounding`

## Commit Convention

We loosely follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `chore:` | Maintenance (deps, config) |
| `refactor:` | Code change that isn't a fix or feature |
| `docs:` | Documentation only |
| `style:` | Formatting, missing semicolons, etc. |

## Reporting Issues

Open a GitHub Issue with a clear title, steps to reproduce, and expected vs actual behaviour.
