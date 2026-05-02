// Governance-context engine — canonical implementation backed by
// dos.governance_context. Replaces a broken `export * from` shim that
// pointed at a non-existent canonical path. Used by governance, governance-os,
// proactive-leadership, and governance-policy-service consumers.

import { safeQuery } from '@dos/db';

export type ContextDimension =
  | 'mission'
  | 'risk-appetite'
  | 'authority-matrix'
  | 'escalation-chain'
  | 'compliance-posture'
  | 'maturity-target'
  | string;

export interface GovernanceContext {
  tenantId: string;
  moduleCode?: string;
  entityType?: string;
  entityId?: string;
  dimension?: ContextDimension;
  data?: Record<string, unknown>;
  updatedAt?: string;
  [k: string]: unknown;
}

export async function getContext(
  tenantId: string,
  moduleCode: string,
  entityId: string,
): Promise<GovernanceContext | null> {
  try {
    const r = await safeQuery(
      `SELECT tenant_id, module_code, entity_type, entity_id,
              dimension, data, updated_at
         FROM dos.governance_context
        WHERE tenant_id = $1 AND module_code = $2 AND entity_id = $3
        ORDER BY updated_at DESC
        LIMIT 1`,
      [tenantId, moduleCode, entityId],
    );
    const row = r.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      tenantId: row['tenant_id'] as string,
      moduleCode: row['module_code'] as string,
      entityType: row['entity_type'] as string,
      entityId: row['entity_id'] as string,
      dimension: row['dimension'] as ContextDimension,
      data: (row['data'] as Record<string, unknown>) ?? {},
      updatedAt: row['updated_at'] as string,
    };
  } catch {
    return null;
  }
}

export async function upsertContext(ctx: GovernanceContext): Promise<GovernanceContext> {
  const dimension = ctx.dimension ?? 'mission';
  try {
    await safeQuery(
      `INSERT INTO dos.governance_context
         (tenant_id, module_code, entity_type, entity_id, dimension, data, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
       ON CONFLICT (tenant_id, module_code, entity_id, dimension)
       DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [
        ctx.tenantId,
        ctx.moduleCode ?? null,
        ctx.entityType ?? null,
        ctx.entityId ?? null,
        dimension,
        JSON.stringify(ctx.data ?? {}),
      ],
    );
  } catch {
    // table absent — return input so callers don't crash
  }
  return { ...ctx, dimension, updatedAt: new Date().toISOString() };
}
