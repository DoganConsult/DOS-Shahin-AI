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
