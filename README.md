# Anchor-Kit

![CI](https://github.com/0xNgoo/anchor-kit/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-orange.svg)

**Anchor-Kit** is a developer-friendly, type-safe SDK for building Stellar Anchors. It abstracts the complexity of Stellar Ecosystem Proposals (SEPs)—specifically SEP-6, SEP-24, and SEP-31—allowing you to focus on your business logic while ensuring compliance and security.

Designed for **Bun** and **TypeScript**, Anchor-Kit aims to make Stellar Anchors simple, modular, and "just work."

> ⚠️ **Status**: Early Development. Not yet ready for production use.

## Features

- 🏗 **SEP-24 Out of the Box**: Hosted deposit and withdrawal flows with minimal configuration.
- 🔐 **SEP-10 Authentication**: Built-in Stellar Web Authentication handling.
- 🧩 **Modular Architecture**: Plugin system for different payment rails (Flutterwave, Paystack, etc.).
- 🛡 **Type-Safe**: Built with TypeScript for a robust developer experience.
- ⚡ **Bun Optimized**: Fast runtime performance.

## Installation

```bash
bun add anchor-kit
```

## Quick Start (Dream API)

```typescript
import { createAnchor } from 'anchor-kit';
import { sep24 } from 'anchor-kit/plugins/sep24';
import { postgresAdapter } from 'anchor-kit/adapters/postgres';

const anchor = createAnchor({
  network: 'testnet',
  database: postgresAdapter({
    url: process.env.DATABASE_URL,
  }),
  secrets: {
    sep10SigningKey: process.env.SEP10_SIGNING_KEY,
    distributionAccountSecret: process.env.DISTRIBUTION_SECRET,
  },
  plugins: [
    sep24({
      assetCode: 'USDC',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    }),
  ],
});

anchor.listen(3000);
console.log('⚓ Anchor service running on port 3000');
```

## Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Contributing Guide](./CONTRIBUTING.md)
# Anchor-Kit

![CI](https://github.com/0xNgoo/anchor-kit/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-orange.svg)

Anchor-Kit is a developer-friendly, type-safe SDK for implementing Stellar anchor services. It provides shared types and small helpers targeted at SEP implementations (SEP-24, SEP-12, etc.).

## Quick links
- Source: [src](src)
- Types entry: [src/types/index.ts](src/types/index.ts)
- Tests: [tests](tests)
- CI config: [.github/workflows/ci.yml](.github/workflows/ci.yml)

## Prerequisites
- Node.js (v16+; project tested on Node 22)
- Bun (optional) — used by the original workflow and supported scripts

## Install
- With npm:

```bash
npm install
```

- With Bun:

```bash
bun install
```

## Build
- Node (TypeScript -> ES modules in `dist`):

```bash
npm run build
```

- Bun (native build):

```bash
bun build src/index.ts --outdir dist --target bun
```

## Test
- Node (Vitest):

```bash
npm test
```

- Bun (project provides Bun-based test scripts):

```bash
bun test
```

## Demo
- A small runtime demo prints `TRANSACTION_STATUSES`. After building, run:

```bash
# Node
npm run demo

# Bun
npm run demo:bun
```

## Developer notes
- `tsconfig.json` includes a `paths` alias mapping `@/*` -> `src/*`; tests resolve the alias using [vitest.config.ts](vitest.config.ts).
- The project contains both Node-oriented and Bun-oriented scripts. CI currently runs with Bun by default.

## CI
- The GitHub Actions workflow is at [.github/workflows/ci.yml](.github/workflows/ci.yml). It installs Bun and runs lint, format check, typecheck, tests with coverage, and build.

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
- 

