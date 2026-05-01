import { describe, it, expect } from 'vitest';
import { Account, Keypair, MuxedAccount } from '@stellar/stellar-sdk';
import { StellarUtils } from '@/utils/stellar.ts';

interface ParsedPaymentOperation {
  type: string;
  amount: string;
  asset?: {
    isNative(): boolean;
  };
}

function asPaymentOperation(operation: unknown): ParsedPaymentOperation {
  if (!operation || typeof operation !== 'object') {
    throw new Error('Unexpected operation payload');
  }
  return operation as ParsedPaymentOperation;
}

describe('StellarUtils', () => {
  const validAccountId = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  const invalidAccountId = 'INVALID_ACCOUNT_ID';

  describe('validateAccountId()', () => {
    it('should return true for valid account IDs', () => {
      expect(StellarUtils.validateAccountId(validAccountId)).toBe(true);
    });

    it('should return false for invalid account IDs', () => {
      expect(StellarUtils.validateAccountId(invalidAccountId)).toBe(false);
      expect(StellarUtils.validateAccountId('SABC...')).toBe(false); // Seed not allowed
      expect(StellarUtils.validateAccountId('')).toBe(false);
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
      const operation = asPaymentOperation(parsed.operations[0]);
      expect(operation.type).toBe('payment');
      // Stellar internal amounts are typically formatted to 7 decimal places
      expect(parseFloat(operation.amount)).toBe(parseFloat(params.amount));
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
      const operation = asPaymentOperation(parsed.operations[0]);
      expect(operation.asset?.isNative()).toBe(true);
      expect(parseFloat(operation.amount)).toBe(parseFloat(params.amount));
    });

    it('should fail early for an invalid source public key', async () => {
      await expect(
        StellarUtils.buildPaymentXdr({
          source: invalidAccountId,
          destination: validAccountId,
          amount: '1',
          assetCode: 'XLM',
          network: 'testnet',
        }),
      ).rejects.toThrow('source must be a valid Stellar public or muxed public key');
    });

    it('should fail early for an invalid destination public key', async () => {
      await expect(
        StellarUtils.buildPaymentXdr({
          source: validAccountId,
          destination: invalidAccountId,
          amount: '1',
          assetCode: 'XLM',
          network: 'testnet',
        }),
      ).rejects.toThrow('destination must be a valid Stellar public or muxed public key');
    });

    it('should throw a clear error when a non-native asset issuer is missing', async () => {
      await expect(
        StellarUtils.buildPaymentXdr({
          source: validAccountId,
          destination: validAccountId,
          amount: '1.5',
          assetCode: 'USDC',
          network: 'testnet',
        }),
      ).rejects.toThrow('A valid issuer is required for non-native asset payments: USDC');
    });

    it('should throw a clear error when a non-native asset issuer is invalid', async () => {
      await expect(
        StellarUtils.buildPaymentXdr({
          source: validAccountId,
          destination: validAccountId,
          amount: '1.5',
          assetCode: 'USDC',
          issuer: invalidAccountId,
          network: 'testnet',
        }),
      ).rejects.toThrow('A valid issuer is required for non-native asset payments: USDC');
    });

    it('should fail early for an invalid issuer on non-native assets', async () => {
      await expect(
        StellarUtils.buildPaymentXdr({
          source: validAccountId,
          destination: validAccountId,
          amount: '1',
          assetCode: 'USDC',
          issuer: invalidAccountId,
          network: 'testnet',
        }),
      ).rejects.toThrow('A valid issuer is required for non-native asset payments: USDC');
    });

    it('should accept muxed source and destination accounts', async () => {
      const baseAccount = Keypair.random().publicKey();
      const source = new MuxedAccount(new Account(baseAccount, '0'), '123').accountId();
      const destination = new MuxedAccount(new Account(baseAccount, '0'), '456').accountId();

      const xdr = await StellarUtils.buildPaymentXdr({
        source,
        destination,
        amount: '1',
        assetCode: 'XLM',
        network: 'testnet',
      });

      const parsed = StellarUtils.parseXdrTransaction(xdr);
      expect(parsed.source).toBe(source);
      expect(parsed.operations.length).toBe(1);
    });

    it('should throw when parsing invalid XDR', () => {
      expect(() => StellarUtils.parseXdrTransaction('invalid-xdr')).toThrow(/Failed to parse XDR/);
    });
  });
});
