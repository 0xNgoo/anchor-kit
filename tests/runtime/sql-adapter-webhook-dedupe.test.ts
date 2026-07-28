import { makeSqliteDbUrlForTests } from '@/core/factory.ts';
import { createSqlDatabaseAdapter } from '@/runtime/database/sql-database-adapter.ts';
import type { DatabaseAdapter } from '@/runtime/interfaces.ts';
import { randomUUID } from 'node:crypto';
import { unlinkSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('SqlDatabaseAdapter – webhook event deduplication (sqlite)', () => {
  const dbUrl = makeSqliteDbUrlForTests();
  const dbPath = dbUrl.startsWith('file:') ? dbUrl.slice('file:'.length) : dbUrl;
  let db: DatabaseAdapter;

  beforeAll(async () => {
    db = createSqlDatabaseAdapter({ provider: 'sqlite', url: dbUrl });
    await db.connect();
    await db.migrate();
  });

  afterAll(async () => {
    await db.disconnect();
    try {
      unlinkSync(dbPath);
    } catch {
      // ignore
    }
  });

  it('first insert returns inserted: true with the new record', async () => {
    const eventId = `evt-${randomUUID()}`;
    const payload = { type: 'payment.completed', amount: '100' };

    const result = await db.insertOrGetWebhookEvent({
      id: randomUUID(),
      eventId,
      provider: 'test-provider',
      payload,
    });

    expect(result.inserted).toBe(true);
    expect(result.record.eventId).toBe(eventId);
    expect(result.record.provider).toBe('test-provider');
    expect(result.record.status).toBe('pending');
    expect(result.record.payload).toEqual(payload);
    expect(result.record.processedAt).toBeNull();
    expect(result.record.errorMessage).toBeNull();
  });

  it('second insert with same event_id returns inserted: false and the existing record', async () => {
    const eventId = `evt-${randomUUID()}`;
    const payload = { type: 'payment.completed', amount: '200' };
    const firstId = randomUUID();

    const first = await db.insertOrGetWebhookEvent({
      id: firstId,
      eventId,
      provider: 'test-provider',
      payload,
    });
    expect(first.inserted).toBe(true);

    const duplicate = await db.insertOrGetWebhookEvent({
      id: randomUUID(),
      eventId,
      provider: 'test-provider',
      payload: { type: 'tampered', amount: '999' },
    });

    expect(duplicate.inserted).toBe(false);
    expect(duplicate.record.id).toBe(firstId);
    expect(duplicate.record.eventId).toBe(eventId);
    expect(duplicate.record.payload).toEqual(payload);
  });

  it('different event_ids are each inserted independently', async () => {
    const eventIdA = `evt-${randomUUID()}`;
    const eventIdB = `evt-${randomUUID()}`;

    const resultA = await db.insertOrGetWebhookEvent({
      id: randomUUID(),
      eventId: eventIdA,
      provider: 'test-provider',
      payload: { seq: 1 },
    });

    const resultB = await db.insertOrGetWebhookEvent({
      id: randomUUID(),
      eventId: eventIdB,
      provider: 'test-provider',
      payload: { seq: 2 },
    });

    expect(resultA.inserted).toBe(true);
    expect(resultB.inserted).toBe(true);
    expect(resultA.record.eventId).toBe(eventIdA);
    expect(resultB.record.eventId).toBe(eventIdB);
  });
});
