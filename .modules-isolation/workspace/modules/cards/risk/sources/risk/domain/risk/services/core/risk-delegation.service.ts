import { logger } from '@dos/module-sdk';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { NotFoundError } from '../../../../errors/index';

export interface DelegationRequest {
  entityId: string;
  entityType: 'risk' | 'assessment' | 'treatment' | 'kri';
  fromUserId: string;
  toUserId: string;
  reason: string;
  expiresAt?: string;
}

export interface DelegationResult {
  delegationId: string;
  entityId: string;
  entityType: string;
  fromUserId: string;
  toUserId: string;
  status: 'active' | 'expired' | 'revoked';
  createdAt: string;
  expiresAt?: string;
}

const ENTITY_TABLE_MAP: Record<string, string> = {
  risk: 'risks',
  assessment: 'risk_assessments',
  treatment: 'risk_treatment_reviews',
  kri: 'risk_kris',
};

export async function delegateOwnership(
  tenantId: string, request: DelegationRequest,
): Promise<DelegationResult> {
  const schema = tenantSchema(tenantId);
  const table = ENTITY_TABLE_MAP[request.entityType] || 'risks';

  const entity = await safeQuery(
    `SELECT id, owner_id FROM "${schema}"."${table}" WHERE id = $1`,
    [request.entityId],
  );
  if (entity.rows.length === 0) throw new NotFoundError(request.entityType, request.entityId);

  const currentOwner = entity.rows[0].owner_id;
  if (currentOwner && currentOwner !== request.fromUserId) {
    const err = new Error(`Only the current owner can delegate. Current owner: ${currentOwner}, requester: ${request.fromUserId}`);
    (err as any).statusCode = 403;
    throw err;
  }

  if (request.fromUserId === request.toUserId) {
    const err = new Error('Cannot delegate to yourself');
    (err as any).statusCode = 400;
    throw err;
  }

  await safeQuery(
    `UPDATE "${schema}"."${table}" SET owner_id = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3`,
    [request.toUserId, request.fromUserId, request.entityId],
  );

  const auditResult = await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state)
     VALUES ($1, $2, 'risk', 'delegated', $3, $4, $5, $6) RETURNING id, created_at`,
    [tenantId, request.fromUserId, request.entityType, request.entityId,
     JSON.stringify({ owner_id: request.fromUserId }),
     JSON.stringify({ owner_id: request.toUserId, reason: request.reason, expiresAt: request.expiresAt })],
  ).catch(catchHandler(EC.EVENT_BUS)) as { rows: Record<string, unknown>[] } | undefined;

  const delegationId = String(auditResult?.rows?.[0]?.id ?? request.entityId);
  const createdAt = String(auditResult?.rows?.[0]?.created_at ?? new Date().toISOString());

  logger.info(`[risk-delegation] ownership delegated`, {
    entityId: request.entityId, entityType: request.entityType,
    from: request.fromUserId, to: request.toUserId,
  });

  return {
    delegationId,
    entityId: request.entityId,
    entityType: request.entityType,
    fromUserId: request.fromUserId,
    toUserId: request.toUserId,
    status: 'active',
    createdAt,
    expiresAt: request.expiresAt,
  };
}

export async function revokeDelegation(
  tenantId: string, entityId: string, entityType: string, userId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const _table = ENTITY_TABLE_MAP[entityType] || 'risks';
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, after_state)
     VALUES ($1, $2, 'risk', 'delegation_revoked', $3, $4, $5)`,
    [tenantId, userId, entityType, entityId, JSON.stringify({ revokedBy: userId })],
  ).catch(catchHandler(EC.EVENT_BUS));
  logger.info(`[risk-delegation] delegation revoked`, { entityId, entityType, revokedBy: userId });
}

export async function getDelegationHistory(
  tenantId: string, entityId: string,
): Promise<Array<{ action: string; fromUser: string; toUser: string; timestamp: string }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT user_id, action, before_state, after_state, created_at
       FROM "${schema}".audit_trail
       WHERE entity_id = $1 AND module = 'risk' AND action IN ('delegated', 'delegation_revoked')
       ORDER BY created_at DESC`,
      [entityId],
    );
    return result.rows.map((r: any) => ({
      action: r.action,
      fromUser: r.user_id,
      toUser: r.after_state?.owner_id ?? '',
      timestamp: r.created_at,
    }));
  } catch { return []; }
}
