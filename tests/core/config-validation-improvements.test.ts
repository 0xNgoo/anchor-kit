import { describe, expect, it } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { AnchorConfig } from '../../src/core/config';
import { ConfigError } from '../../src/core/errors';
import { createAnchor, makeSqliteDbUrlForTests } from '../../src/core/factory';
import type { AnchorKitConfig } from '../../src/types/config';

describe('Config Validation Improvements (#124, #125)', () => {
  const testSep10SigningKey = Keypair.random().secret();
  const validBaseConfig: AnchorKitConfig = {
    network: { network: 'testnet' },
    server: { port: 3000 },
    security: {
      sep10SigningKey: testSep10SigningKey,
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

  it('should reject MySQL provider during validation (#124)', () => {
    const mysqlConfig: AnchorKitConfig = {
      ...validBaseConfig,
      framework: {
        ...validBaseConfig.framework,
        database: {
          provider: 'mysql', // NOT SUPPORTED
          url: 'mysql://user:pass@localhost:3306/db',
        },
      },
    };
    const config = new AnchorConfig(mysqlConfig);
    expect(() => config.validate()).toThrow(ConfigError);
    expect(() => config.validate()).toThrow(/MySQL is not currently supported/);
  });

  it('should accept sqlite provider during validation', () => {
    const sqliteConfig: AnchorKitConfig = {
      ...validBaseConfig,
      framework: {
        ...validBaseConfig.framework,
        database: {
          provider: 'sqlite',
          url: 'file:./dev.db',
        },
      },
    };
    const config = new AnchorConfig(sqliteConfig);
    expect(() => config.validate()).not.toThrow();
  });

  it('should reject non-database schemes in database URL (#125)', () => {
    const ftpConfig: AnchorKitConfig = {
      ...validBaseConfig,
      framework: {
        ...validBaseConfig.framework,
        database: {
          provider: 'postgres',
          url: 'ftp://ftp.example.com/db', // NOT a DATABASE URL
        },
      },
    };
    const config = new AnchorConfig(ftpConfig);
    expect(() => config.validate()).toThrow(ConfigError);
    expect(() => config.validate()).toThrow(/Invalid database URL format/);
  });

  it('should accept valid postgres URLs', () => {
    const postgresConfigs = [
      'postgresql://localhost:5432/mydb',
      'postgres://user:pass@host.com/db',
    ];

    postgresConfigs.forEach((url) => {
      const config = new AnchorConfig({
        ...validBaseConfig,
        framework: {
          ...validBaseConfig.framework,
          database: {
            provider: 'postgres',
            url,
          },
        },
      });
      expect(() => config.validate()).not.toThrow();
    });
  });

  it('should accept valid sqlite URLs', () => {
    const sqliteConfigs = ['sqlite:./local.db', 'file:./data.db'];

    sqliteConfigs.forEach((url) => {
      const config = new AnchorConfig({
        ...validBaseConfig,
        framework: {
          ...validBaseConfig.framework,
          database: {
            provider: 'sqlite',
            url,
          },
        },
      });
      expect(() => config.validate()).not.toThrow();
    });
  });

  describe('Runtime Config Validation (#207)', () => {
    it('should reject redis queue backend during initialization', async () => {
      const redisConfig = {
        ...validBaseConfig,
        framework: {
          ...validBaseConfig.framework,
          database: {
            provider: 'sqlite',
            url: makeSqliteDbUrlForTests(),
          },
          queue: {
            backend: 'redis',
          },
        },
      } as unknown as AnchorKitConfig;
      const anchor = createAnchor(redisConfig);
      await expect(anchor.init()).rejects.toThrow(ConfigError);
      await expect(anchor.init()).rejects.toThrow(/Unsupported queue backend: "redis"/);
    });

    it('should reject postgres queue backend during initialization', async () => {
      const postgresConfig = {
        ...validBaseConfig,
        framework: {
          ...validBaseConfig.framework,
          database: {
            provider: 'sqlite',
            url: makeSqliteDbUrlForTests(),
          },
          queue: {
            backend: 'postgres',
          },
        },
      } as unknown as AnchorKitConfig;
      const anchor = createAnchor(postgresConfig);
      await expect(anchor.init()).rejects.toThrow(ConfigError);
      await expect(anchor.init()).rejects.toThrow(/Unsupported queue backend: "postgres"/);
    });

    it('should accept memory queue backend during initialization', async () => {
      const memoryConfig: AnchorKitConfig = {
        ...validBaseConfig,
        framework: {
          ...validBaseConfig.framework,
          database: {
            provider: 'sqlite',
            url: makeSqliteDbUrlForTests(),
          },
          queue: {
            backend: 'memory',
          },
        },
      };
      const anchor = createAnchor(memoryConfig);
      await anchor.init();
      await anchor.shutdown();
    });

    it('should default to memory queue backend when not specified', async () => {
      const defaultConfig: AnchorKitConfig = {
        ...validBaseConfig,
        framework: {
          ...validBaseConfig.framework,
          database: {
            provider: 'sqlite',
            url: makeSqliteDbUrlForTests(),
          },
        },
      };
      const anchor = createAnchor(defaultConfig);
      await anchor.init();
      await anchor.shutdown();
    });
  });
});
