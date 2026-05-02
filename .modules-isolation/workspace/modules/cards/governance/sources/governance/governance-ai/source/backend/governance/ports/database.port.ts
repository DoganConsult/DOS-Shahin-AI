// Backend-level database port barrel — used by services that live at
// modules/<mod>/source/backend/<sub>/... importing via `../../ports/database.port`.
export { query, safeQuery, getPool, tenantSchema, assertTenantId, emptyResult, withClient, withTenantClient, getTenantClient } from '@dos/db';
