import { ConfigError } from '@/core/errors.ts';
import type { AnchorKitConfig, Asset, NetworkConfig } from '@/types/config.ts';
import { Networks } from '@stellar/stellar-sdk';

/**
 * AnchorConfig
 * Central configuration manager for the Anchor-Kit SDK.
 */
export class AnchorConfig {
  private config: AnchorKitConfig;

  constructor(config: Partial<AnchorKitConfig>) {
    const merged = this.mergeWithDefaults(config || {});
    this.config = this.deepFreeze(merged) as AnchorKitConfig;
  }

  /**
   * Merge partial config with sensible defaults for network and operational.
   */
  private mergeWithDefaults(input: Partial<AnchorKitConfig>): AnchorKitConfig {
    const defaultNetworkPassphrases: Record<string, string> = {
      public: Networks.PUBLIC,
      testnet: Networks.TESTNET,
      futurenet: Networks.FUTURENET,
    };

    const hasNetworkProp = Object.prototype.hasOwnProperty.call(input, 'network');
    const networkInput = input.network as Partial<NetworkConfig> | undefined;

    let network: NetworkConfig | undefined;
    if (hasNetworkProp && typeof networkInput === 'undefined') {
      network = undefined;
    } else {
      network = {
        network: networkInput?.network || 'testnet',
        horizonUrl: networkInput?.horizonUrl,
        networkPassphrase:
          networkInput?.networkPassphrase ||
          defaultNetworkPassphrases[networkInput?.network || 'testnet'],
      };
    }

    const operationalInput = input.operational;
    const operational = {
      name: operationalInput?.name,
      website: operationalInput?.website,
      supportEmail: operationalInput?.supportEmail,
      address: operationalInput?.address,
      webhooksEnabled: operationalInput?.webhooksEnabled ?? true,
      queueBackend: operationalInput?.queueBackend ?? 'memory',
      redisUrl: operationalInput?.redisUrl,
      corsEnabled: operationalInput?.corsEnabled ?? true,
      transactionRetentionDays: operationalInput?.transactionRetentionDays ?? 90,
    } as AnchorKitConfig['operational'];

    // Keep original input values for required sections so explicit `undefined`
    // is preserved (validation will catch missing required fields).
    const merged: {
      [K in keyof AnchorKitConfig]: AnchorKitConfig[K] | undefined;
    } = {
      network,
      server: input.server,
      security: input.security,
      assets: input.assets,
      kyc: input.kyc,
      kycRequired: input.kycRequired,
      operational,
      metadata: input.metadata,
      framework: input.framework
        ? {
            ...input.framework,
            queue: {
              backend: input.framework.queue?.backend ?? 'memory',
              concurrency: input.framework.queue?.concurrency ?? 1,
            },
            watchers: {
              enabled: input.framework.watchers?.enabled ?? true,
              pollIntervalMs: input.framework.watchers?.pollIntervalMs ?? 15000,
              transactionTimeoutMs: input.framework.watchers?.transactionTimeoutMs ?? 300000,
              retentionDays: input.framework.watchers?.retentionDays ?? 90,
            },
            http: {
              maxBodyBytes: input.framework.http?.maxBodyBytes ?? 1024 * 1024,
            },
            rateLimit: {
              windowMs: input.framework.rateLimit?.windowMs ?? 60000,
              authChallengeMax: input.framework.rateLimit?.authChallengeMax ?? 30,
              authTokenMax: input.framework.rateLimit?.authTokenMax ?? 30,
              webhookMax: input.framework.rateLimit?.webhookMax ?? 120,
              depositMax: input.framework.rateLimit?.depositMax ?? 60,
            },
          }
        : undefined,
      webhooks: input.webhooks,
    };

    return merged as AnchorKitConfig;
  }

  /**
   * Deep freeze an object to produce an immutable configuration snapshot.
   */
  private deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    const record = obj as Record<PropertyKey, unknown>;

    // Freeze children first
    for (const key of Reflect.ownKeys(record)) {
      const value = record[key];
      if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        this.deepFreeze(value);
      }
    }

    return Object.freeze(obj);
  }

  /**
   * Get a specific configuration section
   */
  public get<K extends keyof AnchorKitConfig>(key: K): AnchorKitConfig[K] {
    return this.config[key];
  }

  /**
   * Return the raw configuration object
   */
  public getConfig(): AnchorKitConfig {
    return this.config;
  }

  /**
   * Lookup an asset by its code from the configured assets.
   * The lookup is case-sensitive.
   *
   * @param code - The exact asset code to look up (e.g., 'USDC').
   * @returns The matching Asset object, or undefined if not found.
   */
  public getAsset(code: string): Asset | undefined {
    return this.config.assets?.assets?.find((asset) => asset.code === code);
  }

  /**
   * Return required KYC fields by asset code.
   * Returns an empty list when no policy exists or the asset is unmapped.
   *
   * @param code - The exact asset code to look up.
   * @returns An array of required KYC field names.
   */
  public getKycRequiredFields(code: string): string[] {
    const fields = this.config.kycRequired?.[code];
    return Array.isArray(fields) ? fields : [];
  }

  /**
   * Compare a provided passphrase against the configured network passphrase.
   * Uses network default passphrases if an explicit one is not configured.
   *
   * @param passphrase - The passphrase to check.
   * @returns boolean - True if it matches, false otherwise.
   */
  public isNetworkPassphrase(passphrase: string): boolean {
    const configuredPassphrase = this.config.network?.networkPassphrase;

    if (configuredPassphrase) {
      return passphrase === configuredPassphrase;
    }

    const network = this.config.network?.network;
    let defaultPassphrase: string;

    switch (network) {
      case 'public':
        defaultPassphrase = Networks.PUBLIC;
        break;
      case 'testnet':
        defaultPassphrase = Networks.TESTNET;
        break;
      case 'futurenet':
        defaultPassphrase = Networks.FUTURENET;
        break;
      default:
        return false;
    }

    return passphrase === defaultPassphrase;
  }

  /**
   * Validate the configuration object for required secrets,
   * URLs, network values, and basic structural invariants.
   * Throws ConfigError if validation fails.
   */
  public validate(): void {
    if (!this.config) {
      throw new ConfigError('Configuration object is missing');
    }

    const { network, server, security, assets, framework } = this.config;

    // Validate Required Top-Level Fields
    if (!network) {
      throw new ConfigError('Missing required top-level field: network');
    }
    if (!server) {
      throw new ConfigError('Missing required top-level field: server');
    }
    if (!security) {
      throw new ConfigError('Missing required top-level field: security');
    }
    if (!assets) {
      throw new ConfigError('Missing required top-level field: assets');
    }
    if (!framework) {
      throw new ConfigError('Missing required top-level field: framework');
    }

    // Validate Required Secrets
    if (!security.sep10SigningKey) {
      throw new ConfigError('Missing required secret: security.sep10SigningKey');
    }
    if (!security.interactiveJwtSecret) {
      throw new ConfigError('Missing required secret: security.interactiveJwtSecret');
    }
    if (!security.distributionAccountSecret) {
      throw new ConfigError('Missing required secret: security.distributionAccountSecret');
    }

    // Validate Assets configuration
    if (!assets.assets || !Array.isArray(assets.assets) || assets.assets.length === 0) {
      throw new ConfigError('At least one asset must be configured in assets.assets');
    }

    // Validate Framework Database config
    if (!framework.database || !framework.database.provider || !framework.database.url) {
      throw new ConfigError('Missing required database configuration in framework.database');
    }

    if (
      framework.queue &&
      framework.queue.concurrency !== undefined &&
      framework.queue.concurrency < 1
    ) {
      throw new ConfigError('framework.queue.concurrency must be >= 1');
    }

    if (
      framework.watchers &&
      framework.watchers.pollIntervalMs !== undefined &&
      framework.watchers.pollIntervalMs < 10
    ) {
      throw new ConfigError('framework.watchers.pollIntervalMs must be >= 10');
    }

    if (
      framework.http &&
      framework.http.maxBodyBytes !== undefined &&
      framework.http.maxBodyBytes < 1024
    ) {
      throw new ConfigError('framework.http.maxBodyBytes must be >= 1024');
    }

    if (security.authTokenLifetimeSeconds !== undefined && security.authTokenLifetimeSeconds <= 0) {
      throw new ConfigError('security.authTokenLifetimeSeconds must be > 0');
    }

    if (framework.rateLimit) {
      const rateValues = [
        framework.rateLimit.windowMs,
        framework.rateLimit.authChallengeMax,
        framework.rateLimit.authTokenMax,
        framework.rateLimit.webhookMax,
        framework.rateLimit.depositMax,
      ];
      if (rateValues.some((value) => value !== undefined && value <= 0)) {
        throw new ConfigError('framework.rateLimit values must be > 0');
      }
    }

    // Validate database URL loosely (could be a connection string or file path)
    if (!this.isValidDatabaseUrl(framework.database.url)) {
      throw new ConfigError('Invalid database URL format');
    }

    // Validate specific URLs if they are provided
    if (server.interactiveDomain && !this.isValidUrl(server.interactiveDomain)) {
      throw new ConfigError('Invalid URL format for server.interactiveDomain');
    }

    if (network.horizonUrl && !this.isValidUrl(network.horizonUrl)) {
      throw new ConfigError('Invalid URL format for network.horizonUrl');
    }

    const { metadata } = this.config;
    if (metadata?.tomlUrl && !this.isValidUrl(metadata.tomlUrl)) {
      throw new ConfigError('Invalid URL format for metadata.tomlUrl');
    }

    // Validate network-related values
    const validNetworks = ['public', 'testnet', 'futurenet'];
    if (!validNetworks.includes(network.network)) {
      throw new ConfigError(
        `Invalid network: ${network.network}. Must be one of: ${validNetworks.join(', ')}`,
      );
    }
  }

  /**
   * Helper to check for standard HTTP/HTTPS URLs
   */
  private isValidUrl(urlString: string): boolean {
    try {
      if (typeof URL !== 'function') return false;
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Helper to validate database connection strings or file paths
   */
  private isValidDatabaseUrl(urlString: string): boolean {
    if (!urlString || typeof urlString !== 'string') return false;

    const validSchemes = ['postgresql:', 'postgres:', 'mysql:', 'mysql2:', 'sqlite:', 'file:'];

    if (validSchemes.some((scheme) => urlString.startsWith(scheme))) {
      return true;
    }

    // In case it's another valid URI
    try {
      if (typeof URL !== 'function') throw new Error('URL not available');
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  }
}
