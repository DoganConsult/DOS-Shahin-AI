import { logger } from '../../ports/logger.port';
import { safeQuery } from "@dos/db";

// ============================================
// LLM Retry Strategy — Enterprise Grade
// Exponential backoff with jitter, circuit-breaker-aware,
// error-classified retry logic for all LLM calls
// ============================================

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
  retryableStatusCodes: number[];
  retryableErrorPatterns: string[];
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

/** Detailed retryability classification returned by shouldRetryDetailed(). */
export interface RetryClassification {
  retryable: boolean;
  waitMs: number;
  reason: string;
}

/** Circuit breaker state exposed by getCircuitBreakerStatus(). */
export interface CircuitBreakerStatus {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  windowStartMs: number;
  openUntilMs: number | null;
  /** How many requests have been rejected while the breaker was open. */
  rejectedCount: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitterMs: 500,
  retryableStatusCodes: [429, 500, 502, 503, 504, 529],
  retryableErrorPatterns: [
    'rate_limit', 'overloaded', 'timeout', 'ECONNRESET', 'ECONNREFUSED',
    'ETIMEDOUT', 'socket hang up', 'network', 'temporarily unavailable',
  ],
};

// Provider-specific retry configs
export const PROVIDER_RETRY_CONFIGS: Record<string, Partial<RetryConfig>> = {
  anthropic: { maxRetries: 3, baseDelayMs: 2000, retryableStatusCodes: [429, 500, 529] },
  openai: { maxRetries: 3, baseDelayMs: 1000, retryableStatusCodes: [429, 500, 502, 503] },
  groq: { maxRetries: 2, baseDelayMs: 500, retryableStatusCodes: [429, 500, 503] },
  gemini: { maxRetries: 3, baseDelayMs: 1500, retryableStatusCodes: [429, 500, 503] },
};

// ---------------------------------------------------------------------------
// Circuit Breaker — in-memory, per-process
// Opens after FAILURE_THRESHOLD failures within WINDOW_MS, stays open for
// OPEN_DURATION_MS, then transitions to half-open (allows one probe call).
// ---------------------------------------------------------------------------
const CB_FAILURE_THRESHOLD = 5;
const CB_WINDOW_MS = 60_000;        // 60-second sliding window
const CB_OPEN_DURATION_MS = 30_000; // fail-fast for 30 seconds

/** Internal mutable circuit breaker state. */
const circuitBreaker = {
  failures: [] as number[],          // timestamps of recent failures
  openUntilMs: 0,                    // 0 = breaker is closed/half-open
  rejectedCount: 0,
};

/**
 * Record a failure in the circuit breaker window.
 * If the threshold is exceeded the breaker opens.
 */
function cbRecordFailure(): void {
  const now = Date.now();
  circuitBreaker.failures.push(now);
  // Prune failures outside the sliding window
  circuitBreaker.failures = circuitBreaker.failures.filter(ts => now - ts < CB_WINDOW_MS);

  if (circuitBreaker.failures.length >= CB_FAILURE_THRESHOLD) {
    circuitBreaker.openUntilMs = now + CB_OPEN_DURATION_MS;
    logger.error(
      `[llm-retry:circuit-breaker] OPEN — ${circuitBreaker.failures.length} failures in ${CB_WINDOW_MS / 1000}s window. ` +
      `Failing fast for ${CB_OPEN_DURATION_MS / 1000}s.`
    );
  }
}

/** Record a success — resets the breaker to closed. */
function cbRecordSuccess(): void {
  circuitBreaker.failures = [];
  circuitBreaker.openUntilMs = 0;
}

/**
 * Check whether the circuit breaker allows a call right now.
 * Returns true if the call should proceed, false if it should be rejected.
 */
function cbAllow(): boolean {
  const now = Date.now();
  if (circuitBreaker.openUntilMs === 0) return true; // closed
  if (now >= circuitBreaker.openUntilMs) {
    // Transition to half-open: allow a single probe
    return true;
  }
  // Breaker is open — reject
  circuitBreaker.rejectedCount++;
  return false;
}

/**
 * Return the current circuit breaker status for observability.
 */
export function getCircuitBreakerStatus(): CircuitBreakerStatus {
  const now = Date.now();
  // Prune stale entries for an accurate count
  const recentFailures = circuitBreaker.failures.filter(ts => now - ts < CB_WINDOW_MS);

  let state: CircuitBreakerStatus['state'] = 'closed';
  if (circuitBreaker.openUntilMs > 0) {
    state = now >= circuitBreaker.openUntilMs ? 'half-open' : 'open';
  }

  return {
    state,
    failureCount: recentFailures.length,
    windowStartMs: recentFailures.length > 0 ? recentFailures[0] : 0,
    openUntilMs: circuitBreaker.openUntilMs > 0 ? circuitBreaker.openUntilMs : null,
    rejectedCount: circuitBreaker.rejectedCount,
  };
}

/**
 * Classify whether an error is retryable based on status code and error message patterns.
 */
export function shouldRetry(error: unknown, config: RetryConfig = DEFAULT_RETRY_CONFIG): boolean {
  return shouldRetryDetailed(error, config).retryable;
}

/**
 * Detailed retryability classification.
 * Returns { retryable, waitMs, reason } so callers can inspect the rationale.
 *
 * Non-retryable status codes (400, 401, 403, 404, 422) are never retried —
 * these indicate client errors that a retry cannot fix.
 */
export function shouldRetryDetailed(error: unknown, config: RetryConfig = DEFAULT_RETRY_CONFIG): RetryClassification {
  if (!error) return { retryable: false, waitMs: 0, reason: 'no error provided' };

  const err = error as Record<string, unknown>;
  const response = err.response as Record<string, unknown> | undefined;
  const status: number | undefined = (err.status || err.statusCode || response?.status) as number | undefined;

  // Explicitly non-retryable client errors
  const nonRetryableStatuses = [400, 401, 403, 404, 422];
  if (status && nonRetryableStatuses.includes(status)) {
    return { retryable: false, waitMs: 0, reason: `client error ${status} — not retryable` };
  }

  // Check HTTP status code against retryable list
  if (status && config.retryableStatusCodes.includes(status)) {
    const retryAfterMs = extractRetryAfter(error as Record<string, unknown>);
    const waitMs = retryAfterMs || config.baseDelayMs;
    return { retryable: true, waitMs, reason: `retryable status ${status}` };
  }

  const message = ((error instanceof Error ? error.message : String(error)) || '').toLowerCase();
  for (const pattern of config.retryableErrorPatterns) {
    if (message.includes(pattern.toLowerCase())) {
      return { retryable: true, waitMs: config.baseDelayMs, reason: `error pattern match: ${pattern}` };
    }
  }

  const errInner = err.error as Record<string, unknown> | undefined;
  if (errInner?.type === 'overloaded_error') {
    return { retryable: true, waitMs: config.baseDelayMs * 2, reason: 'Anthropic overloaded_error' };
  }
  if (errInner?.type === 'rate_limit_error') {
    const retryAfterMs = extractRetryAfter(err);
    return { retryable: true, waitMs: retryAfterMs || config.baseDelayMs * 3, reason: 'Anthropic rate_limit_error' };
  }

  return { retryable: false, waitMs: 0, reason: 'error does not match any retryable pattern' };
}

/**
 * Calculate delay for the next retry attempt with exponential backoff and jitter.
 */
export function calculateDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const jitter = Math.random() * config.jitterMs;
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

/**
 * Extract rate limit retry-after header if available.
 */
function extractRetryAfter(error: Record<string, unknown>): number | null {
  const headers = error.headers as Record<string, string> | undefined;
  const responseHeaders = (error.response as Record<string, unknown> | undefined)?.headers as Record<string, string> | undefined;
  const retryAfter = headers?.['retry-after'] || responseHeaders?.['retry-after'];
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) return seconds * 1000;
  }
  return null;
}

/**
 * Execute a function with exponential backoff retry logic.
 * Enterprise-grade: circuit breaker integration, rate limit header awareness,
 * per-provider configs, and callback hooks.
 *
 * Circuit breaker: if 5+ failures occur within a 60-second window the breaker
 * opens and all subsequent calls fail fast for 30 seconds. After the cool-down
 * period a single probe call is allowed (half-open). A successful probe resets
 * the breaker to closed.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>,
  provider?: string
): Promise<T> {
  // --- Circuit breaker gate ---
  if (!cbAllow()) {
    const status = getCircuitBreakerStatus();
    const remainingMs = (status.openUntilMs ?? 0) - Date.now();
    const err = new Error(
      `[llm-retry:circuit-breaker] Circuit breaker is OPEN. Failing fast. ` +
      `Resets in ${Math.max(0, Math.round(remainingMs / 1000))}s. ` +
      `(${status.failureCount} failures in window, ${status.rejectedCount} rejected)`
    );

    (err as Record<string, unknown>).circuitBreakerOpen = true;
    throw err;
  }

  const providerDefaults = provider ? PROVIDER_RETRY_CONFIGS[provider] : {};
  const mergedConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...providerDefaults, ...config };

  let lastError: unknown;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      const result = await fn();
      // Success — reset circuit breaker
      cbRecordSuccess();
      return result;
    } catch (error: unknown) {
      lastError = error;

      // Record failure for circuit breaker tracking
      cbRecordFailure();

      // Don't retry on the last attempt
      if (attempt >= mergedConfig.maxRetries) break;

      // Check if error is retryable
      const classification = shouldRetryDetailed(error, mergedConfig);
      if (!classification.retryable) {
        logger.warn(`[llm-retry] Non-retryable error: ${classification.reason}`);
        break;
      }

      // If circuit breaker just opened mid-retry, bail out
      if (!cbAllow()) {
        logger.error('[llm-retry] Circuit breaker opened during retry sequence — aborting.');
        break;
      }

      // Calculate delay — prefer retry-after header, then classification hint, then exponential
      const retryAfterMs = extractRetryAfter(error as Record<string, unknown>);
      const delayMs = retryAfterMs || calculateDelay(attempt, mergedConfig);

      // Call onRetry hook if provided
      if (mergedConfig.onRetry) {
        mergedConfig.onRetry(attempt + 1, error, delayMs);
      }

      // Log retry attempt
      const status = ((error as Record<string, unknown>)?.status) || ((error as Record<string, unknown>)?.statusCode) || 'any';
      logger.warn(
        `[llm-retry] Attempt ${attempt + 1}/${mergedConfig.maxRetries} failed ` +
        `(status=${status}, reason=${classification.reason}). Retrying in ${delayMs}ms...`
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Wrap a function with retry logic and metrics tracking.
 */
export function withRetry<T>(
  fn: () => Promise<T>,
  options?: { provider?: string; config?: Partial<RetryConfig>; label?: string }
): Promise<T> {
  const startMs = Date.now();
  return retryWithBackoff(fn, {
    ...options?.config,
    onRetry: (attempt, error, delayMs) => {
      logger.warn(`[llm-retry:${options?.label || 'unnamed'}] Retry ${attempt}, delay=${delayMs}ms, elapsed=${Date.now() - startMs}ms`);
      options?.config?.onRetry?.(attempt, error, delayMs);
    },
  }, options?.provider);
}
