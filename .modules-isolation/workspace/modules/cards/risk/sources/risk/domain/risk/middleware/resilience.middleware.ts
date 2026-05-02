/**
 * Resilience Middleware for risk
 * 
 * Generated automatically by enterprise module standards
 * 
 * @owner risk
 * @since 2026-04-10
 */

import { createResilience } from './resilience.middleware';

export const resilience = createResilience({
  moduleCode: 'risk',
  enableTimeouts: true,
  enableRetries: true,
  enableCircuitBreaker: true,
  enableGracefulDegradation: true,
  enableOutboxPattern: false,
  timeouts: {
    default: 45000, // Longer timeout for risk calculations
    database: 10000,
    external_api: 15000
  },
  retryPolicy: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 15000,
    backoffMultiplier: 2,
    retryableErrors: ['TIMEOUT', 'ECONNRESET', 'ETIMEDOUT'],
    nonRetryableErrors: ['VALIDATION_ERROR', 'UNAUTHORIZED', 'FORBIDDEN']
  },
  circuitBreakerConfig: {
    failureThreshold: 5,
    recoveryTimeoutMs: 60000,
    monitoringPeriodMs: 10000,
    expectedRecoveryTimeMs: 30000
  },
  fallbackStrategies: {
    default: {
      type: 'degraded',
      value: { status: 'degraded', message: 'Risk assessment service operating in degraded mode' }
    }
  }
});
