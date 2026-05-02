// Standard circuit breaker factory using opossum. Replaces the hand-rolled
// Wave 5.3 breaker around OpenRouter / Ollama / external HTTP calls.
//
// Usage:
//   import { createBreaker } from '@dos/service-bootstrap/circuit-breaker';
//   const llmCall = createBreaker('openrouter', async (prompt) => { ... }, {
//     timeout: 30_000,
//     errorThresholdPercentage: 50,
//   });
//   const result = await llmCall.fire(prompt);
//
// Metrics on state transitions automatically flow into Prometheus via the
// existing recordCircuitBreakerState hook in createServiceServer.

import CircuitBreaker from 'opossum';
import { recordCircuitBreakerState } from '@dos/platform-core/observability';

const _registry = new Map<string, CircuitBreaker>();

export interface BreakerOptions extends CircuitBreaker.Options {
  /** Optional fallback invoked when the breaker is open / call fails. */
  fallback?: (...args: unknown[]) => unknown;
}

export function createBreaker<TArgs extends unknown[], TResult>(
  name: string,
  action: (...args: TArgs) => Promise<TResult>,
  opts: BreakerOptions = {},
): CircuitBreaker<TArgs, TResult> {
  const existing = _registry.get(name);
  if (existing) return existing as CircuitBreaker<TArgs, TResult>;

  const breaker = new CircuitBreaker(action as (...args: unknown[]) => Promise<unknown>, {
    timeout: opts.timeout ?? 30_000,
    errorThresholdPercentage: opts.errorThresholdPercentage ?? 50,
    resetTimeout: opts.resetTimeout ?? 30_000,
    rollingCountTimeout: opts.rollingCountTimeout ?? 10_000,
    rollingCountBuckets: opts.rollingCountBuckets ?? 10,
    name,
    ...opts,
  }) as CircuitBreaker<TArgs, TResult>;

  if (opts.fallback) breaker.fallback(opts.fallback);

  breaker.on('open',     () => recordCircuitBreakerState(name, 'open'));
  breaker.on('halfOpen', () => recordCircuitBreakerState(name, 'half-open'));
  breaker.on('close',    () => recordCircuitBreakerState(name, 'closed'));

  _registry.set(name, breaker as unknown as CircuitBreaker);
  return breaker;
}

export function getBreaker(name: string): CircuitBreaker | undefined {
  return _registry.get(name);
}

export function listBreakerStates(): Record<string, { state: string; stats: CircuitBreaker.Stats }> {
  const out: Record<string, { state: string; stats: CircuitBreaker.Stats }> = {};
  for (const [name, b] of _registry) {
    out[name] = {
      state: b.opened ? 'open' : b.halfOpen ? 'half-open' : 'closed',
      stats: b.stats,
    };
  }
  return out;
}
