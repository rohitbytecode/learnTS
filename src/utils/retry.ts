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

export type RetryReason =
  | "transient_network"
  | "timeout"
  | "dns"
  | "connection_refused"
  | "server_error"
  | "rate_limit"
  | "database"
  | "deadlock"
  | "validation"
  | "unknown";

export type RetryMetrics = {
  label: string;
  attempt: number;
  totalElapsedMs: number;
  succeeded: boolean;
  reason?: RetryReason;
  error?: string;
};
export type RetryMetricsHook = (metrics: RetryMetrics) => void;

export type DelayStrategy = (attempt: number) => number;

export type RetryOptions = {
    maxAttempts?: number;
    baseDelayMs?: number;
    jitterMs?: number;
    maxDelayMs?: number;
    maxTotalMs?: number;
    shouldRetry?: (err: unknown) => boolean;
    classifyRetryReason?: (err: unknown) => RetryReason;
    delayStrategy?: DelayStrategy; 
    signal?: AbortSignal;
    onMetrics?: RetryMetricsHook;
};

//default classifiers
const TRANSIENT_NETWORK_CODES = new Set([
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ENETUNREACH",
    "EHOSTUNREACH",
    "EAI_AGAIN",
]);

const TRANSIENT_MESSAGE_FRAGMENTS = [
  "socket hang up",
  "network timeout",
  "request timeout",
];

const extractReason = (err: unknown): RetryReason => {
  if (!(err instanceof Error)) return "unknown";

  const code = (err as NodeJS.ErrnoException).code;
  const message = err.message.toLowerCase();
  // Network problem

  if(code !== undefined) {
    if(TRANSIENT_NETWORK_CODES.has(code)) {
    if(code === "ECONNREFUSED") return "connection_refused";
    if(code === "ETIMEDOUT") return "timeout";
    if(code === "ENOTFOUND" || code === "EAI_AGAIN") return "dns";

    return "transient_network";
  }
}

if(TRANSIENT_MESSAGE_FRAGMENTS.some((f) => message.includes(f))){
  return "transient_network";
}

if(message.includes("timeout")) return "timeout";
if(message.includes("rate limit") || message.includes("429"))
  return "rate_limit";
if(message.includes("500") || message.includes("502") || message.includes("503") || message.includes("504")) {
  return "server_error";
}
return "unknown";
};

export const isTransientError = (err: unknown): boolean => {
   const reason = extractReason(err);
   return ["transient_network", "timeout", "dns", "connection_refused", "server_error"]
   .includes(reason);
};

//domain specific classifiers

export const createDbRetryClassifier = (): ((err: unknown) => 
RetryReason) => {
  return (err:unknown): RetryReason => {
    if(!(err instanceof Error)) return "unknown";

    const msg = err.message.toLowerCase();
    const code = (err as NodeJS.ErrnoException).code;

    if(code === "ECONNREFUSED") return "connection_refused";
    if(code === "ETIMEDOUT") return "timeout";

    if(msg.includes("deadlock")) {
      return "database"
    }
    if(msg.includes("connection") || msg.includes("socket")) {
      return "transient_network";
    }
    return extractReason(err);
  };
};

export const createHttpRetryClassifier = (): ((err: unknown) =>
  RetryReason) => {
    return (err: unknown): RetryReason => {
      if (!(err instanceof Error)) return "unknown";

      const status = (err as { status?: number }).status ??
      (err as { response?: { status?: number }}).response?.status;

      if(status!==undefined) {
      if(status === 429) return "rate_limit"
      if(status === 408 || status === 504) return "timeout";
      if(status >= 500) return "server_error";
    }
    return extractReason(err);
  };
};

// delay strategy

const defaultDelayStrategy = (
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number => {
  const maxDelay = Math.min(baseDelayMs * 2 ** (attempt-1), maxDelayMs);
  return Math.random() * maxDelay;
};

//main retry function

const serializeError = (err: unknown): string => 
  err instanceof Error ? err.message: String(err);

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
    classifyRetryReason = extractReason,
    delayStrategy = (attempt) =>
      defaultDelayStrategy(
        attempt,
        baseDelayMs,
        maxDelayMs,
      ),
    signal,
    onMetrics,
  } = options;

  const start = Date.now();
  let lastError: unknown;

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
            reason: undefined,
          });

          return result;
        } catch (err) {
          lastError = err;
          const totalElapsedMs = Date.now() - start;
          const reason = classifyRetryReason(err);

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
              reason,
              error: serializeError(err),
            });
            throw new RetryTimedOutError(label, maxTotalMs);
          }

            if (!shouldRetry(err)) {
                logger.error(
                    { event: `${label}_non_retryable`, 
                    attempt, 
                    totalElapsedMs,
                    reason,
                    error: serializeError(err),
                  },
                    `${label} failed with non-retryable error`
                );
                onMetrics?.({ 
                  label, 
                  attempt, 
                  totalElapsedMs,
                  succeeded: false,
                  reason,
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
              reason,
              error: serializeError(err)
            });
            throw err;
          }

          const delayMs = delayStrategy(attempt)
    
          logger.warn(
            { 
              event: `${label}_retry`, 
              attempt,
              totalElapsedMs, 
              nextRetryMs: Math.round(delayMs),
              reason, 
              error: serializeError(err),
            },
            `${label} failed on attempt ${attempt}, 
            retrying in 
            ${Math.round(delayMs)}ms...`
          );

          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
              signal?.removeEventListener("abort", onAbort);
              resolve();
            }, delayMs);

            const onAbort = () => {
              clearTimeout(timer);
              reject(new RetryAbortedError(label));
            };

            signal?.addEventListener(
              "abort", onAbort, 
              { once: true }
            );
          });
      }
  }
  throw lastError || new Error(`${label} failed after ${maxAttempts} attempts`);
};