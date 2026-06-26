import { isTransactionStatus, TRANSACTION_STATUSES } from '@/types/index.ts';

describe('isTransactionStatus', () => {
  it('returns true for every valid status', () => {
    for (const s of TRANSACTION_STATUSES) {
      expect(isTransactionStatus(s)).toBe(true);
    }
  });

  it('returns false for invalid strings', () => {
    expect(isTransactionStatus('not_a_status')).toBe(false);
    expect(isTransactionStatus('Completed')).toBe(false);
    expect(isTransactionStatus('pending')).toBe(false);
  });

  it('returns false for non-string inputs', () => {
    expect(isTransactionStatus(null)).toBe(false);
    expect(isTransactionStatus(undefined)).toBe(false);
    expect(isTransactionStatus(123)).toBe(false);
    expect(isTransactionStatus({})).toBe(false);
    expect(isTransactionStatus([])).toBe(false);
  });
});
