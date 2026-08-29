import { makeSqliteDbUrlForTests } from '@/core/factory.ts';
import { createSqlDatabaseAdapter } from '@/runtime/database/sql-database-adapter.ts';
import { randomUUID } from 'node:crypto';
import { unlinkSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mock } from 'bun:test';
import type { DatabaseAdapter } from '@/runtime/interfaces.ts';

describe('SqlDatabaseAdapter – interactive transaction status updates', () => {
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

  it('updates status and reflects the change on fetch', async () => {
    const txId = randomUUID();
    const RealDate = Date;
    let currentTime = new RealDate('2026-01-01T00:00:00.000Z').getTime();

    class MockDate extends RealDate {
      constructor(value?: string | number | Date) {
        super(value === undefined ? currentTime : value);
      }

      static override now(): number {
        return currentTime;
      }
    }

    globalThis.Date = MockDate as DateConstructor;

    try {
      const inserted = await db.insertInteractiveTransaction({
        id: txId,
        account: 'GTEST1234',
        kind: 'deposit',
        assetCode: 'USDC',
        amount: '50.00',
        status: 'pending_user_transfer_start',
      });

      expect(inserted.status).toBe('pending_user_transfer_start');

      currentTime = new RealDate('2026-01-01T00:00:01.000Z').getTime();
      await expect(db.updateTransactionStatus(txId, 'completed')).resolves.toBe(true);

      const fetched = await db.getInteractiveTransactionById(txId);
      expect(fetched).not.toBeNull();
      expect(fetched!.status).toBe('completed');
      expect(fetched!.updatedAt).not.toBe(inserted.updatedAt);
    } finally {
      globalThis.Date = RealDate;
    }
  });

  it('orders pending transactions by created_at then id for tied timestamps', async () => {
    const RealDate = Date;
    let currentTime = new RealDate('2026-01-02T00:00:00.000Z').getTime();

    class MockDate extends RealDate {
      constructor(value?: string | number | Date) {
        super(value === undefined ? currentTime : value);
      }

      static override now(): number {
        return currentTime;
      }
    }

    globalThis.Date = MockDate as DateConstructor;

    try {
      await db.insertInteractiveTransaction({
        id: 'b-tx',
        account: 'GTEST1234',
        kind: 'deposit',
        assetCode: 'USDC',
        amount: '10.00',
        status: 'pending_user_transfer_start',
      });
      await db.insertInteractiveTransaction({
        id: 'a-tx',
        account: 'GTEST1234',
        kind: 'deposit',
        assetCode: 'USDC',
        amount: '20.00',
        status: 'pending_user_transfer_start',
      });

      const pending = await db.listPendingTransactionsBefore('2026-01-03T00:00:00.000Z');
      expect(pending.map((tx) => tx.id)).toEqual(['a-tx', 'b-tx']);
    } finally {
      globalThis.Date = RealDate;
    }
  });

  it('reports missing transaction IDs as failed updates and keeps existing timestamps stable', async () => {
    const txId = randomUUID();
    const RealDate = Date;
    let currentTime = new RealDate('2026-01-05T00:00:00.000Z').getTime();

    class MockDate extends RealDate {
      constructor(value?: string | number | Date) {
        super(value === undefined ? currentTime : value);
      }

      static override now(): number {
        return currentTime;
      }
    }

    globalThis.Date = MockDate as DateConstructor;

    try {
      const inserted = await db.insertInteractiveTransaction({
        id: txId,
        account: 'GTEST1234',
        kind: 'deposit',
        assetCode: 'USDC',
        amount: '75.00',
        status: 'pending_user_transfer_start',
      });

      await expect(db.updateTransactionStatus('missing-id', 'completed')).resolves.toBe(false);

      currentTime = new RealDate('2026-01-05T00:00:01.000Z').getTime();
      await expect(db.updateTransactionStatus(txId, 'completed')).resolves.toBe(true);

      const fetched = await db.getInteractiveTransactionById(txId);
      expect(fetched).not.toBeNull();
      expect(fetched!.status).toBe('completed');
      expect(fetched!.updatedAt).not.toBe(inserted.updatedAt);
    } finally {
      globalThis.Date = RealDate;
    }
  });

  it('marks auth challenges consumed exactly once and leaves repeated consumption as a no-op', async () => {
    const challengeId = randomUUID();
    const challenge = `challenge-${randomUUID()}`;
    const RealDate = Date;
    let currentTime = new RealDate('2026-01-06T00:00:00.000Z').getTime();

    class MockDate extends RealDate {
      constructor(value?: string | number | Date) {
        super(value === undefined ? currentTime : value);
      }

      static override now(): number {
        return currentTime;
      }
    }

    globalThis.Date = MockDate as DateConstructor;

    try {
      await db.insertAuthChallenge({
        id: challengeId,
        account: 'GTEST1234',
        challenge,
        expiresAt: '2026-01-07T00:00:00.000Z',
      });

      await expect(db.markAuthChallengeConsumed(challengeId)).resolves.toBe(true);

      const firstState = await db.getAuthChallengeByChallenge(challenge);
      expect(firstState).not.toBeNull();
      expect(firstState!.consumedAt).toBe('2026-01-06T00:00:00.000Z');

      currentTime = new RealDate('2026-01-06T00:00:05.000Z').getTime();
      await expect(db.markAuthChallengeConsumed(challengeId)).resolves.toBe(false);
      await expect(db.markAuthChallengeConsumed('missing-challenge-id')).resolves.toBe(false);

      const secondState = await db.getAuthChallengeByChallenge(challenge);
      expect(secondState).not.toBeNull();
      expect(secondState!.consumedAt).toBe('2026-01-06T00:00:00.000Z');
    } finally {
      globalThis.Date = RealDate;
    }
  });

  it('serializes concurrent postgres connect attempts and retries after a failed connect', async () => {
    const connectCalls: Array<string> = [];
    const endCalls: Array<string> = [];

    mock.module('pg', () => ({
      Client: class {
        public readonly connectionString: string;

        constructor(config: { connectionString: string }) {
          this.connectionString = config.connectionString;
        }

        async connect(): Promise<void> {
          connectCalls.push(this.connectionString);
          if (connectCalls.length === 1) {
            await new Promise((resolve) => setTimeout(resolve, 25));
            throw new Error('connect failed');
          }
          await new Promise((resolve) => setTimeout(resolve, 25));
        }

        async end(): Promise<void> {
          endCalls.push(this.connectionString);
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
      },
    }));

    try {
      const { SqlDatabaseAdapter } = await import('@/runtime/database/sql-database-adapter.ts');
      const adapter = new SqlDatabaseAdapter({ provider: 'postgres', url: 'postgres://example' });

      await expect(Promise.all([adapter.connect(), adapter.connect()])).rejects.toThrow('connect failed');
      expect(connectCalls).toHaveLength(1);

      await expect(adapter.connect()).resolves.toBeUndefined();
      expect(connectCalls).toHaveLength(2);

      const disconnectCalls = Promise.all([adapter.disconnect(), adapter.disconnect()]);
      await expect(disconnectCalls).resolves.toEqual([undefined, undefined]);
      expect(endCalls).toHaveLength(1);
    } finally {
      mock.restore();
    }
  });
});
