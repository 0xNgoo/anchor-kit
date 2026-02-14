/**
 * StellarUtils - Helper object for Stellar-specific operations.
 *
 * Provides utilities for memo generation, XDR parsing, payment operations,
 * and account validation.
 */

/**
 * Memo types in Stellar transactions.
 */
export type MemoType = 'none' | 'id' | 'text' | 'hash' | 'return';

/**
 * Generates a memo value for a Stellar transaction.
 *
 * @param value - The memo value (id, text, or hash string).
 * @param type - The type of memo ('id', 'text', 'hash', 'return', or 'none').
 * @returns A memo object suitable for Stellar SDK.
 * @example
 * const memo = StellarUtils.generateMemo('12345', 'id');
 */
export function generateMemo(value: string, type: MemoType): {
  type: MemoType;
  value?: string;
} {
  if (type === 'none') {
    return { type: 'none' };
  }

  switch (type) {
    case 'id':
      // Validate ID is within 64-bit unsigned range
      const idNum = BigInt(value);
      if (idNum > 18446744073709551615n) {
        throw new Error('Memo ID exceeds 64-bit unsigned integer range');
      }
      return { type: 'id', value: value.toString() };

    case 'text':
      // Text memo: max 28 bytes
      if (Buffer.byteLength(value, 'utf8') > 28) {
        throw new Error('Memo text exceeds 28 byte limit');
      }
      return { type: 'text', value };

    case 'hash':
    case 'return':
      // Hash/return: 32 bytes (64 hex chars)
      if (!/^[a-fA-F0-9]{64}$/.test(value)) {
        throw new Error('Memo hash must be 64 hexadecimal characters');
      }
      return { type, value };

    default:
      throw new Error(`Unknown memo type: ${type}`);
  }
}

/**
 * Parses an XDR transaction string into a structured object.
 * Note: This is a simplified parser. For full XDR support, use stellar-sdk.
 *
 * @param xdr - The base64-encoded XDR transaction.
 * @returns A parsed representation of the transaction.
 */
export function parseXdrTransaction(xdr: string): {
  operations: Array<{ type: string; params: Record<string, unknown> }>;
  sourceAccount?: string;
  fee?: string;
} {
  // This is a placeholder implementation
  // In production, use stellar-sdk.TransactionBuilder.fromXDR()
  try {
    // Validate base64 format
    Buffer.from(xdr, 'base64');

    return {
      operations: [],
      sourceAccount: undefined,
      fee: undefined,
    };
  } catch (error) {
    throw new Error(`Invalid XDR format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Builds a payment XDR transaction.
 * Note: This is a simplified implementation. For production use stellar-sdk.
 *
 * @param params - Payment parameters.
 * @returns Base64-encoded XDR transaction (placeholder).
 */
export function buildPaymentXdr(params: {
  source: string;
  destination: string;
  amount: string;
  asset: string;
  memo?: { type: MemoType; value?: string };
}): string {
  // Validate inputs
  if (!params.source.startsWith('G') || params.source.length !== 56) {
    throw new Error('Invalid source account ID');
  }

  if (!params.destination.startsWith('G') || params.destination.length !== 56) {
    throw new Error('Invalid destination account ID');
  }

  // Validate amount
  if (!/^\d+(\.\d{1,7})?$/.test(params.amount)) {
    throw new Error('Invalid amount format');
  }

  // This is a placeholder implementation
  // In production, use stellar-sdk.TransactionBuilder
  return '';
}

/**
 * Validates a Stellar account ID (public key).
 *
 * @param accountId - The Stellar account ID to validate.
 * @returns True if valid, false otherwise.
 * @example
 * StellarUtils.validateAccountId('GABC123...'); // true
 */
export function validateAccountId(accountId: string): boolean {
  // Stellar public keys (G...) and muxed accounts (M...) are base32 encoded
  // Public keys: G + 55 base32 chars = 56 total
  // Muxed: M + 55 base32 chars = 56 total
  return /^[GM][A-Z2-7]{55}$/.test(accountId);
}

/**
 * Checks if a string is a valid Stellar address.
 * This includes account IDs and federation addresses.
 *
 * @param address - The address to validate.
 * @returns True if valid Stellar address format, false otherwise.
 * @example
 * StellarUtils.isStellarAddress('GABC123...'); // true
 * StellarUtils.isStellarAddress('user*domain.com'); // true
 */
export function isStellarAddress(address: string): boolean {
  // Check for public key
  if (validateAccountId(address)) {
    return true;
  }

  // Check for federation address: user*domain.com
  if (address.includes('*')) {
    const [username, domain] = address.split('*');
    if (!username || !domain) {
      return false;
    }
    // Basic validation: username should be alphanumeric, domain should be valid
    const usernameRegex = /^[a-zA-Z0-9-_]+$/;
    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return usernameRegex.test(username) && domainRegex.test(domain);
  }

  return false;
}

/**
 * Formats a Stellar amount for display.
 *
 * @param amount - The amount in stroops (1 stroop = 0.0000001 XLM) or XLM.
 * @param unit - The unit of the amount ('stroops' or 'xlm').
 * @returns The formatted amount string.
 */
export function formatAmount(amount: string, unit: 'stroops' | 'xlm' = 'xlm'): string {
  if (unit === 'stroops') {
    // Convert stroops to XLM
    const stroops = BigInt(amount);
    const xlm = Number(stroops) / 10_000_000;
    return xlm.toFixed(7).replace(/\.?0+$/, '');
  }

  // Already in XLM, just format
  const num = parseFloat(amount);
  return num.toFixed(7).replace(/\.?0+$/, '');
}

/**
 * Parses a Stellar asset string.
 *
 * @param asset - The asset string (e.g., 'XLM' or 'USDC:GABC...').
 * @returns An object with asset code and issuer.
 */
export function parseAsset(asset: string): {
  code: string;
  issuer?: string;
} {
  if (asset === 'XLM' || asset === 'native') {
    return { code: 'XLM' };
  }

  const parts = asset.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid asset format: ${asset}`);
  }

  const [code, issuer] = parts;

  if (code.length > 12) {
    throw new Error(`Asset code exceeds 12 characters: ${code}`);
  }

  if (!issuer.startsWith('G') || issuer.length !== 56) {
    throw new Error(`Invalid asset issuer: ${issuer}`);
  }

  return { code, issuer };
}

/**
 * StellarUtils helper object - exported for convenience.
 */
export const StellarUtils = {
  generateMemo,
  parseXdrTransaction,
  buildPaymentXdr,
  validateAccountId,
  isStellarAddress,
  formatAmount,
  parseAsset,
} as const;
