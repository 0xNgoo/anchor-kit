import { describe, expect, it } from 'vitest';
import type { IdempotencyRecord } from '@/index.ts';

describe('package root exports', () => {
  it('exports IdempotencyRecord for custom database adapters', () => {
    const record: IdempotencyRecord = {
      id: 'record-1',
      scope: 'webhook',
      idempotencyKey: 'key-1',
      requestHash: 'hash-1',
      statusCode: 200,
      responseBody: '{}',
      createdAt: new Date(0).toISOString(),
    };

    expect(record.idempotencyKey).toBe('key-1');
  });
});
