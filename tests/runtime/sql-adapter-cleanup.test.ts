import { makeSqliteDbUrlForTests } from '@/core/factory.ts';
import { createSqlDatabaseAdapter } from '@/runtime/database/sql-database-adapter.ts';
import type { DatabaseAdapter } from '@/runtime/interfaces.ts';
import { Database } from 'bun:sqlite';
import { randomUUID } from 'node:crypto';
import { unlinkSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('SqlDatabaseAdapter – cleanupOldRecords (sqlite)', () => {
  const dbUrl = makeSqliteDbUrlForTests();
  const dbPath = dbUrl.startsWith('file:') ? dbUrl.slice('file:'.length) : dbUrl;
  let db: DatabaseAdapter;
  let raw: Database;

  const CUTOFF = '2024-06-01T12:00:00.000Z';
  const BEFORE = '2024-01-01T00:00:00.000Z';
  const AFTER = '2025-01-01T00:00:00.000Z';

  beforeAll(async () => {
    db = createSqlDatabaseAdapter({ provider: 'sqlite', url: dbUrl });
    await db.connect();
    await db.migrate();
    raw = new Database(dbPath);
  });

  afterAll(async () => {
    raw.close();
    await db.disconnect();
    try {
      unlinkSync(dbPath);
    } catch {
      // ignore
    }
  });

  it('removes expired operational rows and leaves rows that are not cleanup-eligible', async () => {
    const challengeExpired = `challenge-expired-${randomUUID()}`;
    const challengeKept = `challenge-kept-${randomUUID()}`;

    await db.insertAuthChallenge({
      id: randomUUID(),
      account: 'GEXPIRED',
      challenge: challengeExpired,
      expiresAt: BEFORE,
    });
    await db.insertAuthChallenge({
      id: randomUUID(),
      account: 'GKEPT',
      challenge: challengeKept,
      expiresAt: AFTER,
    });

    const idemOldId = randomUUID();
    const idemNewId = randomUUID();
    const scope = `scope-${randomUUID()}`;
    raw
      .prepare(
        `INSERT INTO idempotency_keys (id, scope, idempotency_key, request_hash, status_code, response_body, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(idemOldId, scope, 'old-key', 'hash-a', 200, '{}', BEFORE);
    raw
      .prepare(
        `INSERT INTO idempotency_keys (id, scope, idempotency_key, request_hash, status_code, response_body, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(idemNewId, scope, 'new-key', 'hash-b', 200, '{}', AFTER);

    const whOldProcessedId = randomUUID();
    const whOldPendingId = randomUUID();
    const whNewProcessedId = randomUUID();
    const payload = '{}';

    raw
      .prepare(
        `INSERT INTO webhook_events (id, event_id, provider, payload, status, error_message, processed_at, created_at)
         VALUES (?, ?, ?, ?, 'processed', NULL, ?, ?)`,
      )
      .run(whOldProcessedId, `evt-op-${randomUUID()}`, 'test', payload, BEFORE, BEFORE);
    raw
      .prepare(
        `INSERT INTO webhook_events (id, event_id, provider, payload, status, error_message, processed_at, created_at)
         VALUES (?, ?, ?, ?, 'pending', NULL, NULL, ?)`,
      )
      .run(whOldPendingId, `evt-pend-${randomUUID()}`, 'test', payload, BEFORE);
    raw
      .prepare(
        `INSERT INTO webhook_events (id, event_id, provider, payload, status, error_message, processed_at, created_at)
         VALUES (?, ?, ?, ?, 'processed', NULL, ?, ?)`,
      )
      .run(whNewProcessedId, `evt-new-${randomUUID()}`, 'test', payload, AFTER, AFTER);

    const wOldProcessedId = randomUUID();
    const wOldPendingId = randomUUID();
    const wNewProcessedId = randomUUID();
    const taskPayload = '{}';

    raw
      .prepare(
        `INSERT INTO watcher_tasks (id, watcher_name, payload, status, error_message, processed_at, created_at)
         VALUES (?, 'w', ?, 'processed', NULL, ?, ?)`,
      )
      .run(wOldProcessedId, taskPayload, BEFORE, BEFORE);
    raw
      .prepare(
        `INSERT INTO watcher_tasks (id, watcher_name, payload, status, error_message, processed_at, created_at)
         VALUES (?, 'w', ?, 'pending', NULL, NULL, ?)`,
      )
      .run(wOldPendingId, taskPayload, BEFORE);
    raw
      .prepare(
        `INSERT INTO watcher_tasks (id, watcher_name, payload, status, error_message, processed_at, created_at)
         VALUES (?, 'w', ?, 'processed', NULL, ?, ?)`,
      )
      .run(wNewProcessedId, taskPayload, AFTER, AFTER);

    await db.cleanupOldRecords(CUTOFF);

    expect(await db.getAuthChallengeByChallenge(challengeExpired)).toBeNull();
    const keptAuth = await db.getAuthChallengeByChallenge(challengeKept);
    expect(keptAuth).not.toBeNull();

    expect(await db.getIdempotencyRecord(scope, 'old-key')).toBeNull();
    expect(await db.getIdempotencyRecord(scope, 'new-key')).not.toBeNull();

    const webhookCount = (id: string) =>
      Number(
        (
          raw.prepare('SELECT COUNT(*) AS c FROM webhook_events WHERE id = ?').get(id) as {
            c: number;
          }
        ).c,
      );
    expect(webhookCount(whOldProcessedId)).toBe(0);
    expect(webhookCount(whOldPendingId)).toBe(1);
    expect(webhookCount(whNewProcessedId)).toBe(1);

    const watcherCount = (id: string) =>
      Number(
        (
          raw.prepare('SELECT COUNT(*) AS c FROM watcher_tasks WHERE id = ?').get(id) as {
            c: number;
          }
        ).c,
      );
    expect(watcherCount(wOldProcessedId)).toBe(0);
    expect(watcherCount(wOldPendingId)).toBe(1);
    expect(watcherCount(wNewProcessedId)).toBe(1);
  });
});
