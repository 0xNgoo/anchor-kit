# PR Description

## What does this PR do?

Adds regression coverage for webhook signature handling and startup lifecycle behavior.

- Verifies that uppercase and lowercase HMAC signatures are both accepted.
- Confirms invalid signatures still fail without invoking the webhook callback.
- Adds pre-init router access coverage to ensure `getExpressRouter()` throws the expected `ConfigError` before initialization.
- Covers concurrent `startBackgroundJobs()` calls so background startup only begins once.

## How to test?

1. Run the focused regression tests:
   - `bun test tests/runtime/webhooks/default-webhook-processor.test.ts tests/core/factory-pre-init.test.ts tests/core/factory-background-startup.test.ts`
2. Optionally run the full suite:
   - `bun test`

## Checklist

- [x] My code follows the code style of this project.
- [x] I have added tests for my changes.
- [ ] I have updated the documentation accordingly.
- [ ] I have run `bun run test` and `bun run lint` locally.

## Issue Reference

Closes #
