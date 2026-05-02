/**
 * Phase 0.5 build-compat shim.
 *
 * The risk module imports from `../../../config/database.js` for `safeQuery`
 * and `tenantSchema`. That legacy path re-exports from `@dos/db`; this shim
 * preserves the import graph without refactoring every call site.
 */
export { safeQuery, tenantSchema, query, getClient, withClient, getPool } from '@dos/db';
