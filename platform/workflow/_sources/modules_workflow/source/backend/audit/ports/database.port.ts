// Workflow-local audit-tree database port — thin re-export from @dos/db so
// the audit-prep / related services under source/backend/audit/ resolve
// '../../../ports/database.port' correctly (relative path points inside
// the audit tree, not the workflow tree).
export { safeQuery, tenantSchema, emptyResult, query, withTransaction, safeQueryWithClient } from '@dos/db';
export { assertTenantId } from '@dos/db';
