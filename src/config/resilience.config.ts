import { PipelineOptions } from '@/resilience/resiliencePipeline';
import { env } from '@/config/env';

// Safe env parsing

function envInt(key: string, defaultValue: number): number {
  const raw = env[key as keyof typeof env];
  if (raw === undefined || raw === '') return defaultValue;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `[resilienceConfig] env.${key}="${raw}" is not a valid positive integer (expected > 0)`,
    );
  }
  return Math.floor(parsed);
}

// Config factory

/**
 * Build a full PipelineOptions block for a named integration.
 * The `name` field on circuitBreaker and bulkhead is always derived
 * from `label` so there is exactly one source of truth per integration.
 */

function makeConfig(
  label: string,
  opts: {
    retry: NonNullable<PipelineOptions['retry']>;
    circuitBreaker: Omit<NonNullable<PipelineOptions['circuitBreaker']>, 'name'>;
    bulkhead: Omit<NonNullable<PipelineOptions['bulkhead']>, 'name'>;
  },
): PipelineOptions {
  return {
    label,
    retry: opts.retry,
    circuitBreaker: { name: label, ...opts.circuitBreaker },
    bulkhead: { name: label, ...opts.bulkhead },
  };
}
