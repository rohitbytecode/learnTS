import { logger } from "./logger";

export class RetryAbortedError extends Error {
    constructor(label: string) {
        super(`${label} retry aborted: shutdown in progress`);
        this.name = "RetryAbortedError";
    }
}

export class RetryTimedOutError extends Error {
  constructor(label: string, maxTotalMs: number) {
    super(`${label} retry timed out after ${maxTotalMs}ms`);
    this.name = "RetryTimedOutError";
  }
}

export type RetryMetrics = {
  label: string;
  attempt: number;
  totalElapsedMs: number;
  succeeded: boolean;
  error?: string;
};
export type RetryMetricsHook = (metrics: RetryMetrics) => void;

export type RetryOptions = {
    maxAttempts?: number;
    baseDelayMs?: number;
    jitterMs?: number;
    maxDelayMs?: number;
    maxTotalMs?: number;
    shouldRetry?: (err: unknown) => boolean;
    signal?: AbortSignal;
    onMetrics?: RetryMetricsHook;
};

const TRANSIENT_CODES = new Set([
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEOUT",
    "ENOTFOUND",
    "ENETUNREACH",
    "EHOSTUNREACH",
    "EAI_AGAIN",
]);

const TRANSIENT_MESSAGE_FRAGMENTS = [
  "socket hang up",
  "network timeout",
];

export const isTransientError = (err: unknown): boolean => {
    if (!(err instanceof Error)) return false;

    const code = (err as NodeJS.ErrnoException).code;
    if (code !== undefined && TRANSIENT_CODES.has(code)) return true;

    return TRANSIENT_MESSAGE_FRAGMENTS.some((fragment) =>
      err.message.includes(fragment)
    );
};

const serializeError = (err: unknown): string => 
  err instanceof Error ? err.message: String(err);

const computeDelay = (
  attempt: number,
  baseDelayMs: number,
  jitterMs: number,
  maxDelayMs: number
): number => {
  const jitter = Math.random() * jitterMs;
  return Math.min(baseDelayMs * 2 ** (attempt-1) + jitter, maxDelayMs);
};

export const withRetry = async <T>(
    fn: () => Promise<T>,
    label: string,
    options: RetryOptions = {},
): Promise<T> => {
  const {
    maxAttempts= 3,
    baseDelayMs= 1000,
    jitterMs = 0,
    maxDelayMs = 30_000,
    maxTotalMs,
    shouldRetry = isTransientError,
    signal,
    onMetrics,
  } = options;

  const start = Date.now();

    for (let attempt = 1; attempt<= maxAttempts; attempt++) {

        if(signal?.aborted) {
            throw new RetryAbortedError(label);
        }

        try {
          const result = await fn();
          onMetrics?.({
            label,
            attempt,
            totalElapsedMs: Date.now() -start,
            succeeded: true,
          });

          return result;
        } catch (err) {

          const totalElapsedMs = Date.now() - start;

          if(maxTotalMs !== undefined && totalElapsedMs > maxTotalMs) {
            logger.fatal(
              {
                event: `${label}_timeout`,
                attempt,
                totalElapsedMs,
                error: serializeError(err),
              },
              `${label} exceeded total timeout of ${maxTotalMs}ms`
            );
            onMetrics?.({ 
              label, 
              attempt, 
              totalElapsedMs,
              succeeded: false,
              error: serializeError(err),
            });
            throw new RetryTimedOutError(label, maxTotalMs);
          }

            if (!shouldRetry(err)) {
                logger.error(
                    { event: `${label}_non_retryable`, 
                    attempt, 
                    totalElapsedMs,
                    error: serializeError(err),
                  },
                    `${label} failed with non-retryable error`
                );
                onMetrics?.({ 
                  label, 
                  attempt, 
                  totalElapsedMs,
                  succeeded: false,
                  error: serializeError(err)
                });
                throw err;
            }
            
          const isLastAttempt = attempt === maxAttempts;
          if (isLastAttempt) {
            logger.fatal(
              { 
                event: `${label}_failed`, 
                attempt,
                totalElapsedMs, 
                error: serializeError(err)
              },
              `${label} failed after ${maxAttempts} attempts`
            );
            onMetrics?.({
              label,
              attempt,
              totalElapsedMs,
              succeeded: false,
              error: serializeError(err)
            });
            throw err;
          }

          const delayMs = computeDelay(
            attempt, 
            baseDelayMs, 
            jitterMs, 
            maxDelayMs
          );
    
          logger.warn(
            { 
              event: `${label}_retry`, 
              attempt,
              totalElapsedMs, 
              nextRetryMs: Math.round(delayMs), 
              error: serializeError(err),
            },
            `${label} failed on attempt ${attempt}, 
            retrying in 
            ${Math.round(delayMs)}ms...`
          );

          await new Promise<void>((resolve, reject) => {
            const onAbort = () => {
              clearTimeout(timer);
              reject(new RetryAbortedError(label));
            };

            const timer = setTimeout(() => {
              signal?.removeEventListener("abort", onAbort);
              resolve();
            }, delayMs);

            signal?.addEventListener(
              "abort", onAbort, 
              { once: true }
            );
          });
      }
  }
  throw new Error(`${label} failed after ${maxAttempts} attempts`);
};