# Add `expires_at` to auth token response

Closes #211

## Summary

The `POST /auth/token` response now includes an `expires_at` field with an absolute ISO 8601 timestamp, complementing the existing relative `expires_in` field. This lets clients schedule token refresh without relying on their own clock starting at exchange time.

## Changes

**`src/runtime/http/express-router.ts`**
- Compute `expiresAt` from `(Math.floor(Date.now() / 1000) + tokenLifetime) * 1000` and format it as an ISO string
- Append `expires_at: expiresAt` to the JSON response body alongside `token`, `expires_in`, and `token_type`

**`tests/mvp-express.integration.test.ts`**
- Test 3a: assert `expires_at` is a string, parses as a valid date, and is within 5 seconds of `Date.now() + 3600s`
- Test 3b: same assertions for the custom TTL (7200s) path

## Response shape

```json
{
  "token": "eyJ...",
  "expires_in": 3600,
  "expires_at": "2026-06-25T11:34:07.000Z",
  "token_type": "Bearer"
}
```
