import { EventEmitter } from 'node:events';

export class BulkheadFullError extends Error {
  constructor(
    public readonly name: string,
    public readonly maxConcurrent: number,
    public readonly reason: 'max_concurrent' | 'queue_full' | 'dropped_for_higher_priority',
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
}
