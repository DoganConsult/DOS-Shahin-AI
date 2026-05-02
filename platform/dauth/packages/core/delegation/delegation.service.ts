/**
 * DAuth — Agent Delegation Service
 *
 * Allows AI agents to act on behalf of users. Every action flows through
 * DAuth's 14-step evaluateAccess() — no parallel permission engine (§16.3).
 *
 * §9.1: time-bounded, scope-bounded, action-bounded, role-bounded,
 *        authority-aware, SoD-checked, auditable
 * §9.3: no implicit delegation, no expansion beyond delegator rights
 * §16.2: agent actor must exist, permission via DAuth only
 * §16.3: no hidden agent-wide bypass, no separate permission engine
 *
 * Ownership: platform/dauth/delegation/
 * Scopes and action-type mappings are registered at runtime by product/module layers.
 */

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '@dos/db';
import { generateAccessToken, decodeTokenUnsafe, evaluateAccess, type AuthPayload } from '../index';
import { logAuthDecision } from '../audit/decision-log.service';
import { catchHandler, EC, swallow } from '@dos/platform-core/resilience';
import { publish as publishEvent } from '../events/publish-with-dsoc';
import type { GenericRow } from '@dos/types/db';
import { SYSTEM_JOB_ACTOR } from '@dos/platform-core';
import { checkAgentSodDelegation } from '../agents/policies/agent-sod-delegation.service';

// ── Types ──────────────────────────────────────────────────────────────────

export type DelegationScope = string;

export interface DelegationGrant {
  grantId: string;
  tenantId: string;
  userId: string;
  agentId: string;
  scopes: string[];
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface DelegationAction {
  actionId: string;
  grantId: string;
  agentId: string;
  userId: string;
  tenantId: string;
  actionType: string;
  entityType: string;
  entityId: string | null;
  payload: Record<string, unknown>;
  result: 'success' | 'failure';
  errorMessage: string | null;
  executedAt: string;
}

// ── Data-driven scope and action registries ───────────────────────────────

const _actionToScope = new Map<string, string>();
const _scopePermissions = new Map<string, string[]>();

export function registerDelegationScope(scopeCode: string, requiredPermissions: string[]): void {
  _scopePermissions.set(scopeCode, requiredPermissions);
}

export function registerActionScopeMapping(actionType: string, scopeCode: string): void {
  _actionToScope.set(actionType, scopeCode);
}

export function getScopeRequiredPermissions(scopeCode: string): string[] {
  if (!_scopePermissions.has(scopeCode)) {
    throw new Error(`Delegation scope '${scopeCode}' is not registered — deny by default (Law 11)`);
  }
  return _scopePermissions.get(scopeCode)!;
}

export function getActionScope(actionType: string): string | undefined {
  return _actionToScope.get(actionType);
}

// ── Grant delegation (§9.1: explicit, validated) ──────────────────────────

export async function createDelegationGrant(
  tenantId: string,
  userId: string,
  agentId: string,
  scopes: DelegationScope[],
  durationMinutes: number = 60,
): Promise<DelegationGrant> {
  const schema = tenantSchema(tenantId);
  await ensureDelegationTables(schema);

  // §16.2: Validate agent exists in registry
  const agentExists = await safeQuery(
    `SELECT 1 FROM "${schema}".ai_agent_registry WHERE agent_id = $1 AND status = 'active' LIMIT 1`,
    [agentId],
  );
  if (agentExists.rows.length === 0) {
    throw new Error(`Agent ${agentId} not found in ai_agent_registry or not active. (§16.2)`);
  }

  // §9.1 role-bounded + §9.3 no expansion: verify delegator holds all required permissions
  for (const scope of scopes) {
    const requiredPerms = getScopeRequiredPermissions(scope);
    for (const perm of requiredPerms) {
      const decision = await evaluateAccess({
        userId,
        tenantId,
        role: '', // will be resolved from DB
        permissionCode: perm,
        moduleCode: perm.split('.')[0],
      });
      if (!decision.allowed) {
        throw new Error(
          `Delegator ${userId} does not hold permission ${perm} required for scope ${scope}. ` +
          `Cannot delegate rights you do not have. (§9.3, step ${decision.failedStep}: ${decision.failedCheck})`
        );
      }
    }
  }

  // §9.1 SoD check: verify delegation doesn't create SoD conflict
  const userRoles = await safeQuery(
    `SELECT fr.code FROM "${schema}".user_role_assignments ura
     JOIN "${schema}".functional_roles fr ON fr.id = ura.functional_role_id
     WHERE ura.user_id = $1 AND ura.is_active = TRUE`,
    [userId],
  );
  const userRoleCodes = userRoles.rows.map((r: any) => r.code);
  if (userRoleCodes.length > 1) {
    const sodConflict = await safeQuery(
      `SELECT role_code_a, role_code_b FROM "${schema}".sod_rules
       WHERE is_active = TRUE AND conflict_level = 'block'
       AND role_code_a = ANY($1) AND role_code_b = ANY($1) LIMIT 1`,
      [userRoleCodes],
    );
    if (sodConflict.rows.length > 0) {
      throw new Error(
        `SoD conflict detected for delegator ${userId}: ${sodConflict.rows[0].role_code_a} vs ${sodConflict.rows[0].role_code_b}. ` +
        `Cannot create delegation with conflicting roles. (§9.1 SoD-checked)`
      );
    }
  }

  // Create grant
  const grantId = uuid();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationMinutes * 60_000);

  await safeQuery(
    `INSERT INTO "${schema}".delegation_grants
       (grant_id, tenant_id, user_id, agent_id, scopes, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [grantId, tenantId, userId, agentId, JSON.stringify(scopes), expiresAt.toISOString(), now.toISOString()],
  );

  await logAuthDecision(tenantId, {
    userId, permissionCode: 'delegation.grant.create', moduleCode: 'delegation',
    decision: 'allow', reason: 'Delegation grant created',
    context: { agentId, scopes, durationMinutes, grantId },
  });

  await swallow(EC.EVENT_BUS, publishEvent(
    'delegation.granted', tenantId,
    { grantId, userId, agentId, scopes, moduleCode: 'delegation', category: 'security' },
  ), { tenantId, operation: 'eventBus:delegation.granted' });

  return { grantId, tenantId, userId, agentId, scopes, expiresAt: expiresAt.toISOString(), revokedAt: null, createdAt: now.toISOString() };
}

// ── Revoke delegation (§9.1: revocable, §16.2: blacklist tokens) ─────────

export async function revokeDelegationGrant(
  tenantId: string,
  grantId: string,
  revokedBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".delegation_grants SET revoked_at = NOW() WHERE grant_id = $1 AND revoked_at IS NULL`,
    [grantId],
  );

  // Blacklist all JTIs issued under this grant
  try {
    const jtis = await safeQuery(
      `SELECT jti FROM "${schema}".delegation_token_jtis WHERE grant_id = $1 AND expires_at > NOW()`,
      [grantId],
    );
    if (jtis.rows.length > 0) {
      const { blacklistToken } = await import('../session/token-blacklist.service.js');
      for (const row of jtis.rows) {
        await blacklistToken(row.jti).catch(catchHandler(EC.EVENT_BUS));
      }
    }
  } catch {
    // token-blacklist service may not be available
  }

  await logAuthDecision(tenantId, {
    userId: revokedBy, permissionCode: 'delegation.grant.revoke', moduleCode: 'delegation',
    decision: 'allow', reason: 'Delegation grant revoked',
    context: { grantId, revokedBy, blacklistedJtis: true },
  });
}

// ── Validate active grant ────────────────────────────────────────────────

export async function validateDelegation(
  tenantId: string,
  agentId: string,
  requiredScope: DelegationScope,
): Promise<DelegationGrant | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".delegation_grants
     WHERE tenant_id = $1 AND agent_id = $2 AND revoked_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [tenantId, agentId],
  );
  if (!result.rows.length) return null;

  const grant: any = result.rows[0];
  const scopes: DelegationScope[] = typeof grant.scopes === 'string' ? JSON.parse(grant.scopes) : grant.scopes;
  if (!scopes.includes(requiredScope)) return null;

  return mapGrantRow(grant);
}

// ── Generate impersonation token (§9.1: auditable, §16.2: revocable) ─────

export async function generateDelegatedToken(
  grant: DelegationGrant,
  userEmail: string,
  userRole: string,
): Promise<string> {
  const payload: AuthPayload & { delegatedBy: string; agentId: string } = {
    userId: grant.userId,
    email: userEmail,
    tenantId: grant.tenantId,
    role: userRole,
    delegatedBy: grant.userId,
    agentId: grant.agentId,
  };

  const token = generateAccessToken(payload as Parameters<typeof generateAccessToken>[0]);

  // Register JTI for blacklisting
  const decoded = decodeTokenUnsafe(token);
  if (decoded?.jti) {
    const schema = tenantSchema(grant.tenantId);
    const ttlSeconds = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900;
    await safeQuery(
      `INSERT INTO "${schema}".delegation_token_jtis (grant_id, jti, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 second' * $3) ON CONFLICT DO NOTHING`,
      [grant.grantId, decoded.jti, ttlSeconds],
    ).catch(catchHandler(EC.EVENT_BUS));
  }

  return token;
}

// ── Require explicit grant (§9.1, §16.3) ─────────────────────────────────

export async function requireExplicitGrant(
  tenantId: string,
  agentId: string,
  requiredScope: DelegationScope,
): Promise<DelegationGrant> {
  const schema = tenantSchema(tenantId);
  await ensureDelegationTables(schema);
  const existing = await validateDelegation(tenantId, agentId, requiredScope);
  if (!existing) {
    throw new Error(
      `No active delegation grant for agent ${agentId} with scope ${requiredScope}. ` +
      `User must explicitly approve delegation before agent can act. (§9.1, §16.3)`
    );
  }
  return existing;
}

// ── Execute action through delegation — ALL access via DAuth (§16.3) ─────

export async function executeDelegatedAction(
  tenantId: string,
  userId: string,
  agentId: string,
  action: { type: string; title: string; description: string; priority: string; entityType?: string; entityId?: string; assignToRole?: string; dueInDays?: number; [key: string]: any },
): Promise<{ success: boolean; message: string; grantId: string; actionId: string }> {
  const requiredScope = getActionScope(action.type);
  if (!requiredScope) {
    throw new Error(`Unknown action type "${action.type}" — no scope mapping. (§9.1)`);
  }

  // 1. Require explicit grant
  const grant = await requireExplicitGrant(tenantId, agentId, requiredScope);

  const requiredPerms = getScopeRequiredPermissions(requiredScope);
  const sod = await checkAgentSodDelegation({
    tenantId,
    agentId,
    principalId: grant.userId,
    actionType: action.type,
    entityType: action.entityType,
    entityId: action.entityId ?? null,
    requiredPermissions: requiredPerms,
  });
  if (!sod.allowed) {
    const delegatedAction = await recordDelegatedAction(
      tenantId, grant.grantId, agentId, userId,
      `copilot.${action.type}`, action.entityType || 'task', action.entityId || null,
      { title: action.title, description: action.description, priority: action.priority },
      'failure', sod.reason || 'agent_sod_block',
    );
    throw new Error(`DAuth denied delegated action: ${sod.reason || 'agent_sod_block'}. grantId=${grant.grantId} actionId=${delegatedAction.actionId}`);
  }

  // 2. Verify action permission through DAuth 14-step pipeline (§16.3: no separate engine)
  for (const perm of requiredPerms) {
    const decision = await evaluateAccess({
      userId: grant.userId,
      tenantId,
      role: '',
      permissionCode: perm,
      moduleCode: perm.split('.')[0],
    });
    if (!decision.allowed) {
      throw new Error(
        `DAuth denied delegated action: ${perm} failed at step ${decision.failedStep} (${decision.failedCheck}). ` +
        `Agent ${agentId} acting for user ${userId}. (§16.2)`
      );
    }
  }

  // 3. Execute via agent-runner (optional cross-service dep — resolved at runtime).
  // @ts-expect-error — agent-runner lives in ai-engine-service; packages/core
  // must not hard-link to it to keep DAuth core deployable standalone.
  const { executeAction } = await import('../../../modules/ai/services/agents/core/agent-runner.service.js');
  await executeAction(tenantId, agentId, action as unknown);

  // 4. Record with full traceability
  const delegatedAction = await recordDelegatedAction(
    tenantId, grant.grantId, agentId, userId,
    `copilot.${action.type}`, action.entityType || 'task', action.entityId || null,
    { title: action.title, description: action.description, priority: action.priority },
    'success', null,
  );

  // 5. Publish event
  await swallow(EC.EVENT_BUS, publishEvent(
    'delegation.action_executed', tenantId,
    {
      grantId: grant.grantId,
      agentId,
      userId,
      actionType: action.type,
      moduleCode: 'delegation',
      category: 'security',
      severity: action.priority === 'critical' ? 'warn' : 'info',
    },
  ), { tenantId, operation: 'eventBus:delegation.action_executed' });

  return {
    success: true,
    message: `${action.title} — executed by ${agentId} on behalf of ${userId}`,
    grantId: grant.grantId,
    actionId: delegatedAction.actionId,
  };
}

// ── Record delegated action ──────────────────────────────────────────────

export async function recordDelegatedAction(
  tenantId: string, grantId: string, agentId: string, userId: string,
  actionType: string, entityType: string, entityId: string | null,
  payload: Record<string, unknown>, result: 'success' | 'failure', errorMessage: string | null = null,
): Promise<DelegationAction> {
  const schema = tenantSchema(tenantId);
  const actionId = uuid();
  const now = new Date().toISOString();

  await safeQuery(
    `INSERT INTO "${schema}".delegation_actions
       (action_id, grant_id, agent_id, user_id, tenant_id, action_type,
        entity_type, entity_id, payload, result, error_message, executed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [actionId, grantId, agentId, userId, tenantId, actionType,
     entityType, entityId, JSON.stringify(payload), result, errorMessage, now],
  );

  await logAuthDecision(tenantId, {
    userId: agentId, permissionCode: `delegation.action.${actionType}`, moduleCode: 'delegation',
    decision: result === 'success' ? 'allow' : 'deny', reason: `Delegated action: ${actionType}`,
    context: { onBehalfOf: userId, grantId, entityType, entityId, result, errorMessage },
  });

  return { actionId, grantId, agentId, userId, tenantId, actionType, entityType, entityId, payload, result, errorMessage, executedAt: now };
}

// ── Query helpers ────────────────────────────────────────────────────────

export async function getActiveGrants(tenantId: string, userId: string): Promise<DelegationGrant[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".delegation_grants
     WHERE tenant_id = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [tenantId, userId],
  );
  return result.rows.map(mapGrantRow);
}

export async function getDelegationHistory(
  tenantId: string, filters?: { userId?: string; agentId?: string; limit?: number },
): Promise<DelegationAction[]> {
  const schema = tenantSchema(tenantId);
  const conditions = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;
  if (filters?.userId) { conditions.push(`user_id = $${idx++}`); params.push(filters.userId); }
  if (filters?.agentId) { conditions.push(`agent_id = $${idx++}`); params.push(filters.agentId); }
  const safeLimit = Math.min(500, Math.max(1, parseInt(String(filters?.limit || 50)) || 50));
  conditions.push('TRUE'); // anchor for LIMIT param
  const result = await safeQuery(
    `SELECT * FROM "${schema}".delegation_actions WHERE ${conditions.join(' AND ')} ORDER BY executed_at DESC LIMIT $${idx}`,
    [...params, safeLimit],
  );
  return result.rows.map(mapActionRow);
}

// ── Table setup ──────────────────────────────────────────────────────────

const _ensuredSchemas = new Set<string>();
async function ensureDelegationTables(schema: string): Promise<void> {
  if (_ensuredSchemas.has(schema)) return;
  _ensuredSchemas.add(schema);
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".delegation_grants (
      grant_id UUID PRIMARY KEY, tenant_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL, agent_id VARCHAR(64) NOT NULL,
      scopes JSONB NOT NULL DEFAULT '[]', expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS "${schema}".delegation_actions (
      action_id UUID PRIMARY KEY, grant_id UUID NOT NULL,
      agent_id VARCHAR(64) NOT NULL, user_id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(64) NOT NULL, action_type VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL, entity_id VARCHAR(64),
      payload JSONB DEFAULT '{}', result VARCHAR(20) NOT NULL,
      error_message TEXT, executed_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS "${schema}".delegation_token_jtis (
      grant_id UUID NOT NULL, jti VARCHAR(64) NOT NULL PRIMARY KEY,
      expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_delegation_grants_active ON "${schema}".delegation_grants (tenant_id, agent_id, expires_at) WHERE revoked_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_delegation_actions_grant ON "${schema}".delegation_actions (grant_id, executed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_delegation_token_jtis_grant ON "${schema}".delegation_token_jtis (grant_id);
  `);
}

// ── Row mappers ──────────────────────────────────────────────────────────

function mapGrantRow(row: any): DelegationGrant {
  return {
    grantId: row.grant_id, tenantId: row.tenant_id, userId: row.user_id,
    agentId: row.agent_id,
    scopes: typeof row.scopes === 'string' ? JSON.parse(row.scopes) : row.scopes,
    expiresAt: row.expires_at, revokedAt: row.revoked_at, createdAt: row.created_at,
  };
}

function mapActionRow(row: any): DelegationAction {
  return {
    actionId: row.action_id, grantId: row.grant_id, agentId: row.agent_id,
    userId: row.user_id, tenantId: row.tenant_id, actionType: row.action_type,
    entityType: row.entity_type, entityId: row.entity_id,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    result: row.result, errorMessage: row.error_message, executedAt: row.executed_at,
  };
}

// ── Governance Authority Delegations (migrated from governance-delegations.service.ts) ──
// CRUD for delegated authorities, revocation, expiring delegation detection, conflict check.
// Operates on governance_delegations and governance_authority_levels tables.

export async function listDelegations(
  tenantId: string,
  filters?: { status?: string; delegator_user_id?: string; delegate_user_id?: string },
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".governance_delegations WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.status) { sql += ` AND status = $${idx++}`; params.push(filters.status); }
  if (filters?.delegator_user_id) { sql += ` AND delegator_user_id = $${idx++}`; params.push(filters.delegator_user_id); }
  if (filters?.delegate_user_id) { sql += ` AND delegate_user_id = $${idx++}`; params.push(filters.delegate_user_id); }
  sql += ` ORDER BY valid_from DESC`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function getDelegationById(tenantId: string, delegationId: string): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_delegations WHERE delegation_id = $1 AND deleted_at IS NULL`,
    [delegationId],
  );
  if (result.rows.length === 0) throw new Error('Delegation not found');
  return result.rows[0];
}

export async function createDelegation(tenantId: string, data: {
  delegator_user_id: string;
  delegate_user_id: string;
  authority_type: string;
  scope?: string;
  valid_from: string;
  valid_to: string;
  conditions?: string;
  created_by?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_delegations
      (delegation_id, delegator_user_id, delegate_user_id, authority_type, scope_description, effective_date, expiry_date, conditions, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9)
     RETURNING *`,
    [id, data.delegator_user_id, data.delegate_user_id, data.authority_type, data.scope || null,
     data.valid_from, data.valid_to, data.conditions || null, data.created_by || null],
  );
  return result.rows[0];
}

/**
 * Request a delegation that requires approval before activation.
 * Creates the delegation in 'pending_approval' status and submits for approval.
 */
export async function requestDelegation(tenantId: string, data: {
  delegator_user_id: string;
  delegate_user_id: string;
  authority_type: string;
  scope?: string;
  valid_from: string;
  valid_to: string;
  conditions?: string;
  requested_by: string;
}): Promise<{ delegation: GenericRow | undefined; requiresApproval: boolean }> {
  const schema = tenantSchema(tenantId);
  const id = uuid();

  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_delegations
      (delegation_id, delegator_user_id, delegate_user_id, authority_type, scope_description,
       effective_date, expiry_date, conditions, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending_approval',$9)
     RETURNING *`,
    [id, data.delegator_user_id, data.delegate_user_id, data.authority_type,
     data.scope || null, data.valid_from, data.valid_to, data.conditions || null, data.requested_by],
  );

  const delegation: any = result.rows[0];

  // Try to submit for approval via the approval engine
  let requiresApproval = false;
  try {
    // @ts-expect-error — approval-engine lives in workflow-service; kept as an
    // optional dynamic import so packages/core is standalone-deployable.
    const { submitForApproval } = await import('../../dos/workflows/approvals/approval-engine.service.js');
    await submitForApproval(tenantId, 'delegation', id, data.requested_by);
    requiresApproval = true;
  } catch {
    // No approval chain configured for delegations — auto-activate
    await safeQuery(
      `UPDATE "${schema}".governance_delegations SET status = 'active', updated_at = NOW()
       WHERE delegation_id = $1`,
      [id],
    );
    delegation.status = 'active';
  }

  await swallow(EC.EVENT_BUS, publishEvent(
    requiresApproval ? 'delegation.requested' : 'delegation.created', tenantId,
    {
      authority_type: data.authority_type,
      delegate: data.delegate_user_id,
      requiresApproval,
      userId: data.requested_by,
      moduleCode: 'delegation',
      category: 'security',
    },
  ), { tenantId, operation: 'eventBus:delegation.requested' });

  return { delegation, requiresApproval };
}

/** Approve a pending delegation (called by approval engine callback). */
export async function approveDelegation(tenantId: string, delegationId: string, approvedBy: string): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_delegations
     SET status = 'active', approved_by = $2, approved_at = NOW(), updated_at = NOW()
     WHERE delegation_id = $1 AND status = 'pending_approval'
     RETURNING *`,
    [delegationId, approvedBy],
  );
  if (result.rows.length === 0) throw new Error('Delegation not found or not pending approval');
  return result.rows[0];
}

/** Reject a pending delegation. */
export async function rejectDelegation(tenantId: string, delegationId: string, rejectedBy: string, reason: string): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_delegations
     SET status = 'rejected', rejection_reason = $2, updated_at = NOW()
     WHERE delegation_id = $1 AND status = 'pending_approval'
     RETURNING *`,
    [delegationId, reason],
  );
  if (result.rows.length === 0) throw new Error('Delegation not found or not pending approval');
  return result.rows[0];
}

export async function updateDelegation(tenantId: string, delegationId: string, data: Record<string, unknown>): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const allowed = ['authority_type', 'scope_description', 'effective_date', 'expiry_date', 'conditions', 'status'];
  const fields = Object.keys(data).filter(k => allowed.includes(k) && data[k] !== undefined);
  if (fields.length === 0) throw new Error('No valid fields to update');
  const sets = fields.map((f, i) => `${f} = $${i + 2}`);
  const vals = fields.map(f => data[f]);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_delegations SET ${sets.join(', ')}, updated_at = NOW()
     WHERE delegation_id = $1 AND deleted_at IS NULL RETURNING *`,
    [delegationId, ...vals],
  );
  if (result.rows.length === 0) throw new Error('Delegation not found');
  return result.rows[0];
}

export async function revokeDelegation(tenantId: string, delegationId: string): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_delegations SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
     WHERE delegation_id = $1 AND deleted_at IS NULL AND status != 'revoked' RETURNING *`,
    [delegationId],
  );
  if (result.rows.length === 0) throw new Error('Delegation not found or already revoked');
  const revoked: any = result.rows[0];
  await swallow(EC.EVENT_BUS, publishEvent(
    'delegation.revoked', tenantId,
    {
      authority_type: revoked.authority_type,
      delegate_user_id: revoked.delegate_user_id,
      userId: revoked.delegator_user_id,
      moduleCode: 'delegation',
      category: 'security',
      severity: 'warn',
    },
  ), { tenantId, operation: 'eventBus:delegation.revoked' });
  return revoked;
}

export async function getExpiringDelegations(tenantId: string, withinDays: number = 7): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_delegations
     WHERE deleted_at IS NULL AND status = 'active'
       AND expiry_date IS NOT NULL
       AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 || ' days')::INTERVAL
     ORDER BY expiry_date ASC`,
    [withinDays],
  );
  // Emit expiring delegation events
  for (const d of result.rows as Array<Record<string, unknown>>) {
    await swallow(EC.EVENT_BUS, publishEvent(
      'governance.delegation_expiring', tenantId,
      {
        authority_type: d.authority_type,
        delegate_user_id: d.delegate_user_id,
        valid_to: d.valid_to,
        userId: d.delegator_user_id || SYSTEM_JOB_ACTOR,
        moduleCode: 'delegation',
        category: 'domain',
        severity: 'warn',
      },
    ), { tenantId, operation: 'eventBus:governance.delegation_expiring' });
  }
  return result.rows;
}

/** Compat alias for listDelegations */
export const getDelegations = listDelegations;

/** Active delegations for a specific user (delegate side) */
export async function getActiveDelegationsForUser(
  tenantId: string,
  userId: string,
): Promise<GenericRow[]> {
  return listDelegations(tenantId, { delegate_user_id: userId, status: 'active' });
}

export async function detectAuthorityConflicts(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT a.delegation_id AS delegation_a, b.delegation_id AS delegation_b,
      a.delegate_user_id, a.authority_type,
      a.effective_date AS a_from, a.expiry_date AS a_to,
      b.effective_date AS b_from, b.expiry_date AS b_to
    FROM "${schema}".governance_delegations a
    JOIN "${schema}".governance_delegations b
      ON a.delegate_user_id = b.delegate_user_id
      AND a.authority_type = b.authority_type
      AND a.delegation_id < b.delegation_id
      AND a.deleted_at IS NULL AND b.deleted_at IS NULL
      AND a.status = 'active' AND b.status = 'active'
    ORDER BY a.delegate_user_id, a.authority_type
  `);
  return result.rows;
}

export async function listAuthorityLevels(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_authority_levels ORDER BY authority_type, max_amount`,
  );
  return result.rows;
}

export async function upsertAuthorityLevel(tenantId: string, data: {
  level_name: string;
  description?: string;
  level_order?: number;
  approval_limit?: number;
  created_by?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_authority_levels (tenant_id, authority_type, level_name, max_amount, requires_dual_approval)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [tenantId, data.level_name, data.description || data.level_name, data.approval_limit || 0, false],
  );
  return result.rows[0];
}

export async function expireOverdueDelegations(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_delegations
     SET status = 'expired', updated_at = NOW()
     WHERE status = 'active'
       AND expiry_date < NOW()
       AND deleted_at IS NULL
     RETURNING delegation_id`,
    [],
  );
  const count = result.rows.length;
  if (count > 0) {
    for (const row of result.rows) {
      await swallow(EC.EVENT_BUS, publishEvent(
        'governance.delegation_expired', tenantId,
        {
          delegation_id: row.delegation_id,
          userId: SYSTEM_JOB_ACTOR,
          moduleCode: 'delegation',
          category: 'domain',
          severity: 'warn',
        },
      ), { tenantId, operation: 'eventBus:governance.delegation_expired' });
    }
  }
  return count;
}
export function ACTION_TYPE_TO_SCOPE(..._args: unknown[]): undefined { return undefined; }
