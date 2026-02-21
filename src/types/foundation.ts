/**
 * Foundation types for unified spec
 * Includes KYC/customer related types used across SEPs
 */

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
 * Error returned when a transaction cannot be found or accessed.
 * Included in SEP-24 transaction responses as an error branch.
 */
export interface TransactionNotFoundError {
  /** Discriminator to allow narrowing on error responses */
  type: 'error';

  /** Human readable error message */
  error: string;
}
