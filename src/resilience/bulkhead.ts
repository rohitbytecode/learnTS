import { EventEmitter } from 'node:events';
import { clearInterval } from 'node:timers';

export class BulkheadFullError extends Error {
  constructor(
    public readonly name: string,
    public readonly maxConcurrent: number,
    public readonly reason:
      | 'max_concurrent'
      | 'queue_full'
      | 'dropped_for_higher_priority'
      | 'queue_timeout',
  ) {
    super(`Bulkhead [${name}] rejected (${reason})`);
    this.name = 'BulkheadFullError';
  }
}

export interface BulkheadConfig {
  name: string;
  maxConcurrent: number;
  maxQueueSize?: number;
  maxWaitMs?: number;

  // Priority + Anti-starvation
  enablePriority?: boolean;
  aging?: {
    enabled?: boolean;
    intervalMs?: number;
    boostAmount: number;
  };
  // Adaptive concurrency (AIMD with EMA)
  adaptive?: {
    enabled: boolean;
    minConcurrent?: number;
    adjustmentIntervalMs?: number;
    scaleDownOnErrorRate?: number;
    scaleDownOnHighLatencyMs?: number;
    stepSize?: number;
    emaAlpha?: number;
  };
}

export interface BulkheadStates {
  name: string;
  active: number;
  queued: number;
  currentMaxConcurrent: number;
  rejected: number;
  completed: number;
  rejectionRate: number;
  avgWaitTimeMs: number;
}

// Reusable max-heap Priority queue (higher effective priority first)

class PriorityQueue<T extends { getEffectivePriority(now: number): number }> {
  private heap: T[] = [];

  enqueue(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): T | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();
    const top = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    return top;
  }

  size(): number {
    return this.heap.length;
  }
  // Core logic
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.heap[index], this.heap[parent]) > 0) {
        [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
        index = parent;
      } else break;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      let largest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < length && this.compare(this.heap[left], this.heap[largest]) > 0) largest = left;
      if (right < length && this.compare(this.heap[right], this.heap[largest]) > 0) largest = right;

      if (largest !== index) {
        [this.heap[index], this.heap[largest]] = [this.heap[largest], this.heap[index]];
        index = largest;
      } else break;
    }
  }

  private compare(a: T, b: T): number {
    const now = Date.now();
    return a.getEffectivePriority(now) - b.getEffectivePriority(now);
  }
}

type QueuedTask<T> = {
  fn: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  queuedAt: number;
  basePriority: number;
  timeoutId?: NodeJS.Timeout;
  getEffectivePriority: (now: number) => number;
};

export class Bulkhead extends EventEmitter {
  private active = 0;
  private queuedCount = 0;
  private rejected = 0;
  private completed = 0;
  private totalWaitTimeMs = 0;

  private currentMaxConcurrent: number;
  private readonly maxConcurrent: number;
  private readonly maxQueueSize: number;
  private readonly maxWaitMs: number;

  private readonly enablePriority: boolean;
  private readonly agingEnabled: boolean;
  private readonly agingIntervals: number;
  private readonly agingBoost: number;

  // EMA+ cold start ptotection
  private readonly adaptiveEnabled: boolean;
  private readonly adaptiveMin: number;
  private readonly adjustmentIntervalMs: number;
  private readonly errorThreshold: number;
  private readonly latencyThresholdMs: number;
  private readonly stepSize: number;
  private readonly emaAlpha: number;

  private emaErrorRate = 0;
  private emaLatency = 0;
  private recentSuccess = 0;
  private recentFailure = 0;
  private recentTotalLatency = 0;
  private samplesCollected = 0;
  private adjustmentTimer?: NodeJS.Timeout;

  private readonly queue: QueuedTask<any>[] = [];
  private readonly priorityQueue?: PriorityQueue<QueuedTask<any>>;

  readonly name: string;

  constructor(config: BulkheadConfig) {
    super();
    this.name = config.name;
    this.maxConcurrent = config.maxConcurrent;
    this.currentMaxConcurrent = config.maxConcurrent;
    this.maxQueueSize = config.maxQueueSize ?? 0;
    this.maxWaitMs = config.maxWaitMs ?? 0;

    this.enablePriority = config.enablePriority ?? false;
    this.agingEnabled = !!config.aging?.enabled;
    this.agingIntervals = config.aging?.intervalMs ?? 3000;
    this.agingBoost = config.aging?.boostAmount ?? 1;

    this.adaptiveEnabled = config.adaptive?.enabled ?? false;
    this.adaptiveMin =
      config.adaptive?.minConcurrent ?? Math.max(1, Math.floor(this.maxConcurrent * 0.3));

    this.adjustmentIntervalMs = config.adaptive?.adjustmentIntervalMs ?? 10000;
    this.errorThreshold = config.adaptive?.scaleDownOnErrorRate ?? 0.15;
    this.latencyThresholdMs = config.adaptive?.scaleDownOnHighLatencyMs ?? 1500;
    this.stepSize = config.adaptive?.stepSize ?? 2;
    this.emaAlpha = config.adaptive?.emaAlpha ?? 0.25;

    if (this.enablePriority) {
      this.priorityQueue = new PriorityQueue<QueuedTask<any>>();
    }

    if (this.adaptiveEnabled) {
      this.currentMaxConcurrent = this.adaptiveMin;
      this.startAdaptiveTuning();
    }
  }

  async execute<T>(fn: () => Promise<T>, priority = 5): Promise<T> {
    const basePriority = Math.max(1, Math.min(10, priority));

    if (this.active < this.currentMaxConcurrent) {
      return this.run(fn);
    }

    if (this.maxQueueSize === 0 || this.queuedCount >= this.maxQueueSize) {
      this.rejected++;
      this.emit('rejected', { reason: 'queue_full' });
      throw new BulkheadFullError(this.name, this.currentMaxConcurrent, 'queue_full');
    }
    return this.enqueue(fn, basePriority);
  }

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    this.active++;
    const start = Date.now();

    try {
      const result = await fn();
      this.completed++;
      this.recordSuccess(Date.now() - start);
      return result;
    } catch (err) {
      this.rejected++;
      this.recordFailure();
      throw err;
    } finally {
      this.active--;
      this.processNext();
    }
  }
  private enqueue<T>(fn: () => Promise<T>, basePriority: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: QueuedTask<T> = {
        fn,
        resolve,
        reject,
        queuedAt: Date.now(),
        basePriority,
        getEffectivePriority: (now: number) => {
          if (!this.agingEnabled) return basePriority;
          const waited = now - task.queuedAt;
          const agingSteps = Math.floor(waited / this.agingIntervals);
          return Math.min(10, basePriority + agingSteps * this.agingBoost);
        },
      };

      if (this.maxWaitMs > 0) {
        task.timeoutId = setTimeout(() => this.handleTimeout(task), this.maxWaitMs);
      }

      if (this.priorityQueue) {
        this.priorityQueue.enqueue(task);
      } else {
        this.queue.push(task);
      }

      this.queuedCount++;
      this.processNext();
    });
  }

  private handleTimeout(task: QueuedTask<any>): void {
    const idx = this.queue.indexOf(task);
    if (idx !== -1) this.queue.splice(idx, 1);
    this.queuedCount--;
    this.rejected++;
    task.reject(new BulkheadFullError(this.name, this.currentMaxConcurrent, 'queue_timeout'));
  }

  private processNext(): void {
    if (this.active >= this.currentMaxConcurrent) return;

    let task: QueuedTask<any> | undefined;
    if (this.priorityQueue) {
      task = this.priorityQueue.dequeue();
    } else if (this.queue.length > 0) {
      task = this.queue.shift();
    }

    if (!task) return;

    this.queuedCount--;
    if (task.timeoutId) clearTimeout(task.timeoutId);

    const waitTime = Date.now() - task.queuedAt;
    this.totalWaitTimeMs += waitTime;

    this.run(task.fn).then(task.resolve).catch(task.reject);
  }

  private recordSuccess(latency: number) {
    this.recentSuccess++;
    this.recentTotalLatency += latency;
    this.samplesCollected++;
  }

  private recordFailure() {
    this.recentFailure++;
    this.samplesCollected++;
  }

  private startAdaptiveTuning() {
    this.adjustmentTimer = setInterval(() => this.adjustConcurrency(), this.adjustmentIntervalMs);
  }

  private adjustConcurrency() {
    if (this.samplesCollected < 20) return;

    const total = this.recentSuccess + this.recentFailure;
    if (total === 0) return;

    const instantError = this.recentFailure / total;
    const instantLatency =
      this.recentSuccess > 0 ? this.recentTotalLatency / this.recentSuccess : 0;

    this.emaErrorRate = this.emaAlpha * instantError + (1 - this.emaAlpha) * this.emaErrorRate;
    this.emaLatency = this.emaAlpha * instantLatency + (1 - this.emaAlpha) * this.emaLatency;

    let delta = 0;
    if (this.emaErrorRate > this.errorThreshold || this.emaLatency > this.latencyThresholdMs) {
      delta = -this.stepSize;
    } else if (this.emaErrorRate < 0.05 && this.active < this.currentMaxConcurrent * 0.6) {
      delta = this.stepSize;
    }

    if (delta !== 0) {
      const newMax = Math.max(
        this.adaptiveMin,
        Math.min(this.maxConcurrent, this.currentMaxConcurrent + delta),
      );

      if (newMax !== this.currentMaxConcurrent) {
        const previous = this.currentMaxConcurrent;
        this.currentMaxConcurrent = newMax;

        this.emit('adaptive-adjust', {
          previous: this.currentMaxConcurrent,
          current: newMax,
          emaErrorRate: this.emaErrorRate,
          emaLatency: this.emaLatency,
        });
        this.processNext();
      }
    }

    this.recentSuccess = this.recentFailure = this.recentTotalLatency = 0;
  }

  stats(): BulkheadStates {
    const total = this.completed + this.rejected;
    return {
      name: this.name,
      active: this.active,
      queued: this.queuedCount,
      currentMaxConcurrent: this.currentMaxConcurrent,
      rejected: this.rejected,
      completed: this.completed,
      rejectionRate: total ? Math.round((this.rejected / total) * 100) / 100 : 0,
      avgWaitTimeMs: total ? Math.round(this.totalWaitTimeMs / total) : 0,
    };
  }

  destroy(): void {
    if (this.adjustmentTimer) clearInterval(this.adjustmentTimer);
    [...this.queue, ...(this.priorityQueue ? [] : [])].forEach(
      (t) => t.timeoutId && clearTimeout(t.timeoutId),
    );
    this.queue.length = 0;
  }
}

// Registry

export class BulkheadRegistry {
  private static instance = new BulkheadRegistry();
  private bulkheads = new Map<string, Bulkhead>();

  static getInstance() {
    return BulkheadRegistry.instance;
  }

  getOnCreate(config: BulkheadConfig): Bulkhead {
    if (!this.bulkheads.has(config.name)) {
      this.bulkheads.set(config.name, new Bulkhead(config));
    }
    return this.bulkheads.get(config.name)!;
  }

  getAllStats() {
    return Array.from(this.bulkheads.values()).map((b) => b.stats());
  }

  destroyAll() {
    this.bulkheads.forEach((b) => b.destroy());
    this.bulkheads.clear();
  }
}

export const bulkheadRegistry = BulkheadRegistry.getInstance();
