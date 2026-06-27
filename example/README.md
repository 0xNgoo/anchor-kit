# Example Express Host App

This example shows the intended MVP integration model:

- Host app owns `listen()`
- Anchor-Kit exposes route handlers via `getExpressRouter()`

## Run

```bash
# optional
export DATABASE_URL=file:/tmp/anchor-kit-example.sqlite
export CHALLENGE_EXPIRATION_SECONDS=45
export WATCHERS_ENABLED=false

bun run example/express-app.ts
```

Server starts on `http://localhost:3000` by default.

## Environment variables

All environment variables read by the example app are optional; the defaults below apply when the variable is absent.

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Port the Express server listens on. Must be a positive number. |
| `DATABASE_URL` | `file:/tmp/anchor-kit-example-<random>.sqlite` | Database location. Use a `file:` URL for the SQLite adapter, or a Postgres URL for the Postgres adapter. |
| `INTERACTIVE_DOMAIN` | `http://localhost:3000` | Base URL advertised for interactive deposit URLs. |
| `SEP10_SIGNING_KEY` | A random keypair generated at startup | Stellar secret key used to sign SEP-10 challenge transactions. |
| `INTERACTIVE_JWT_SECRET` | `example-jwt-secret` | Secret used to sign interactive JWTs. |
| `DISTRIBUTION_ACCOUNT_SECRET` | `example-distribution-secret` | Stellar secret key for the distribution account. |
| `WEBHOOK_SECRET` | unset | Shared secret for verifying webhook signatures. When set, webhook signature verification is enabled. |
| `ASSET_CODE` | `USDC` | Asset code advertised by the anchor. |
| `ASSET_ISSUER` | `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` | Issuer for the advertised asset. |
| `CHALLENGE_EXPIRATION_SECONDS` | `300` | SEP-10 challenge lifetime in seconds. Must be greater than `0`. |
| `WATCHERS_ENABLED` | enabled | Set to `false` to disable background watchers. |
| `DEBUG_WEBHOOKS` | unset | Set to `1` to log received webhook event IDs to the console. |

## Quick check

```bash
curl -s http://localhost:3000/anchor/health
```
