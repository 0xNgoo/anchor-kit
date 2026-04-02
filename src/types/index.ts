/**
 * Anchor-Kit Type Definitions
 * This is the main entry point for all type exports
 */

export { isPendingTransactionStatus, TRANSACTION_STATUSES } from './transaction-status.ts';
export type { TransactionStatus } from './transaction-status.ts';

export type { Customer } from './customer.ts';

export type {
  Transaction,
  Amount,
  RailTransactionData,
  StellarTransactionData,
  InteractiveData,
  TransactionError,
  RefundInfo,
} from './transaction.ts';

export * from './config';
export * from './sep24';
export type { KycStatus } from './foundation';
export type { PostalAddress } from './foundation';
export type { IdentityDocument } from './foundation';
export type { KycData, KycData as CustomerKycData } from './foundation';
export type {
  AnchorPlugin,
  AnchorPluginContext,
  AnchorPluginHooks,
  Context as PluginContext,
} from './plugin';
export type { RouteDefinition, SchemaDefinition, SepErrorCode } from './foundation';
