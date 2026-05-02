import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '@dos/db';

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

    const authorityDecision = await checkDecisionAuthority(ts, userId, action, opts);
    if (authorityDecision) {
      await logDecision(ts, decisionId, tenantId, userId, action, opts, authorityDecision, Date.now() - startMs);
      return authorityDecision;
    }

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

    const decision: AuthorizationDecision = {
      allowed: false,
      reason: `No matching permission for action "${action}" — deny by default`,
      delegated: false,
    };
    await logDecision(ts, decisionId, tenantId, userId, action, opts, decision, Date.now() - startMs);
    return decision;
  } catch (err: unknown) {
    const decision: AuthorizationDecision = {
      allowed: false,
      reason: `Authorization error: ${err instanceof Error ? err.message : 'unknown'} — deny by default`,
      delegated: false,
    };
    await logDecision(ts, decisionId, tenantId, userId, action, opts, decision, Date.now() - startMs).catch((): void => undefined);
    return decision;
  }
}

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

  return result.rows.map((row: Record<string, unknown>) => ({
    permissionCode: String(row.permission_code ?? ''),
    roleCode: String(row.role_code ?? ''),
    source: 'direct',
  }));
}

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

  const authority = result.rows[0] as Record<string, unknown>;

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
    reason: `Granted via decision authority level "${String(authority.authority_level ?? '')}" (${String(authority.decision_type ?? '')}) on entity type "${opts.entityType}"`,
    authority: String(authority.authority_level ?? ''),
    delegated: false,
  };
}

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

  return result.rows.map((row: Record<string, unknown>) => ({
    permissionCode: String(row.permission_code ?? ''),
    roleCode: String(row.role_code ?? ''),
    source: 'delegation',
    delegationId: row.delegation_id ? String(row.delegation_id) : undefined,
  }));
}

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
