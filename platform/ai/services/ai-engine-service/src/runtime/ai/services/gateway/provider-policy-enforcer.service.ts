import { logger } from '../../ports/logger.port';
// ============================================
// AGRC-OS — Provider Policy Runtime Enforcer
// Wraps AI calls with provider-policy matrix checks
// + circuit breaker health. Enables graceful degradation
// when LLM providers are unavailable.
// ============================================

import {
  getTaskFallbackBehavior, isDeterministicTask,
  type FallbackBehavior,
} from '../../ports/platform.port';
import { aiCircuitBreaker } from '../governance/circuit/ai-circuit-breaker.service';
import { safeQuery } from "@dos/db";

export interface PolicyEnforcementResult {
  allowed: boolean;
  fallbackMode: FallbackBehavior | 'proceed';
  reason?: string;
}

/**
 * Check whether an AI call is allowed for the given task key.
 * Returns the enforcement decision + fallback mode if blocked.
 */
export function checkProviderPolicy(taskKey: string, tenantId?: string): PolicyEnforcementResult {
  // Deterministic tasks never need AI — always allowed
  if (isDeterministicTask(taskKey)) {
    return { allowed: true, fallbackMode: 'proceed' };
  }

  // Check circuit breaker state
  const cbResult = aiCircuitBreaker.canCall(tenantId);
  if (cbResult.allowed) {
    return { allowed: true, fallbackMode: 'proceed' };
  }

  // Provider is down — apply fallback policy from matrix
  const fallback = getTaskFallbackBehavior(taskKey);
  return {
    allowed: false,
    fallbackMode: fallback,
    reason: cbResult.reason || 'AI provider unavailable',
  };
}

/**
 * Wrap an AI call with provider policy enforcement.
 * - If provider is healthy: runs aiHandler
 * - If provider is down:
 *   - graceful_degrade → runs fallbackHandler (or returns null)
 *   - local_only → runs aiHandler (LLM router should redirect to Ollama)
 *   - skip_silently → returns null
 *   - never → runs aiHandler (deterministic tasks, should not reach here)
 */
export async function withProviderPolicy<T>(
  taskKey: string,
  tenantId: string,
  aiHandler: () => Promise<T>,
  fallbackHandler?: () => Promise<T | null>,
): Promise<T | null> {
  const policy = checkProviderPolicy(taskKey, tenantId);

  if (policy.allowed) {
    return aiHandler();
  }

  logger.info(`[ProviderPolicy] Task "${taskKey}" blocked: ${policy.reason}. Fallback: ${policy.fallbackMode}`);

  switch (policy.fallbackMode) {
    case 'graceful_degrade':
      return fallbackHandler ? fallbackHandler() : null;

    case 'local_only':
      // LLM router handles Ollama routing via OLLAMA_BASE_URL env
      // Set hint so downstream knows to prefer local provider
      process.env._AGRC_PREFER_LOCAL = 'true';
      try {
        return await aiHandler();
      } finally {
        delete process.env._AGRC_PREFER_LOCAL;
      }

    case 'skip_silently':
      return null;

    case 'never':
      // Deterministic — should not reach here, but run handler anyway
      return aiHandler();

    default:
      return null;
  }
}
