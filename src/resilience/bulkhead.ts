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
