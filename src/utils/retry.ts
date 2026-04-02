import { on } from "node:cluster";
import { logger } from "./logger";

export class RetryAbortedError extends Error {
    constructor(label: string) {
        super(`${label} retry aborted: shutdown in progress`);
        this.name = "RetryAbortedError";
    }
}

export type RetryOptions = {
    maxAttempts?: number;
    baseDelayMs?: number;
    jitterMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (err: unknown) => boolean;
    signal?: AbortSignal;
};

export const isTransientError = (err: unknown): boolean => {
    if (!(err instanceof Error)) return false;

    const transientMassages = [
        "ECONNREFUSED",
        "ECONNRESET",
        "ETIMEOUT",
        "ENOTFOUND",
        "ENETUNREACH",
        "EHOSTUNREACH",
        "EAI_AGAIN",
        "socket hang up",
        "network timeout",
    ];

    return transientMassages.some(
        (msg) => 
        (err as NodeJS.ErrnoException).code === msg ||
        err.message.includes(msg)
    );
};

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
    shouldRetry = isTransientError,
    signal,
  } = options;
    for (let attempt = 1; attempt<= maxAttempts; attempt++) {

        if(signal?.aborted) {
            throw new RetryAbortedError(label);
        }

        try {
          return await fn();
        } catch (err) {

            if (!shouldRetry(err)) {
                logger.error(
                    { event: `${label}_non_retryable`, attempt, error: err},
                    `${label} failed with non-retryable error`
                );
                throw err;
            }
            
          const isLastAttempt = attempt === maxAttempts;
          if (isLastAttempt) {
            logger.fatal(
              { event: `${label}_failed`, attempt, error: err },
              `${label} failed after ${maxAttempts} attempts`
            );
            throw err;
           }

           const delayMs = computeDelay(attempt, baseDelayMs, jitterMs, maxDelayMs);
    
          logger.warn(
            { event: `${label}_retry`, attempt, nextRetryMs: Math.round(delayMs), error: err },
            `${label} failed on attempt ${attempt}, retrying in ${Math.round(delayMs)}ms...`
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
              "abort", onAbort, { once: true });
          });
        }
      }
      throw new Error(`${label} failed after ${maxAttempts} attempts`);
    };