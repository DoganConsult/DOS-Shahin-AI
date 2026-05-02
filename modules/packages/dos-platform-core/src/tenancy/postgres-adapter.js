/**
 * Real PlatformTenancy implementation backed by public.tenants.
 *
 * Registered via setTenancyHandler() at service bootstrap so any module
 * or service code calling getProvisionedTenants() from
 * @dos/platform-core/tenancy hits this single source of truth.
 *
 * "Provisioned" = a tenant whose schema exists and is eligible for
 * scheduled jobs / event fanout. We exclude tenants that have been
 * soft-disabled, but include 'onboarding' so the provisioning pipeline
 * itself can run (seeding data for a tenant still in onboarding).
 */
import { safeQuery } from '@dos/db';
import { setTenancyHandler } from './tenancy';
import { logger } from '../observability';
/**
 * Statuses that indicate a tenant has a provisioned schema and is
 * eligible for scheduled jobs / event fanout / cross-tenant iteration.
 *
 * Matches the convention used across the codebase (compliance,
 * reporting, regulatory-delta services all query the same set).
 *
 * Excluded:
 *  - 'registered'           — signup recorded but schema may not exist yet
 *  - 'pending_onboarding'   — same
 *  - 'inactive', 'suspended', 'archived' — disabled, no work to do
 */
const ELIGIBLE_STATUSES = ['active', 'onboarding'];
export class PostgresTenancyAdapter {
    async getProvisionedTenants() {
        try {
            const placeholders = ELIGIBLE_STATUSES.map((_, i) => `$${i + 1}`).join(',');
            const result = await safeQuery(`SELECT tenant_id, settings, status, plan, schema_name
           FROM public.tenants
          WHERE status IN (${placeholders})
          ORDER BY created_at ASC`, [...ELIGIBLE_STATUSES]);
            return result.rows.map((row) => ({
                tenant_id: row.tenant_id,
                settings: {
                    ...(typeof row.settings === 'object' && row.settings !== null ? row.settings : {}),
                    status: row.status,
                    plan: row.plan,
                    schema_name: row.schema_name,
                },
            }));
        }
        catch (err) {
            logger.error('[tenancy-adapter] getProvisionedTenants failed', {
                error: err instanceof Error ? err.message : String(err),
            });
            // Schedulers rely on this list; returning [] is safer than throwing
            // because throwing would kill the job runner. An empty list means
            // "no work this tick" which the scheduler handles correctly.
            return [];
        }
    }
}
let _registered = false;
/**
 * Register the canonical Postgres tenancy adapter with @dos/platform-core.
 * Idempotent — safe to call from multiple entry points.
 */
export function registerTenancyAdapter() {
    if (_registered)
        return;
    setTenancyHandler(new PostgresTenancyAdapter());
    _registered = true;
    logger.info('[tenancy-adapter] Registered PostgresTenancyAdapter with @dos/platform-core/tenancy');
}
//# sourceMappingURL=postgres-adapter.js.map