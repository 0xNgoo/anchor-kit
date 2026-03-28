import type { QueueJob } from '@/runtime/interfaces.ts';
import { InMemoryQueueAdapter } from '@/runtime/queue/in-memory-queue.ts';
import { describe, expect, it } from 'vitest';

describe('InMemoryQueueAdapter', () => {
  it('should honor concurrency limits when processing jobs', async () => {
    const concurrency = 2;
    const queue = new InMemoryQueueAdapter({ concurrency });

    // Track concurrent execution
    let maxConcurrentJobs = 0;
    let currentConcurrentJobs = 0;

    // Create a worker that tracks concurrency
    const worker = async (_job: QueueJob): Promise<void> => {
      currentConcurrentJobs++;
      maxConcurrentJobs = Math.max(maxConcurrentJobs, currentConcurrentJobs);

      // Simulate async work
      await new Promise((resolve) => setTimeout(resolve, 50));

      currentConcurrentJobs--;
    };

    // Start the queue
    await queue.start(worker);

    // Enqueue more jobs than the concurrency limit
    const totalJobs = 6;
    for (let i = 0; i < totalJobs; i++) {
      const job: QueueJob = {
        type: 'process_watcher_task',
        payload: { jobId: i },
      };
      await queue.enqueue(job);
    }

    // Wait for all jobs to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify that concurrency was never exceeded
    expect(maxConcurrentJobs).toBeLessThanOrEqual(concurrency);
    expect(maxConcurrentJobs).toBeGreaterThan(0); // Ensure jobs actually ran

    await queue.stop();
  });

  it('should process jobs sequentially when concurrency is 1', async () => {
    const concurrency = 1;
    const queue = new InMemoryQueueAdapter({ concurrency });

    const executionOrder: number[] = [];

    const worker = async (job: QueueJob): Promise<void> => {
      const jobId = job.payload.jobId as number;
      executionOrder.push(jobId);

      // Simulate work to ensure overlapping execution would be detectable
      await new Promise((resolve) => setTimeout(resolve, 30));
    };

    await queue.start(worker);

    // Enqueue multiple jobs
    const totalJobs = 4;
    for (let i = 0; i < totalJobs; i++) {
      const job: QueueJob = {
        type: 'process_watcher_task',
        payload: { jobId: i },
      };
      await queue.enqueue(job);
    }

    // Wait for all jobs to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify sequential execution (order should match enqueue order for concurrency=1)
    expect(executionOrder).toEqual([0, 1, 2, 3]);

    await queue.stop();
  });

  it('should allow concurrent execution up to the limit', async () => {
    const concurrency = 3;
    const queue = new InMemoryQueueAdapter({ concurrency });

    let maxConcurrentJobs = 0;
    let currentConcurrentJobs = 0;
    const startTimes: number[] = [];

    const worker = async (job: QueueJob): Promise<void> => {
      currentConcurrentJobs++;
      maxConcurrentJobs = Math.max(maxConcurrentJobs, currentConcurrentJobs);

      const jobId = job.payload.jobId as number;
      startTimes[jobId] = Date.now();

      // Simulate work
      await new Promise((resolve) => setTimeout(resolve, 50));

      currentConcurrentJobs--;
    };

    await queue.start(worker);

    // Enqueue jobs that should be able to run concurrently
    const totalJobs = 5;
    for (let i = 0; i < totalJobs; i++) {
      const job: QueueJob = {
        type: 'process_watcher_task',
        payload: { jobId: i },
      };
      await queue.enqueue(job);
    }

    // Wait for all jobs to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify that the concurrency limit was reached but not exceeded
    expect(maxConcurrentJobs).toBe(concurrency);
    expect(maxConcurrentJobs).toBeGreaterThan(0);

    await queue.stop();
  });

  it('should process jobs queued before start() after start() is called', async () => {
    const queue = new InMemoryQueueAdapter({ concurrency: 1 });
    const processedJobs: number[] = [];

    const worker = async (job: QueueJob): Promise<void> => {
      processedJobs.push(job.payload.jobId as number);
    };

    // Enqueue jobs BEFORE start()
    const jobsToEnqueue = [1, 2, 3];
    for (const jobId of jobsToEnqueue) {
      await queue.enqueue({
        type: 'process_watcher_task',
        payload: { jobId },
      });
    }

    // Verify no jobs processed yet
    expect(processedJobs).toHaveLength(0);

    // Start the queue
    await queue.start(worker);

    // Wait for jobs to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify all jobs were processed in order
    expect(processedJobs).toEqual(jobsToEnqueue);

    await queue.stop();
  });
});
