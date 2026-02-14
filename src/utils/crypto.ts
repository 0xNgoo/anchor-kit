/**
 * CryptoUtils - Helper object for cryptographic operations.
 *
 * Provides secure utilities for JWT handling, password hashing, and random string generation.
 * Uses Web Crypto API for browser compatibility and Node.js crypto for server-side.
 */

/**
 * Generates a JWT token.
 * Note: In production, use a proper JWT library like 'jose' or 'jsonwebtoken'.
 * This is a simplified implementation for development/testing.
 *
 * @param payload - The payload to encode in the token.
 * @param secret - The secret key for signing.
 * @param expiresIn - Token expiration time in seconds (default: 3600 = 1 hour).
 * @returns A signed JWT string.
 */
export async function generateJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn: number = 3600
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const encoder = new TextEncoder();
  const headerBase64 = btoa(JSON.stringify(header));
  const payloadBase64 = btoa(JSON.stringify(tokenPayload));

  const data = `${headerBase64}.${payloadBase64}`;
  const signature = await signWithHmac(data, secret);

  return `${data}.${signature}`;
}

/**
 * Verifies a JWT token.
 *
 * @param token - The JWT string to verify.
 * @param secret - The secret key for verification.
 * @returns The decoded payload if valid, null otherwise.
 */
export async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const [headerBase64, payloadBase64, signature] = token.split('.');

    if (!headerBase64 || !payloadBase64 || !signature) {
      return null;
    }

    const data = `${headerBase64}.${payloadBase64}`;
    const expectedSignature = await signWithHmac(data, secret);

    if (signature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(atob(payloadBase64));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Hashes a password using SHA-256 with salt.
 * In production, use bcrypt or argon2 for better security.
 *
 * @param password - The plain text password.
 * @param salt - Optional salt string. If not provided, generates a random one.
 * @returns An object with salt and hash.
 */
export async function hashPassword(password: string, salt?: string): Promise<{ salt: string; hash: string }> {
  const actualSalt = salt || await generateRandomString(16);
  const data = new TextEncoder().encode(password + actualSalt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return { salt: actualSalt, hash };
}

/**
 * Verifies a password against a hash.
 *
 * @param password - The plain text password to verify.
 * @param salt - The salt used for hashing.
 * @param hash - The hash to compare against.
 * @returns True if the password matches, false otherwise.
 */
export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const { hash: computedHash } = await hashPassword(password, salt);
  return computedHash === hash;
}

/**
 * Generates a cryptographically secure random string.
 *
 * @param length - The desired length of the string (default: 16).
 * @param charset - Optional custom character set. Default is alphanumeric.
 * @returns A random string of the specified length.
 */
export async function generateRandomString(
  length: number = 16,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): Promise<string> {
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[randomBytes[i] % charset.length];
  }

  return result;
}

/**
 * Internal helper: Signs data with HMAC-SHA256.
 */
async function signWithHmac(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signatureArray = Array.from(new Uint8Array(signature));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * CryptoUtils helper object - exported for convenience.
 */
export const CryptoUtils = {
  generateJwt,
  verifyJwt,
  hashPassword,
  verifyPassword,
  generateRandomString,
} as const;
