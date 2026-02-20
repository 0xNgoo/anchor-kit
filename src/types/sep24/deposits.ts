/**
 * SEP-24 Deposit Transaction Types
 * @see https://developers.stellar.org/docs/learn/fundamentals/stellar-ecosystem-proposals/sep-0024
 */

import type { BaseTransactionResponse, TransactionStatus } from './common';

/**
 * DepositTransaction represents a hosted deposit transaction
 *
 * This interface extends BaseTransactionResponse with a discriminator
 * to enable type narrowing and discriminated union usage.
 *
 * @example
 * ```typescript
 * const transaction: Sep24TransactionResponse = getTransaction();
 * if (transaction.type === 'deposit') {
 *   // TypeScript now knows this is a DepositTransaction
 *   console.log(transaction.id, transaction.status);
 * }
 * ```
 */
export interface DepositTransaction extends BaseTransactionResponse {
  /** Discriminator field indicating this is a deposit transaction */
  type: 'deposit';
}

/**
 * Type guard to narrow a generic Sep24TransactionResponse to DepositTransaction
 *
 * @param transaction - Transaction to check
 * @returns True if the transaction is a deposit transaction
 *
 * @example
 * ```typescript
 * const transaction = await getTransaction(id);
 * if (isDepositTransaction(transaction)) {
 *   console.log('Deposit ID:', transaction.id);
 * }
 * ```
 */
export function isDepositTransaction(
  transaction: unknown
): transaction is DepositTransaction {
  return (
    typeof transaction === 'object' &&
    transaction !== null &&
    'type' in transaction &&
    transaction.type === 'deposit' &&
    'id' in transaction &&
    typeof (transaction as Record<string, unknown>).id === 'string' &&
    'status' in transaction
  );
}
