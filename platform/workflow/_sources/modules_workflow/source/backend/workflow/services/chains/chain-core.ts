/**
 * Chain Core — Single source of truth for all chain state logic.
 *
 * Both workflow-chain-executor.service.ts (REST/admin) and
 * cross-module-chain-handler.service.ts (event-driven runtime)
 * delegate ALL state interpretation to functions in this file.
 *
 * Neither service loads definitions, evaluates conditions, creates
 * instances, advances steps, or checks SoD on its own.
 */

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { createProcessTask, type ProcessTaskType } from '../../ports/lifecycle.port';
import { eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
import { normalizeChainStepsForCrossModule } from '../../utils/workflow-chain-step-normalize';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChainStep {
  stepNo: number;
  moduleCode: string;
  eventTrigger?: string;
  taskType: string;
  roleCode: string;
  slaHours: number;
  nextEvent?: string;
  condition?: { field: string; op: string; value: string };
}

export interface ChainSodRule {
  roleA: string; moduleA: string;
  roleB: string; moduleB: string;
  level: 'block' | 'warn';
}

export interface ChainDefinition {
  chainCode: string;
  nameEn: string;
  steps: ChainStep[];
  sodRules: ChainSodRule[];
  isActive: boolean;
}

export interface ChainInstance {
  instanceId: string;
  chainCode: string;
  tenantId: string;
  currentStep: number;
  status: string;
  context: Record<string, unknown>;
  triggerEntityType?: string;
  triggerEntityId?: string;
}

export interface StartChainResult {
  instanceId: string;
  chainCode: string;
  currentStep: number;
  status: string;
  alreadyExisted: boolean;
}

export interface AdvanceChainResult {
  instanceId: string;
  previousStep: number;
  nextStep: number | null;
  chainComplete: boolean;
  status: string;
}

export interface SodCheckResult {
  passed: boolean;
  violations: Array<{ ruleDescription: string; level: 'block' | 'warn' }>;
}

// ── Valid ProcessTaskType values ──────────────────────────────────────────────

const VALID_TASK_TYPES: Set<string> = new Set([
  'evidence_request', 'control_review', 'risk_assessment', 'policy_creation',
  'audit_response', 'incident_response', 'remediation', 'approval', 'verification',
  'training_assignment', 'workflow_task', 'workflow_approval',
  'vendor_risk_propagation', 'vendor_gap_remediation', 'vendor_evidence_review',
  'vendor_audit_finding', 'vendor_framework_sync',
  'asset_review', 'exception_review', 'training_review', 'training_content_review',
  'training_content_creation', 'issue_triage', 'qiyas_reassessment', 'qiyas_score_review',
  'ai_governance_review', 'foundation_review', 'report_regeneration', 'report_generation',
  'ai_analysis', 'ai_classification', 'ai_execution', 'integration_health_check',
  'admin_review', 'workflow_trigger', 'portal_review', 'records_review',
  'records_retention_review', 'records_archival', 'privacy_breach_response',
  'privacy_review', 'privacy_impact_assessment', 'privacy_notice_review',
  'team_review', 'team_reassignment',
]);

function toProcessTaskType(t: string): ProcessTaskType {
  return (VALID_TASK_TYPES.has(t) ? t : 'verification') as ProcessTaskType;
}

// ── Definition Loading ───────────────────────────────────────────────────────

export async function loadChainDefinition(
  schema: string,
  chainCode: string,
): Promise<ChainDefinition | null> {
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_chain_definitions WHERE chain_code = $1`,
    [chainCode],
  );
  if (!result.rows.length) return null;
  const row = getFirstRow(result)!;
  const rawSteps = typeof row.steps === 'string' ? JSON.parse(row.steps || '[]') : row.steps || [];
  const normalized = normalizeChainStepsForCrossModule(rawSteps);
  const sodRules =
    (typeof row.sod_rules === 'string' ? JSON.parse(row.sod_rules || '[]') : row.sod_rules) || [];
  return {
    chainCode: row.chain_code,
    nameEn: row.name_en,
    steps: normalized,
    sodRules,
    isActive: row.is_active !== false,
  };
}

export async function loadAllChainDefinitions(
  schema: string,
  activeOnly = true,
): Promise<ChainDefinition[]> {
  const sql = activeOnly
    ? `SELECT * FROM "${schema}".workflow_chain_definitions WHERE is_active = TRUE ORDER BY chain_code`
    : `SELECT * FROM "${schema}".workflow_chain_definitions ORDER BY chain_code`;
  const result = await safeQuery(sql);

  return result.rows.map((row: Record<string, unknown>) => {
    const rawSteps = typeof row.steps === 'string' ? JSON.parse(row.steps || '[]') : row.steps || [];
    const normalized = normalizeChainStepsForCrossModule(rawSteps);
    const sodRules =
      (typeof row.sod_rules === 'string' ? JSON.parse(row.sod_rules || '[]') : row.sod_rules) || [];
    return {
      chainCode: row.chain_code,
      nameEn: row.name_en,
      steps: normalized,
      sodRules,
      isActive: row.is_active !== false,
    };
  });
}

// ── Idempotency / Lock ───────────────────────────────────────────────────────

/**
 * Acquire a chain lock: checks if there's already an active instance
 * for this (chain_code, trigger_entity_type, trigger_entity_id).
 *
 * Uses the partial unique index uq_chain_active_trigger (migration 707)
 * to prevent duplicate starts for non-terminal instances.
 *
 * Returns the existing instance_id if one exists, null if free to create.
 */
/**
 * Check if there's already an active chain instance for this trigger.
 * Uses the partial unique index uq_chain_active_trigger (migration 707).
 * workflow_chain_instances.status CHECK allows: 'active','completed','cancelled','failed'
 */
export async function acquireChainLock(
  schema: string,
  chainCode: string,
  triggerEntityType: string,
  triggerEntityId: string,
): Promise<string | null> {
  const existing = await safeQuery(
    `SELECT instance_id FROM "${schema}".workflow_chain_instances
     WHERE chain_code = $1 AND trigger_entity_type = $2
     AND trigger_entity_id = $3 AND status = 'active'
     LIMIT 1`,
    [chainCode, triggerEntityType, triggerEntityId],
  );
  return existing.rows.length > 0 ? getFirstRow(existing)?.instance_id : null;
}

// ── Instance Creation ────────────────────────────────────────────────────────

export async function createChainInstance(
  schema: string,
  tenantId: string,
  chainCode: string,
  triggerEntityType: string,
  triggerEntityId: string,
  context: Record<string, unknown>,
  createdBy?: string,
): Promise<string> {
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_chain_instances
     (chain_code, tenant_id, current_step, status, context, trigger_entity_type, trigger_entity_id, created_by)
     VALUES ($1, $2, 1, 'active', $3, $4, $5, $6)
     RETURNING instance_id`,
    [chainCode, tenantId, JSON.stringify(context), triggerEntityType, triggerEntityId, createdBy || null],
  );
  return getFirstRow(result)?.instance_id;
}

// ── Instance Loading ─────────────────────────────────────────────────────────

export async function loadChainInstance(
  schema: string,
  instanceId: string,
  activeOnly = true,
): Promise<ChainInstance | null> {
  const sql = activeOnly
    ? `SELECT * FROM "${schema}".workflow_chain_instances WHERE instance_id = $1 AND status = 'active'`
    : `SELECT * FROM "${schema}".workflow_chain_instances WHERE instance_id = $1`;
  const result = await safeQuery(sql, [instanceId]);
  if (!result.rows.length) return null;
  return mapInstanceRow(getFirstRow(result));
}

// ── Step Evaluation & Condition ──────────────────────────────────────────────

export function evaluateStepCondition(
  condition: { field: string; op: string; value: string },
  context: Record<string, unknown>,
): boolean {
  const actual = context[condition.field];
  if (actual === undefined || actual === null) return false;

  const severityOrder: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

  switch (condition.op) {
    case 'eq': return String(actual) === condition.value;
    case 'neq': return String(actual) !== condition.value;
    case 'gte': return (severityOrder[(actual as any)] || 0) >= (severityOrder[condition.value] || 0);
    case 'gt': return (severityOrder[(actual as any)] || 0) > (severityOrder[condition.value] || 0);
    case 'lte': return (severityOrder[(actual as any)] || 0) <= (severityOrder[condition.value] || 0);
    default: return true;
  }
}

// ── SoD Check ────────────────────────────────────────────────────────────────

export async function checkSodViolation(
  schema: string,
  chain: ChainDefinition,
  stepNo: number,
  userId: string,
  instanceId: string,
): Promise<SodCheckResult> {
  const violations: SodCheckResult['violations'] = [];

  for (const rule of chain.sodRules) {
    // Find which steps the SoD rule refers to
    const stepA = chain.steps.find(s => s.moduleCode === rule.moduleA && s.roleCode === rule.roleA);
    const stepB = chain.steps.find(s => s.moduleCode === rule.moduleB && s.roleCode === rule.roleB);

    if (!stepA || !stepB) continue;
    if (stepA.stepNo !== stepNo && stepB.stepNo !== stepNo) continue;

    // Find the other step's actor
    const otherStepNo = stepA.stepNo === stepNo ? stepB.stepNo : stepA.stepNo;
    const logResult = await safeQuery(
      `SELECT actor_user_id FROM "${schema}".workflow_chain_step_log
       WHERE instance_id = $1 AND step_no = $2 AND status = 'completed'
       ORDER BY completed_at DESC LIMIT 1`,
      [instanceId, otherStepNo],
    );

    if (logResult.rows.length > 0) {
      const otherActor = getFirstRow(logResult)?.actor_user_id;
      if (otherActor === userId) {
        violations.push({
          ruleDescription: `SoD: ${rule.roleA}@${rule.moduleA} and ${rule.roleB}@${rule.moduleB} must be different users`,
          level: rule.level,
        });
      }
    }
  }

  return {
    passed: violations.filter(v => v.level === 'block').length === 0,
    violations,
  };
}

// ── Step Execution ───────────────────────────────────────────────────────────

/**
 * Execute a chain step: evaluate condition, create process task, log step.
 * Auto-advances to the next step if condition is not met (skip).
 */
export async function executeChainStep(
  tenantId: string,
  instanceId: string,
  chain: ChainDefinition,
  stepNo: number,
  context: Record<string, unknown>,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const step = chain.steps.find(s => s.stepNo === stepNo);
  if (!step) return;

  // Evaluate step condition
  if (step.condition) {
    const conditionMet = evaluateStepCondition(step.condition, context);
    if (!conditionMet) {
      // Skip this step
      await safeQuery(
        `INSERT INTO "${schema}".workflow_chain_step_log
         (instance_id, step_no, module_code, task_type, status, notes)
         VALUES ($1, $2, $3, $4, 'skipped', 'Condition not met')`,
        [instanceId, stepNo, step.moduleCode, step.taskType],
      );

      // Advance to next step
      const nextStepNo = stepNo + 1;
      await safeQuery(
        `UPDATE "${schema}".workflow_chain_instances SET current_step = $2 WHERE instance_id = $1`,
        [instanceId, nextStepNo],
      );
      await executeChainStep(tenantId, instanceId, chain, nextStepNo, context);
      return;
    }
  }

  // Create process task
  try {
    const task = await createProcessTask(tenantId, {
      title: `[${chain.nameEn}] Step ${stepNo}: ${step.moduleCode}`,
      description: `Chain ${chain.chainCode}, step ${stepNo}. Module: ${step.moduleCode}`,
      taskType: toProcessTaskType(step.taskType),
      priority: context.severity === 'critical' ? 'critical' : context.severity === 'high' ? 'high' : 'medium',
      entityType: step.moduleCode,
      entityId: context[`${step.moduleCode}EntityId`] || context.triggerEntityId || null,
      dueInHours: step.slaHours,
      triggerSource: `chain:${chain.chainCode}`,
      triggerData: { instanceId, stepNo, chainCode: chain.chainCode },
      assigneeRole: step.roleCode,
      createdBy: context.createdBy || null,
    });

    // Log step
    await safeQuery(
      `INSERT INTO "${schema}".workflow_chain_step_log
       (instance_id, step_no, module_code, task_type, task_id, status, started_at)
       VALUES ($1, $2, $3, $4, $5, 'in_progress', NOW())`,
      [instanceId, stepNo, step.moduleCode, step.taskType, task.taskId],
    );

    // Emit chain step event
    emitChainEvent('crosshub.chain_step_started', tenantId, {
      instanceId, chainCode: chain.chainCode, stepNo,
      moduleCode: step.moduleCode, taskId: task.taskId,
    });

  } catch (err) {
    await safeQuery(
      `INSERT INTO "${schema}".workflow_chain_step_log
       (instance_id, step_no, module_code, task_type, status, notes)
       VALUES ($1, $2, $3, $4, 'failed', $5)`,
      [instanceId, stepNo, step.moduleCode, step.taskType, String(err)],
    );

    await safeQuery(
      `UPDATE "${schema}".workflow_chain_instances SET status = 'failed' WHERE instance_id = $1`,
      [instanceId],
    );
  }
}

// ── Chain Start (Idempotent) ─────────────────────────────────────────────────

/**
 * Start a new chain instance. Idempotent: returns existing if active.
 * Uses acquireChainLock() backed by partial unique index.
 */
export async function startChain(
  tenantId: string,
  chainCode: string,
  triggerEntityType: string,
  triggerEntityId: string,
  context: Record<string, unknown> = {},
  createdBy?: string,
): Promise<StartChainResult | null> {
  const schema = tenantSchema(tenantId);

  // Load definition
  const chain = await loadChainDefinition(schema, chainCode);
  if (!chain || !chain.isActive) return null;

  // Idempotency check
  const existingId = await acquireChainLock(schema, chainCode, triggerEntityType, triggerEntityId);
  if (existingId) {
    return { instanceId: existingId, chainCode, currentStep: 1, status: 'active', alreadyExisted: true };
  }

  // Create instance
  const instanceId = await createChainInstance(
    schema, tenantId, chainCode, triggerEntityType, triggerEntityId, context, createdBy,
  );
  if (!instanceId) return null;

  // Execute first step
  await executeChainStep(tenantId, instanceId, chain, 1, context);

  emitChainEvent('crosshub.cascade_triggered', tenantId, {
    instanceId, chainCode, triggerEntityType, triggerEntityId,
  });

  return { instanceId, chainCode, currentStep: 1, status: 'active', alreadyExisted: false };
}

// ── Chain Advance ────────────────────────────────────────────────────────────

/**
 * Advance a chain when a step's task completes.
 */
export async function advanceChainStep(
  tenantId: string,
  instanceId: string,
  completedTaskId: string,
): Promise<AdvanceChainResult | null> {
  const schema = tenantSchema(tenantId);

  // Load instance
  const instance = await loadChainInstance(schema, instanceId);
  if (!instance) return null;

  // Mark current step as completed
  await safeQuery(
    `UPDATE "${schema}".workflow_chain_step_log
     SET status = 'completed', completed_at = NOW()
     WHERE instance_id = $1 AND step_no = $2 AND task_id = $3`,
    [instanceId, instance.currentStep, completedTaskId],
  );

  // Load definition
  const chain = await loadChainDefinition(schema, instance.chainCode);
  if (!chain) return null;

  const nextStepNo = instance.currentStep + 1;
  const nextStep = chain.steps.find(s => s.stepNo === nextStepNo);

  if (!nextStep) {
    // Chain complete
    await safeQuery(
      `UPDATE "${schema}".workflow_chain_instances
       SET status = 'completed', completed_at = NOW(), current_step = $2
       WHERE instance_id = $1`,
      [instanceId, instance.currentStep],
    );

    emitChainEvent('crosshub.chain_completed', tenantId, {
      instanceId, chainCode: instance.chainCode, context: instance.context,
    });

    return {
      instanceId,
      previousStep: instance.currentStep,
      nextStep: null,
      chainComplete: true,
      status: 'completed',
    };
  }

  // Advance to next step
  await safeQuery(
    `UPDATE "${schema}".workflow_chain_instances
     SET current_step = $2, context = $3
     WHERE instance_id = $1`,
    [instanceId, nextStepNo, JSON.stringify(instance.context)],
  );

  await executeChainStep(tenantId, instanceId, chain, nextStepNo, instance.context);

  return {
    instanceId,
    previousStep: instance.currentStep,
    nextStep: nextStepNo,
    chainComplete: false,
    status: 'active',
  };
}

// ── Chain Cancel ─────────────────────────────────────────────────────────────

export async function cancelChain(
  schema: string,
  instanceId: string,
  reason?: string,
): Promise<void> {
  await safeQuery(
    `UPDATE "${schema}".workflow_chain_instances
     SET status = 'cancelled', completed_at = NOW()
     WHERE instance_id = $1 AND status IN ('pending', 'active', 'running')`,
    [instanceId],
  );

  // Mark any in-progress steps as cancelled
  await safeQuery(
    `UPDATE "${schema}".workflow_chain_step_log
     SET status = 'skipped', notes = $2
     WHERE instance_id = $1 AND status = 'in_progress'`,
    [instanceId, reason || 'Chain cancelled'],
  );
}

// ── Event Emission ───────────────────────────────────────────────────────────

export function emitChainEvent(
  eventType: string,
  tenantId: string,
  payload: Record<string, unknown>,
): void {
  eventBus.publish(({
      eventType,
      tenantId,
      severity: 'info',
      payload,
    } as any));
}

// ── Query Helpers ────────────────────────────────────────────────────────────

export async function getChainInstances(
  tenantId: string,
  filters?: { status?: string; chainCode?: string; moduleCode?: string },
): Promise<ChainInstance[]> {
  const schema = tenantSchema(tenantId);
  const params: unknown[] = [tenantId];
  let idx = 2;
  const parts = [`wci.tenant_id = $1`];
  if (filters?.chainCode) {
    parts.push(`wci.chain_code = $${idx++}`);
    params.push(filters.chainCode);
  }
  if (filters?.status) {
    parts.push(`wci.status = $${idx++}`);
    params.push(filters.status);
  }
  const moduleCode = filters?.moduleCode?.trim();
  if (moduleCode) {
    parts.push(`EXISTS (SELECT 1 FROM "${schema}".workflow_chain_step_log l WHERE l.instance_id = wci.instance_id AND l.module_code = $${idx++})`);
    params.push(moduleCode);
  }
  const sql = `SELECT wci.* FROM "${schema}".workflow_chain_instances wci WHERE ${parts.join(' AND ')} ORDER BY wci.started_at DESC LIMIT 100`;
  const result = await safeQuery(sql, params);
  return result.rows.map(mapInstanceRow);
}

export async function getChainStepLog(
  tenantId: string,
  instanceId: string,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_chain_step_log
     WHERE instance_id = $1 ORDER BY step_no`,
    [instanceId],
  );
  return result.rows;
}

// ── Internal Helpers ─────────────────────────────────────────────────────────

function mapInstanceRow(row: Record<string, unknown>): ChainInstance {
  return {

    instanceId: row.instance_id,

    chainCode: row.chain_code,

    tenantId: row.tenant_id,

    currentStep: row.current_step,

    status: row.status,
    context: typeof row.context === 'string' ? JSON.parse(row.context) : (row.context || {}),

    triggerEntityType: row.trigger_entity_type,

    triggerEntityId: row.trigger_entity_id,
  };
}
