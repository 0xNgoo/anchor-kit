import type { AnchorKitConfig, Asset } from '../types/config.ts';
import { ConfigurationError } from './errors.ts';

/**
 * AnchorConfig
 * Central configuration manager for the Anchor-Kit SDK.
 */
export class AnchorConfig {
  private config: AnchorKitConfig;

  constructor(config: AnchorKitConfig) {
    this.config = config;
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
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  }
}
