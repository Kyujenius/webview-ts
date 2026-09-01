# Contributing to ts-bridge

Thanks for your interest in contributing! This guide will help you get started.

## Prerequisites

- Node.js >= 20.0.0
- Vite+ CLI

## Setup

```bash
git clone https://github.com/<your-fork>/ts-bridge.git
cd ts-bridge
vp install
vp run build
```

## Package Structure

| Package                | Path                          | Description              |
| ---------------------- | ----------------------------- | ------------------------ |
| `@webview-ts/shared`   | `packages/shared`             | Shared types (zero deps) |
| `@webview-ts/core`     | `packages/core`               | Web-side bridge engine   |
| `@webview-ts/react`    | `packages/clients/react`      | React hooks and provider |
| `@webview-ts/native`   | `packages/hosts/react-native` | React Native host        |
| `@webview-ts/devtools` | `packages/devtools`           | Visual debugging panel   |

## Development

```bash
vp run dev          # Watch mode for all packages
vp run test         # Run all tests
vp run test:watch   # Watch mode tests
vp run lint         # Lint all packages
vp run type-check   # TypeScript type checking
vp fmt              # Format with Oxfmt
```

## Making Changes

1. Create a branch from `main`
2. Make your changes
3. Write or update tests
4. Run `vp run build && vp run test` to verify
5. Add a changeset: `vp run changeset`
6. Submit a pull request

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `test:` — adding or updating tests
- `docs:` — documentation changes
- `chore:` — maintenance tasks

## Pull Request Guidelines

- One feature or fix per PR
- Include tests for new functionality
- Ensure all existing tests pass
- Keep changes focused — avoid unrelated refactoring

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
