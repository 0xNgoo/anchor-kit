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

## MVP Status

This repository now ships a usable MVP with:

- Express-style router mounting via `anchor.getExpressRouter()`
- SEP-10 minimal challenge/token flow
- SEP-24 minimal interactive deposit flow
- Webhook endpoint with signature verification + callback hook
- Real SQL persistence (SQLite implemented for local/dev tests, PostgreSQL path supported)
- In-process queue + watcher lifecycle (`startBackgroundJobs` / `stopBackgroundJobs`)

The SDK does not own `listen()` and does not bind network ports.

## Install

```bash
bun add anchor-kit
```

For tests and local development, you can import `makeSqliteDbUrlForTests` directly from `anchor-kit`.

## Quick Start

```ts
import express from 'express';
import { createAnchor } from 'anchor-kit';

const app = express();
app.use(express.json());

const anchor = createAnchor({
  network: { network: 'testnet' },
  server: { interactiveDomain: 'https://anchor.example.com' },
  security: {
    sep10SigningKey: process.env.SEP10_SIGNING_KEY!,
    interactiveJwtSecret: process.env.INTERACTIVE_JWT_SECRET!,
    distributionAccountSecret: process.env.DISTRIBUTION_ACCOUNT_SECRET!,
    webhookSecret: process.env.WEBHOOK_SECRET,
    verifyWebhookSignatures: true,
  },
  assets: {
    assets: [
      {
        code: 'USDC',
        issuer: process.env.USDC_ISSUER!,
        deposits_enabled: true,
      },
    ],
  },
  framework: {
    database: {
      provider: 'postgres',
      url: process.env.DATABASE_URL!,
    },
    queue: {
      backend: 'memory',
      concurrency: 5,
    },
    watchers: {
      enabled: true,
      pollIntervalMs: 15000,
      transactionTimeoutMs: 300000,
    },
  },
  webhooks: {
    onEvent: async (event, ctx) => {
      console.log('webhook event', event.eventId, ctx.receivedAt);
    },
  },
});

await anchor.init();
await anchor.startBackgroundJobs();

app.use('/anchor', anchor.getExpressRouter());

app.listen(3000);
```

## Endpoints

Mounted under your chosen base path (for example `/anchor`):

- `GET /health`
- `GET /info`
- `GET /auth/challenge`
- `POST /auth/token` (expects wallet-signed SEP-10 challenge XDR)
- `POST /transactions/deposit/interactive` (Bearer auth)
- `GET /transactions/:id` (Bearer auth)
- `POST /webhooks/events`

## Docs

- [Architecture Overview](./ARCHITECTURE.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Roadmap](./ROADMAP.md)

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on how to get started.

## License

MIT
