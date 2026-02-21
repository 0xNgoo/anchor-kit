/**
 * SEP-24 Types Barrel
 * Exports all SEP-24 related types and utilities
 */

export type { BaseTransactionResponse } from './common';
export type { TransactionNotFoundError } from './common';
export { isTransactionNotFoundError } from './common';

export type { DepositTransaction } from './deposits';
export { isDepositTransaction } from './deposits';

export type { WithdrawalTransaction } from './withdrawals';
export { isWithdrawalTransaction } from './withdrawals';

import type { DepositTransaction } from './deposits';
import type { WithdrawalTransaction } from './withdrawals';
import type { TransactionNotFoundError } from './common';

/**
 * Union of all possible SEP-24 transaction responses
 * Can be a successful deposit, successful withdrawal, or a not found error
 *
 * Use the discriminator field 'type' for type narrowing:
 * - 'deposit' for DepositTransaction
 * - 'withdrawal' for WithdrawalTransaction
 * - 'not_found' for TransactionNotFoundError
 *
 * @example
 * ```typescript
 * const response: Sep24TransactionResponse = await getTransaction(id);
 * if (response.type === 'deposit') {
 *   console.log('Deposit ID:', response.id);
 * } else if (response.type === 'withdrawal') {
 *   console.log('Withdrawal ID:', response.id);
 * } else {
 *   console.log('Error:', response.error);
 * }
 * ```
 */
export type Sep24TransactionResponse =
  | DepositTransaction
  | WithdrawalTransaction
  | TransactionNotFoundError;
