// Module operating-state — real impl backed by dos.module_operating_state.
// Replaces a broken `export * from '../../../../platform/dos/modules/...'`
// shim that resolved outside the module's compiled dist tree.

import { safeQuery } from '@dos/db';

export type ModuleState = 'active' | 'degraded' | 'offline' | 'kill_switched' | string;

export interface ModuleStateRecord {
  tenantId: string;
  moduleCode: string;
  state: ModuleState;
  reason?: string | null;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export async function getModuleState(
  tenantId: string,
  moduleCode: string,
): Promise<ModuleStateRecord> {
  try {
    const r = await safeQuery(
      `SELECT tenant_id, module_code, state, reason, updated_at, metadata
         FROM dos.module_operating_state
        WHERE tenant_id = $1 AND module_code = $2
        LIMIT 1`,
      [tenantId, moduleCode],
    );
    const row = r.rows[0] as Record<string, unknown> | undefined;
    if (row) {
      return {
        tenantId: row['tenant_id'] as string,
        moduleCode: row['module_code'] as string,
        state: (row['state'] as ModuleState) ?? 'active',
        reason: (row['reason'] as string) ?? null,
        updatedAt: row['updated_at'] as string,
        metadata: (row['metadata'] as Record<string, unknown>) ?? {},
      };
    }
  } catch { /* table absent → safe default below */ }
  return {
    tenantId,
    moduleCode,
    state: 'active',
    reason: null,
    updatedAt: new Date().toISOString(),
    metadata: {},
  };
}

export async function updateModuleState(
  tenantId: string,
  moduleCode: string,
  state: ModuleState,
  reason?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO dos.module_operating_state
         (tenant_id, module_code, state, reason, metadata, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
       ON CONFLICT (tenant_id, module_code)
       DO UPDATE SET state = EXCLUDED.state,
                     reason = EXCLUDED.reason,
                     metadata = EXCLUDED.metadata,
                     updated_at = NOW()`,
      [tenantId, moduleCode, state, reason ?? null, JSON.stringify(metadata ?? {})],
    );
  } catch { /* table absent */ }
}

export async function getAllModuleStates(tenantId: string): Promise<ModuleStateRecord[]> {
  try {
    const r = await safeQuery(
      `SELECT tenant_id, module_code, state, reason, updated_at, metadata
         FROM dos.module_operating_state
        WHERE tenant_id = $1
        ORDER BY module_code`,
      [tenantId],
    );
    return (r.rows as Record<string, unknown>[]).map((row) => ({
      tenantId: row['tenant_id'] as string,
      moduleCode: row['module_code'] as string,
      state: (row['state'] as ModuleState) ?? 'active',
      reason: (row['reason'] as string) ?? null,
      updatedAt: row['updated_at'] as string,
      metadata: (row['metadata'] as Record<string, unknown>) ?? {},
    }));
  } catch {
    return [];
  }
}

export async function isModuleActive(tenantId: string, moduleCode: string): Promise<boolean> {
  const s = await getModuleState(tenantId, moduleCode);
  return s.state === 'active';
}
