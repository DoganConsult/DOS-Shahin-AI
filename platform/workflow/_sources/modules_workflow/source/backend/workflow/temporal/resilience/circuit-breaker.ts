// ============================================
// Temporal Circuit Breaker — Re-export barrel
//
// @deprecated Use `utils/circuit-breaker` directly.
// Death date: 2026-07-01
//
// This module re-exports the canonical CircuitBreaker from
// utils/circuit-breaker.ts and adds Temporal-specific convenience
// wrappers (getBreaker, executeWithBreaker).
// ============================================

export {
  CircuitBreaker,
  CircuitBreakerOpenError,
  CircuitOpenError,
  getOrCreateBreaker,
  getAllBreakerMetrics,
} from '../../utils/circuit-breaker';

export type {
  CircuitState,
  CircuitBreakerOptions,
} from '../../utils/circuit-breaker';

import { type CircuitBreakerOptions, getOrCreateBreaker, type CircuitBreaker } from '../../utils/circuit-breaker';

const breakers = new Map<string, CircuitBreaker>();

export function getBreaker(workflowType: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
  let breaker = breakers.get(workflowType);
  if (!breaker) {
    breaker = getOrCreateBreaker({ name: workflowType, ...options });
    breakers.set(workflowType, breaker);
  }
  return breaker;
}

export async function executeWithBreaker<T>(
  workflowType: string,
  fn: () => Promise<T>,
  options?: Partial<CircuitBreakerOptions>,
): Promise<T> {
  const breaker = getBreaker(workflowType, options);
  return breaker.execute(fn);
}
