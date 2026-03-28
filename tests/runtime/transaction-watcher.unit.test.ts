import type { DatabaseAdapter, QueueAdapter } from '@/runtime/interfaces.ts';
import { TransactionWatcher } from '@/runtime/watchers/transaction-watcher.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('TransactionWatcher Unit Tests', () => {
  let mockDatabase: DatabaseAdapter;
  let mockQueue: QueueAdapter;
  let transactionWatcher: TransactionWatcher;

  beforeEach(() => {
    mockDatabase = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      migrate: vi.fn().mockResolvedValue(undefined),
      insertAuthChallenge: vi.fn().mockResolvedValue(undefined),
      getAuthChallengeByChallenge: vi.fn().mockResolvedValue(null),
      markAuthChallengeConsumed: vi.fn().mockResolvedValue(undefined),
      insertInteractiveTransaction: vi.fn().mockResolvedValue({
        id: 'test-tx-id',
        account: 'test-account',
        kind: 'deposit' as const,
        assetCode: 'USDC',
        amount: '100',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      getInteractiveTransactionById: vi.fn().mockResolvedValue(null),
      listPendingTransactionsBefore: vi.fn().mockResolvedValue([]),
      updateTransactionStatus: vi.fn().mockResolvedValue(undefined),
      getIdempotencyRecord: vi.fn().mockResolvedValue(null),
      insertIdempotencyRecord: vi.fn().mockResolvedValue(undefined),
      insertWebhookEvent: vi.fn().mockResolvedValue({
        inserted: true,
        record: {
          id: 'webhook-id',
          eventId: 'external-id',
          provider: 'generic',
          payload: {},
          status: 'pending' as const,
          errorMessage: null,
          processedAt: null,
          createdAt: new Date().toISOString(),
        },
      }),
      updateWebhookEventStatus: vi.fn().mockResolvedValue(undefined),
      insertWatcherTask: vi.fn().mockResolvedValue(undefined),
      listPendingWatcherTasks: vi.fn().mockResolvedValue([]),
      updateWatcherTaskStatus: vi.fn().mockResolvedValue(undefined),
      countProcessedWatcherTasks: vi.fn().mockResolvedValue(0),
      cleanupOldRecords: vi.fn().mockResolvedValue(undefined),
    } as unknown as DatabaseAdapter;

    mockQueue = {
      enqueue: vi.fn().mockResolvedValue(undefined),
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    } as unknown as QueueAdapter;

    transactionWatcher = new TransactionWatcher(mockDatabase, mockQueue, {
      pollIntervalMs: 1000,
      transactionTimeoutMs: 300000, // 5 minutes
      retentionDays: 30,
    });
  });

  it('enqueues expiration jobs for stale pending deposits', async () => {
    const staleTransaction = {
      id: 'stale-tx-1',
      account: 'account-1',
      kind: 'deposit' as const,
      assetCode: 'USDC',
      amount: '100',
      status: 'pending',
      createdAt: new Date(Date.now() - 400000).toISOString(), // 6+ minutes ago (stale)
      updatedAt: new Date(Date.now() - 400000).toISOString(),
    };

    const anotherStaleTransaction = {
      id: 'stale-tx-2',
      account: 'account-2',
      kind: 'deposit' as const,
      assetCode: 'EURT',
      amount: '50',
      status: 'pending',
      createdAt: new Date(Date.now() - 350000).toISOString(), // 5+ minutes ago (stale)
      updatedAt: new Date(Date.now() - 350000).toISOString(),
    };

    mockDatabase.listPendingTransactionsBefore = vi
      .fn()
      .mockResolvedValue([staleTransaction, anotherStaleTransaction]);

    // Start the watcher to trigger the tick
    await transactionWatcher.start();

    // Should enqueue expire_transaction jobs for each stale transaction
    expect(mockQueue.enqueue).toHaveBeenCalledWith({
      type: 'expire_transaction',
      payload: { transactionId: 'stale-tx-1' },
    });

    expect(mockQueue.enqueue).toHaveBeenCalledWith({
      type: 'expire_transaction',
      payload: { transactionId: 'stale-tx-2' },
    });

    // Should have called enqueue at least 4 times:
    // 2 for expire_transaction, 1 for process_watcher_task, 1 for cleanup_records
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(4);

    // Should have inserted a watcher task record
    expect(mockDatabase.insertWatcherTask).toHaveBeenCalledWith({
      id: expect.any(String),
      watcherName: 'transaction-watcher',
      payload: {
        pendingTransactionsChecked: 2,
        checkedAt: expect.any(String),
      },
    });

    // Stop the watcher to clean up
    await transactionWatcher.stop();
  });

  it('does not enqueue expiration jobs when no stale pending deposits exist', async () => {
    mockDatabase.listPendingTransactionsBefore = vi.fn().mockResolvedValue([]);

    // Start the watcher to trigger the tick
    await transactionWatcher.start();

    // Should not enqueue any expire_transaction jobs
    expect(mockQueue.enqueue).not.toHaveBeenCalledWith({
      type: 'expire_transaction',
      payload: expect.any(Object),
    });

    // Should still enqueue process_watcher_task and cleanup_records
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(2);

    // Should have inserted a watcher task record with zero checked
    expect(mockDatabase.insertWatcherTask).toHaveBeenCalledWith({
      id: expect.any(String),
      watcherName: 'transaction-watcher',
      payload: {
        pendingTransactionsChecked: 0,
        checkedAt: expect.any(String),
      },
    });

    // Stop the watcher to clean up
    await transactionWatcher.stop();
  });

  it('calculates cutoff time correctly for transaction timeout', async () => {
    const now = Date.now();
    const timeoutMs = 300000; // 5 minutes
    const expectedCutoff = new Date(now - timeoutMs).toISOString();

    // Mock Date.now to control timing
    const originalDateNow = Date.now;
    Date.now = vi.fn().mockReturnValue(now);

    const staleTransaction = {
      id: 'stale-tx',
      account: 'account',
      kind: 'deposit' as const,
      assetCode: 'USDC',
      amount: '100',
      status: 'pending',
      createdAt: new Date(now - timeoutMs - 1000).toISOString(), // Just over timeout
      updatedAt: new Date(now - timeoutMs - 1000).toISOString(),
    };

    mockDatabase.listPendingTransactionsBefore = vi.fn().mockResolvedValue([staleTransaction]);

    // Start the watcher to trigger the tick
    await transactionWatcher.start();

    // Verify the cutoff time was calculated correctly
    expect(mockDatabase.listPendingTransactionsBefore).toHaveBeenCalledWith(expectedCutoff);

    // Restore original Date.now
    Date.now = originalDateNow;

    // Stop the watcher to clean up
    await transactionWatcher.stop();
  });
});
