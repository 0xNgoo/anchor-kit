import { describe, it, expect } from 'vitest';
import {
  generateJwt,
  verifyJwt,
  hashPassword,
  verifyPassword,
  generateRandomString,
  CryptoUtils,
} from '../src/utils/crypto';

describe('CryptoUtils', () => {
  const testSecret = 'test-secret-key-12345';
  const testPayload = { userId: 'user-123', role: 'admin' };

  describe('generateJwt', () => {
    it('should generate a valid JWT token', async () => {
      const token = await generateJwt(testPayload, testSecret);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // header.payload.signature
    });

    it('should include payload in token', async () => {
      const token = await generateJwt(testPayload, testSecret);
      const parts = token.split('.');

      const payloadBase64 = parts[1];
      const payload = JSON.parse(atob(payloadBase64));

      expect(payload.userId).toBe(testPayload.userId);
      expect(payload.role).toBe(testPayload.role);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    it('should use custom expiration time', async () => {
      const expiresIn = 7200; // 2 hours
      const token = await generateJwt(testPayload, testSecret, expiresIn);

      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));

      const now = Math.floor(Date.now() / 1000);
      const expectedExp = now + expiresIn;

      expect(payload.exp).toBeGreaterThan(now);
      expect(payload.exp).toBeLessThanOrEqual(expectedExp + 1); // Allow 1 second variance
    });
  });

  describe('verifyJwt', () => {
    it('should verify a valid token', async () => {
      const token = await generateJwt(testPayload, testSecret);
      const verified = await verifyJwt(token, testSecret);

      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(testPayload.userId);
      expect(verified?.role).toBe(testPayload.role);
    });

    it('should reject token with wrong secret', async () => {
      const token = await generateJwt(testPayload, testSecret);
      const verified = await verifyJwt(token, 'wrong-secret');

      expect(verified).toBeNull();
    });

    it('should reject expired token', async () => {
      const token = await generateJwt(testPayload, testSecret, -1); // Already expired
      const verified = await verifyJwt(token, testSecret);

      expect(verified).toBeNull();
    });

    it('should reject malformed token', async () => {
      const verified = await verifyJwt('invalid.token', testSecret);

      expect(verified).toBeNull();
    });
  });

  describe('hashPassword', () => {
    it('should hash a password with generated salt', async () => {
      const password = 'test-password';
      const { salt, hash } = await hashPassword(password);

      expect(salt).toBeTruthy();
      expect(typeof salt).toBe('string');
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
    });

    it('should hash a password with provided salt', async () => {
      const password = 'test-password';
      const salt = 'fixed-salt-123';
      const { hash } = await hashPassword(password, salt);

      expect(hash).toBeTruthy();
    });

    it('should produce same hash for same password and salt', async () => {
      const password = 'test-password';
      const salt = 'test-salt';

      const { hash: hash1 } = await hashPassword(password, salt);
      const { hash: hash2 } = await hashPassword(password, salt);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different salts', async () => {
      const password = 'test-password';

      const { hash: hash1 } = await hashPassword(password);
      const { hash: hash2 } = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'correct-password';
      const { salt, hash } = await hashPassword(password);

      const isValid = await verifyPassword(password, salt, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'correct-password';
      const { salt, hash } = await hashPassword(password);

      const isValid = await verifyPassword('wrong-password', salt, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('generateRandomString', () => {
    it('should generate string of default length', async () => {
      const str = await generateRandomString();

      expect(typeof str).toBe('string');
      expect(str.length).toBe(16);
    });

    it('should generate string of custom length', async () => {
      const str = await generateRandomString(32);

      expect(str.length).toBe(32);
    });

    it('should generate different strings on subsequent calls', async () => {
      const str1 = await generateRandomString();
      const str2 = await generateRandomString();

      expect(str1).not.toBe(str2);
    });

    it('should only contain characters from charset', async () => {
      const charset = 'abcdef';
      const str = await generateRandomString(10, charset);

      expect(str).toMatch(/^[abcdef]+$/);
    });
  });

  describe('JWT roundtrip', () => {
    it('should successfully complete generate and verify cycle', async () => {
      const payload = { userId: 'user-456', email: 'test@example.com' };
      const token = await generateJwt(payload, testSecret);
      const verified = await verifyJwt(token, testSecret);

      expect(verified).toEqual(
        expect.objectContaining({
          userId: payload.userId,
          email: payload.email,
        })
      );
    });
  });

  describe('CryptoUtils helper object', () => {
    it('should export all methods', () => {
      expect(CryptoUtils.generateJwt).toBeDefined();
      expect(CryptoUtils.verifyJwt).toBeDefined();
      expect(CryptoUtils.hashPassword).toBeDefined();
      expect(CryptoUtils.verifyPassword).toBeDefined();
      expect(CryptoUtils.generateRandomString).toBeDefined();
    });
  });
});
