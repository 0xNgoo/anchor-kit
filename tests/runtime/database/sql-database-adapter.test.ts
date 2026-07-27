import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Database } from 'bun:sqlite';
import {
  makeSqliteDbUrlForTests,
  SqlDatabaseAdapter,
} from '@/runtime/database/sql-database-adapter.ts';

describe('SqlDatabaseAdapter (sqlite)', () => {
  let adapter: SqlDatabaseAdapter;

  beforeEach(async () => {
    const sqliteUrl = makeSqliteDbUrlForTests();
    adapter = new SqlDatabaseAdapter({ provider: 'sqlite', url: sqliteUrl });
    await adapter.connect();
    await adapter.migrate();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('persists and consumes auth challenges correctly', async () => {
    await adapter.insertAuthChallenge({
      id: 'challenge-1',
      account: 'GB7W6F6S6LFQXCNHZVKI53ZJHULPF4E66YW2LJ3F4PAEPGZF5FY2B7ZB',
      challenge: 'live-test-challenge',
      expiresAt: '2099-12-31T23:59:59.000Z',
    });

    const stored = await adapter.getAuthChallengeByChallenge('live-test-challenge');
    expect(stored).not.toBeNull();
    expect(stored?.account).toBe('GB7W6F6S6LFQXCNHZVKI53ZJHULPF4E66YW2LJ3F4PAEPGZF5FY2B7ZB');
    expect(stored?.consumedAt).toBeNull();

    await adapter.markAuthChallengeConsumed('challenge-1');
    const consumed = await adapter.getAuthChallengeByChallenge('live-test-challenge');
    expect(consumed).not.toBeNull();
    expect(consumed?.consumedAt).toEqual(expect.any(String));
  });

  it('returns only pending user-transfer-start transactions before the cutoff', async () => {
    const firstTimestamp = '2024-01-01T00:00:00.000Z';
    const secondTimestamp = '2024-01-03T00:00:00.000Z';
    const cutoffTimestamp = '2024-01-02T00:00:00.000Z';

    await adapter.insertInteractiveTransaction({
      id: 'tx-old',
      account: 'GBOLDDATATESTACCOUNT',
      kind: 'deposit',
      assetCode: 'USDC',
      amount: '100',
      status: 'pending_user_transfer_start',
    });

    await adapter.insertInteractiveTransaction({
      id: 'tx-new',
      account: 'GBNEWTESTACCOUNT1234567890',
      kind: 'deposit',
      assetCode: 'USDC',
      amount: '150',
      status: 'pending_user_transfer_start',
    });

    await adapter.insertInteractiveTransaction({
      id: 'tx-completed',
      account: 'GBCOMPLETEDACCOUNT0000000000',
      kind: 'deposit',
      assetCode: 'USDC',
      amount: '200',
      status: 'completed',
    });

    const sqlite = (adapter as unknown as { sqlite: Database }).sqlite;
    sqlite
      .prepare('UPDATE interactive_transactions SET created_at = ? WHERE id = ?')
      .run(firstTimestamp, 'tx-old');
    sqlite
      .prepare('UPDATE interactive_transactions SET created_at = ? WHERE id = ?')
      .run(secondTimestamp, 'tx-new');
    sqlite
      .prepare('UPDATE interactive_transactions SET created_at = ? WHERE id = ?')
      .run(secondTimestamp, 'tx-completed');

    const pending = await adapter.listPendingTransactionsBefore(cutoffTimestamp);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.id).toBe('tx-old');
  });
});
