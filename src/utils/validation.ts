/**
 * ValidationUtils - Helper object for common validation tasks.
 *
 * Provides deterministic validators for emails, phone numbers, URLs, and input sanitization.
 */

/**
 * Validates an email address using RFC 5322 compliant regex.
 *
 * @param email - The email string to validate.
 * @returns True if valid email format, false otherwise.
 * @example
 * ValidationUtils.isValidEmail('user@example.com'); // true
 * ValidationUtils.isValidEmail('invalid-email'); // false
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Validates a phone number.
 * Supports international formats with optional country code.
 *
 * @param phoneNumber - The phone number string to validate.
 * @returns True if valid phone number format, false otherwise.
 * @example
 * ValidationUtils.isValidPhoneNumber('+1234567890'); // true
 * ValidationUtils.isValidPhoneNumber('123-456-7890'); // true
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Check if it's between 7 and 15 digits (E.164 standard)
  return /^\d{7,15}$/.test(cleaned);
}

/**
 * Validates a URL string.
 *
 * @param url - The URL string to validate.
 * @returns True if valid URL format, false otherwise.
 * @example
 * ValidationUtils.isValidUrl('https://example.com'); // true
 * ValidationUtils.isValidUrl('not-a-url'); // false
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitizes user input to prevent XSS attacks.
 * Removes potentially dangerous HTML tags and attributes.
 *
 * @param input - The raw user input string.
 * @returns The sanitized string.
 * @example
 * ValidationUtils.sanitizeInput('<script>alert("xss")</script>Hello');
 * // Returns: '&lt;script&gt;alert("xss")&lt;/script&gt;Hello'
 */
export function sanitizeInput(input: string): string {
  // Replace < and > with HTML entities
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates a Stellar account ID (public key).
 *
 * @param accountId - The Stellar account ID (G-prefixed public key).
 * @returns True if valid Stellar public key, false otherwise.
 * @example
 * ValidationUtils.isValidStellarAccountId('GABCDEF...'); // true if valid format
 */
export function isValidStellarAccountId(accountId: string): boolean {
  // Stellar public keys start with 'G' and are 56 characters (base32)
  return /^G[A-Z2-7]{55}$/.test(accountId);
}

/**
 * Validates a Stellar memo.
 *
 * @param memo - The memo string to validate.
 * @param type - The memo type (text, id, hash, return).
 * @returns True if valid memo for the specified type, false otherwise.
 */
export function isValidStellarMemo(memo: string, type: 'text' | 'id' | 'hash' | 'return' = 'text'): boolean {
  switch (type) {
    case 'text':
      // Text memo: max 28 bytes
      return Buffer.byteLength(memo, 'utf8') <= 28;
    case 'id':
      // ID memo: 64-bit unsigned integer
      return /^\d+$/.test(memo) && BigInt(memo) <= 18446744073709551615n;
    case 'hash':
    case 'return':
      // Hash/return memo: 32 bytes hex encoded (64 chars)
      return /^[a-fA-F0-9]{64}$/.test(memo);
    default:
      return false;
  }
}

/**
 * Validates an amount string for Stellar transactions.
 *
 * @param amount - The amount string to validate.
 * @returns True if valid amount (max 7 decimal places), false otherwise.
 */
export function isValidStellarAmount(amount: string): boolean {
  const amountRegex = /^\d+(\.\d{1,7})?$/;
  return amountRegex.test(amount) && parseFloat(amount) > 0;
}

/**
 * ValidationUtils helper object - exported for convenience.
 */
export const ValidationUtils = {
  isValidEmail,
  isValidPhoneNumber,
  isValidUrl,
  sanitizeInput,
  isValidStellarAccountId,
  isValidStellarMemo,
  isValidStellarAmount,
} as const;
