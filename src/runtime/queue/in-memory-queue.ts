import type { QueueAdapter, QueueJob } from '@/runtime/interfaces.ts';

interface InMemoryQueueOptions {
  concurrency: number;
}

export class InMemoryQueueAdapter implements QueueAdapter {
  private readonly concurrency: number;
  private readonly jobs: QueueJob[] = [];
  private running = false;
  private activeWorkers = 0;
  private worker: ((job: QueueJob) => Promise<void>) | null = null;

  constructor(options: InMemoryQueueOptions) {
    this.concurrency = options.concurrency;
  }

  public async enqueue(job: QueueJob): Promise<void> {
    this.jobs.push(job);
    this.kick();
  }

  public async start(worker: (job: QueueJob) => Promise<void>): Promise<void> {
    this.worker = worker;
    this.running = true;
    this.kick();
  }

  public async stop(): Promise<void> {
    this.running = false;
  }

  private kick(): void {
    if (!this.running || !this.worker) return;

    while (this.activeWorkers < this.concurrency && this.jobs.length > 0) {
      const job = this.jobs.shift();
      if (!job) break;

      this.activeWorkers += 1;
      const worker = this.worker;

      void worker(job)
        .catch(() => {
          // Best-effort queue for MVP: job errors are handled by worker logic.
        })
        .finally(() => {
          this.activeWorkers -= 1;
          this.kick();
        });
    }
  }
}
