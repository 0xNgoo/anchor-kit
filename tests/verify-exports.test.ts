import { describe, expect, it } from 'vitest';
import type { WatcherTaskRecord } from '@/index.ts';

describe('package root exports', () => {
  it('exports WatcherTaskRecord for custom database adapters', () => {
    const record: WatcherTaskRecord = {
      id: 'task-1',
      watcherName: 'transaction-watcher',
      payload: { transactionId: 'tx-1' },
      status: 'pending',
      errorMessage: null,
      processedAt: null,
      createdAt: new Date(0).toISOString(),
    };

    expect(record.watcherName).toBe('transaction-watcher');
  });
});
