/**
 * Foundation types for unified spec
 * Includes asset, KYC/customer related types used across SEPs
 */

/**
 * Asset represents a Stellar asset available on an anchor
 * Used across multiple SEPs for consistent asset representation
 */
export interface Asset {
  /**
   * The 1-12 character asset code (e.g., USDC, EUR, NGA)
   * Must match Stellar's asset code restrictions
   */
  code: string;

  /**
   * The public key (account ID) of the asset issuer on Stellar
   * Used to uniquely identify the asset on the network
   */
  issuer: string;

  /**
   * Human-readable display name for the asset
   * Shown to users in user interfaces (e.g., "US Dollar Coin", "Euro")
   */
  displayName?: string;

  /**
   * The name of the asset as it appears on the Stellar network
   * May differ from displayName (e.g., code="EURC", nameOnNetwork="Euro Coin")
   */
  nameOnNetwork?: string;

  /**
   * Number of decimal places for the asset
   * Indicates the smallest unit that can be transacted (e.g., 6 means 0.000001 is the smallest unit)
   */
  decimals?: number;
}

/** Allowed KYC status values as used in unified spec */
export type KycStatus = 'not_provided' | 'pending' | 'approved' | 'rejected';

/** Postal address fields commonly used for KYC */
export interface PostalAddress {
  street_address?: string;
  locality?: string; // city
  region?: string; // state/province
  postal_code?: string;
  country?: string; // ISO 3166-1 alpha-2
}

/** Minimal representation of a submitted identity document */
export interface IdentityDocument {
  id?: string;
  type?: string;
  issuing_country?: string;
  status?: KycStatus;
}

/**
 * KycData represents the customer KYC information surfaced in the unified spec.
 * Fields are intentionally optional where SEP-12 allows them to be absent.
 */
export interface KycData {
  id?: string;
  status: KycStatus;

  // Basic identity fields
  first_name?: string;
  last_name?: string;
  email_address?: string;
  phone_number?: string;
  birth_date?: string; // ISO 8601 date (YYYY-MM-DD)

  // Address and nationality
  address?: PostalAddress;
  nationality?: string; // ISO 3166-1 alpha-2

  // Government ID / document references
  id_number?: string;
  id_type?: string;
  documents?: IdentityDocument[];

  // Timestamps
  created_at?: number;
  updated_at?: number;
}

export type { KycData as CustomerKycData };

/**
 * Common error codes used across Stellar Ecosystem Proposals (SEPs).
 */
export type SepErrorCode =
  | 'bad_request'
  | 'transaction_not_found'
  | 'customer_info_needed'
  | 'verification_required'
  | 'not_found'
  | 'invalid_asset'
  | 'unsupported_asset'
  | 'invalid_request'
  | 'forbidden'
  | string;

/**
 * Error returned when a transaction cannot be found or accessed.
 * Included in SEP-24 transaction responses as an error branch.
 */
export interface TransactionNotFoundError {
  /** Discriminator to allow narrowing on error responses */
  type: 'error';

  /** Human readable error message */
  error: string;
}
