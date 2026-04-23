import { CircuitBreaker, CircuitBreakerOptions, CircuitState } from './circuitBreaker';
import { Bulkhead, BulkheadConfig, BulkheadStates } from './bulkhead';
import { withRetry, RetryOptions } from '@/utils/retry';
import { logger } from '@/utils/logger';

export interface PipelineOptions {
  label: string;
  circuitBreaker?: CircuitBreakerOptions;
  bulkhead: BulkheadConfig;
  retry?: RetryOptions;
}

export interface PipelineStatus {
  label: string;
  circuit: CircuitState | 'disabled';
  bulkhead: BulkheadStates | 'disabled';
}

// Pipeline

export class ResiliencePipeline {
  readonly label: string;

  private readonly cb: CircuitBreaker | null;
  private readonly bulkhead: Bulkhead | null;
  private readonly retry: RetryOptions | null;

  constructor(opts: PipelineOptions) {
    this.label = opts.label;
    this.retry = opts.retry ?? null;

    const userStateChange = opts.circuitBreaker?.onStateChange;

    this.cb = opts.circuitBreaker
      ? new CircuitBreaker({
          ...opts.circuitBreaker,
          onStateChange: (prev, next) => {
            logger.warn(
              { event: 'circuit_breaker_state_change', label: opts.label, prev, next },
              `[${opts.label}] circuit breaker: ${prev} -> ${next}`,
            );
            userStateChange?.(prev, next);
          },
        })
      : null;

    this.bulkhead = opts.bulkhead ? new Bulkhead(opts.bulkhead) : null;

    if (!this.cb && !this.bulkhead && !this.retry) {
      logger.warn(
        { event: 'resilience_pipeline_empty', label: opts.label },
        `[${opts.label}] ResiliencePipeline created with no resilience options- acting as a plain wrapper`,
      );
    }
  }

  /**
   * Execute `fn` thorugh pipeline.
   *
   * @param fn- The async operation to protect.
   * @param priority- Bulkhead queue priority, Higher = dequeued. (1-10, default 5).
   */

  async execute<T>(fn: () => Promise<T>, priority = 5): Promise<T> {
    // Each attempt is a fresh invocation- CB will re-check the state
    // On every attempt, so retries into an open circuit fail fast.
    const withCbAndRetry = (): Promise<T> => {
      const attempt = this.cb ? () => this.cb!.execute(fn) : fn;

      return this.retry ? withRetry(attempt, this.label, this.retry) : attempt();
    };

    return this.bulkhead ? this.bulkhead.execute(withCbAndRetry, priority) : withCbAndRetry();
  }

  status(): PipelineStatus {
    return {
      label: this.label,
      circuit: this.cb ? this.cb.getState() : 'disabled',
      bulkhead: this.bulkhead ? this.bulkhead.stats() : 'disabled',
    };
  }

  /**
   * Release internal resources
   * Call this when the pipeline is no longer needed.
   */

  destroy(): void {
    this.bulkhead?.destroy();
  }
}
