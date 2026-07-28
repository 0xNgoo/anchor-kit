import { describe, expect, it } from 'vitest';
import { InMemoryQueueAdapter } from '@/runtime/queue/in-memory-queue.ts';
import type { QueueJob } from '@/runtime/interfaces.ts';

describe('InMemoryQueueAdapter', () => {
  it('processes queued jobs only once when start is called twice', async () => {
    const adapter = new InMemoryQueueAdapter({ concurrency: 1 });
    let processedCount = 0;
    let resolveProcessed: (() => void) | null = null;
    const processed = new Promise<void>((resolve) => {
      resolveProcessed = resolve;
    });

    const job: QueueJob = {
      type: 'cleanup_records',
      payload: { id: 'job-1' },
    };

    await adapter.enqueue(job);
    await adapter.start(async () => {
      processedCount += 1;
      resolveProcessed?.();
    });
    await adapter.start(async () => {
      processedCount += 1;
    });

    await processed;

    expect(processedCount).toBe(1);
    await adapter.stop();
  });
});
