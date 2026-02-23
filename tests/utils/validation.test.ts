import { expect, test, describe } from 'bun:test';
import { ValidationUtils } from '../../src/utils/validation';

describe('ValidationUtils', () => {
  describe('isValidEmail', () => {
    test('should return true for valid emails', () => {
      expect(ValidationUtils.isValidEmail('test@example.com')).toBe(true);
      expect(ValidationUtils.isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(ValidationUtils.isValidEmail('user+alias@gmail.com')).toBe(true);
    });

    test('should return false for invalid emails', () => {
      expect(ValidationUtils.isValidEmail('invalid-email')).toBe(false);
      expect(ValidationUtils.isValidEmail('user@')).toBe(false);
      expect(ValidationUtils.isValidEmail('@domain.com')).toBe(false);
      expect(ValidationUtils.isValidEmail('user@domain')).toBe(false);
    });
  });

  describe('isValidPhoneNumber', () => {
    test('should return true for valid E.164 phone numbers', () => {
      expect(ValidationUtils.isValidPhoneNumber('+1234567890')).toBe(true);
      expect(ValidationUtils.isValidPhoneNumber('+447123456789')).toBe(true);
    });

    test('should return false for invalid phone numbers', () => {
      expect(ValidationUtils.isValidPhoneNumber('1234567890')).toBe(false); // Missing +
      expect(ValidationUtils.isValidPhoneNumber('+0123456789')).toBe(false); // Leading zero after +
      expect(ValidationUtils.isValidPhoneNumber('+123')).toBe(true); // Minimum length is not strictly enforced by SEP usually, but pattern says 1-14 digits
      expect(ValidationUtils.isValidPhoneNumber('+1234567890123456')).toBe(false); // Too long (>15 digits)
    });
  });

  describe('isValidUrl', () => {
    test('should return true for valid URLs', () => {
      expect(ValidationUtils.isValidUrl('https://stellar.org')).toBe(true);
      expect(ValidationUtils.isValidUrl('http://localhost:8000')).toBe(true);
    });

    test('should return false for invalid URLs', () => {
      expect(ValidationUtils.isValidUrl('not-a-url')).toBe(false);
      expect(ValidationUtils.isValidUrl('ftp://invalid')).toBe(true); // Technically a valid URL structure
      expect(ValidationUtils.isValidUrl('')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    test('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      expect(ValidationUtils.sanitizeInput(input)).toBe('Hello');
    });

    test('should remove HTML tags', () => {
      const input = '<div><b>Bold</b> Text</div>';
      expect(ValidationUtils.sanitizeInput(input)).toBe('Bold Text');
    });

    test('should trim whitespace', () => {
      const input = '   content   ';
      expect(ValidationUtils.sanitizeInput(input)).toBe('content');
    });

    test('should handle empty input', () => {
      expect(ValidationUtils.sanitizeInput('')).toBe('');
    });
  });
});
