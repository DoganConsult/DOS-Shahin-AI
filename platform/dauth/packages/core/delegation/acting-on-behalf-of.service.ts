import { safeQuery, tenantSchema } from '@dos/db';
import { evaluateAccess, type AccessDecisionContext } from '../access/decision-engine';
import { logAuthDecision } from '../audit/decision-log.service';
import { publish } from '../events/publish-with-dsoc';
import { getActor } from '../actor/actor-registry';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface ActingOnBehalfOfContext {
  delegateId: string;
  principalId: string;
  tenantId: string;
  grantId: string;
  scopes: string[];
  expiresAt: string;
}

export async function resolveActingContext(
  tenantId: string,
  delegateId: string,
  grantId: string,
): Promise<ActingOnBehalfOfContext | null> {
  const schema = tenantSchema(tenantId);

  const delegateActor = await getActor(tenantId, delegateId);
  if (!delegateActor || !delegateActor.isActive) return null;

  const { rows } = await safeQuery(
    `SELECT grant_id, user_id, agent_id, scopes, expires_at
     FROM "${schema}".delegation_grants
     WHERE grant_id = $1 AND (agent_id = $2 OR user_id = $2)
       AND revoked_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [grantId, delegateId],
  );
  if (!rows[0]) return null;
  const r = rows[0];

  const principalActor = await getActor(tenantId, r.user_id);
  if (!principalActor || !principalActor.isActive) return null;

  return {
    delegateId,
    principalId: r.user_id,
    tenantId,
    grantId: r.grant_id,
    scopes: r.scopes ?? [],
    expiresAt: r.expires_at?.toISOString?.() ?? '',
  };
}

export async function evaluateDelegatedAccess(
  ctx: ActingOnBehalfOfContext,
  permissionCode: string,
  moduleCode: string,
): Promise<{ allowed: boolean; reason: string }> {
  const modulePrefix = permissionCode.split('.')[0];
  const scopeMatch = ctx.scopes.some(s => modulePrefix.includes(s) || s === '*');
  if (!scopeMatch) {
    await logAuthDecision(ctx.tenantId, {
      userId: ctx.delegateId,
      permissionCode,
      decision: 'deny',
      reason: 'delegation_scope_mismatch',
      context: { grantId: ctx.grantId, principalId: ctx.principalId },
    });
    return { allowed: false, reason: 'delegation_scope_mismatch' };
  }

  const decision = await evaluateAccess({
    userId: ctx.principalId,
    tenantId: ctx.tenantId,
    role: '',
    roles: [],
    isSuperAdmin: false,
    permissionCode,
    moduleCode,
  } as AccessDecisionContext);

  if (!decision.allowed) {
    return { allowed: false, reason: `principal_lacks_permission:${decision.reason}` };
  }

  await publish('dauth.delegation.action_executed', ctx.tenantId, {
    grantId: ctx.grantId,
    delegateId: ctx.delegateId,
    principalId: ctx.principalId,
    permissionCode,
    executedAt: new Date().toISOString(),
  }).catch(catchHandler(EC.EVENT_BUS));

  return { allowed: true, reason: 'delegated_access_granted' };
}
