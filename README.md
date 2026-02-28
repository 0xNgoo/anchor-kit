# Anchor-Kit

![CI](https://github.com/0xNgoo/anchor-kit/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-orange.svg)

Anchor-Kit is a developer-friendly, type-safe SDK for implementing Stellar anchor services. It provides shared types and small helpers targeted at SEP implementations (SEP-24, SEP-12, etc.).

> ⚠️ **Status**: Early Development. Not yet ready for production use.

## Quick links

- Source: [src](src)
- Types entry: [src/types/index.ts](src/types/index.ts)
- Tests: [tests](tests)
- CI config: [.github/workflows/ci.yml](.github/workflows/ci.yml)

## Prerequisites

- Node.js (v16+; project tested on Node 22)

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

## Demo

```bash
npm run demo
```

## Developer notes

- `tsconfig.json` includes a `paths` alias mapping `@/*` -> `src/*`; tests resolve the alias using [vitest.config.ts](vitest.config.ts).

## CI

- The GitHub Actions workflow is at [.github/workflows/ci.yml](.github/workflows/ci.yml). It runs lint, format check, typecheck, tests with coverage, and build.

## Contributing

- Run tests and typecheck before opening a PR:

```bash
npm ci
npm run build
npm test
```

- Please follow the contribution guidelines in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

- MIT © [0xNgoo](https://github.com/0xNgoo)
