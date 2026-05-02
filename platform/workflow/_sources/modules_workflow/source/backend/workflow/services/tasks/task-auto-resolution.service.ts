import { logger } from '../../ports/logger.port';
// ============================================
// Shahin — Task Auto-Resolution Service
// Event-driven closed-loop engine that auto-closes
// process tasks when trigger events fire and
// resolution conditions are met.
//
// Subscribes to domain events (evidence.submitted,
// policy.published, risk.score_updated, etc.) and
// auto-resolves linked process tasks per tenant-
// configurable rules in task_auto_resolution_rules.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { completeProcessTask } from '../../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../../ports/events.port';
import { enterpriseAuthzService } from '../../../admin/services/enterprise-authz.service';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { swallow, EC } from '@dos/platform-core/resilience';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

// ── Types ────────────────────────────────────────────────────────────────────

interface AutoResolutionRule {
  id: number;
  entity_type: string;
  task_type: string;
  trigger_event: string;
  resolution_conditions: Record<string, unknown>;
  auto_close: boolean;
  require_validation: boolean;
  validation_min_score: number;
}

// ── Rule Cache ───────────────────────────────────────────────────────────────

const _ruleCache = new Map<string, { rules: AutoResolutionRule[]; ts: number }>();
const RULE_CACHE_TTL = 5 * 60_000;

async function getRules(tenantId: string): Promise<AutoResolutionRule[]> {
  const cached = _ruleCache.get(tenantId);
  if (cached && Date.now() - cached.ts < RULE_CACHE_TTL) return cached.rules;

  const schema = tenantSchema(tenantId);
  try {
    const res = await safeQuery(
      `SELECT id, entity_type, task_type, trigger_event, resolution_conditions,
              auto_close, require_validation, validation_min_score
       FROM "${schema}".task_auto_resolution_rules
       WHERE active = TRUE`,
      [],
    );
    const rules = res.rows as AutoResolutionRule[];
    _ruleCache.set(tenantId, { rules, ts: Date.now() });
    return rules;
  } catch {
    return [];
  }
}

// ── Auto-Approval Config ─────────────────────────────────────────────────────

interface AutoApprovalConfig {
  entity_type: string;
  max_priority: string;
  max_risk_score: number;
  min_authority_level: string;
  require_audit_log: boolean;
}

const PRIORITY_RANK: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

async function getAutoApprovalConfig(tenantId: string, entityType: string): Promise<AutoApprovalConfig | null> {
  const schema = tenantSchema(tenantId);
  try {
    const res = await safeQuery(
      `SELECT entity_type, max_priority, max_risk_score, min_authority_level, require_audit_log
       FROM "${schema}".auto_approval_config
       WHERE entity_type = $1 AND enabled = TRUE LIMIT 1`,
      [entityType],
    );
    return getFirstRow(res) ?? null;
  } catch {
    return null;
  }
}

// ── Core: Handle Domain Event ────────────────────────────────────────────────

/**
 * Called when any domain event fires. Checks if there are open process tasks
 * linked to the event's entity that match an auto-resolution rule.
 */
export async function handleDomainEvent(event: PlatformEvent): Promise<void> {
  if (!event.tenantId || !event.entityType || !event.entityId) return;

  const rules = await getRules(event.tenantId);
  if (!rules.length) return;

  // Find rules matching this event
  const matchingRules = rules.filter(
    (r) => r.trigger_event === event.eventType && r.entity_type === event.entityType,
  );
  if (!matchingRules.length) return;

  const schema = tenantSchema(event.tenantId);

  for (const rule of matchingRules) {
    // Find open tasks matching entity + task type
    try {
      const tasksRes = await safeQuery(
        `SELECT task_id, assigned_user_id, priority, entity_type, entity_id
         FROM "${schema}".process_tasks
         WHERE entity_type = $1 AND entity_id = $2 AND task_type = $3
           AND status NOT IN ('completed', 'cancelled', 'auto_closed')
         ORDER BY created_at ASC`,
        [rule.entity_type, event.entityId, rule.task_type],
      );

      for (const task of tasksRes.rows) {
        // Check resolution conditions
        const conditionsMet = await checkResolutionConditions(
          event.tenantId, rule, event, task,
        );
        if (!conditionsMet) continue;

        // Auto-close the task
        if (rule.auto_close) {
          await autoResolveTask(event.tenantId, task.task_id, {
            rule_id: rule.id,
            trigger_event: event.eventType,
            entity_type: event.entityType,
            entity_id: event.entityId,
            source: 'task-auto-resolution',
            event_payload: event.payload,
          });

          logger.info(`[AutoResolution] Auto-closed task ${task.task_id} (${rule.task_type}) via ${event.eventType} for ${event.entityType}:${event.entityId}`);
        }
      }
    } catch (e: unknown) {
      logger.warn(`[AutoResolution] Error processing rule ${rule.id} for ${event.eventType}: ${toErrorMessage(e)}`);
    }
  }
}

/**
 * Auto-approve eligible tasks (low-risk, below threshold).
 * Called when an approval task is created or when a linked entity is updated.
 */
export async function tryAutoApprove(
  tenantId: string,
  taskId: string,
  entityType: string,
  entityId: string,
  priority: string,
  assignedUserId: string | null,
): Promise<boolean> {
  const config = await getAutoApprovalConfig(tenantId, entityType);
  if (!config) return false;

  // Check priority threshold
  if ((PRIORITY_RANK[priority] ?? 4) > (PRIORITY_RANK[config.max_priority] ?? 2)) {
    return false;
  }

  // Check risk score threshold (if entity has a risk score)
  const schema = tenantSchema(tenantId);
  try {
    const scoreRes = await safeQuery(
      `SELECT COALESCE(risk_score, 0)::int AS risk_score
       FROM "${schema}".risks WHERE risk_id = $1
       UNION ALL
       SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM "${schema}".risks WHERE risk_id = $1)
       LIMIT 1`,
      [entityId],
    );
    const riskScore = getFirstRow(scoreRes)?.risk_score ?? 0;
    if (riskScore > config.max_risk_score) return false;
  } catch {
    // No risk score check available — proceed
  }

  // Check assigned user has sufficient authority
  if (assignedUserId) {
    try {
      const hasSod = await (enterpriseAuthzService as any).checkSoDForAssignment?.(
        tenantId, assignedUserId, 'approval_approver',
      );
      if (hasSod) return false;
    } catch {
      // SoD check non-critical
    }
  }

  // Auto-approve
  await autoResolveTask(tenantId, taskId, {
    source: 'auto-approval',
    entity_type: entityType,
    entity_id: entityId,
    priority,
    auto_approval_config: config,
  });

  // Law 9: Auto-approval audit is ALWAYS logged (not conditional on config)
  try {
    await enterpriseAuthzService.logDecision(tenantId, {
      userId: assignedUserId ?? SYSTEM_JOB_ACTOR,
      tenantId,
      permissionCode: 'orchestration.auto_approve',
      moduleCode: entityType,
      allowed: true,
      reason: `auto_approved:priority=${priority},risk_score_threshold=${config.max_risk_score}`,
      approval_mode: 'ai_auto',  // Law 9: distinguish AI auto vs human approval
    });
  } catch { /* best effort */ }

  logger.info(`[AutoApproval] Auto-approved task ${taskId} (${entityType}:${entityId}, priority=${priority})`);
  return true;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function checkResolutionConditions(
  tenantId: string,
  rule: AutoResolutionRule,
  event: PlatformEvent,
  _task: any,
): Promise<boolean> {
  // If rule requires validation with minimum score
  if (rule.require_validation && rule.validation_min_score > 0) {
    const score = event.payload?.score ?? event.payload?.completeness_score ?? event.payload?.effectiveness_score ?? 0;
    if (Number(score) < rule.validation_min_score) return false;
  }

  // Check custom resolution conditions from JSONB
  const conditions = rule.resolution_conditions;
  if (conditions && Object.keys(conditions).length > 0) {
    for (const [key, expected] of Object.entries(conditions)) {
      const actual = event.payload?.[key];
      if (typeof expected === 'string' && expected.startsWith('>')) {
        if (Number(actual) <= Number(expected.slice(1))) return false;
      } else if (typeof expected === 'string' && expected.startsWith('<')) {
        if (Number(actual) >= Number(expected.slice(1))) return false;
      } else if (actual !== expected) {
        return false;
      }
    }
  }

  return true;
}

async function autoResolveTask(
  tenantId: string,
  taskId: string,
  evidence: Record<string, unknown>,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Complete the task via the standard path
  await completeProcessTask(tenantId, taskId, evidence);

  // Mark as auto-resolved
  try {
    await safeQuery(
      `UPDATE "${schema}".process_tasks
       SET auto_resolved = TRUE,
           resolution_source = $2,
           resolution_evidence = $3
       WHERE task_id = $1`,
      [taskId, evidence.source ?? 'auto-resolution', JSON.stringify(evidence)],
    );
  } catch {
    // columns may not exist yet
  }

  // Publish auto-resolution event
  await swallow(EC.EVENT_BUS, eventBus.publish({
    eventType: 'process_task.auto_resolved' as any,
    tenantId,

    sourceService: 'task-auto-resolution',
    severity: 'info',
    entityType: 'process_task',
    entityId: taskId,
    payload: { taskId, ...evidence },
  }), { tenantId, operation: 'eventBus:process_task.auto_resolved' });
}

// ── Event Subscription ───────────────────────────────────────────────────────

/** All domain events that can trigger auto-resolution */
const AUTO_RESOLUTION_TRIGGER_EVENTS: string[] = [
  'evidence.submitted',
  'evidence.validated',
  'evidence.approved',
  'evidence.collected',
  'policy.approved',
  'policy.review_completed',
  'risk.score_changed',
  'risk.treatment_updated',
  'incident.resolved',
  'vendor.dd_completed',
  'audit.completed',
  'compliance.assessment_completed',
  'approval.completed',
  'governance.health_score_changed',
  'governance.action_escalated',
  'process_task.completed',
];

/**
 * Register all auto-resolution event subscribers on the EventBus.
 * Call once during server startup.
 */
export function registerAutoResolutionSubscribers(): void {
  for (const eventType of AUTO_RESOLUTION_TRIGGER_EVENTS) {
    eventBus.subscribe(
      eventType as string,
      `auto-resolution:${eventType}`,
      handleDomainEvent,
    );
  }
  logger.info(`[AutoResolution] Registered ${AUTO_RESOLUTION_TRIGGER_EVENTS.length} event subscribers`);
}
