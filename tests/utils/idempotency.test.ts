import { describe, it, expect } from 'vitest';
import {
  generateIdempotencyKey,
  extractIdempotencyHeader,
  normalizeIdempotencyKey,
  IdempotencyUtils,
} from '../src/utils/idempotency';

describe('IdempotencyUtils', () => {
  describe('generateIdempotencyKey', () => {
    it('should generate a unique idempotency key', () => {
      const key1 = generateIdempotencyKey();
      const key2 = generateIdempotencyKey();

      expect(key1).not.toBe(key2);
      expect(key1).toMatch(/^idemp_\d{8}_[a-z0-9]{12}$/);
    });

    it('should include timestamp in the key', () => {
      const key = generateIdempotencyKey();
      const date = new Date();
      const expectedTimestamp = date.toISOString().slice(0, 10).replace(/-/g, '');

      expect(key).toContain(expectedTimestamp);
    });
  });

  describe('extractIdempotencyHeader', () => {
    it('should extract idempotency key from Headers object', () => {
      const headers = new Headers();
      headers.set('idempotency-key', 'test-key-123');

      const key = extractIdempotencyHeader(headers);
      expect(key).toBe('test-key-123');
    });

    it('should extract idempotency key from plain object (lowercase)', () => {
      const headers = { 'idempotency-key': 'test-key-456' };

      const key = extractIdempotencyHeader(headers);
      expect(key).toBe('test-key-456');
    });

    it('should extract idempotency key from plain object (capitalized)', () => {
      const headers = { 'Idempotency-Key': 'test-key-789' };

      const key = extractIdempotencyHeader(headers);
      expect(key).toBe('test-key-789');
    });

    it('should return null when header is missing', () => {
      const headers = new Headers();
      const key = extractIdempotencyHeader(headers);

      expect(key).toBeNull();
    });

    it('should return null when header value is empty', () => {
      const headers = new Headers();
      headers.set('idempotency-key', '');

      const key = extractIdempotencyHeader(headers);
      expect(key).toBeNull();
    });
  });

  describe('normalizeIdempotencyKey', () => {
    it('should return existing key if present', () => {
      const headers = new Headers();
      headers.set('idempotency-key', 'existing-key');

      const key = normalizeIdempotencyKey(headers);
      expect(key).toBe('existing-key');
    });

    it('should generate new key if header is missing', () => {
      const headers = new Headers();
      const key = normalizeIdempotencyKey(headers);

      expect(key).toMatch(/^idemp_\d{8}_[a-z0-9]{12}$/);
    });

    it('should generate new key if header value is empty', () => {
      const headers = new Headers();
      headers.set('idempotency-key', '');

      const key = normalizeIdempotencyKey(headers);
      expect(key).toMatch(/^idemp_\d{8}_[a-z0-9]{12}$/);
    });
  });

  describe('IdempotencyUtils helper object', () => {
    it('should export all methods', () => {
      expect(IdempotencyUtils.generateIdempotencyKey).toBeDefined();
      expect(IdempotencyUtils.extractIdempotencyHeader).toBeDefined();
      expect(IdempotencyUtils.normalizeIdempotencyKey).toBeDefined();
    });

    it('should work when called from helper object', () => {
      const key = IdempotencyUtils.generateIdempotencyKey();
      expect(key).toMatch(/^idemp_\d{8}_[a-z0-9]{12}$/);

      const headers = new Headers();
      headers.set('idempotency-key', key);

      const extracted = IdempotencyUtils.extractIdempotencyHeader(headers);
      expect(extracted).toBe(key);
    });
  });
});
