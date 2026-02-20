/**
 * Common types for SEP-24 transactions
 * Based on Stellar SEP-24 specification
 * @see https://developers.stellar.org/docs/learn/fundamentals/stellar-ecosystem-proposals/sep-0024
 */

import type { TransactionStatus } from '../transaction-status.ts';

/**
 * Base transaction response type
 * Defines the common structure for all SEP-24 transactions
 */
export interface BaseTransactionResponse {
  /** Unique transaction identifier */
  id: string;

  /** Current status of the transaction */
  status: TransactionStatus;

  /** A URL the user can visit to see more information about a transaction */
  more_info_url?: string;

  /** Amount being transferred */
  amount_in?: {
    amount: string;
    asset: string;
  };

  /** Amount to be transferred */
  amount_out?: {
    amount: string;
    asset: string;
  };

  /** Amount charged as fees */
  amount_fee?: {
    amount: string;
    asset: string;
  };

  /** Unix timestamp when transaction was started */
  started_at?: number;

  /** Unix timestamp when transaction was completed */
  completed_at?: number;

  /** Additional transaction data */
  message?: string;

  /** Refund details if transaction failed */
  refunds?: {
    amount_refunded: {
      amount: string;
      asset: string;
    };
    amount_fee: {
      amount: string;
      asset: string;
    };
    payments: Array<{
      id: string;
      id_type: string;
      amount: {
        amount: string;
        asset: string;
      };
      fee: {
        amount: string;
        asset: string;
      };
    }>;
  };
}
