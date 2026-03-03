# Example Express Host App

This example shows the intended MVP integration model:

- Host app owns `listen()`
- Anchor-Kit exposes route handlers via `getExpressRouter()`

## Run

```bash
# optional
export DATABASE_URL=file:/tmp/anchor-kit-example.sqlite

bun run example/express-app.ts
```

Server starts on `http://localhost:3000` by default.

## Quick check

```bash
curl -s http://localhost:3000/anchor/health
```
