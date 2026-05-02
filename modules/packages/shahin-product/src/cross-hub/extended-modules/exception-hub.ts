// @ts-nocheck — module-layer imports not yet extracted
import { logger } from '@dos/platform-core/observability';
import { safeQuery } from '@dos/db';
import { tenantSchema } from '@dos/db';
import { Engine } from 'json-rules-engine';
import { z } from 'zod';
import { getFirstRow } from '@dos/db';
import { eventBus } from '@dos/platform-core/events';
import { toErrorMessage } from '@dos/module-sdk';
import { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';

const AssetDeploymentContextSchema = z.object({
  assetId: z.string().uuid(),
  assetName: z.string(),
  classification: z.enum(['public', 'internal', 'confidential', 'restricted']),
  residualRiskScore: z.number().min(0).max(100),
  activeVulnerabilities: z.number().int().min(0),
  compensatingControlsActive: z.boolean(),
});

export type AssetDeploymentContext = z.infer<typeof AssetDeploymentContextSchema>;

const GenericGateContextSchema = z.object({
  entityId: z.string(),
  entityType: z.string(),
}).passthrough();

export interface ExceptionGateResult {
  allowed: boolean;
  reason: string;
  matchedExceptionId?: string;
  matchedRuleIds: string[];
  requiredActions?: string[];
  evaluationDurationMs?: number;
  ruleCount?: number;
}

export interface GatingRuleRecord {
  rule_id: string;
  rule_code: string;
  entity_type: string;
  rule_name: string;
  description: string | null;
  conditions_json: any;
  event_type: string;
  priority: number;
  enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExceptionRecord {
  exception_id: string;
  entity_id: string;
  entity_type: string;
  status: string;
  reason: string;
  conditions: any;
  requested_by: string;
  approved_by: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface ExceptionRequestPayload {
  entityId: string;
  entityType: string;
  reason: string;
  requestedBy: string;
  compensatingControls?: string;
  expiresInDays?: number;
  conditions?: Record<string, unknown>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface GatingRuleCreatePayload {
  ruleCode: string;
  entityType: string;
  ruleName: string;
  description?: string;
  conditionsJson: Record<string, unknown>;
  eventType: string;
  priority?: number;
  createdBy?: string;
}

async function loadGatingRules(tenantId: string, entityType: string): Promise<GatingRuleRecord[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT rule_id, rule_code, entity_type, rule_name, description, conditions_json, event_type, priority, enabled, created_by, created_at, updated_at
     FROM "${schema}".exception_gating_rules
     WHERE entity_type = $1 AND enabled = true AND deleted_at IS NULL
     ORDER BY priority DESC`,
    [entityType],
  );
  return result.rows;
}

async function fetchActiveExceptionsForEntity(
  tenantId: string, entityId: string, entityType: string,
): Promise<ExceptionRecord[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT exception_id, entity_id, entity_type, status, reason, conditions, requested_by, approved_by, expires_at, created_at
     FROM "${schema}".exceptions
     WHERE entity_id = $1
       AND entity_type = $2
       AND status = 'approved'
       AND (expires_at IS NULL OR expires_at > NOW())
       AND deleted_at IS NULL`,
    [entityId, entityType],
  );
  return result.rows;
}

async function recordGateAudit(
  tenantId: string,
  entityType: string,
  entityId: string,
  gateAction: string,
  allowed: boolean,
  reason: string,
  matchedRuleIds: string[],
  matchedExceptionId: string | undefined,
  context: Record<string, unknown>,
  evaluatedBy?: string,
  durationMs?: number,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `INSERT INTO "${schema}".exception_gate_audit
        (entity_type, entity_id, gate_action, allowed, reason, matched_rule_ids, matched_exception_id, context_snapshot, evaluated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [entityType, entityId, gateAction, allowed, reason,
       JSON.stringify(matchedRuleIds), matchedExceptionId || null,
       JSON.stringify({ ...context, _evaluationDurationMs: durationMs }), evaluatedBy || SYSTEM_JOB_ACTOR],
    );
  } catch { /* best-effort audit */ }
}

export async function validateAssetDeployment(
  tenantId: string,
  context: unknown,
): Promise<ExceptionGateResult> {
  const parseResult = AssetDeploymentContextSchema.safeParse(context);
  if (!parseResult.success) {
    logger.warn(`[Exception-Hub] Rejected asset deployment due to invalid context schema`, { tenantId, errors: parseResult.error.issues });
    return { allowed: false, reason: 'Invalid deployment context schema provided by source module.', matchedRuleIds: [] };
  }

  const validContext = parseResult.data;
  return evaluateGate(tenantId, 'asset', validContext.assetId, 'asset_deployment', validContext);
}

export async function validateEntityGate(
  tenantId: string,
  entityType: string,
  entityId: string,
  gateAction: string,
  facts: Record<string, unknown>,
): Promise<ExceptionGateResult> {
  const parseResult = GenericGateContextSchema.safeParse({ entityId, entityType, ...facts });
  if (!parseResult.success) {
    return { allowed: false, reason: 'Invalid gate context.', matchedRuleIds: [] };
  }
  return evaluateGate(tenantId, entityType, entityId, gateAction, facts);
}

export async function evaluateBatchGate(
  tenantId: string,
  entityType: string,
  gateAction: string,
  entities: Array<{ entityId: string; facts: Record<string, unknown> }>,
): Promise<Map<string, ExceptionGateResult>> {
  const results = new Map<string, ExceptionGateResult>();
  const dbRules = await loadGatingRules(tenantId, entityType);
  const engine = new Engine();
  addRulesToEngine(engine, dbRules);

  for (const entry of entities) {
    const start = Date.now();
    const activeExceptions = await fetchActiveExceptionsForEntity(tenantId, entry.entityId, entityType);
    const matchedRuleIds: string[] = [];

    const facts = {
      ...entry.facts,
      hasActiveException: activeExceptions.length > 0,
      activeExceptionCount: activeExceptions.length,
    };

    const engineResults = await engine.run(facts);
    const durationMs = Date.now() - start;

    if (engineResults.events.length > 0) {
      for (const ev of engineResults.events) {
        if (ev.params?.ruleId) matchedRuleIds.push(ev.params.ruleId as string);
      }
      const result: ExceptionGateResult = {
        allowed: true,
        reason: `Gate authorized by ${engineResults.events.length} rule(s).`,
        matchedExceptionId: activeExceptions.length > 0 ? activeExceptions[0].exception_id : undefined,
        matchedRuleIds,
        evaluationDurationMs: durationMs,
        ruleCount: dbRules.length,
      };
      await recordGateAudit(tenantId, entityType, entry.entityId, gateAction, true, result.reason, matchedRuleIds, result.matchedExceptionId, entry.facts, SYSTEM_JOB_ACTOR, durationMs);
      results.set(entry.entityId, result);
    } else {
      const result: ExceptionGateResult = {
        allowed: false,
        reason: `Zero-Trust Gate: ${gateAction} blocked for ${entityType}. Policy rules not satisfied.`,
        matchedRuleIds: [],
        requiredActions: ['Request a temporary exception with compensating controls', 'Reduce residual risk score below threshold'],
        evaluationDurationMs: durationMs,
        ruleCount: dbRules.length,
      };
      await recordGateAudit(tenantId, entityType, entry.entityId, gateAction, false, result.reason, [], undefined, entry.facts, SYSTEM_JOB_ACTOR, durationMs);
      results.set(entry.entityId, result);
    }
  }
  return results;
}

function addRulesToEngine(engine: Engine, dbRules: GatingRuleRecord[]): void {
  if (dbRules.length > 0) {
    for (const dbRule of dbRules) {
      try {
        engine.addRule({
          conditions: typeof dbRule.conditions_json === 'string' ? JSON.parse(dbRule.conditions_json) : dbRule.conditions_json,
          event: { type: dbRule.event_type, params: { ruleId: dbRule.rule_id, ruleCode: dbRule.rule_code } },
          priority: dbRule.priority,
        });
      } catch (err) {
        logger.warn(`[Exception-Hub] Skipped malformed rule ${dbRule.rule_code}`, err);
      }
    }
  } else {
    engine.addRule({
      conditions: {
        any: [
          {
            all: [
              { fact: 'residualRiskScore', operator: 'greaterThanInclusive', value: 70 },
              { fact: 'compensatingControlsActive', operator: 'equal', value: true },
              { fact: 'hasActiveException', operator: 'equal', value: true },
            ],
          },
          {
            all: [
              { fact: 'residualRiskScore', operator: 'lessThan', value: 70 },
              { fact: 'activeVulnerabilities', operator: 'lessThanInclusive', value: 2 },
            ],
          },
        ],
      },
      event: { type: 'deployment_authorized', params: { ruleId: 'builtin-zero-trust', ruleCode: 'zero-trust-high-risk' } },
    });
  }
}

async function evaluateGate(
  tenantId: string,
  entityType: string,
  entityId: string,
  gateAction: string,
  contextFacts: Record<string, unknown>,
): Promise<ExceptionGateResult> {
  const start = Date.now();
  const dbRules = await loadGatingRules(tenantId, entityType);
  const activeExceptions = await fetchActiveExceptionsForEntity(tenantId, entityId, entityType);

  const engine = new Engine();
  const matchedRuleIds: string[] = [];
  addRulesToEngine(engine, dbRules);

  const facts = {
    ...contextFacts,
    hasActiveException: activeExceptions.length > 0,
    activeExceptionCount: activeExceptions.length,
  };

  const engineResults = await engine.run(facts);
  const durationMs = Date.now() - start;

  if (engineResults.events.length > 0) {
    for (const ev of engineResults.events) {
      if (ev.params?.ruleId) matchedRuleIds.push(ev.params.ruleId as string);
    }

    const result: ExceptionGateResult = {
      allowed: true,
      reason: `Gate authorized by ${engineResults.events.length} rule(s).`,
      matchedExceptionId: activeExceptions.length > 0 ? activeExceptions[0].exception_id : undefined,
      matchedRuleIds,
      evaluationDurationMs: durationMs,
      ruleCount: dbRules.length,
    };

    logger.info(`[Exception-Hub] ${gateAction} authorized for ${entityType}:${entityId}`, { tenantId, durationMs });
    await recordGateAudit(tenantId, entityType, entityId, gateAction, true, result.reason, matchedRuleIds, result.matchedExceptionId, contextFacts, SYSTEM_JOB_ACTOR, durationMs);

    await eventBus.publish({
      eventType: 'exception.gate_passed',
      tenantId,
      severity: 'info',
      entityType,
      entityId,
      payload: { gateAction, matchedRuleIds, matchedExceptionId: result.matchedExceptionId },
    }).catch(() => {});

    return result;
  }

  const result: ExceptionGateResult = {
    allowed: false,
    reason: `Zero-Trust Gate: ${gateAction} blocked for ${entityType}. Policy rules not satisfied.`,
    matchedRuleIds: [],
    requiredActions: [
      'Request a temporary exception with compensating controls',
      'Reduce residual risk score below threshold',
    ],
    evaluationDurationMs: durationMs,
    ruleCount: dbRules.length,
  };

  logger.warn(`[Exception-Hub] ${gateAction} BLOCKED for ${entityType}:${entityId}`, { tenantId, durationMs });
  await recordGateAudit(tenantId, entityType, entityId, gateAction, false, result.reason, [], undefined, contextFacts, SYSTEM_JOB_ACTOR, durationMs);

  await eventBus.publish({
    eventType: 'exception.gate_blocked',
    tenantId,
    severity: 'warning',
    entityType,
    entityId,
    payload: { gateAction, requiredActions: result.requiredActions },
  }).catch(() => {});

  return result;
}

export async function createGatingRule(
  tenantId: string,
  payload: GatingRuleCreatePayload,
): Promise<GatingRuleRecord> {
  const schema = tenantSchema(tenantId);
  const conditionsStr = typeof payload.conditionsJson === 'string' ? payload.conditionsJson : JSON.stringify(payload.conditionsJson);

  try {
    const testEngine = new Engine();
    testEngine.addRule({
      conditions: typeof payload.conditionsJson === 'string' ? JSON.parse(payload.conditionsJson) : payload.conditionsJson,
      event: { type: payload.eventType },
    });
  } catch (err) {
    throw new Error(`Invalid rule conditions: ${toErrorMessage(err)}`);
  }

  const result = await safeQuery(
    `INSERT INTO "${schema}".exception_gating_rules
       (rule_code, entity_type, rule_name, description, conditions_json, event_type, priority, created_by)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
     RETURNING *`,
    [payload.ruleCode, payload.entityType, payload.ruleName, payload.description || null,
     conditionsStr, payload.eventType, payload.priority ?? 100, payload.createdBy || null],
  );

  const rule = getFirstRow(result);
  logger.info(`[Exception-Hub] Gating rule created: ${payload.ruleCode}`, { tenantId });

  await eventBus.publish({
    eventType: 'exception.rule_created',
    tenantId,
    severity: 'info',
    entityType: 'gating_rule',
    entityId: rule.rule_id,
    payload: { ruleCode: payload.ruleCode, entityType: payload.entityType },
  }).catch(() => {});

  return rule;
}

export async function updateGatingRule(
  tenantId: string,
  ruleId: string,
  updates: Partial<Pick<GatingRuleCreatePayload, 'ruleName' | 'description' | 'conditionsJson' | 'eventType' | 'priority'>>,
): Promise<GatingRuleRecord | null> {
  const schema = tenantSchema(tenantId);
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (updates.ruleName !== undefined) { sets.push(`rule_name = $${idx++}`); params.push(updates.ruleName); }
  if (updates.description !== undefined) { sets.push(`description = $${idx++}`); params.push(updates.description); }
  if (updates.conditionsJson !== undefined) {
    try {
      const testEngine = new Engine();
      testEngine.addRule({
        conditions: updates.conditionsJson as Record<string, unknown>,
        event: { type: updates.eventType || 'test' },
      });
    } catch (err) {
      throw new Error(`Invalid rule conditions: ${toErrorMessage(err)}`);
    }
    sets.push(`conditions_json = $${idx++}::jsonb`);
    params.push(JSON.stringify(updates.conditionsJson));
  }
  if (updates.eventType !== undefined) { sets.push(`event_type = $${idx++}`); params.push(updates.eventType); }
  if (updates.priority !== undefined) { sets.push(`priority = $${idx++}`); params.push(updates.priority); }

  if (sets.length === 0) return null;
  sets.push(`updated_at = NOW()`);
  params.push(ruleId);

  const result = await safeQuery(
    `UPDATE "${schema}".exception_gating_rules SET ${sets.join(', ')} WHERE rule_id = $${idx} AND deleted_at IS NULL RETURNING *`,
    params,
  );
  return getFirstRow(result);
}

export async function deleteGatingRule(tenantId: string, ruleId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".exception_gating_rules SET deleted_at = NOW(), enabled = false WHERE rule_id = $1 AND deleted_at IS NULL`,
    [ruleId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function toggleGatingRule(tenantId: string, ruleId: string, enabled: boolean): Promise<GatingRuleRecord | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".exception_gating_rules SET enabled = $1, updated_at = NOW() WHERE rule_id = $2 AND deleted_at IS NULL RETURNING *`,
    [enabled, ruleId],
  );
  return getFirstRow(result);
}

export async function listGatingRules(tenantId: string, entityType?: string): Promise<GatingRuleRecord[]> {
  const schema = tenantSchema(tenantId);
  if (entityType) {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".exception_gating_rules WHERE entity_type = $1 AND deleted_at IS NULL ORDER BY priority DESC, created_at DESC`,
      [entityType],
    );
    return result.rows;
  }
  const result = await safeQuery(
    `SELECT * FROM "${schema}".exception_gating_rules WHERE deleted_at IS NULL ORDER BY priority DESC, created_at DESC`,
  );
  return result.rows;
}

export async function getGatingRuleById(tenantId: string, ruleId: string): Promise<GatingRuleRecord | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".exception_gating_rules WHERE rule_id = $1 AND deleted_at IS NULL`,
    [ruleId],
  );
  return getFirstRow(result);
}

export async function requestException(
  tenantId: string,
  payload: ExceptionRequestPayload,
): Promise<ExceptionRecord> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `INSERT INTO "${schema}".exceptions
       (entity_id, entity_type, status, reason, requested_by, compensating_controls, conditions, priority, expires_at)
     VALUES ($1, $2, 'pending_approval', $3, $4, $5, $6::jsonb, $7, CASE WHEN $8::int IS NOT NULL THEN NOW() + make_interval(days => $8::int) ELSE NULL END)
     RETURNING *`,
    [payload.entityId, payload.entityType, payload.reason, payload.requestedBy,
     payload.compensatingControls || null,
     JSON.stringify(payload.conditions || {}),
     payload.priority || 'medium',
     payload.expiresInDays ?? null],
  );

  const exception = getFirstRow(result);
  logger.info(`[Exception-Hub] Exception requested for ${payload.entityType}:${payload.entityId}`, { tenantId });

  await eventBus.publish({
    eventType: 'exception.requested',
    tenantId,
    severity: 'info',
    entityType: payload.entityType,
    entityId: payload.entityId,
    payload: { exceptionId: exception.exception_id, reason: payload.reason, priority: payload.priority },
  }).catch(() => {});

  return exception;
}

export async function approveException(
  tenantId: string,
  exceptionId: string,
  approvedBy: string,
  expiresInDays?: number,
): Promise<ExceptionRecord | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `UPDATE "${schema}".exceptions
     SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW(),
       expires_at = CASE WHEN $3::int IS NOT NULL THEN NOW() + make_interval(days => $3::int) ELSE expires_at END
     WHERE exception_id = $2 AND status = 'pending_approval' AND deleted_at IS NULL
     RETURNING *`,
    [approvedBy, exceptionId, expiresInDays ?? null],
  );
  const exception = getFirstRow(result);
  if (exception) {
    logger.info(`[Exception-Hub] Exception ${exceptionId} approved by ${approvedBy}`, { tenantId });
    await eventBus.publish({
      eventType: 'exception.approved',
      tenantId,
      severity: 'info',
      entityType: exception.entity_type,
      entityId: exception.entity_id,
      payload: { exceptionId, approvedBy },
    }).catch(() => {});
  }
  return exception;
}

export async function rejectException(
  tenantId: string,
  exceptionId: string,
  rejectedBy: string,
  rejectionReason: string,
): Promise<ExceptionRecord | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".exceptions
     SET status = 'rejected', approved_by = $1, rejection_reason = $2, updated_at = NOW()
     WHERE exception_id = $3 AND status = 'pending_approval' AND deleted_at IS NULL
     RETURNING *`,
    [rejectedBy, rejectionReason, exceptionId],
  );
  const exception = getFirstRow(result);
  if (exception) {
    await eventBus.publish({
      eventType: 'exception.rejected',
      tenantId,
      severity: 'warning',
      entityType: exception.entity_type,
      entityId: exception.entity_id,
      payload: { exceptionId, rejectedBy, rejectionReason },
    }).catch(() => {});
  }
  return exception;
}

export async function revokeException(
  tenantId: string,
  exceptionId: string,
  revokedBy: string,
  reason: string,
): Promise<ExceptionRecord | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".exceptions
     SET status = 'revoked', revoked_by = $1, revocation_reason = $2, updated_at = NOW()
     WHERE exception_id = $3 AND status = 'approved' AND deleted_at IS NULL
     RETURNING *`,
    [revokedBy, reason, exceptionId],
  );
  const exception = getFirstRow(result);
  if (exception) {
    logger.warn(`[Exception-Hub] Exception ${exceptionId} revoked by ${revokedBy}: ${reason}`, { tenantId });
    await eventBus.publish({
      eventType: 'exception.revoked',
      tenantId,
      severity: 'critical',
      entityType: exception.entity_type,
      entityId: exception.entity_id,
      payload: { exceptionId, revokedBy, reason },
    }).catch(() => {});
  }
  return exception;
}

export async function getExpiringExceptions(
  tenantId: string,
  withinDays: number = 7,
): Promise<ExceptionRecord[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".exceptions
     WHERE status = 'approved'
       AND expires_at IS NOT NULL
       AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '1 day' * $1
       AND deleted_at IS NULL
     ORDER BY expires_at ASC`,
    [withinDays],
  );
  return result.rows;
}

export async function autoExpireExceptions(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".exceptions
     SET status = 'expired', updated_at = NOW()
     WHERE status = 'approved'
       AND expires_at IS NOT NULL
       AND expires_at <= NOW()
       AND deleted_at IS NULL`,
  );
  const count = result.rowCount ?? 0;
  if (count > 0) {
    logger.info(`[Exception-Hub] Auto-expired ${count} exception(s)`, { tenantId });
    await eventBus.publish({
      eventType: 'exception.batch_expired',
      tenantId,
      severity: 'warning',
      payload: { expiredCount: count },
    }).catch(() => {});
  }
  return count;
}

export async function getActiveExceptionsForEntity(
  tenantId: string, entityId: string, entityType: string,
): Promise<ExceptionRecord[]> {
  return fetchActiveExceptionsForEntity(tenantId, entityId, entityType);
}

export async function getGateAuditHistory(
  tenantId: string,
  entityType: string,
  entityId: string,
  limit = 25,
  offset = 0,
): Promise<{ rows: Array<Record<string, unknown>>; total: number }> {
  const schema = tenantSchema(tenantId);
  const [dataResult, countResult] = await Promise.all([
    safeQuery(
      `SELECT * FROM "${schema}".exception_gate_audit
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY evaluated_at DESC LIMIT $3 OFFSET $4`,
      [entityType, entityId, limit, offset],
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".exception_gate_audit
       WHERE entity_type = $1 AND entity_id = $2`,
      [entityType, entityId],
    ),
  ]);
  return { rows: dataResult.rows, total: getFirstRow(countResult)?.cnt ?? 0 };
}

export async function getExceptionGateSummary(tenantId: string): Promise<{
  totalEvaluations: number;
  allowed: number;
  blocked: number;
  activeRules: number;
  activeExceptions: number;
  expiringWithin7Days: number;
  topBlockedEntities: Array<{ entity_type: string; entity_id: string; block_count: number }>;
}> {
  const schema = tenantSchema(tenantId);
  const [evalResult, ruleResult, excResult, expiringResult, topBlockedResult] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE allowed = true)::int AS allowed,
         COUNT(*) FILTER (WHERE allowed = false)::int AS blocked
       FROM "${schema}".exception_gate_audit
       WHERE evaluated_at >= NOW() - INTERVAL '30 days'`,
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".exception_gating_rules WHERE enabled = true AND deleted_at IS NULL`,
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".exceptions
       WHERE status = 'approved' AND (expires_at IS NULL OR expires_at > NOW()) AND deleted_at IS NULL`,
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".exceptions
       WHERE status = 'approved' AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND deleted_at IS NULL`,
    ),
    safeQuery(
      `SELECT entity_type, entity_id, COUNT(*)::int AS block_count
       FROM "${schema}".exception_gate_audit
       WHERE allowed = false AND evaluated_at >= NOW() - INTERVAL '30 days'
       GROUP BY entity_type, entity_id ORDER BY block_count DESC LIMIT 10`,
    ),
  ]);
  const stats = getFirstRow(evalResult);
  return {
    totalEvaluations: stats?.total ?? 0,
    allowed: stats?.allowed ?? 0,
    blocked: stats?.blocked ?? 0,
    activeRules: getFirstRow(ruleResult)?.cnt ?? 0,
    activeExceptions: getFirstRow(excResult)?.cnt ?? 0,
    expiringWithin7Days: getFirstRow(expiringResult)?.cnt ?? 0,
    topBlockedEntities: topBlockedResult.rows,
  };
}

export async function getRuleEffectiveness(tenantId: string, ruleId: string): Promise<{
  totalEvaluations: number;
  triggered: number;
  triggerRate: number;
}> {
  const schema = tenantSchema(tenantId);
  const [totalResult, triggeredResult] = await Promise.all([
    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".exception_gate_audit
       WHERE evaluated_at >= NOW() - INTERVAL '90 days'`,
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".exception_gate_audit
       WHERE matched_rule_ids @> $1::jsonb
         AND evaluated_at >= NOW() - INTERVAL '90 days'`,
      [JSON.stringify([ruleId])],
    ),
  ]);
  const total = getFirstRow(totalResult)?.cnt ?? 0;
  const triggered = getFirstRow(triggeredResult)?.cnt ?? 0;
  return {
    totalEvaluations: total,
    triggered,
    triggerRate: total > 0 ? Math.round((triggered / total) * 10000) / 100 : 0,
  };
}
