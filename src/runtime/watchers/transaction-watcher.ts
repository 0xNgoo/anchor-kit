import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter, QueueAdapter, Watcher } from '@/runtime/interfaces.ts';

interface TransactionWatcherOptions {
  pollIntervalMs: number;
  transactionTimeoutMs: number;
  retentionDays: number;
}

export class TransactionWatcher implements Watcher {
  public readonly name = 'transaction-watcher';

  private readonly database: DatabaseAdapter;
  private readonly queue: QueueAdapter;
  private readonly pollIntervalMs: number;
  private readonly transactionTimeoutMs: number;
  private readonly retentionDays: number;
  private isTickInProgress = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(database: DatabaseAdapter, queue: QueueAdapter, options: TransactionWatcherOptions) {
    this.database = database;
    this.queue = queue;
    this.pollIntervalMs = options.pollIntervalMs;
    this.transactionTimeoutMs = options.transactionTimeoutMs;
    this.retentionDays = options.retentionDays;
  }

  public async start(): Promise<void> {
    if (this.timer) return;

    await this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollIntervalMs);
  }

  public async stop(): Promise<void> {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.isTickInProgress) {
      return;
    }

    this.isTickInProgress = true;

    try {
      const cutoff = new Date(Date.now() - this.transactionTimeoutMs).toISOString();
      const pendingTransactions = await this.database.listPendingTransactionsBefore(cutoff);

      for (const transaction of pendingTransactions) {
        await this.queue.enqueue({
          type: 'expire_transaction',
          payload: { transactionId: transaction.id },
        });
      }

      const watcherTaskId = randomUUID();
      await this.database.insertWatcherTask({
        id: watcherTaskId,
        watcherName: this.name,
        payload: {
          pendingTransactionsChecked: pendingTransactions.length,
          checkedAt: new Date().toISOString(),
        },
      });

      await this.queue.enqueue({
        type: 'process_watcher_task',
        payload: { watcherTaskId },
      });

      await this.queue.enqueue({
        type: 'cleanup_records',
        payload: {
          retentionDays: this.retentionDays,
        },
      });
    } finally {
      this.isTickInProgress = false;
    }
  }
}
