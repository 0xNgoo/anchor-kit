/**
 * SEP-24 Withdrawal Transaction Types
 * @see https://developers.stellar.org/docs/learn/fundamentals/stellar-ecosystem-proposals/sep-0024
 */

import type { BaseTransactionResponse } from './common';

/**
 * WithdrawalTransaction represents a hosted withdrawal transaction
 *
 * This interface extends BaseTransactionResponse with a discriminator
 * to enable type narrowing and discriminated union usage.
 */
export interface WithdrawalTransaction extends BaseTransactionResponse {
  /** Discriminator field indicating this is a withdrawal transaction */
  type: 'withdrawal';
}

/**
 * Type guard to narrow a generic Sep24TransactionResponse to WithdrawalTransaction
 *
 * @param transaction - Transaction to check
 * @returns True if the transaction is a withdrawal transaction
 */
export function isWithdrawalTransaction(
  transaction: unknown
): transaction is WithdrawalTransaction {
  return (
    typeof transaction === 'object' &&
    transaction !== null &&
    'type' in transaction &&
    transaction.type === 'withdrawal' &&
    'id' in transaction &&
    typeof (transaction as Record<string, unknown>).id === 'string' &&
    'status' in transaction
  );
}
