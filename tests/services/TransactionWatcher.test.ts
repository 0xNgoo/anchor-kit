import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TransactionWatcher } from '@/services/TransactionWatcher.ts';

describe('TransactionWatcher', () => {
  let watcher: TransactionWatcher;
  let taskMock: any;

  // Helper to flush all currently expected microtasks
  async function flush() {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    taskMock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (watcher) {
      watcher.stop();
    }
    vi.useRealTimers();
  });

  describe('overlap guard logic', () => {
    it('prevents overlapping ticks when task is slow', async () => {
      let taskStarted = 0;
      let resolveTask: any;
      const slowTask = vi.fn(() => {
        taskStarted++;
        return new Promise<void>((resolve) => {
          resolveTask = resolve;
        });
      });

      watcher = new TransactionWatcher(slowTask, 1000);
      watcher.start();

      // Trigger first tick
      vi.advanceTimersByTime(1001);
      await flush();
      
      expect(taskStarted).toBe(1);
      expect(watcher.isBusy()).toBe(true);

      // Trigger second tick while first is still processing
      vi.advanceTimersByTime(1001);
      await flush();

      // Should NOT have started a second task
      expect(taskStarted).toBe(1);
      
      // Resolve first task
      if (resolveTask) resolveTask();
      await flush();

      expect(watcher.isBusy()).toBe(false);

      // Trigger third tick - now it should work as task is free
      vi.advanceTimersByTime(1001);
      await flush();
      expect(taskStarted).toBe(2);
    });

    it('handles manual tick() calls with overlap guard', async () => {
      let resolveTask: any;
      const deferredTask = vi.fn<() => Promise<void>>(() => new Promise<void>((resolve) => {
        resolveTask = resolve;
      }));

      watcher = new TransactionWatcher(deferredTask, 1000);
      
      const p1 = watcher.tick();
      await flush();

      expect(deferredTask).toHaveBeenCalledTimes(1);
      expect(watcher.isBusy()).toBe(true);

      // Second manual call - should return immediately due to guard
      const p2 = watcher.tick(); 
      await flush();

      // Should skip
      expect(deferredTask).toHaveBeenCalledTimes(1);
      await p2;

      // Resolve first
      if (resolveTask) resolveTask();
      await p1;
      await flush();
      
      expect(watcher.isBusy()).toBe(false);
    });
  });

  describe('lifecycle', () => {
    it('starts and stops correctly', async () => {
      watcher = new TransactionWatcher(taskMock, 100);
      watcher.start();
      expect(watcher.isActive()).toBe(true);

      vi.advanceTimersByTime(101);
      await flush();
      expect(taskMock).toHaveBeenCalledTimes(1);

      watcher.stop();
      expect(watcher.isActive()).toBe(false);

      vi.advanceTimersByTime(200);
      await flush();
      // No more calls
      expect(taskMock).toHaveBeenCalledTimes(1);
    });
  });
});
