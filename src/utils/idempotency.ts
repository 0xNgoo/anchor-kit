/**
 * IdempotencyUtils - Helper object for idempotency key generation and header extraction.
 *
 * Idempotency keys are used to ensure that the same operation is not performed twice,
 * which is critical for financial transactions.
 */

/**
 * Generates a unique idempotency key.
 * Uses a combination of timestamp and random string for uniqueness.
 *
 * @returns A unique idempotency key string.
 * @example
 * const key = IdempotencyUtils.generateIdempotencyKey();
 * // e.g., "idemp_20250214_abc123def456"
 */
export function generateIdempotencyKey(): string {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 14);
  return `idemp_${timestamp}_${random}`;
}

/**
 * Extracts the idempotency key from request headers.
 *
 * @param headers - Request headers object (typically from a request like Headers or Record<string, string>)
 * @returns The idempotency key if found, otherwise null.
 * @example
 * const key = IdempotencyUtils.extractIdempotencyHeader(request.headers);
 */
export function extractIdempotencyHeader(headers: Headers | Record<string, string>): string | null {
  let idempotencyKey: string | null = null;

  if (headers instanceof Headers) {
    idempotencyKey = headers.get('idempotency-key');
  } else {
    // Handle plain object headers
    idempotencyKey = headers['idempotency-key'] || headers['Idempotency-Key'];
  }

  return idempotencyKey || null;
}

/**
 * Normalizes missing idempotency header behavior.
 * Generates a new key if none is provided.
 *
 * @param headers - Request headers object
 * @returns Either the extracted idempotency key or a newly generated one.
 * @example
 * const key = IdempotencyUtils.normalizeIdempotencyKey(request.headers);
 */
export function normalizeIdempotencyKey(headers: Headers | Record<string, string>): string {
  const existingKey = extractIdempotencyHeader(headers);
  return existingKey || generateIdempotencyKey();
}

/**
 * IdempotencyUtils helper object - exported for convenience.
 */
export const IdempotencyUtils = {
  generateIdempotencyKey,
  extractIdempotencyHeader,
  normalizeIdempotencyKey,
} as const;
