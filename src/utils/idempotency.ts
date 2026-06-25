/**
 * IdempotencyUtils helper object
 * Provides helpers for generating idempotency keys and extracting
 * idempotency header values from different header shapes.
 */
type HeaderValue = string | string[] | undefined | null;
type HeadersRecord = Record<string, HeaderValue>;
type HeadersGetter = { get(name: string): string | null | undefined };
export type HeadersLike = Headers | HeadersGetter | HeadersRecord;

export const IdempotencyUtils = {
  /**
   * Generate a standardized UUID v4 idempotency key.
   *
   * @param prefix Optional prefix to help grouping keys
   */
  generateIdempotencyKey(prefix?: string): string {
    const uuid = crypto.randomUUID();
    return prefix ? `${prefix}-${uuid}` : uuid;
  },

  /**
   * Extract the idempotency header value from a Headers-like object,
   * plain object, or an array value. Normalizes missing or empty values
   * to `null` for consistent calling code.
   *
   * Accepts: Fetch `Headers`, a Node/express `IncomingHttpHeaders`-like
   * object, or a plain record where values may be string | string[] | undefined.
   */
  extractIdempotencyHeader(
    headers: HeadersLike | null | undefined,
    headerName = 'Idempotency-Key',
  ): string | null {
    if (!headers) return null;

    // Fetch Headers instance
    if (typeof headers.get === 'function') {
      const v = headers.get(headerName) ?? headers.get(headerName.toLowerCase());
      if (!v) return null;
      const trimmed = String(v).trim();
      return trimmed === '' ? null : trimmed;
    }

    // Plain object (case-insensitive key lookup)
    const headerRecord = headers as HeadersRecord;
    const keys = Object.keys(headerRecord);
    const foundKey = keys.find((k) => k.toLowerCase() === headerName.toLowerCase());
    if (!foundKey) return null;

    const val = headerRecord[foundKey];
    if (Array.isArray(val)) {
      const found = val.map((s) => (s == null ? '' : String(s).trim())).find((s) => s.length > 0);
      return found ?? null;
    }

    if (val == null) return null;
    const s = String(val).trim();
    return s === '' ? null : s;
  },
};
