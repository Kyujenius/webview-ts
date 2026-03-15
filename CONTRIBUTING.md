# Contributing to ts-bridge

Thanks for your interest in contributing! This guide will help you get started.

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## Setup

```bash
git clone https://github.com/<your-fork>/ts-bridge.git
cd ts-bridge
pnpm install
pnpm build
```

## Package Structure

| Package               | Path                          | Description              |
| --------------------- | ----------------------------- | ------------------------ |
| `@webview-ts/shared`   | `packages/shared`             | Shared types (zero deps) |
| `@webview-ts/core`     | `packages/core`               | Web-side bridge engine   |
| `@webview-ts/react`    | `packages/clients/react`      | React hooks and provider |
| `@webview-ts/native`   | `packages/hosts/react-native` | React Native host        |
| `@webview-ts/devtools` | `packages/devtools`           | Visual debugging panel   |

## Development

```bash
pnpm dev          # Watch mode for all packages
pnpm test         # Run all tests
pnpm test:watch   # Watch mode tests
pnpm lint         # Lint all packages
pnpm type-check   # TypeScript type checking
pnpm format       # Format with Prettier
```

## Making Changes

1. Create a branch from `main`
2. Make your changes
3. Write or update tests
4. Run `pnpm build && pnpm test` to verify
5. Add a changeset: `pnpm changeset`
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
