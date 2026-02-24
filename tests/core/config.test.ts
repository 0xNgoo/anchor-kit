import { describe, it, expect } from 'vitest';
import { AnchorConfig } from '@/core/config.ts';
import { ConfigurationError } from '@/core/errors.ts';
import type { AnchorKitConfig } from '@/types/config.ts';

describe('AnchorConfig', () => {
  const validBaseConfig: AnchorKitConfig = {
    network: { network: 'testnet' },
    server: { port: 3000 },
    security: {
      sep10SigningKey: 'secret-key-10',
      interactiveJwtSecret: 'jwt-secret',
      distributionAccountSecret: 'dist-secret',
    },
    assets: {
      assets: [
        {
          code: 'USDC',
          issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        },
      ],
    },
    framework: {
      database: {
        provider: 'postgres',
        url: 'postgresql://localhost:5432/anchor',
      },
    },
  };

  describe('Initialization and Getters', () => {
    it('should initialize and return specific config properties', () => {
      const config = new AnchorConfig(validBaseConfig);
      expect(config.get('network').network).toBe('testnet');
      expect(config.get('server').port).toBe(3000);
      expect(config.getConfig()).toMatchObject(validBaseConfig);
    });

    it('should apply operational defaults when not provided', () => {
      const cfg = new AnchorConfig(validBaseConfig);
      const op = cfg.get('operational');
      expect(op).toBeDefined();
      expect(op?.webhooksEnabled).toBe(true);
      expect(op?.queueBackend).toBe('memory');
      expect(op?.corsEnabled).toBe(true);
      expect(op?.transactionRetentionDays).toBe(90);
    });
  });

  describe('getAsset()', () => {
    it('should return the matching asset', () => {
      const config = new AnchorConfig(validBaseConfig);
      const asset = config.getAsset('USDC');
      expect(asset).toBeDefined();
      expect(asset?.code).toBe('USDC');
      expect(asset?.issuer).toBe('GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
    });

    it('should return undefined when case does not match', () => {
      const config = new AnchorConfig(validBaseConfig);
      const asset = config.getAsset('usdc');
      expect(asset).toBeUndefined();
    });

    it('should return undefined when the asset is missing', () => {
      const config = new AnchorConfig(validBaseConfig);
      const asset = config.getAsset('UNKNOWN');
      expect(asset).toBeUndefined();
    });
  });

  describe('getKycRequiredFields()', () => {
    it('should return configured fields for a mapped asset', () => {
      const configWithKyc: AnchorKitConfig = {
        ...validBaseConfig,
        kycRequired: {
          USDC: ['first_name', 'last_name', 'email'],
        },
      };
      const config = new AnchorConfig(configWithKyc);
      const fields = config.getKycRequiredFields('USDC');
      expect(fields).toEqual(['first_name', 'last_name', 'email']);
    });

    it('should return an empty list for an unmapped asset', () => {
      const configWithKyc: AnchorKitConfig = {
        ...validBaseConfig,
        kycRequired: {
          USDC: ['first_name', 'last_name', 'email'],
        },
      };
      const config = new AnchorConfig(configWithKyc);
      const fields = config.getKycRequiredFields('NGNC');
      expect(fields).toEqual([]);
    });

    it('should return an empty list when no policy exists (kycRequired is undefined)', () => {
      const config = new AnchorConfig(validBaseConfig);
      const fields = config.getKycRequiredFields('USDC');
      expect(fields).toEqual([]);
    });
  });

  describe('isNetworkPassphrase()', () => {
    it('should return true for configured network passphrase', () => {
      const configWithPassphrase: AnchorKitConfig = {
        ...validBaseConfig,
        network: {
          ...validBaseConfig.network,
          networkPassphrase: 'Custom Network Passphrase',
        },
      };
      const config = new AnchorConfig(configWithPassphrase);
      expect(config.isNetworkPassphrase('Custom Network Passphrase')).toBe(true);
      expect(config.isNetworkPassphrase('Test SDF Network ; September 2015')).toBe(false);
    });

    it('should fall back to testnet default passphrase', () => {
      const config = new AnchorConfig(validBaseConfig); // validBaseConfig has network: 'testnet'
      expect(config.isNetworkPassphrase('Test SDF Network ; September 2015')).toBe(true);
      expect(config.isNetworkPassphrase('Wrong Passphrase')).toBe(false);
    });

    it('should fall back to public default passphrase', () => {
      const configPublic: AnchorKitConfig = {
        ...validBaseConfig,
        network: { network: 'public' },
      };
      const config = new AnchorConfig(configPublic);
      expect(config.isNetworkPassphrase('Public Global Stellar Network ; September 2015')).toBe(
        true,
      );
      expect(config.isNetworkPassphrase('Test SDF Network ; September 2015')).toBe(false);
    });

    it('should fall back to futurenet default passphrase', () => {
      const configFuturenet: AnchorKitConfig = {
        ...validBaseConfig,
        network: { network: 'futurenet' },
      };
      const config = new AnchorConfig(configFuturenet);
      expect(config.isNetworkPassphrase('Test SDF Future Network ; Fall 2022')).toBe(true);
      expect(config.isNetworkPassphrase('Test SDF Network ; September 2015')).toBe(false);
    });
  });

  describe('validate()', () => {
    it('should pass for a valid configuration', () => {
      const config = new AnchorConfig(validBaseConfig);
      expect(() => config.validate()).not.toThrow();
    });

    it('should throw ConfigurationError if top-level network is missing', () => {
      // @ts-expect-error this is for test cases
      const invalidConfig: AnchorKitConfig = { ...validBaseConfig, network: undefined };
      const config = new AnchorConfig(invalidConfig);
      expect(() => config.validate()).toThrow(ConfigurationError);
      expect(() => config.validate()).toThrow(/network/);
    });

    it('should throw ConfigurationError if required secrets are missing', () => {
      const invalidConfig: AnchorKitConfig = {
        ...validBaseConfig,
        security: { ...validBaseConfig.security, sep10SigningKey: '' },
      };
      const config = new AnchorConfig(invalidConfig);

      expect(() => config.validate()).toThrow(ConfigurationError);
      expect(() => config.validate()).toThrow(/sep10SigningKey/);
    });

    it('should throw ConfigurationError for missing assets list', () => {
      const invalidConfig: AnchorKitConfig = {
        ...validBaseConfig,
        assets: { assets: [] },
      };
      const config = new AnchorConfig(invalidConfig);

      expect(() => config.validate()).toThrow(ConfigurationError);
      expect(() => config.validate()).toThrow(/asset/);
    });

    it('should throw ConfigurationError for invalid network string', () => {
      const invalidConfig: AnchorKitConfig = {
        ...validBaseConfig,
        // @ts-expect-error this is for test cases
        network: { network: 'invalidnet' },
      };
      const config = new AnchorConfig(invalidConfig);

      expect(() => config.validate()).toThrow(ConfigurationError);
      expect(() => config.validate()).toThrow(/Invalid network: invalidnet/);
    });

    it('should validate framework database configuration', () => {
      const invalidConfig: AnchorKitConfig = {
        ...validBaseConfig,
        // @ts-expect-error this is for test cases
        framework: { database: { provider: 'postgres' } }, // missing url
      };
      const config = new AnchorConfig(invalidConfig);

      expect(() => config.validate()).toThrow(ConfigurationError);
      expect(() => config.validate()).toThrow(/database/);
    });

    it('should reject invalid database URLs', () => {
      const invalidConfig: AnchorKitConfig = {
        ...validBaseConfig,
        framework: {
          database: {
            provider: 'postgres',
            url: 'invalid-url-string',
          },
        },
      };
      const config = new AnchorConfig(invalidConfig);

      expect(() => config.validate()).toThrow(ConfigurationError);
      expect(() => config.validate()).toThrow(/Invalid database URL format/);
    });

    it('should reject invalid HTTP URLs for network or server', () => {
      const invalidConfig: AnchorKitConfig = {
        ...validBaseConfig,
        server: { ...validBaseConfig.server, interactiveDomain: 'not-a-url' },
      };
      const config = new AnchorConfig(invalidConfig);

      expect(() => config.validate()).toThrow(ConfigurationError);
      expect(() => config.validate()).toThrow(/Invalid URL format for server\.interactiveDomain/);
    });

    it('should validate valid sqlite file URIs', () => {
      const sqliteConfig: AnchorKitConfig = {
        ...validBaseConfig,
        framework: {
          database: {
            provider: 'sqlite',
            url: 'file:./dev.db',
          },
        },
      };
      const config = new AnchorConfig(sqliteConfig);
      expect(() => config.validate()).not.toThrow();
    });
  });
});
