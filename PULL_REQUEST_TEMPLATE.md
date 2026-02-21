# [Types] Define Transaction interface

## What does this PR do?

Implements the unified `Transaction` interface from the Types foundation module as specified in the Stellar Anchor Platform unified specification. This interface serves as the comprehensive type definition for representing transactions across the anchor platform, combining core SEP-24 fields with optional rail (payment provider), Stellar blockchain, interactive, and error handling fields.

### Key Changes:

- **New Type File**: `src/types/transaction.ts` with the following interfaces:
  - `Transaction` - Main unified transaction interface with all fields
  - `Amount` - Monetary amount with asset/currency information (string-based for decimal precision)
  - `RailTransactionData` - Payment rail (Flutterwave, Paystack, mobile money) specific fields
  - `StellarTransactionData` - Stellar blockchain specific fields
  - `InteractiveData` - Hosted interactive flow details
  - `TransactionError` - Error information for failed transactions
  - `RefundInfo` - Refund details if transaction was refunded

- **Core Fields**: `id`, `status` (TransactionStatus), `kind` ('deposit' | 'withdrawal')
- **Amount Fields**: `amount_in`, `amount_out`, `amount_fee` using Decimal string representation
- **Optional Fields**: All rail, stellar, interactive, error, and refund fields are optional to support partial transaction states
- **Exports**: All types properly exported from `src/types/index.ts` barrel

## How to test?

### Compile-time type checking:
```bash
npm run typecheck
```

### Run the comprehensive type tests:
```bash
npm test -- tests/types/transaction.test.ts
```

### Test coverage includes:

1. **Core Fields**: Required fields validation (id, status, kind)
2. **Amount Fields**: Decimal string precision with deposit/withdrawal examples
3. **Deposit Lifecycle**: Complete transaction flow from `incomplete` → `completed`
4. **Withdrawal Lifecycle**: Complete transaction flow with Stellar and rail integration
5. **Rail Fields**: Payment provider reference and metadata handling
6. **Stellar Fields**: Transaction ID, memo, memo types, and account IDs
7. **Interactive Fields**: URL and form field definitions
8. **Error Handling**: Error codes and messages for failed transactions
9. **Refunds**: Refund amount, fees, and individual payments
10. **Compile-time Validation**: Type safety with `@ts-expect-error` assertions

## Checklist

- [x] My code follows the code style of this project.
  - Follows existing patterns from `src/types/customer.ts` and `src/types/sep24/`
  - Consistent with project's TypeScript conventions
  - Proper JSDoc documentation with examples
  
- [x] I have added tests for my changes.
  - 717 lines of comprehensive tests in `tests/types/transaction.test.ts`
  - 50+ test cases covering all interfaces and field combinations
  - Tests for compile-time validation and runtime type safety
  
- [x] I have updated the documentation accordingly.
  - Added detailed JSDoc comments to all interfaces
  - Included `@example` blocks showing real-world usage patterns
  - Documented Amount field using Decimal string representation
  
- [ ] I have run `bun run test` and `bun run lint` locally.
  - Type checking passes (`tsc --noEmit`)
  - Tests compile without errors

## Issue Reference

Closes #

---

### Related Documentation

- [Stellar Anchor Platform](https://developers.stellar.org/docs/build/apps/anchor-platform)
- [SEP-24: Hosted Deposits and Withdrawals](https://developers.stellar.org/docs/learn/fundamentals/stellar-ecosystem-proposals/sep-0024)
- [Anchor-Kit ARCHITECTURE.md](./ARCHITECTURE.md)
- [Anchor-Kit TRD](./anchor-kit-trd.md) - Section 4.2 on Database Schema (Decimal precision patterns)
