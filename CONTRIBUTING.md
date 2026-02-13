# Contributing to Anchor-Kit

Thank you for your interest in contributing to Anchor-Kit! We welcome contributions from the community to help make Stellar anchor development easier for everyone.

## Development Environment Setup

To get started, you'll need the following installed:

- [Bun](https://bun.sh/) (v1.0.0 or later)
- [Git](https://git-scm.com/)

### 1. Clone the repository

```bash
git clone git@github.com:0xNgoo/anchor-kit.git
cd anchor-kit
```

### 2. Install dependencies

```bash
bun install
```

## Running Tests

We use [Vitest](https://vitest.dev/) for testing.

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage
```

## Code Style

We enforce code style using [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/).

- **Linting**: `bun run lint`
- **Formatting**: `bun run format`

**Note**: We use Husky and lint-staged to automatically format and lint your code before committing. If your code doesn't pass these checks, the commit will be blocked.

## Git Workflow

1.  **Fork** the repository (if you are not a core maintainer).
2.  Create a **feature branch** from `main`:
    ```bash
    git checkout -b feat/my-new-feature
    ```
    or for bugs:
    ```bash
    git checkout -b fix/bug-description
    ```
3.  Make your changes.
4.  Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/):
    - `feat: add new SEP-24 hook`
    - `fix: resolve null pointer in auth`
    - `docs: update README`
5.  Push to your fork/branch.
6.  Open a **Pull Request** targeting the `main` branch.

## Pull Request Guidelines

- **Description**: clearly explain what your PR does.
- **Tests**: include tests for any new functionality or bug fixes.
- **Documentation**: update documentation if your changes affect the public API.
- **CI**: ensure all CI checks pass.

## Definition of Done

A task is considered "Done" when:

- [ ] Code is written and linted.
- [ ] Tests are written and passing.
- [ ] Documentation is updated.
- [ ] PR is approved by a maintainer.

## License

By contributing, you agree that your contributions will be licensed under its MIT License.
