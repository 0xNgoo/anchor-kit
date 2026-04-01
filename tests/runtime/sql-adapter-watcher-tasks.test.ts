import { makeSqliteDbUrlForTests } from '@/core/factory.ts';
import { createSqlDatabaseAdapter } from '@/runtime/database/sql-database-adapter.ts';
import { randomUUID } from 'node:crypto';
import { unlinkSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '@/runtime/interfaces.ts';

describe('SqlDatabaseAdapter – watcher task persistence and processed counts', () => {
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

  beforeEach(async () => {
    // Clean up watcher tasks between tests
    const sqlite = (db as unknown as { sqlite?: { exec: (sql: string) => void } }).sqlite;
    if (sqlite) {
      sqlite.exec('DELETE FROM watcher_tasks');
    }
  });

  afterEach(async () => {
    // Ensure cleanup after each test
    const sqlite = (db as unknown as { sqlite?: { exec: (sql: string) => void } }).sqlite;
    if (sqlite) {
      sqlite.exec('DELETE FROM watcher_tasks');
    }
  });

  it('inserts a watcher task, updates status to processed, and counts it correctly', async () => {
    const taskId = randomUUID();
    const watcherName = 'test-watcher';
    const payload = { foo: 'bar', count: 42 };

    // Insert a new watcher task
    await db.insertWatcherTask({
      id: taskId,
      watcherName,
      payload,
    });

    // Verify initial count is 0 (task is pending)
    let processedCount = await db.countProcessedWatcherTasks();
    expect(processedCount).toBe(0);

    // List pending tasks to verify the task exists
    const pendingTasks = await db.listPendingWatcherTasks(10);
    expect(pendingTasks).toHaveLength(1);
    expect(pendingTasks[0].id).toBe(taskId);
    expect(pendingTasks[0].watcherName).toBe(watcherName);
    expect(pendingTasks[0].payload).toEqual(payload);
    expect(pendingTasks[0].status).toBe('pending');

    // Update the task status to processed
    await db.updateWatcherTaskStatus({
      id: taskId,
      status: 'processed',
    });

    // Verify the processed count is now 1
    processedCount = await db.countProcessedWatcherTasks();
    expect(processedCount).toBe(1);

    // Verify the task is no longer in pending list
    const stillPending = await db.listPendingWatcherTasks(10);
    expect(stillPending).toHaveLength(0);
  });

  it('handles multiple watcher tasks with mixed statuses', async () => {
    const task1Id = randomUUID();
    const task2Id = randomUUID();
    const task3Id = randomUUID();

    // Insert three tasks
    await db.insertWatcherTask({
      id: task1Id,
      watcherName: 'multi-task-watcher',
      payload: { task: 1 },
    });
    await db.insertWatcherTask({
      id: task2Id,
      watcherName: 'multi-task-watcher',
      payload: { task: 2 },
    });
    await db.insertWatcherTask({
      id: task3Id,
      watcherName: 'multi-task-watcher',
      payload: { task: 3 },
    });

    // Initially all are pending
    expect(await db.countProcessedWatcherTasks()).toBe(0);
    expect((await db.listPendingWatcherTasks(10)).length).toBe(3);

    // Mark task1 and task3 as processed
    await db.updateWatcherTaskStatus({ id: task1Id, status: 'processed' });
    await db.updateWatcherTaskStatus({ id: task3Id, status: 'processed' });

    // Count should be 2
    expect(await db.countProcessedWatcherTasks()).toBe(2);

    // Only task2 should remain pending
    const pending = await db.listPendingWatcherTasks(10);
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(task2Id);

    // Mark task2 as failed
    await db.updateWatcherTaskStatus({
      id: task2Id,
      status: 'failed',
      errorMessage: 'Test failure',
    });

    // Count should still be 2 (failed tasks don't count)
    expect(await db.countProcessedWatcherTasks()).toBe(2);

    // No pending tasks left
    expect(await db.listPendingWatcherTasks(10)).toHaveLength(0);
  });
});
