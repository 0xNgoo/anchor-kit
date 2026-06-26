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

export type Sep24TransactionResponse =
  | DepositTransaction
  | WithdrawalTransaction
  | TransactionNotFoundError;
