/**
 * workflow-service / middleware / openfga-guard
 *
 * OpenFGA seeding + check helpers used by the Temporal provisioning
 * activities to establish base authorization relationships for a newly
 * provisioned tenant/workspace.
 *
 * Feature-flag gated: if `OPENFGA_ENABLED` is not set, every function
 * returns early with a log entry. Production enforcement is controlled by
 * that env var at the service boundary — when the flag is true and the
 * client is not connected, seeding operations fail loud (return
 * `{ seeded: false }`) rather than silently no-opping.
 */
import { logger } from '@dos/platform-core/observability';
import { openfgaClient, openfgaConnected } from '@dos/platform-core';

const OPENFGA_ENABLED = process.env.OPENFGA_ENABLED === 'true';

/**
 * Check whether `user` has `relation` to `object` via OpenFGA. Returns
 * `true` (bypass) when FGA is disabled by env; returns `false` when the
 * flag is on but the client is not connected (fail closed).
 */
export async function openfgaGuard(
  user: string,
  relation: string,
  object: string,
): Promise<boolean> {
  if (!OPENFGA_ENABLED) {
    logger.debug('[OpenFGA] Guard bypass — FGA disabled', { user, relation, object });
    return true;
  }
  if (!openfgaConnected()) {
    logger.warn('[OpenFGA] Guard fail-closed — enabled but not connected', {
      user, relation, object,
    });
    return false;
  }
  const allowed = await openfgaClient.check({ user, relation, object });
  if (!allowed) {
    logger.warn('[OpenFGA] Access denied', { user, relation, object });
  }
  return allowed;
}

/**
 * Seed role tuples for the tenant (organization) during provisioning.
 * Each role maps to an `organization:<tenantId>` object and a `user:<userId>`
 * actor in OpenFGA.
 */
export async function seedTenantTuples(
  tenantId: string,
  roles: Array<{ userId: string; roleCode: string }> = [],
): Promise<{ seeded: boolean; tupleCount: number }> {
  if (!OPENFGA_ENABLED) {
    logger.debug('[OpenFGA] Skipping seedTenantTuples — disabled', { tenantId });
    return { seeded: false, tupleCount: 0 };
  }
  if (!openfgaConnected()) {
    logger.warn('[OpenFGA] Cannot seed tenant tuples — not connected', { tenantId });
    return { seeded: false, tupleCount: 0 };
  }
  try {
    const tuples = roles.map((r) => ({
      user: `user:${r.userId}`,
      relation: r.roleCode,
      object: `organization:${tenantId}`,
    }));
    const ok = await openfgaClient.write(tuples);
    if (ok) {
      logger.info('[OpenFGA] Tenant tuples seeded', { tenantId, count: tuples.length });
      return { seeded: true, tupleCount: tuples.length };
    }
    return { seeded: false, tupleCount: 0 };
  } catch (err) {
    logger.warn('[OpenFGA] seedTenantTuples failed', {
      tenantId,
      error: (err as { message?: string })?.message ?? String(err),
    });
    return { seeded: false, tupleCount: 0 };
  }
}

/**
 * Seed module tuples for the workspace during provisioning. Each module
 * code maps to a `module:<code>` object and a `workspace:<workspaceId>`
 * actor in OpenFGA.
 */
export async function seedModuleTuples(
  workspaceId: string,
  moduleCodes: string[] = [],
): Promise<{ seeded: boolean; tupleCount: number }> {
  if (!OPENFGA_ENABLED) {
    logger.debug('[OpenFGA] Skipping seedModuleTuples — disabled', { workspaceId });
    return { seeded: false, tupleCount: 0 };
  }
  if (!openfgaConnected()) {
    logger.warn('[OpenFGA] Cannot seed module tuples — not connected', { workspaceId });
    return { seeded: false, tupleCount: 0 };
  }
  try {
    const tuples = moduleCodes.map((code) => ({
      user: `workspace:${workspaceId}`,
      relation: 'workspace',
      object: `module:${code}`,
    }));
    const ok = await openfgaClient.write(tuples);
    if (ok) {
      logger.info('[OpenFGA] Module tuples seeded', { workspaceId, count: tuples.length });
      return { seeded: true, tupleCount: tuples.length };
    }
    return { seeded: false, tupleCount: 0 };
  } catch (err) {
    logger.warn('[OpenFGA] seedModuleTuples failed', {
      workspaceId,
      error: (err as { message?: string })?.message ?? String(err),
    });
    return { seeded: false, tupleCount: 0 };
  }
}
