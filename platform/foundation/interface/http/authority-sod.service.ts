/**
 * Foundation — Authority Matrix + SoD Engine (G2).
 *
 * Two responsibilities in one service module (split internally):
 *
 *  AUTHORITY MATRIX
 *    - List authority kinds (catalog)
 *    - Get the authority limits for a position / user
 *    - Resolve "can user X approve action Y at amount Z?"
 *
 *  SoD ENGINE
 *    - Load active rules (platform default + tenant override)
 *    - Check a proposed assignment / approval BEFORE write
 *    - Record violations; track resolution lifecycle
 *
 * Both surfaces are exposed via routes/authority-sod.routes.ts.
 */
import { withTenantClient } from '../../ports/database.port';
import { userMetrics } from '../../infrastructure/observability/metrics';

export interface AuthorityKind {
  authority_kind: string;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  is_monetary: boolean;
  default_unit: string | null;
  is_active: boolean;
}

export interface PositionAuthority {
  id: string;
  tenant_id: string;
  position_id: string;
  authority_kind: string;
  monetary_limit: string | null;
  monetary_unit: string | null;
  qualifications: string[] | null;
  conditions: Record<string, unknown>;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
}

export interface SodRule {
  rule_code: string;
  tenant_id: string | null;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  rule_kind:
    | 'mutually_exclusive_roles'
    | 'blocked_role_pair'
    | 'blocked_authority_pair'
    | 'time_separation'
    | 'approval_self_block'
    | 'committee_self_block';
  parameters: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_enforcing: boolean;
  remediation_hint_en: string | null;
  remediation_hint_ar: string | null;
  is_active: boolean;
}

export interface SodViolation {
  id: string;
  tenant_id: string;
  rule_code: string;
  user_id: string;
  detected_at: string;
  context: Record<string, unknown>;
  severity: string | null;
  resolution: 'open' | 'accepted_risk' | 'remediated' | 'false_positive' | 'expired';
  resolution_note: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface SodCheckInput {
  userId: string;
  /** Existing roles + the proposed-new role. Pass [] to check current state. */
  proposedRoles?: string[];
  /** What action is being attempted (for self-block / authority checks). */
  attemptedAction?: { authority_kind: string; initiator_id?: string; amount?: number };
  /** Current delegations granted to this user (for time-separation checks). */
  recentDelegations?: { granted_at: string; authority_kind: string }[];
}

export interface SodCheckResult {
  passed: boolean;
  violations: { rule: SodRule; reason: string; severity: string }[];
  warnings: { rule: SodRule; reason: string }[];
}

function track<T>(op: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => userMetrics.observeDb(op, Date.now() - start));
}

// ---------------------------------------------------------------------------
// AUTHORITY MATRIX
// ---------------------------------------------------------------------------

export async function listAuthorityKinds(): Promise<AuthorityKind[]> {
  return track('foundation.authority.kinds', () =>
    withTenantClient('platform', async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.foundation_authority_kinds WHERE is_active = true
         ORDER BY authority_kind`,
      );
      return r.rows as AuthorityKind[];
    }),
  );
}

export async function listPositionAuthority(tenantId: string, positionId: string): Promise<PositionAuthority[]> {
  return track('foundation.authority.byPosition', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.foundation_position_authority
          WHERE tenant_id = $1 AND position_id = $2 AND is_active = true
            AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
            AND (effective_to   IS NULL OR effective_to   >= CURRENT_DATE)
          ORDER BY authority_kind`,
        [tenantId, positionId],
      );
      return r.rows as PositionAuthority[];
    }),
  );
}

export async function listAuthorityMatrix(tenantId: string): Promise<{ position_id: string; authorities: PositionAuthority[] }[]> {
  return track('foundation.authority.matrix', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.foundation_position_authority
          WHERE tenant_id = $1 AND is_active = true
            AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
            AND (effective_to   IS NULL OR effective_to   >= CURRENT_DATE)
          ORDER BY position_id, authority_kind`,
        [tenantId],
      );
      const grouped = new Map<string, PositionAuthority[]>();
      for (const row of r.rows as PositionAuthority[]) {
        const arr = grouped.get(row.position_id) ?? [];
        arr.push(row);
        grouped.set(row.position_id, arr);
      }
      return Array.from(grouped.entries()).map(([position_id, authorities]) => ({ position_id, authorities }));
    }),
  );
}

export async function setPositionAuthority(
  tenantId: string,
  input: {
    position_id: string;
    authority_kind: string;
    monetary_limit?: number | null;
    monetary_unit?: string | null;
    qualifications?: string[];
    conditions?: Record<string, unknown>;
    effective_from?: string | null;
    effective_to?: string | null;
  },
  actorId: string,
): Promise<PositionAuthority> {
  return track('foundation.authority.set', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `INSERT INTO dos.foundation_position_authority
           (tenant_id, position_id, authority_kind, monetary_limit, monetary_unit,
            qualifications, conditions, effective_from, effective_to,
            is_active, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, true, $10)
         ON CONFLICT (tenant_id, position_id, authority_kind, effective_from)
         DO UPDATE SET
           monetary_limit  = EXCLUDED.monetary_limit,
           monetary_unit   = EXCLUDED.monetary_unit,
           qualifications  = EXCLUDED.qualifications,
           conditions      = EXCLUDED.conditions,
           effective_to    = EXCLUDED.effective_to,
           is_active       = true
         RETURNING *`,
        [tenantId, input.position_id, input.authority_kind,
         input.monetary_limit ?? null, input.monetary_unit ?? null,
         input.qualifications ?? null, input.conditions ?? {},
         input.effective_from ?? null, input.effective_to ?? null,
         actorId],
      );
      return r.rows[0] as PositionAuthority;
    }),
  );
}

// ---------------------------------------------------------------------------
// SoD ENGINE
// ---------------------------------------------------------------------------

export async function listRules(tenantId: string): Promise<SodRule[]> {
  return track('foundation.sod.listRules', () =>
    withTenantClient(tenantId, async (c) => {
      // Tenant overrides take precedence over platform defaults of the same rule_code.
      const r = await c.query(
        `SELECT DISTINCT ON (rule_code) *
           FROM dos.foundation_sod_rules
          WHERE is_active = true AND (tenant_id IS NULL OR tenant_id = $1)
          ORDER BY rule_code, tenant_id NULLS LAST`,
        [tenantId],
      );
      return r.rows as SodRule[];
    }),
  );
}

export async function check(tenantId: string, input: SodCheckInput): Promise<SodCheckResult> {
  return track('foundation.sod.check', () =>
    withTenantClient(tenantId, async (c) => {
      const rulesRes = await c.query(
        `SELECT DISTINCT ON (rule_code) *
           FROM dos.foundation_sod_rules
          WHERE is_active = true AND (tenant_id IS NULL OR tenant_id = $1)
          ORDER BY rule_code, tenant_id NULLS LAST`,
        [tenantId],
      );
      const rules = rulesRes.rows as SodRule[];

      const out: SodCheckResult = { passed: true, violations: [], warnings: [] };
      const proposedRoles = input.proposedRoles ?? [];

      for (const rule of rules) {
        const params = rule.parameters ?? {};
        let triggered = false;
        let reason = '';

        switch (rule.rule_kind) {
          case 'mutually_exclusive_roles':
          case 'blocked_role_pair': {
            const pair = (params['role_pair'] as string[]) ?? [];
            if (pair.length === 2 && pair.every((r) => proposedRoles.includes(r))) {
              triggered = true;
              reason = `User would hold both '${pair[0]}' and '${pair[1]}'`;
            }
            break;
          }
          case 'approval_self_block': {
            if (input.attemptedAction && input.attemptedAction.initiator_id === input.userId) {
              const applies = (params['applies_to'] as string[]) ?? [];
              if (applies.includes(input.attemptedAction.authority_kind) || applies.includes('all')) {
                triggered = true;
                reason = `User initiated and is approving the same action (${input.attemptedAction.authority_kind})`;
              }
            }
            break;
          }
          case 'time_separation': {
            const minHours = Number(params['min_hours'] ?? 0);
            const applies = (params['applies_to'] as string[]) ?? [];
            if (input.attemptedAction && input.recentDelegations &&
                (applies.includes(input.attemptedAction.authority_kind) || applies.includes('all'))) {
              const cutoffMs = Date.now() - minHours * 3600_000;
              const fresh = input.recentDelegations.find(
                (d) => d.authority_kind === input.attemptedAction!.authority_kind &&
                       new Date(d.granted_at).getTime() > cutoffMs,
              );
              if (fresh) {
                triggered = true;
                reason = `Delegation granted at ${fresh.granted_at} is younger than ${minHours}h cooling period`;
              }
            }
            break;
          }
          case 'committee_self_block': {
            // Stub — caller passes context via attemptedAction.meta if used in committee context.
            break;
          }
          default:
            break;
        }

        if (triggered) {
          if (rule.is_enforcing) {
            out.passed = false;
            out.violations.push({ rule, reason, severity: rule.severity });
          } else {
            out.warnings.push({ rule, reason });
          }
        }
      }

      return out;
    }),
  );
}

export async function recordViolation(
  tenantId: string,
  input: { ruleCode: string; userId: string; severity?: string; context?: Record<string, unknown> },
): Promise<SodViolation> {
  return track('foundation.sod.record', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `INSERT INTO dos.foundation_sod_violations
           (tenant_id, rule_code, user_id, severity, context)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING *`,
        [tenantId, input.ruleCode, input.userId, input.severity ?? null, input.context ?? {}],
      );
      return r.rows[0] as SodViolation;
    }),
  );
}

export async function listViolations(
  tenantId: string,
  filter: { resolution?: string; severity?: string; userId?: string } = {},
): Promise<SodViolation[]> {
  const conds = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  if (filter.resolution) { params.push(filter.resolution); conds.push(`resolution = $${params.length}`); }
  if (filter.severity)   { params.push(filter.severity);   conds.push(`severity = $${params.length}`); }
  if (filter.userId)     { params.push(filter.userId);     conds.push(`user_id = $${params.length}`); }
  return track('foundation.sod.listViolations', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.foundation_sod_violations
          WHERE ${conds.join(' AND ')}
          ORDER BY detected_at DESC LIMIT 500`,
        params,
      );
      return r.rows as SodViolation[];
    }),
  );
}

export async function resolveViolation(
  tenantId: string,
  violationId: string,
  resolution: 'accepted_risk' | 'remediated' | 'false_positive' | 'expired',
  note: string | undefined,
  actorId: string,
): Promise<SodViolation | null> {
  return track('foundation.sod.resolve', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.foundation_sod_violations
            SET resolution = $3, resolution_note = $4, resolved_at = NOW(), resolved_by = $5
          WHERE id = $1 AND tenant_id = $2 AND resolution = 'open'
          RETURNING *`,
        [violationId, tenantId, resolution, note ?? null, actorId],
      );
      return (r.rows[0] as SodViolation) ?? null;
    }),
  );
}
