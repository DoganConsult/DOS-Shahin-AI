/**
 * Circuit Breaker — canonical enterprise implementation.
 *
 * Pattern: three-state (CLOSED / OPEN / HALF_OPEN) breaker with rolling-window
 * failure counting and configurable open timeout. Used by Temporal activity
 * wrappers and any service-level guard that must fail-fast when a downstream
 * dependency is unhealthy.
 *
 * Semantics:
 *   - CLOSED: operations pass through. Failures increment the failure counter.
 *   - When failures within the rolling window ≥ failureThreshold, transitions
 *     to OPEN and starts the open timer.
 *   - OPEN: operations reject with CircuitBreakerOpenError without invoking fn.
 *   - After openMs elapses, transitions to HALF_OPEN.
 *   - HALF_OPEN: the next operation is a probe. Success → CLOSED + reset.
 *     Failure → OPEN with a fresh timer.
 *
 * Metrics are introspectable via `getMetrics()` / `getAllBreakerMetrics()`.
 */

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerOptions {
  /** Unique breaker name — used as the registry key. */
  name: string;
  /** Consecutive failures required to open the breaker. Default 5. */
  failureThreshold?: number;
  /** Milliseconds the breaker stays OPEN before moving to HALF_OPEN. Default 30 000. */
  openMs?: number;
  /**
   * Alias for `openMs`. Retained because legacy temporal activities pass
   * `recoveryTimeMs`; either value controls the OPEN→HALF_OPEN wait.
   */
  recoveryTimeMs?: number;
  /** Rolling window for failure counting. Default 60 000. */
  rollingWindowMs?: number;
  /** Override the Date.now clock for deterministic tests. */
  now?: () => number;
}

export interface CircuitBreakerMetrics {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  rejected: number;
  lastOpenedAt: number | null;
  lastClosedAt: number | null;
  lastFailureAt: number | null;
}

export class CircuitBreakerOpenError extends Error {
  override readonly name = 'CircuitBreakerOpenError';
  readonly breaker: string;
  constructor(breaker: string) {
    super(`Circuit breaker '${breaker}' is OPEN`);
    this.breaker = breaker;
  }
}

/** Alias retained for backward-compat with legacy call sites. */
export const CircuitOpenError = CircuitBreakerOpenError;
export type CircuitOpenError = CircuitBreakerOpenError;

export class CircuitBreaker {
  readonly name: string;
  private failureThreshold: number;
  private openMs: number;
  private rollingWindowMs: number;
  private now: () => number;

  private state: CircuitState = 'closed';
  private failureTimestamps: number[] = [];
  private successes = 0;
  private rejected = 0;
  private lastOpenedAt: number | null = null;
  private lastClosedAt: number | null = null;
  private lastFailureAt: number | null = null;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = Math.max(1, options.failureThreshold ?? 5);
    const openMs = options.openMs ?? options.recoveryTimeMs ?? 30_000;
    this.openMs = Math.max(1_000, openMs);
    this.rollingWindowMs = Math.max(1_000, options.rollingWindowMs ?? 60_000);
    this.now = options.now ?? (() => Date.now());
  }

  getState(): CircuitState {
    this.tick();
    return this.state;
  }

  isOpen(): boolean {
    return this.getState() === 'open';
  }

  getMetrics(): CircuitBreakerMetrics {
    this.tick();
    this.trimWindow();
    return {
      name: this.name,
      state: this.state,
      failures: this.failureTimestamps.length,
      successes: this.successes,
      rejected: this.rejected,
      lastOpenedAt: this.lastOpenedAt,
      lastClosedAt: this.lastClosedAt,
      lastFailureAt: this.lastFailureAt,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.getState();
    if (state === 'open') {
      this.rejected += 1;
      throw new CircuitBreakerOpenError(this.name);
    }
    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  /** Backward-compat alias for callers using `wrap(fn)`. */
  wrap<T>(fn: () => Promise<T>): Promise<T> {
    return this.execute(fn);
  }

  private tick(): void {
    if (this.state === 'open' && this.lastOpenedAt !== null) {
      if (this.now() - this.lastOpenedAt >= this.openMs) {
        this.state = 'half_open';
      }
    }
  }

  private trimWindow(): void {
    const threshold = this.now() - this.rollingWindowMs;
    if (this.failureTimestamps.length === 0) return;
    if (this.failureTimestamps[0] >= threshold) return;
    this.failureTimestamps = this.failureTimestamps.filter((t) => t >= threshold);
  }

  private recordSuccess(): void {
    this.successes += 1;
    if (this.state === 'half_open' || this.state === 'open') {
      this.state = 'closed';
      this.failureTimestamps = [];
      this.lastClosedAt = this.now();
    }
  }

  private recordFailure(): void {
    this.trimWindow();
    const ts = this.now();
    this.failureTimestamps.push(ts);
    this.lastFailureAt = ts;
    if (this.state === 'half_open' || this.failureTimestamps.length >= this.failureThreshold) {
      this.state = 'open';
      this.lastOpenedAt = ts;
    }
  }
}

// ── Registry of named breakers ──────────────────────────────────────────────

const _registry = new Map<string, CircuitBreaker>();

export function getOrCreateBreaker(options: CircuitBreakerOptions): CircuitBreaker {
  const existing = _registry.get(options.name);
  if (existing) return existing;
  const breaker = new CircuitBreaker(options);
  _registry.set(options.name, breaker);
  return breaker;
}

export function getAllBreakerMetrics(): Record<string, CircuitBreakerMetrics> {
  const out: Record<string, CircuitBreakerMetrics> = {};
  for (const [name, breaker] of _registry) {
    out[name] = breaker.getMetrics();
  }
  return out;
}

export function clearAllBreakersForTesting(): void {
  _registry.clear();
}

// ── Legacy default export ────────────────────────────────────────────────────
// Some older call sites do `import circuitBreaker from '../utils/circuit-breaker'`
// and expect `{ wrap, isOpen }`. Keep a module-level default breaker backing
// that legacy contract without removing it.

export const circuitBreaker = {
  wrap: <T>(fn: () => Promise<T>): Promise<T> =>
    getOrCreateBreaker({ name: 'default' }).wrap(fn),
  isOpen: (): boolean => getOrCreateBreaker({ name: 'default' }).isOpen(),
};

export default circuitBreaker;
