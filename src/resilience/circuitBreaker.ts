export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type CircuitBreakerOptions = {
  name: string;
  failureThreshold?: number;
  successThreshold?: number;
  openDurationMs?: number;
  timeoutMs?: number;
  onStateChange?: (prev: CircuitState, next: CircuitState) => void;
};

export class CircuitBreakerOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker [${name}] is OPEN - call rejected`);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class CircuitBreakerTimeoutError extends Error {
  constructor(name: string, ms: number) {
    super(`Circuit breaker [${name}] call timed out after ${ms} ms`);
    this.name = 'CircuitBreakerTimeoutError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private openedAt: number | null = null;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly openDurationMs: number;
  private readonly timeoutMs: number | null;
  private readonly onStateChange?: CircuitBreakerOptions['onStateChange'];
  readonly name: string;

  constructor(opts: CircuitBreakerOptions) {
    this.name = opts.name;
    this.failureThreshold = opts.failureThreshold ?? 5;
    this.successThreshold = opts.successThreshold ?? 2;
    this.openDurationMs = opts.openDurationMs ?? 30_000;
    this.timeoutMs = opts.timeoutMs ?? null;
    this.onStateChange = opts.onStateChange;
  }

  getState(): CircuitState {
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.maybeTransitionFromOpen();

    if (this.state === 'OPEN') {
      throw new CircuitBreakerOpenError(this.name);
    }

    try {
      const result = await this.callWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (err) {
      if (err instanceof CircuitBreakerOpenError) throw err;
      this.onFailure();
      throw err;
    }
  }

  private async callWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    if (this.timeoutMs === null) return fn();

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new CircuitBreakerTimeoutError(this.name, this.timeoutMs!));
      }, this.timeoutMs!);

      fn()
        .then((v) => {
          clearTimeout(timer);
          resolve(v);
        })
        .catch((e) => {
          clearTimeout(timer);
          reject(e);
        });
    });
  }

  private maybeTransitionFromOpen(): void {
    if (
      this.state === 'OPEN' &&
      this.openedAt !== null &&
      Date.now() - this.openedAt >= this.openDurationMs
    ) {
      this.transition('HALF_OPEN');
      this.successes = 0;
      this.failures = 0;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.failures = 0;
        this.transition('CLOSED');
      }
    } else {
      // reset failure count on any success in CLOSED
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    if (this.state === 'HALF_OPEN' || this.failures >= this.failureThreshold) {
      this.openedAt = Date.now();
      this.transition('OPEN');
    }
  }

  private transition(next: CircuitState): void {
    const prev = this.state;
    if (prev === next) return;
    this.state = next;
    this.onStateChange?.(prev, next);
  }
}
