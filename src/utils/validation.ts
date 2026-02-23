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
   * Sanitizes input string by removing basic HTML tags and scripts.
   * Focuses on preventing simple XSS and maintaining deterministic behavior.
   *
   * @param input The raw input string.
   * @returns Sanitized string.
   */
  sanitizeInput(input: string): string {
    if (!input) return '';
    return input
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
      .replace(/<[^>]+>/g, '')
      .trim();
  },
};
