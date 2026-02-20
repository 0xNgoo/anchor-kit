/**
 * Type tests for Asset interface
 * Verifies required and optional field behavior
 */

import { describe, it, expectTypeOf } from 'vitest';
import type { Asset, KycStatus } from '../../src/types/foundation';

describe('Asset Type Tests', () => {
  describe('Asset interface', () => {
    it('should require code and issuer fields', () => {
      const asset: Asset = {
        code: 'USDC',
        issuer: 'GBBD47UZQ5CPCB5J22EMS2HK7J5ZCRYEVGY4FULBNINPL7ONCHKSC3EH',
      };

      expectTypeOf(asset.code).toEqualTypeOf<string>();
      expectTypeOf(asset.issuer).toEqualTypeOf<string>();
    });

    it('should allow creation with only required fields', () => {
      const minimalAsset: Asset = {
        code: 'EUR',
        issuer: 'GBBD47UZQ5CPCB5J22EMS2HK7J5ZCRYEVGY4FULBNINPL7ONCHKSC3EH',
      };

      expectTypeOf(minimalAsset).toMatchTypeOf<Asset>();
    });

    it('should allow displayName as optional field', () => {
      const asset: Asset = {
        code: 'USDC',
        issuer: 'GBBD47UZQ5CPCB5J22EMS2HK7J5ZCRYEVGY4FULBNINPL7ONCHKSC3EH',
        displayName: 'US Dollar Coin',
      };

      expectTypeOf(asset.displayName).toMatchTypeOf<string | undefined>();
    });

    it('should allow nameOnNetwork as optional field', () => {
      const asset: Asset = {
        code: 'EURC',
        issuer: 'GBBD47UZQ5CPCB5J22EMS2HK7J5ZCRYEVGY4FULBNINPL7ONCHKSC3EH',
        nameOnNetwork: 'Circle Euro Coin',
      };

      expectTypeOf(asset.nameOnNetwork).toMatchTypeOf<string | undefined>();
    });

    it('should allow decimals as optional number field', () => {
      const asset: Asset = {
        code: 'USDC',
        issuer: 'GBBD47UZQ5CPCB5J22EMS2HK7J5ZCRYEVGY4FULBNINPL7ONCHKSC3EH',
        decimals: 6,
      };

      expectTypeOf(asset.decimals).toMatchTypeOf<number | undefined>();
    });

    it('should allow all optional fields together', () => {
      const fullAsset: Asset = {
        code: 'USDC',
        issuer: 'GBBD47UZQ5CPCB5J22EMS2HK7J5ZCRYEVGY4FULBNINPL7ONCHKSC3EH',
        displayName: 'US Dollar Coin',
        nameOnNetwork: 'Circle USDC',
        decimals: 6,
      };

      expectTypeOf(fullAsset).toMatchTypeOf<Asset>();
      expectTypeOf(fullAsset.displayName).toMatchTypeOf<string | undefined>();
      expectTypeOf(fullAsset.nameOnNetwork).toMatchTypeOf<string | undefined>();
      expectTypeOf(fullAsset.decimals).toMatchTypeOf<number | undefined>();
    });

    it('should support various asset codes', () => {
      const assets: Asset[] = [
        { code: 'USDC', issuer: 'GBBD47UZQ5CPCB5J22EMS2HK7J5ZCRYEVGY4FULBNINPL7ONCHKSC3EH' },
        { code: 'EUR', issuer: 'GBBD47UZQ5CPCB5J22EMS2HK7J5ZCRYEVGY4FULBNINPL7ONCHKSC3EH' },
        { code: 'NGN', issuer: 'GBBD47UZQ5CPCB5J22EMS2HK7J5ZCRYEVGY4FULBNINPL7ONCHKSC3EH' },
        { code: 'BRL', issuer: 'GBBD47UZQ5CPCB5J22EMS2HK7J5ZCRYEVGY4FULBNINPL7ONCHKSC3EH' },
      ];

      expectTypeOf(assets).toMatchTypeOf<Asset[]>();
    });

    it('should support standard decimal places for different assets', () => {
      const usdcAsset: Asset = {
        code: 'USDC',
        issuer: 'GBBD47UZQ5CPCB5J22EMS2HK7J5ZCRYEVGY4FULBNINPL7ONCHKSC3EH',
        decimals: 6,
      };

      const xlmAsset: Asset = {
        code: 'native',
        issuer: 'GBBD47UZQ5CPCB5J22EMS2HK7J5ZCRYEVGY4FULBNINPL7ONCHKSC3EH',
        decimals: 7,
      };

      expectTypeOf(usdcAsset.decimals).toMatchTypeOf<number | undefined>();
      expectTypeOf(xlmAsset.decimals).toMatchTypeOf<number | undefined>();
    });
  });

  describe('KycStatus type', () => {
    it('should export KycStatus type', () => {
      const status: KycStatus = 'approved';
      expectTypeOf(status).toMatchTypeOf<KycStatus>();
    });

    it('should support all KycStatus values', () => {
      const statuses: KycStatus[] = ['not_provided', 'pending', 'approved', 'rejected'];
      expectTypeOf(statuses).toMatchTypeOf<KycStatus[]>();
    });
  });
});
