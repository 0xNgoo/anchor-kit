/**
 * SEP-24 Types Barrel
 * Exports all SEP-24 related types and utilities
 */

export type { BaseTransactionResponse } from './common';

export type { DepositTransaction } from './deposits';
export { isDepositTransaction } from './deposits';

export type { WithdrawalTransaction } from './withdrawals';
export { isWithdrawalTransaction } from './withdrawals';

import type { DepositTransaction } from './deposits';
import type { WithdrawalTransaction } from './withdrawals';

export type Sep24TransactionResponse = DepositTransaction | WithdrawalTransaction;
