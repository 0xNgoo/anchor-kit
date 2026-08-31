# Normalize webhook provider values and add webhook rate-limit coverage

## What does this PR do?

- Trims whitespace-only webhook provider values before evaluating fallback logic.
- Falls back from a blank header to the body provider, then to `generic`.
- Accepts array-style `x-webhook-provider` and `x-anchor-signature` headers by reading the first non-empty value.
- Adds focused regression coverage for webhook provider fallback behavior and webhook route rate limiting.

## How to test?

- Run `bun test tests/webhook-fallback.test.ts tests/mvp-express.integration.test.ts`
- Confirm the new webhook fallback and webhook rate-limit cases pass.

## Checklist

- [ ] My code follows the code style of this project.
- [x] I have added tests for my changes.
- [ ] I have updated the documentation accordingly.
- [x] I have run `bun test` locally.

## Issue Reference

Closes #355
Closes #356
Closes #359
Closes #357
