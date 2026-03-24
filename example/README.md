# Example Express Host App

This example shows the intended MVP integration model:

- Host app owns `listen()`
- Anchor-Kit exposes route handlers via `getExpressRouter()`

## Run

```bash
# optional
export DATABASE_URL=file:/tmp/anchor-kit-example.sqlite
export WATCHERS_ENABLED=false

bun run example/express-app.ts
```

Server starts on `http://localhost:3000` by default.

## Optional environment variables

- `DATABASE_URL`: overrides the example database location
- `WATCHERS_ENABLED`: set to `false` to disable background watchers. Defaults to enabled.

## Quick check

```bash
curl -s http://localhost:3000/anchor/health
```
