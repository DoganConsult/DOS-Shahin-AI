// Barrel re-export of @dos/db platform surface.
// Pattern matches modules/onboarding/source/config/database.ts;
// module backends dynamically import from '../../../config/database.js'.
export {
  query,
  safeQuery,
  safeQueryWithClient,
  getClient,
  withClient,
  withPoolClient,
  getPool,
  closePool,
  createServicePool,
  closeServicePool,
  tenantSchema,
  tenantScopedQuery,
  getTenantClient,
  withTenantClient,
  assertTenantId,
  withTransaction,
  withTransactionIsolation,
  masterQuery,
  masterGetFirst,
} from '@dos/db';
