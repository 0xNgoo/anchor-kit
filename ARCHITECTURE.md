# Architecture Overview

Anchor-Kit is designed to be the "Rails" for Stellar Anchors—opinionated but flexible, emphasizing convention over configuration.

## Core Design Principles

1.  **Type Safety First**: Leveraging TypeScript to prevent runtime errors, especially for financial transactions.
2.  **Plugin-Based**: Core logic (server, auth, db connection) is separate from protocol implementations (SEPs) and payment rail integrations.
3.  **Strict State Machines**: Financial transactions follow rigid, unidirectional state transitions to prevent race conditions and double-spending.
4.  **Developer Experience (DX)**: Inspired by tools like Better-Auth, providing a fluent, clear API.

## Module Breakdown

### `src/core`
The heart of the SDK.
-   `createAnchor()`: The factory function that initializes the server.
-   **Auth**: SEP-10 implementation details.
-   **Database**: Abstract adapters (Prisma, Postgres) to manage transaction state.

### `src/plugins`
Modular implementations of SEPs and integrations.
-   `sep24/`: Hosted Deposit/Withdrawal flow.
-   `sep6/`: API-based Transfer flow (Future).
-   `sep31/`: Cross-border payments (Future).

### `src/services`
Shared internal services.
-   `StellarService`: Wrappers around Horizon API.
-   `QueueService`: Job queues for processing blockchain transactions asynchronously.

## Folder Structure

```
anchor-kit/
├── src/
│   ├── core/           # Core SDK logic (auth, server factory)
│   ├── services/       # Shared services (Stellar, Logger, Queue)
│   ├── plugins/        # SEP implementations and Rail adapters
│   ├── utils/          # Helper functions (XDR parsing, etc.)
│   ├── types/          # TypeScript definitions
│   └── index.ts        # Public API export
├── examples/           # implementing example servers
├── tests/              # Vitest test suite
└── dist/               # Compiled output
```

## Data Flow (SEP-24 Example)

1.  **Wallet** initiates auth (SEP-10).
2.  **Anchor-Kit** verifies signature and issues JWT.
3.  **Wallet** requests deposit (SEP-24).
4.  **Anchor-Kit** creates transaction record (status: `incomplete`) and returns interactive URL.
5.  **User** completes KYC/Payment on the interactive page.
6.  **Anchor-Kit** receives Webhook from Payment Rail (e.g., Flutterwave).
7.  **Anchor-Kit** validates webhook, updates status to `pending_user_transfer_start`.
8.  **Job Queue** picks up job, sends Stellar Asset to user.
9.  **Anchor-Kit** updates status to `completed`.
