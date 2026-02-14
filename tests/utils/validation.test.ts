import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidPhoneNumber,
  isValidUrl,
  sanitizeInput,
  isValidStellarAccountId,
  isValidStellarMemo,
  isValidStellarAmount,
  ValidationUtils,
} from '../src/utils/validation';

describe('ValidationUtils', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user @example.com')).toBe(false);
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should validate international phone numbers', () => {
      expect(isValidPhoneNumber('+1234567890')).toBe(true);
      expect(isValidPhoneNumber('+44 20 1234 5678')).toBe(true);
      expect(isValidPhoneNumber('123-456-7890')).toBe(true);
      expect(isValidPhoneNumber('(123) 456-7890')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhoneNumber('123')).toBe(false); // Too short
      expect(isValidPhoneNumber('1234567890123456')).toBe(false); // Too long
      expect(isValidPhoneNumber('')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('ws://example.com')).toBe(true);
      expect(isValidUrl('wss://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false); // Unsupported protocol
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should escape HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(sanitizeInput('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;/b&gt;');
    });

    it('should escape special characters', () => {
      expect(sanitizeInput('test & "test" \'test\'')).toBe('test &amp; &quot;test&quot; &#39;test&#39;');
    });

    it('should handle normal text', () => {
      expect(sanitizeInput('Hello, World!')).toBe('Hello, World!');
    });
  });

  describe('isValidStellarAccountId', () => {
    it('should validate valid Stellar account IDs', () => {
      expect(isValidStellarAccountId('GABCDEFGHIJKLMNOPQRSTUVWXYZ234567')).toBe(true);
      expect(isValidStellarAccountId('GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVW')).toBe(true);
    });

    it('should reject invalid Stellar account IDs', () => {
      expect(isValidStellarAccountId('invalid')).toBe(false);
      expect(isValidStellarAccountId('GABCD')).toBe(false); // Too short
      expect(isValidStellarAccountId('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe(false); // Wrong prefix
    });
  });

  describe('isValidStellarMemo', () => {
    it('should validate text memos', () => {
      expect(isValidStellarMemo('hello', 'text')).toBe(true);
      expect(isValidStellarMemo('a'.repeat(28), 'text')).toBe(true);
    });

    it('should reject oversize text memos', () => {
      expect(isValidStellarMemo('a'.repeat(29), 'text')).toBe(false);
    });

    it('should validate ID memos', () => {
      expect(isValidStellarMemo('12345', 'id')).toBe(true);
      expect(isValidStellarMemo('0', 'id')).toBe(true);
      expect(isValidStellarMemo('18446744073709551615', 'id')).toBe(true);
    });

    it('should reject invalid ID memos', () => {
      expect(isValidStellarMemo('18446744073709551616', 'id')).toBe(false); // Exceeds 64-bit
      expect(isValidStellarMemo('not-a-number', 'id')).toBe(false);
    });

    it('should validate hash memos', () => {
      expect(isValidStellarMemo('a'.repeat(64), 'hash')).toBe(true);
      expect(isValidStellarMemo('A'.repeat(64), 'hash')).toBe(true);
    });

    it('should reject invalid hash memos', () => {
      expect(isValidStellarMemo('a'.repeat(63), 'hash')).toBe(false);
      expect(isValidStellarMemo('g'.repeat(64), 'hash')).toBe(false); // Invalid hex
    });
  });

  describe('isValidStellarAmount', () => {
    it('should validate valid amounts', () => {
      expect(isValidStellarAmount('1')).toBe(true);
      expect(isValidStellarAmount('10.5')).toBe(true);
      expect(isValidStellarAmount('0.1234567')).toBe(true);
    });

    it('should reject amounts with more than 7 decimals', () => {
      expect(isValidStellarAmount('0.12345678')).toBe(false);
    });

    it('should reject non-positive amounts', () => {
      expect(isValidStellarAmount('0')).toBe(false);
      expect(isValidStellarAmount('-1')).toBe(false);
    });

    it('should reject invalid formats', () => {
      expect(isValidStellarAmount('not-a-number')).toBe(false);
      expect(isValidStellarAmount('')).toBe(false);
    });
  });

  describe('ValidationUtils helper object', () => {
    it('should export all methods', () => {
      expect(ValidationUtils.isValidEmail).toBeDefined();
      expect(ValidationUtils.isValidPhoneNumber).toBeDefined();
      expect(ValidationUtils.isValidUrl).toBeDefined();
      expect(ValidationUtils.sanitizeInput).toBeDefined();
      expect(ValidationUtils.isValidStellarAccountId).toBeDefined();
      expect(ValidationUtils.isValidStellarMemo).toBeDefined();
      expect(ValidationUtils.isValidStellarAmount).toBeDefined();
    });

    it('should work when called from helper object', () => {
      expect(ValidationUtils.isValidEmail('test@example.com')).toBe(true);
      expect(ValidationUtils.isValidUrl('https://example.com')).toBe(true);
    });
  });
});
