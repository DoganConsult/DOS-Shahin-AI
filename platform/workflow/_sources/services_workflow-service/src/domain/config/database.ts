/**
 * workflow-service / config / database
 *
 * Thin adapter onto the canonical `@dos/db` package. Keeps legacy import
 * paths (`../../config/database`) working for Temporal workers and other
 * orchestration code that originated before the `@dos/db` extraction.
 *
 * This file contains no business logic and no fake state — every export
 * delegates to the platform-owned pool implementation.
 */

export {
  pool,
  getPool,
  closePool,
  createServicePool,
  closeServicePool,
  closeAllServicePools,
  query,
  safeQuery,
  safeQueryWithClient,
  tenantSchema,
} from '@dos/db';

export type {
  Pool,
  PoolClient,
  QueryResult,
  QueryResultRow,
  ServicePoolConfig,
} from '@dos/db';
