// AI subdir database port — thin re-export from @dos/db so the ported
// ai-observation.service can resolve '../../ports/database.port' from
// dist/ai/services/observability/.
export { safeQuery, tenantSchema, emptyResult, query, withTransaction, safeQueryWithClient } from '@dos/db';
export { assertTenantId } from '@dos/db';
