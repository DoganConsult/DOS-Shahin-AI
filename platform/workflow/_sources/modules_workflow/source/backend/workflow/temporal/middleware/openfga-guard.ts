/**
 * OpenFGA Guard — Fine-grained authorization tuple seeding.
 *
 * Extracted from monolith: /home/Dr-Dogan-AGRC-OS/backend/src/middleware/openfga-guard.ts
 *
 * Feature-flag gated: if OPENFGA_ENABLED is not set, functions return
 * early with audit log entry.
 */

import { logger } from '@dos/platform-core/observability';
import { openfgaClient, openfgaConnected } from '@dos/platform-core';

const OPENFGA_ENABLED = process.env.OPENFGA_ENABLED === 'true';

/**
 * Check if user has relation to object via OpenFGA.
 */
export async function openfgaGuard(
  user: string,
  relation: string,
  object: string,
): Promise<boolean> {
  if (!OPENFGA_ENABLED || !openfgaConnected()) {
    logger.debug('[OpenFGA] Guard bypass — FGA disabled or not connected');
    return !OPENFGA_ENABLED; // bypass if disabled, deny if enabled but disconnected
  }

  const allowed = await openfgaClient.check({ user, relation, object });
  if (!allowed) {
    logger.warn('[OpenFGA] Access denied', { user, relation, object });
  }
  return allowed;
}

/**
 * Seed authorization tuples for a tenant in OpenFGA.
 * Used during tenant provisioning to establish base access relationships.
 */
export async function seedTenantTuples(
  tenantId: string,
  roles: { userId: string; roleCode: string }[] = [],
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
    const tuples = roles.map(r => ({
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
      tenantId, error: (err as Error).message,
    });
    return { seeded: false, tupleCount: 0 };
  }
}

/**
 * Seed module-level authorization tuples for a tenant.
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
    const tuples = moduleCodes.map(code => ({
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
      workspaceId, error: (err as Error).message,
    });
    return { seeded: false, tupleCount: 0 };
  }
}
