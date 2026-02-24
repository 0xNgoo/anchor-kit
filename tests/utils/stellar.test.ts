import { describe, it, expect } from 'vitest';
import { StellarUtils } from '@/utils/stellar.ts';

describe('StellarUtils', () => {
  const validAccountId = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  const invalidAccountId = 'INVALID_ACCOUNT_ID';

  describe('validateAccountId() / isStellarAddress()', () => {
    it('should return true for valid account IDs', () => {
      expect(StellarUtils.validateAccountId(validAccountId)).toBe(true);
      expect(StellarUtils.isStellarAddress(validAccountId)).toBe(true);
    });

    it('should return false for invalid account IDs', () => {
      expect(StellarUtils.validateAccountId(invalidAccountId)).toBe(false);
      expect(StellarUtils.isStellarAddress('SABC...')).toBe(false); // Seed not allowed
      expect(StellarUtils.isStellarAddress('')).toBe(false);
    });
  });

  describe('generateMemo()', () => {
    it('should generate a hash memo', () => {
      const txId = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const memo = StellarUtils.generateMemo(txId, 'hash');
      expect(memo.type).toBe('hash');
      expect(memo.value).toBe(txId);
    });

    it('should generate a text memo (truncated to 28 bytes)', () => {
      const txId = 'this_is_a_very_long_transaction_id_that_exceeds_28_bytes';
      const memo = StellarUtils.generateMemo(txId, 'text');
      expect(memo.type).toBe('text');
      expect(memo.value.length).toBeLessThanOrEqual(28);
      expect(memo.value).toBe(txId.substring(0, 28));
    });
  });

  describe('buildPaymentXdr() and parseXdrTransaction()', () => {
    it('should build and then parse back a payment transaction', async () => {
      const params = {
        source: validAccountId,
        destination: validAccountId,
        amount: '100.00',
        assetCode: 'USDC',
        issuer: validAccountId,
        memo: { value: 'test-memo', type: 'text' as const },
        network: 'testnet',
      };

      const xdr = await StellarUtils.buildPaymentXdr(params);
      expect(typeof xdr).toBe('string');
      expect(xdr.length).toBeGreaterThan(0);

      const parsed = StellarUtils.parseXdrTransaction(xdr);
      expect(parsed.source).toBe(params.source);
      expect(parsed.memo?.value).toBe(params.memo.value);
      expect(parsed.memo?.type).toBe(params.memo.type);
      expect(parsed.operations.length).toBe(1);
      expect(parsed.operations[0].type).toBe('payment');
      // Stellar internal amounts are typically formatted to 7 decimal places
      expect(parseFloat(parsed.operations[0].amount)).toBe(parseFloat(params.amount));
    });

    it('should build a native XLM payment', async () => {
      const params = {
        source: validAccountId,
        destination: validAccountId,
        amount: '1.5',
        assetCode: 'XLM',
        network: 'testnet',
      };

      const xdr = await StellarUtils.buildPaymentXdr(params);
      const parsed = StellarUtils.parseXdrTransaction(xdr);
      expect(parsed.operations[0].asset.isNative()).toBe(true);
      expect(parseFloat(parsed.operations[0].amount)).toBe(parseFloat(params.amount));
    });

    it('should throw when parsing invalid XDR', () => {
      expect(() => StellarUtils.parseXdrTransaction('invalid-xdr')).toThrow(/Failed to parse XDR/);
    });
  });
});
