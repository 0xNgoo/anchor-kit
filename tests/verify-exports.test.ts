import {
  AssetSchema,
  DatabaseUrlSchema,
  SecurityConfigSchema,
  makeSqliteDbUrlForTests,
  utils,
} from '../src/index';
import type { TransactionKind } from '../src/index';
import { describe, expect, it } from 'vitest';

describe('Export Verification', () => {
  it('should export TransactionKind at the top level', () => {
    const deposit: TransactionKind = 'deposit';
    const withdrawal: TransactionKind = 'withdrawal';

    expect(deposit).toBe('deposit');
    expect(withdrawal).toBe('withdrawal');
  });

  it('should export AssetSchema at the top level', () => {
    expect(AssetSchema).toBeDefined();
    expect(typeof AssetSchema.isValid).toBe('function');
  });

  it('should export DatabaseUrlSchema at the top level', () => {
    expect(DatabaseUrlSchema).toBeDefined();
    expect(typeof DatabaseUrlSchema.isValid).toBe('function');
  });

  it('should export SecurityConfigSchema at the top level', () => {
    expect(SecurityConfigSchema).toBeDefined();
    expect(typeof SecurityConfigSchema.validate).toBe('function');
  });

  it('should still be available through utils.AssetSchema', () => {
    expect(utils.AssetSchema).toBeDefined();
    expect(utils.AssetSchema).toBe(AssetSchema);
  });

  it('should still be available through utils.SecurityConfigSchema', () => {
    expect(utils.SecurityConfigSchema).toBeDefined();
    expect(utils.SecurityConfigSchema).toBe(SecurityConfigSchema);
  });

  it('should export makeSqliteDbUrlForTests at the top level', () => {
    expect(makeSqliteDbUrlForTests).toBeDefined();
    expect(typeof makeSqliteDbUrlForTests).toBe('function');
    expect(makeSqliteDbUrlForTests()).toMatch(/^file:/);
  });
});

describe('AssetSchema Validation', () => {
  it('should validate a correct asset object', () => {
    const validAsset = {
      code: 'USDC',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      name: 'USD Coin',
      deposits_enabled: true,
      withdrawals_enabled: true,
      min_amount: 10,
      max_amount: 5000,
    };
    expect(AssetSchema.isValid(validAsset)).toBe(true);
  });

  it('should validate a minimal asset object', () => {
    const minimalAsset = {
      code: 'USDC',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    };
    expect(AssetSchema.isValid(minimalAsset)).toBe(true);
  });

  it('should reject an asset with missing code', () => {
    const invalidAsset = {
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    };
    expect(AssetSchema.isValid(invalidAsset)).toBe(false);
  });

  it('should reject an asset with invalid issuer', () => {
    const invalidAsset = {
      code: 'USDC',
      issuer: 'invalid-stellar-address',
    };
    expect(AssetSchema.isValid(invalidAsset)).toBe(false);
  });

  it('should reject an asset with incorrect field types', () => {
    const invalidAsset = {
      code: 'USDC',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      deposits_enabled: 'yes', // should be boolean
    };
    expect(AssetSchema.isValid(invalidAsset)).toBe(false);
  });

  // min_amount / max_amount relationship checks
  it('should reject an asset where min_amount exceeds max_amount', () => {
    const invalidAsset = {
      code: 'USDC',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      min_amount: 1000,
      max_amount: 100,
    };
    expect(AssetSchema.isValid(invalidAsset)).toBe(false);
  });

  it('should accept an asset where min_amount equals max_amount', () => {
    const validAsset = {
      code: 'USDC',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      min_amount: 500,
      max_amount: 500,
    };
    expect(AssetSchema.isValid(validAsset)).toBe(true);
  });

  it('should accept an asset with only min_amount', () => {
    const validAsset = {
      code: 'USDC',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      min_amount: 10,
    };
    expect(AssetSchema.isValid(validAsset)).toBe(true);
  });

  it('should accept an asset with only max_amount', () => {
    const validAsset = {
      code: 'USDC',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      max_amount: 5000,
    };
    expect(AssetSchema.isValid(validAsset)).toBe(true);
  });

  it('should accept an asset with neither min_amount nor max_amount', () => {
    const validAsset = {
      code: 'USDC',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    };
    expect(AssetSchema.isValid(validAsset)).toBe(true);
  });
});
