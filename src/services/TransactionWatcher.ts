/**
 * TransactionWatcher
 * A background service that periodically executes a task (tick)
 * while ensuring that multiple instances of the task do not overlap.
 * 
 * Specifically, if a tick takes longer than the poll interval, 
 * subsequent intervals are skipped until the current tick finishes.
 */
export class TransactionWatcher {
  private intervalId: any = null;
  private isProcessing: boolean = false;

  constructor(
    private readonly task: () => Promise<void>,
    private readonly pollIntervalMs: number = 10000 // default 10s
  ) {}

  /**
   * Start the core watcher. If already running, does nothing.
   */
  public start(): void {
    if (this.isActive()) return;

    this.intervalId = setInterval(async () => {
      // Internal tick with guard logic
      await this.tick();
    }, this.pollIntervalMs);
  }

  /**
   * Stop the watcher if it's currently running.
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isProcessing = false;
  }

  /**
   * Execute a single tick with overlap protection.
   * If a previous tick is still in progress, this execution call is skipped.
   */
  public async tick(): Promise<void> {
    if (this.isProcessing) {
      // Overlap guard: skip if already processing
      return;
    }

    try {
      this.isProcessing = true;
      await this.task();
    } catch (e) {
      // Allow task errors to be logged/handled by caller but ensure guard is reset
      throw e;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Check if the watcher is currently active (started).
   * 
   * @returns boolean - True if the interval is running.
   */
  public isActive(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Check if the watcher is currently in the middle of a tick execution.
   * 
   * @returns boolean - True if a tick task is being processed.
   */
  public isBusy(): boolean {
    return this.isProcessing;
  }
}
