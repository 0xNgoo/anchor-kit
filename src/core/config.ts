import type { AnchorKitConfig, Asset, NetworkConfig } from '../types/config.ts';
import { ConfigurationError } from './errors.ts';

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
      public: 'Public Global Stellar Network ; September 2015',
      testnet: 'Test SDF Network ; September 2015',
      futurenet: 'Test SDF Future Network ; Fall 2022',
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

    const operationalInput = input.operational as
      | Partial<AnchorKitConfig['operational']>
      | undefined;
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
    const merged: any = {
      network,
      server: input.server,
      security: input.security,
      assets: input.assets,
      kyc: input.kyc,
      kycRequired: input.kycRequired,
      operational,
      metadata: input.metadata,
      framework: input.framework,
    };

    return merged as AnchorKitConfig;
  }

  /**
   * Deep freeze an object to produce an immutable configuration snapshot.
   */
  private deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;

    // Freeze children first
    for (const key of Object.getOwnPropertyNames(obj) as Array<keyof T>) {
      const value = (obj as any)[key];
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
        defaultPassphrase = 'Public Global Stellar Network ; September 2015';
        break;
      case 'testnet':
        defaultPassphrase = 'Test SDF Network ; September 2015';
        break;
      case 'futurenet':
        defaultPassphrase = 'Test SDF Future Network ; Fall 2022';
        break;
      default:
        return false;
    }

    return passphrase === defaultPassphrase;
  }

  /**
   * Validate the configuration object for required secrets,
   * URLs, network values, and basic structural invariants.
   * Throws ConfigurationError if validation fails.
   */
  public validate(): void {
    if (!this.config) {
      throw new ConfigurationError('Configuration object is missing');
    }

    const { network, server, security, assets, framework } = this.config;

    // Validate Required Top-Level Fields
    if (!network) {
      throw new ConfigurationError('Missing required top-level field: network');
    }
    if (!server) {
      throw new ConfigurationError('Missing required top-level field: server');
    }
    if (!security) {
      throw new ConfigurationError('Missing required top-level field: security');
    }
    if (!assets) {
      throw new ConfigurationError('Missing required top-level field: assets');
    }
    if (!framework) {
      throw new ConfigurationError('Missing required top-level field: framework');
    }

    // Validate Required Secrets
    if (!security.sep10SigningKey) {
      throw new ConfigurationError('Missing required secret: security.sep10SigningKey');
    }
    if (!security.interactiveJwtSecret) {
      throw new ConfigurationError('Missing required secret: security.interactiveJwtSecret');
    }
    if (!security.distributionAccountSecret) {
      throw new ConfigurationError('Missing required secret: security.distributionAccountSecret');
    }

    // Validate Assets configuration
    if (!assets.assets || !Array.isArray(assets.assets) || assets.assets.length === 0) {
      throw new ConfigurationError('At least one asset must be configured in assets.assets');
    }

    // Validate Framework Database config
    if (!framework.database || !framework.database.provider || !framework.database.url) {
      throw new ConfigurationError('Missing required database configuration in framework.database');
    }

    // Validate database URL loosely (could be a connection string or file path)
    if (!this.isValidDatabaseUrl(framework.database.url)) {
      throw new ConfigurationError('Invalid database URL format');
    }

    // Validate specific URLs if they are provided
    if (server.interactiveDomain && !this.isValidUrl(server.interactiveDomain)) {
      throw new ConfigurationError('Invalid URL format for server.interactiveDomain');
    }

    if (network.horizonUrl && !this.isValidUrl(network.horizonUrl)) {
      throw new ConfigurationError('Invalid URL format for network.horizonUrl');
    }

    const { metadata } = this.config;
    if (metadata?.tomlUrl && !this.isValidUrl(metadata.tomlUrl)) {
      throw new ConfigurationError('Invalid URL format for metadata.tomlUrl');
    }

    // Validate network-related values
    const validNetworks = ['public', 'testnet', 'futurenet'];
    if (!validNetworks.includes(network.network)) {
      throw new ConfigurationError(
        `Invalid network: ${network.network}. Must be one of: ${validNetworks.join(', ')}`,
      );
    }
  }

  /**
   * Helper to check for standard HTTP/HTTPS URLs
   */
  private isValidUrl(urlString: string): boolean {
    try {
      const UrlCtor = (globalThis as any).URL;
      if (typeof UrlCtor !== 'function') return false;
      const url = new UrlCtor(urlString);
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
      const UrlCtor = (globalThis as any).URL;
      if (typeof UrlCtor !== 'function') throw new Error('URL not available');
      new UrlCtor(urlString);
      return true;
    } catch {
      return false;
    }
  }
}
