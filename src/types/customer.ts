import type { KycData } from './kyc-data.ts';

/**
 * Represents an anchor customer.
 *
 * Maps to the TRD's AnchorUser model with an added Stellar account
 * link (`accountId`) and optional contact / KYC info.
 */
export interface Customer {
  id: string;
  accountId: string;
  email?: string;
  phone?: string;
  createdAt: Date;
  kycData?: KycData;
}
