/**
 * Every valid status a SEP-24 transaction can be in.
 *
 * The TransactionStatus type is derived straight from this array,
 * so we only need to maintain the list in one place.
 *
 * https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md
 */
export const TRANSACTION_STATUSES = [
  'incomplete',
  'pending_anchor',
  'pending_user_transfer_start',
  'pending_user_transfer_complete',
  'pending_external',
  'pending_trust',
  'pending_user',
  'pending_stellar',
  'completed',
  'refunded',
  'expired',
  'error',
  'no_market',
  'too_small',
  'too_large',
] as const;

/** Union of all valid transaction statuses, pulled from the array above. */
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

/** Union of all pending transaction statuses. */
export type PendingTransactionStatus = Extract<TransactionStatus, `pending_${string}`>;

const PENDING_TRANSACTION_STATUSES: ReadonlySet<TransactionStatus> = new Set([
  'pending_anchor',
  'pending_user_transfer_start',
  'pending_user_transfer_complete',
  'pending_external',
  'pending_trust',
  'pending_user',
  'pending_stellar',
]);

/**
 * Returns whether a transaction is still in progress.
 *
 * Pending statuses are:
 * - `pending_anchor`
 * - `pending_user_transfer_start`
 * - `pending_user_transfer_complete`
 * - `pending_external`
 * - `pending_trust`
 * - `pending_user`
 * - `pending_stellar`
 */
export function isPendingTransactionStatus(
  status: TransactionStatus,
): status is PendingTransactionStatus {
  return PENDING_TRANSACTION_STATUSES.has(status);
}
