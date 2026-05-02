// ============================================
// Temporal Retry Policies
// Per-activity retry configurations
// ============================================

import type { RetryPolicy } from '@temporalio/common';

/** Default retry for idempotent DB operations */
export const RETRY_DEFAULT: RetryPolicy = {
  initialInterval: '2s',
  backoffCoefficient: 2,
  maximumAttempts: 5,
  maximumInterval: '30s',
  nonRetryableErrorTypes: ['VALIDATION_ERROR', 'DUPLICATE_KEY'],
};

/** Conservative retry for schema/migration operations */
export const RETRY_SCHEMA: RetryPolicy = {
  initialInterval: '5s',
  backoffCoefficient: 2,
  maximumAttempts: 3,
  maximumInterval: '60s',
  nonRetryableErrorTypes: ['MIGRATION_CONFLICT'],
};

/** Aggressive retry for LLM calls (transient failures common) */
export const RETRY_LLM: RetryPolicy = {
  initialInterval: '3s',
  backoffCoefficient: 2,
  maximumAttempts: 4,
  maximumInterval: '45s',
  nonRetryableErrorTypes: ['INVALID_API_KEY', 'BUDGET_EXCEEDED'],
};

/** No retry — for non-fatal steps that should not block workflow */
export const RETRY_NONE: RetryPolicy = {
  maximumAttempts: 1,
};

/** SLA timer activities — minimal retry */
export const RETRY_SLA: RetryPolicy = {
  initialInterval: '1s',
  backoffCoefficient: 1.5,
  maximumAttempts: 3,
  maximumInterval: '10s',
};
