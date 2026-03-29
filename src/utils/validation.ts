import DOMPurify from 'isomorphic-dompurify';

/**
 * ValidationUtils helper object
 * Provides standard validation for common fields used in SEPs.
 */
export const ValidationUtils = {
  /**
   * Validates if the given string is a valid email address.
   * Uses a standard regex pattern for common email verification.
   *
   * @param email The email address to validate.
   * @returns true if valid, false otherwise.
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  },

  /**
   * Validates if the given string is a valid E.164 phone number.
   * Example: +1234567890
   *
   * @param phone The phone number to validate.
   * @returns true if valid, false otherwise.
   */
  isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  },

  /**
   * Validates if the given string is a valid URL.
   *
   * @param url The URL string to validate.
   * @returns true if valid, false otherwise.
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Sanitizes input string by removing HTML tags and scripts.
   * Uses DOMPurify for robust XSS prevention.
   *
   * @param input The raw input string.
   * @returns Sanitized string.
   */
  sanitizeInput(input: string): string {
    if (!input) return '';
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
  },

  /**
   * Validates if a string is a valid decimal number.
   *
   * @param value The string to validate.
   * @returns true if valid, false otherwise.
   */
  isDecimal(value: string): boolean {
    if (!value) return false;
    return /^-?\d+(\.\d+)?$/.test(value);
  },

  /**
   * Validates if a string is a valid Stellar public key (starting with 'G').
   *
   * @param address The address to validate.
   * @returns true if valid, false otherwise.
   */
  isValidStellarAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    // Basic format check to avoid loading full SDK if obviously wrong
    if (!/^G[A-Z2-7]{55}$/.test(address)) return false;
    return true;
  },
};

/**
 * AssetSchema
 * Validation schema for individual Asset entries.
 */
export const AssetSchema = {
  /**
   * Validates if the given object is a valid Asset entry.
   *
   * @param asset The asset object to validate.
   * @returns true if valid, false otherwise.
   */
  isValid(asset: unknown): boolean {
    if (!asset || typeof asset !== 'object') return false;
    const a = asset as Record<string, unknown>;

    // Required fields: code, issuer
    if (typeof a.code !== 'string' || a.code.length === 0) return false;
    if (typeof a.issuer !== 'string' || !ValidationUtils.isValidStellarAddress(a.issuer)) {
      return false;
    }

    // Optional fields if provided must have correct type
    if (a.name !== undefined && typeof a.name !== 'string') return false;
    if (a.deposits_enabled !== undefined && typeof a.deposits_enabled !== 'boolean')
      return false;
    if (a.withdrawals_enabled !== undefined && typeof a.withdrawals_enabled !== 'boolean')
      return false;
    if (a.min_amount !== undefined && typeof a.min_amount !== 'number') return false;
    if (a.max_amount !== undefined && typeof a.max_amount !== 'number') return false;

    return true;
  },
};

/**
 * DatabaseUrlSchema
 * Restricts database URLs to supported schemes (postgres, sqlite).
 */
export const DatabaseUrlSchema = {
  /**
   * Validates if the given string is a supported database URL.
   * Acceptable schemes: postgresql:, postgres:, sqlite:, file:
   *
   * @param urlString The database URL string.
   * @returns true if supported, false otherwise.
   */
  isValid(urlString: string): boolean {
    if (!urlString || typeof urlString !== 'string') return false;

    const validSchemes = ['postgresql:', 'postgres:', 'sqlite:', 'file:'];
    return validSchemes.some((scheme) => urlString.startsWith(scheme));
  },
};
