export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type CircuitBreakerOptions = {
  name: string;
  failureThreshold?: number;
  successThreshold?: number;
  openDurationMs?: number;
  timeoutMs?: number;
  onStateChange?: (prev: CircuitState, next: CircuitState) => void;
};

export class CircuitBreakerOpenError extends Error {}
