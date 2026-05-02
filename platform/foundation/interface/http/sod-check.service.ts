import { randomUUID } from 'node:crypto';
import { withTenantClient } from '../../ports/database.port';
import { tenantSchema } from '../../ports/database.port';
import { userMetrics } from '../../infrastructure/observability/metrics';

export interface SodRule {
  rule_id: string;
  tenant_id: string;
  role_a: string;
  role_b: string;
  severity: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SodDecision {
  user_id: string;
  proposed_role: string;
  current_roles: string[];
  has_conflicts: boolean;
  conflicts: SodRule[];
  decision: 'ALLOWED' | 'BLOCKED';
}

export interface CreateSodRuleInput {
  role_a: string;
  role_b: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  status?: 'active' | 'inactive';
}

function track<T>(op: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => userMetrics.observeDb(op, Date.now() - start));
}

function mapRow(row: any, tenantId: string): SodRule {
  const ca: string[] = Array.isArray(row.conflict_a) ? row.conflict_a : [];
  const cb: string[] = Array.isArray(row.conflict_b) ? row.conflict_b : [];
  return {
    rule_id: row.rule_code ?? String(row.id),
    tenant_id: tenantId,
    role_a: ca[0] ?? '',
    role_b: cb[0] ?? '',
    severity: row.severity ?? 'high',
    description: row.description ?? row.rule_name ?? null,
    status: row.enabled === false ? 'inactive' : 'active',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function checkSod(tenantId: string, userId: string, proposedRole: string): Promise<SodDecision> {
  return track('foundation.sod.check', async () =>
    withTenantClient(tenantId, async (c) => {
      const schema = tenantSchema(tenantId);
      const rolesRes = await c.query(
        `SELECT role_code FROM dos.user_role_assignments
          WHERE user_id = $1 AND tenant_id = $2
            AND (revoked_at IS NULL)`,
        [userId, tenantId],
      );
      const currentRoles: string[] = rolesRes.rows.map((r: { role_code: string }) => r.role_code);

      const conflictsRes = await c.query(
        `SELECT * FROM "${schema}".sod_rules
          WHERE enabled = true
            AND ((conflict_a && ARRAY[$1]::text[] AND conflict_b && $2::text[])
              OR (conflict_b && ARRAY[$1]::text[] AND conflict_a && $2::text[]))`,
        [proposedRole, currentRoles.length > 0 ? currentRoles : ['__none__']],
      );
      const conflicts = conflictsRes.rows.map((r: any) => mapRow(r, tenantId));
      return {
        user_id: userId,
        proposed_role: proposedRole,
        current_roles: currentRoles,
        has_conflicts: conflicts.length > 0,
        conflicts,
        decision: conflicts.length > 0 ? 'BLOCKED' : 'ALLOWED',
      };
    }),
  );
}

export async function listSodRules(tenantId: string): Promise<SodRule[]> {
  return track('foundation.sod.rules', async () =>
    withTenantClient(tenantId, async (c) => {
      const schema = tenantSchema(tenantId);
      try {
        const r = await c.query(
          `SELECT * FROM "${schema}".sod_rules ORDER BY created_at DESC`,
        );
        return r.rows.map((row: any) => mapRow(row, tenantId));
      } catch (err: any) {
        // 42P01 = undefined_table, 3F000 = invalid_schema_name. A platform-
        // scoped principal (no tenant schema provisioned) has no SoD rules.
        if (err?.code === '42P01' || err?.code === '3F000') return [];
        throw err;
      }
    }),
  );
}

export async function createSodRule(tenantId: string, input: CreateSodRuleInput, _actorId: string): Promise<SodRule> {
  const ruleCode = `SOD-${randomUUID().slice(0, 8).toUpperCase()}`;
  return track('foundation.sod.createRule', async () =>
    withTenantClient(tenantId, async (c) => {
      const schema = tenantSchema(tenantId);
      const r = await c.query(
        `INSERT INTO "${schema}".sod_rules
           (tenant_id, rule_code, rule_name, description, severity,
            conflict_a, conflict_b, scope, action, enabled, metadata, created_at, updated_at)
         VALUES ($1::uuid, $2, $3, $4, $5, $6::text[], $7::text[], 'tenant', 'block',
                 COALESCE($8, true), '{}'::jsonb, NOW(), NOW())
         RETURNING *`,
        [
          tenantId,
          ruleCode,
          input.description ?? `${input.role_a} vs ${input.role_b}`,
          input.description ?? null,
          input.severity ?? 'high',
          [input.role_a],
          [input.role_b],
          input.status ? input.status === 'active' : true,
        ],
      );
      return mapRow(r.rows[0], tenantId);
    }),
  );
}

export async function deleteSodRule(tenantId: string, id: string): Promise<boolean> {
  return track('foundation.sod.deleteRule', async () =>
    withTenantClient(tenantId, async (c) => {
      const schema = tenantSchema(tenantId);
      const r = await c.query(
        `DELETE FROM "${schema}".sod_rules
          WHERE rule_code = $1 OR id::text = $1
          RETURNING id`,
        [id],
      );
      return r.rows.length > 0;
    }),
  );
}
