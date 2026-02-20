/**
 * Type tests for DepositTransaction
 * Verifies discriminated union narrowing and type compatibility
 */

import { describe, it, expectTypeOf } from 'vitest';
import type {
  DepositTransaction,
  Sep24TransactionResponse,
  WithdrawalTransaction,
  BaseTransactionResponse,
} from '../src/types/sep24';
import { isDepositTransaction, isWithdrawalTransaction } from '../src/types/sep24';

describe('DepositTransaction Type Tests', () => {
  describe('DepositTransaction interface', () => {
    it('should have type discriminator set to "deposit"', () => {
      const deposit: DepositTransaction = {
        type: 'deposit',
        id: 'deposit-123',
        status: 'completed',
      };

      expectTypeOf(deposit.type).toEqualTypeOf<'deposit'>();
    });

    it('should require id and status fields', () => {
      const deposit: DepositTransaction = {
        type: 'deposit',
        id: 'deposit-123',
        status: 'completed',
      };

      expectTypeOf(deposit.id).toMatchTypeOf<string>();
      expectTypeOf(deposit.status).toMatchTypeOf<
        | 'incomplete'
        | 'pending_user_transfer_start'
        | 'pending_user_transfer_complete'
        | 'pending_external'
        | 'pending_anchor'
        | 'pending_stellar'
        | 'completed'
        | 'failed'
        | 'error'
        | 'expired'
      >();
    });

    it('should extend BaseTransactionResponse', () => {
      const deposit: DepositTransaction = {
        type: 'deposit',
        id: 'deposit-123',
        status: 'completed',
        amount_in: {
          amount: '100.00',
          asset: 'USD',
        },
      };

      expectTypeOf(deposit).toMatchTypeOf<BaseTransactionResponse>();
    });
  });

  describe('Sep24TransactionResponse compatibility', () => {
    it('should be assignable to Sep24TransactionResponse for deposits', () => {
      const depositTx: DepositTransaction = {
        type: 'deposit',
        id: 'dep-1',
        status: 'pending_user_transfer_start',
      };

      const txResponse: Sep24TransactionResponse = depositTx;
      expectTypeOf(txResponse).toMatchTypeOf<Sep24TransactionResponse>();
    });

    it('should narrow from Sep24TransactionResponse to DepositTransaction', () => {
      const transaction: Sep24TransactionResponse = {
        type: 'deposit',
        id: 'dep-1',
        status: 'completed',
      };

      if (transaction.type === 'deposit') {
        expectTypeOf(transaction).toEqualTypeOf<DepositTransaction>();
      }
    });

    it('should support discriminated union with withdrawals', () => {
      const transaction: Sep24TransactionResponse = {
        type: 'deposit',
        id: 'dep-1',
        status: 'completed',
      };

      const testUnion = (tx: Sep24TransactionResponse) => {
        if (tx.type === 'deposit') {
          expectTypeOf(tx).toEqualTypeOf<DepositTransaction>();
        } else {
          expectTypeOf(tx).toEqualTypeOf<WithdrawalTransaction>();
        }
      };

      testUnion(transaction);
    });
  });

  describe('Type guard functions', () => {
    it('isDepositTransaction should narrow correctly', () => {
      const transaction: Sep24TransactionResponse = {
        type: 'deposit',
        id: 'dep-1',
        status: 'completed',
      };

      if (isDepositTransaction(transaction)) {
        expectTypeOf(transaction).toEqualTypeOf<DepositTransaction>();
      }
    });

    it('isWithdrawalTransaction should narrow to WithdrawalTransaction', () => {
      const transaction: Sep24TransactionResponse = {
        type: 'withdrawal',
        id: 'wd-1',
        status: 'completed',
      };

      if (isWithdrawalTransaction(transaction)) {
        expectTypeOf(transaction).toEqualTypeOf<WithdrawalTransaction>();
      }
    });

    it('should use type guards for runtime filtering', () => {
      const transactions: Sep24TransactionResponse[] = [
        { type: 'deposit', id: 'dep-1', status: 'completed' },
        { type: 'withdrawal', id: 'wd-1', status: 'pending_external' },
        { type: 'deposit', id: 'dep-2', status: 'failed' },
      ];

      const deposits = transactions.filter(isDepositTransaction);
      const withdrawals = transactions.filter(isWithdrawalTransaction);

      expectTypeOf(deposits).toMatchTypeOf<DepositTransaction[]>();
      expectTypeOf(withdrawals).toMatchTypeOf<WithdrawalTransaction[]>();
    });
  });

  describe('Field compatibility', () => {
    it('should support all optional BaseTransactionResponse fields', () => {
      const deposit: DepositTransaction = {
        type: 'deposit',
        id: 'dep-1',
        status: 'completed',
        more_info_url: 'https://example.com/info',
        amount_in: {
          amount: '100.00',
          asset: 'USD',
        },
        amount_out: {
          amount: '95.00',
          asset: 'USDC',
        },
        amount_fee: {
          amount: '5.00',
          asset: 'USD',
        },
        started_at: 1000000,
        completed_at: 2000000,
        message: 'Transaction completed',
      };

      expectTypeOf(deposit.type).toEqualTypeOf<'deposit'>();
      expectTypeOf(deposit.id).toEqualTypeOf<string>();
      expectTypeOf(deposit.status).toMatchTypeOf<string>();
    });
  });
});

describe('WithdrawalTransaction Type Tests', () => {
  describe('WithdrawalTransaction interface', () => {
    it('should have type discriminator set to "withdrawal"', () => {
      const withdrawal: WithdrawalTransaction = {
        type: 'withdrawal',
        id: 'withdrawal-123',
        status: 'pending_external',
      };

      expectTypeOf(withdrawal.type).toEqualTypeOf<'withdrawal'>();
    });

    it('should require id and status fields', () => {
      const withdrawal: WithdrawalTransaction = {
        type: 'withdrawal',
        id: 'withdrawal-123',
        status: 'pending_external',
      };

      expectTypeOf(withdrawal.id).toMatchTypeOf<string>();
      expectTypeOf(withdrawal.status).toMatchTypeOf<
        | 'incomplete'
        | 'pending_user_transfer_start'
        | 'pending_user_transfer_complete'
        | 'pending_external'
        | 'pending_anchor'
        | 'pending_stellar'
        | 'completed'
        | 'failed'
        | 'error'
        | 'expired'
      >();
    });

    it('should extend BaseTransactionResponse', () => {
      const withdrawal: WithdrawalTransaction = {
        type: 'withdrawal',
        id: 'withdrawal-123',
        status: 'completed',
        amount_out: {
          amount: '100.00',
          asset: 'USD',
        },
      };

      expectTypeOf(withdrawal).toMatchTypeOf<BaseTransactionResponse>();
    });
  });

  describe('Sep24TransactionResponse compatibility', () => {
    it('should be assignable to Sep24TransactionResponse for withdrawals', () => {
      const withdrawalTx: WithdrawalTransaction = {
        type: 'withdrawal',
        id: 'wd-1',
        status: 'pending_user_transfer_complete',
      };

      const txResponse: Sep24TransactionResponse = withdrawalTx;
      expectTypeOf(txResponse).toMatchTypeOf<Sep24TransactionResponse>();
    });

    it('should narrow from Sep24TransactionResponse to WithdrawalTransaction', () => {
      const transaction: Sep24TransactionResponse = {
        type: 'withdrawal',
        id: 'wd-1',
        status: 'completed',
      };

      if (transaction.type === 'withdrawal') {
        expectTypeOf(transaction).toEqualTypeOf<WithdrawalTransaction>();
      }
    });
  });

  describe('Type guard for withdrawals', () => {
    it('isWithdrawalTransaction should narrow correctly', () => {
      const transaction: Sep24TransactionResponse = {
        type: 'withdrawal',
        id: 'wd-1',
        status: 'pending_stellar',
      };

      if (isWithdrawalTransaction(transaction)) {
        expectTypeOf(transaction).toEqualTypeOf<WithdrawalTransaction>();
      }
    });
  });

  describe('Field compatibility for withdrawals', () => {
    it('should support all optional BaseTransactionResponse fields', () => {
      const withdrawal: WithdrawalTransaction = {
        type: 'withdrawal',
        id: 'wd-1',
        status: 'completed',
        more_info_url: 'https://example.com/info',
        amount_out: {
          amount: '100.00',
          asset: 'USD',
        },
        amount_fee: {
          amount: '1.00',
          asset: 'USD',
        },
        started_at: 1000000,
        completed_at: 2000000,
        message: 'Withdrawal processed',
      };

      expectTypeOf(withdrawal.type).toEqualTypeOf<'withdrawal'>();
      expectTypeOf(withdrawal.id).toEqualTypeOf<string>();
      expectTypeOf(withdrawal.status).toMatchTypeOf<string>();
    });
  });
});
