# PR Summary

## What does this PR do?

Adds runtime support and tests for queue and sqlite behavior:

- Introduces an in-memory queue adapter with a guard against double-start processing.
- Adds a sqlite runtime database adapter with auth challenge persistence and transaction filtering.
- Covers sqlite auth challenge lifecycle and pending transaction cutoff filtering with focused tests.

## How to test?

Run the full test suite or the new runtime tests:

```bash
bun test --run
```

Or:

```bash
bun test tests/runtime --run
```

## Checklist

- [x] My code follows the code style of this project.
- [x] I have added tests for my changes.
- [ ] I have updated the documentation accordingly.
- [x] I have run `bun test --run` locally.

## Issue Reference

Closes #
