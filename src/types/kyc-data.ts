/**
 * Shape of a customer's KYC (Know Your Customer) data.
 *
 * `level` follows the TRD convention: 0 = none, 1 = basic, 2 = verified.
 * `fields` is a catch-all for provider-specific SEP-9 attributes
 * (name, address, id-number, etc.) that vary by jurisdiction.
 */
export interface KycData {
  level: number;
  status: string;
  fields?: Record<string, string>;
}
