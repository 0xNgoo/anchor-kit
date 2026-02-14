import { describe, it, expect } from 'vitest';
import {
  generateMemo,
  parseXdrTransaction,
  buildPaymentXdr,
  validateAccountId,
  isStellarAddress,
  formatAmount,
  parseAsset,
  type MemoType,
  StellarUtils,
} from '../src/utils/stellar';

describe('StellarUtils', () => {
  describe('generateMemo', () => {
    it('should generate ID memo', () => {
      const memo = generateMemo('12345', 'id');
      expect(memo).toEqual({ type: 'id', value: '12345' });
    });

    it('should generate text memo', () => {
      const memo = generateMemo('hello', 'text');
      expect(memo).toEqual({ type: 'text', value: 'hello' });
    });

    it('should generate hash memo', () => {
      const hash = 'a'.repeat(64);
      const memo = generateMemo(hash, 'hash');
      expect(memo).toEqual({ type: 'hash', value: hash });
    });

    it('should generate return memo', () => {
      const hash = 'b'.repeat(64);
      const memo = generateMemo(hash, 'return');
      expect(memo).toEqual({ type: 'return', value: hash });
    });

    it('should generate none memo', () => {
      const memo = generateMemo('', 'none');
      expect(memo).toEqual({ type: 'none' });
    });

    it('should throw error for oversize text memo', () => {
      expect(() => generateMemo('a'.repeat(29), 'text')).toThrow('exceeds 28 byte limit');
    });

    it('should throw error for invalid hash memo', () => {
      expect(() => generateMemo('invalid', 'hash')).toThrow('64 hexadecimal characters');
    });

    it('should throw error for ID exceeding 64-bit', () => {
      expect(() => generateMemo('18446744073709551616', 'id')).toThrow('exceeds 64-bit');
    });
  });

  describe('parseXdrTransaction', () => {
    it('should parse valid base64 XDR', () => {
      const xdr = Buffer.from('test').toString('base64');
      const result = parseXdrTransaction(xdr);

      expect(result).toEqual({
        operations: [],
        sourceAccount: undefined,
        fee: undefined,
      });
    });

    it('should throw error for invalid base64', () => {
      expect(() => parseXdrTransaction('not-valid-base64!!!')).toThrow('Invalid XDR format');
    });
  });

  describe('buildPaymentXdr', () => {
    const validSource = 'G' + 'A'.repeat(55);
    const validDestination = 'G' + 'B'.repeat(55);

    it('should validate source account', () => {
      expect(() => buildPaymentXdr({
        source: 'invalid',
        destination: validDestination,
        amount: '10',
        asset: 'XLM',
      })).toThrow('Invalid source account ID');
    });

    it('should validate destination account', () => {
      expect(() => buildPaymentXdr({
        source: validSource,
        destination: 'invalid',
        amount: '10',
        asset: 'XLM',
      })).toThrow('Invalid destination account ID');
    });

    it('should validate amount format', () => {
      expect(() => buildPaymentXdr({
        source: validSource,
        destination: validDestination,
        amount: 'invalid',
        asset: 'XLM',
      })).toThrow('Invalid amount format');
    });
  });

  describe('validateAccountId', () => {
    it('should validate public key (G...)', () => {
      expect(validateAccountId('G' + 'A'.repeat(55))).toBe(true);
    });

    it('should validate muxed account (M...)', () => {
      expect(validateAccountId('M' + 'A'.repeat(55))).toBe(true);
    });

    it('should reject invalid accounts', () => {
      expect(validateAccountId('invalid')).toBe(false);
      expect(validateAccountId('G' + 'a'.repeat(55))).toBe(false); // Lowercase
      expect(validateAccountId('G' + 'A'.repeat(54))).toBe(false); // Too short
      expect(validateAccountId('G' + 'A'.repeat(56))).toBe(false); // Too long
    });
  });

  describe('isStellarAddress', () => {
    it('should validate public keys', () => {
      expect(isStellarAddress('G' + 'A'.repeat(55))).toBe(true);
    });

    it('should validate muxed accounts', () => {
      expect(isStellarAddress('M' + 'A'.repeat(55))).toBe(true);
    });

    it('should validate federation addresses', () => {
      expect(isStellarAddress('user*domain.com')).toBe(true);
      expect(isStellarAddress('alice*stellar.org')).toBe(true);
    });

    it('should reject invalid federation addresses', () => {
      expect(isStellarAddress('user@domain.com')).toBe(false); // Wrong separator
      expect(isStellarAddress('*domain.com')).toBe(false); // Missing username
      expect(isStellarAddress('user*')).toBe(false); // Missing domain
      expect(isStellarAddress('user*invalid')).toBe(false); // Invalid domain
    });
  });

  describe('formatAmount', () => {
    it('should format XLM amounts', () => {
      expect(formatAmount('10000000', 'stroops')).toBe('1');
      expect(formatAmount('15000000', 'stroops')).toBe('1.5');
      expect(formatAmount('12345678', 'stroops')).toBe('1.2345678');
    });

    it('should format XLM directly', () => {
      expect(formatAmount('10', 'xlm')).toBe('10');
      expect(formatAmount('1.5', 'xlm')).toBe('1.5');
    });

    it('should remove trailing zeros', () => {
      expect(formatAmount('10000000', 'stroops')).toBe('1');
      expect(formatAmount('15000000', 'stroops')).toBe('1.5');
    });
  });

  describe('parseAsset', () => {
    it('should parse XLM', () => {
      const asset = parseAsset('XLM');
      expect(asset).toEqual({ code: 'XLM' });
    });

    it('should parse native', () => {
      const asset = parseAsset('native');
      expect(asset).toEqual({ code: 'XLM' });
    });

    it('should parse custom asset', () => {
      const asset = parseAsset('USDC:G' + 'A'.repeat(55));
      expect(asset.code).toBe('USDC');
      expect(asset.issuer).toBeDefined();
      expect(asset.issuer).toHaveLength(56);
    });

    it('should throw error for invalid format', () => {
      expect(() => parseAsset('invalid')).toThrow('Invalid asset format');
      expect(() => parseAsset('USDC')).toThrow('Invalid asset format'); // Missing issuer
    });

    it('should throw error for long asset code', () => {
      expect(() => parseAsset('A'.repeat(13) + ':G' + 'A'.repeat(55))).toThrow('exceeds 12 characters');
    });

    it('should throw error for invalid issuer', () => {
      expect(() => parseAsset('USDC:invalid')).toThrow('Invalid asset issuer');
    });
  });

  describe('Memo type edge cases', () => {
    it('should handle max text memo (28 bytes)', () => {
      const memo = 'a'.repeat(28);
      expect(() => generateMemo(memo, 'text')).not.toThrow();
    });

    it('should handle max ID memo (64-bit unsigned)', () => {
      const maxId = '18446744073709551615';
      expect(() => generateMemo(maxId, 'id')).not.toThrow();
    });
  });

  describe('StellarUtils helper object', () => {
    it('should export all methods', () => {
      expect(StellarUtils.generateMemo).toBeDefined();
      expect(StellarUtils.parseXdrTransaction).toBeDefined();
      expect(StellarUtils.buildPaymentXdr).toBeDefined();
      expect(StellarUtils.validateAccountId).toBeDefined();
      expect(StellarUtils.isStellarAddress).toBeDefined();
      expect(StellarUtils.formatAmount).toBeDefined();
      expect(StellarUtils.parseAsset).toBeDefined();
    });

    it('should work when called from helper object', () => {
      expect(StellarUtils.validateAccountId('G' + 'A'.repeat(55))).toBe(true);
      expect(StellarUtils.isStellarAddress('user*domain.com')).toBe(true);
    });
  });
});
