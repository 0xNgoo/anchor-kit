import { TRANSACTION_STATUSES, type TransactionStatus } from '@/types/index.ts';

describe('TransactionStatus', () => {
  // -- runtime checks on the status array --

  it('covers every SEP-24 lifecycle status', () => {
    const expected = [
      'completed',
      'error',
      'expired',
      'incomplete',
      'no_market',
      'pending_anchor',
      'pending_external',
      'pending_stellar',
      'pending_trust',
      'pending_user',
      'pending_user_transfer_complete',
      'pending_user_transfer_start',
      'refunded',
      'too_large',
      'too_small',
    ];

    expect([...TRANSACTION_STATUSES].sort()).toEqual(expected);
  });

  it('contains no duplicates', () => {
    const unique = new Set(TRANSACTION_STATUSES);
    expect(unique.size).toBe(TRANSACTION_STATUSES.length);
  });

  // -- compile-time checks (tsc catches these before tests even run) --

  it('accepts every valid status', () => {
    const all: TransactionStatus[] = [
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
    ];

    expect(all).toBeDefined();
  });

  it('rejects invalid strings at compile time', () => {
    // @ts-expect-error — not a real status
    const x: TransactionStatus = 'invalid';

    // @ts-expect-error — wrong casing
    const y: TransactionStatus = 'COMPLETED';

    // @ts-expect-error — partial match doesn't count
    const z: TransactionStatus = 'pending';

    expect(x).toBeDefined();
    expect(y).toBeDefined();
    expect(z).toBeDefined();
  });
});
