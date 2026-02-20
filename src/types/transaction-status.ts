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
