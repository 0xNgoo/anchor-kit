import type { KycData } from './foundation.ts';

/**
 * Represents an anchor customer.
 *
 * Maps to the TRD's AnchorUser model with an added Stellar account
 * link (`account_id`) and optional contact / KYC info.
 */
export interface Customer {
  id: string;
  account_id: string;
  email_address?: string;
  phone_number?: string;
  created_at: number;
  kyc_data?: KycData;
}
