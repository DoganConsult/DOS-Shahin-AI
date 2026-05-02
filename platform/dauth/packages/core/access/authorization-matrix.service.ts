// ============================================
// DAuth — Authorization Matrix Service
// Canonical authz decision engine: resolves whether an actor
// can perform an action on a resource within a given scope.
// Owner: DAuth (Law 2 — one canonical owner per concern)
// ============================================

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '@dos/db';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// ── Types ──────────────────────────────────────────────────────────

export interface AuthorizationCheckInput {
  entityType?: string;
  entityId?: string;
  scopeType?: string;
  scopeId?: string;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason: string;
  authority?: string;
  delegated?: boolean;
}

interface ResolvedPermission {
  permissionCode: string;
  roleCode: string;
  source: 'direct' | 'delegation';
  delegationId?: string;
}

// ── Core authz check ───────────────────────────────────────────────

/**
 * Evaluate whether `userId` may execute `action` in tenant `tenantId`.
 *
 * Resolution order:
 *  1. Direct role-based permissions
 *  2. Decision authority escalation (elevated actions)
 *  3. Active delegation chains
 *  4. Deny by default (Law 11)
 *
 * Every call is logged to `authz_decision_log` (Law 12 — audit by default).
 */
export async function can(
  tenantId: string,
  userId: string,
  action: string,
  opts?: AuthorizationCheckInput,
): Promise<AuthorizationDecision> {
  const ts = tenantSchema(tenantId);
  const decisionId = uuid();
  const startMs = Date.now();

  try {
    // ── 1. Resolve direct permissions via role assignments ───────
    const directPerms = await resolveDirectPermissions(ts, userId, action);
    if (directPerms.length > 0) {
      const perm = directPerms[0];
      const decision: AuthorizationDecision = {
        allowed: true,
        reason: `Granted via role "${perm.roleCode}" → permission "${perm.permissionCode}"`,
        authority: perm.roleCode,
        delegated: false,
      };
      await logDecision(ts, decisionId, tenantId, userId, action, opts, decision, Date.now() - startMs);
      return decision;
    }

    // ── 2. Check decision authorities for elevated actions ──────
    const authorityDecision = await checkDecisionAuthority(ts, userId, action, opts);
    if (authorityDecision) {
      await logDecision(ts, decisionId, tenantId, userId, action, opts, authorityDecision, Date.now() - startMs);
      return authorityDecision;
    }

    // ── 3. Check active delegation chains ───────────────────────
    const delegatedPerms = await resolveDelegatedPermissions(ts, userId, action);
    if (delegatedPerms.length > 0) {
      const perm = delegatedPerms[0];
      const decision: AuthorizationDecision = {
        allowed: true,
        reason: `Granted via delegation "${perm.delegationId}" → role "${perm.roleCode}" → permission "${perm.permissionCode}"`,
        authority: perm.roleCode,
        delegated: true,
      };
      await logDecision(ts, decisionId, tenantId, userId, action, opts, decision, Date.now() - startMs);
      return decision;
    }

    // ── 4. Deny by default (Law 11) ────────────────────────────
    const decision: AuthorizationDecision = {
      allowed: false,
      reason: `No matching permission for action "${action}" — deny by default`,
      delegated: false,
    };
    await logDecision(ts, decisionId, tenantId, userId, action, opts, decision, Date.now() - startMs);
    return decision;
  } catch (err: unknown) {
    // On any error, deny and log
    const decision: AuthorizationDecision = {
      allowed: false,
      reason: `Authorization error: ${(err as Error).message ?? 'unknown'} — deny by default`,
      delegated: false,
    };
    await logDecision(ts, decisionId, tenantId, userId, action, opts, decision, Date.now() - startMs).catch(catchHandler(EC.EVENT_BUS));
    return decision;
  }
}

// ── Direct permission resolution ───────────────────────────────────

async function resolveDirectPermissions(
  ts: string,
  userId: string,
  action: string,
): Promise<ResolvedPermission[]> {
  const result = await safeQuery(
    `SELECT DISTINCT p.code AS permission_code, r.code AS role_code
     FROM ${ts}.user_role_assignments ura
     JOIN ${ts}.roles r ON r.id = ura.role_id
     JOIN ${ts}.role_permissions rp ON rp.role_id = r.id
     JOIN ${ts}.permissions p ON p.id = rp.permission_id
     WHERE ura.user_id = $1
       AND ura.is_active = true
       AND (ura.valid_until IS NULL OR ura.valid_until > NOW())
       AND p.code = $2`,
    [userId, action],
  );
  return result.rows.map((r: any) => ({
    permissionCode: r.permission_code,
    roleCode: r.role_code,
    source: 'direct' as const,
  }));
}

// ── Decision authority escalation ──────────────────────────────────

async function checkDecisionAuthority(
  ts: string,
  userId: string,
  action: string,
  opts?: AuthorizationCheckInput,
): Promise<AuthorizationDecision | null> {
  if (!opts?.entityType) return null;

  const result = await safeQuery(
    `SELECT da.id, da.authority_level, da.decision_type
     FROM ${ts}.decision_authorities da
     JOIN ${ts}.user_role_assignments ura ON ura.role_id = da.role_id
     WHERE ura.user_id = $1
       AND ura.is_active = true
       AND (ura.valid_until IS NULL OR ura.valid_until > NOW())
       AND da.entity_type = $2
       AND da.action_code = $3
       AND da.is_active = true`,
    [userId, opts.entityType, action],
  );

  if (result.rows.length === 0) return null;

  const authority: any = result.rows[0];

  // Scope check: if scopeType is provided, verify authority applies in that scope
  if (opts.scopeType && opts.scopeId) {
    const scopeCheck = await safeQuery(
      `SELECT 1 FROM ${ts}.authority_scope_bindings asb
       WHERE asb.authority_id = $1
         AND asb.scope_type = $2
         AND (asb.scope_id = $3 OR asb.scope_id = '*')`,
      [authority.id, opts.scopeType, opts.scopeId],
    );
    if (scopeCheck.rows.length === 0) return null;
  }

  return {
    allowed: true,
    reason: `Granted via decision authority level "${authority.authority_level}" (${authority.decision_type}) on entity type "${opts.entityType}"`,
    authority: authority.authority_level,
    delegated: false,
  };
}

// ── Delegated permission resolution ────────────────────────────────

async function resolveDelegatedPermissions(
  ts: string,
  userId: string,
  action: string,
): Promise<ResolvedPermission[]> {
  const result = await safeQuery(
    `SELECT DISTINCT p.code AS permission_code, r.code AS role_code, dc.id AS delegation_id
     FROM ${ts}.delegation_chains dc
     JOIN ${ts}.user_role_assignments ura ON ura.user_id = dc.from_user_id AND ura.role_id = dc.role_id
     JOIN ${ts}.roles r ON r.id = dc.role_id
     JOIN ${ts}.role_permissions rp ON rp.role_id = r.id
     JOIN ${ts}.permissions p ON p.id = rp.permission_id
     WHERE dc.to_user_id = $1
       AND dc.status = 'active'
       AND dc.valid_from <= NOW()
       AND (dc.valid_until IS NULL OR dc.valid_until > NOW())
       AND p.code = $2`,
    [userId, action],
  );
  return result.rows.map((r: any) => ({
    permissionCode: r.permission_code,
    roleCode: r.role_code,
    source: 'delegation' as const,
    delegationId: r.delegation_id,
  }));
}

// ── Audit log ──────────────────────────────────────────────────────

async function logDecision(
  ts: string,
  decisionId: string,
  tenantId: string,
  userId: string,
  action: string,
  opts: AuthorizationCheckInput | undefined,
  decision: AuthorizationDecision,
  durationMs: number,
): Promise<void> {
  await safeQuery(
    `INSERT INTO ${ts}.authz_decision_log
       (id, tenant_id, user_id, action, entity_type, entity_id, scope_type, scope_id,
        allowed, reason, authority, delegated, duration_ms, decided_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
    [
      decisionId,
      tenantId,
      userId,
      action,
      opts?.entityType ?? null,
      opts?.entityId ?? null,
      opts?.scopeType ?? null,
      opts?.scopeId ?? null,
      decision.allowed,
      decision.reason,
      decision.authority ?? null,
      decision.delegated ?? false,
      durationMs,
    ],
  );
}
