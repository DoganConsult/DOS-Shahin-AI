// ============================================
// Shahin-Ai — Workflow Advanced Service
// Condition builder, delegation engine,
// simulation, dynamic routing, parallel
// approvals, workflow analytics
// Requirements: 10.1–10.6
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

// ── Interfaces ──

/** A single condition within a branch rule */
interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: unknown;
}

/** A branch rule mapping conditions to a target step */
interface BranchRule {
  conditions: WorkflowCondition[];
  logic: 'AND' | 'OR';
  targetStepId: string;
}

/** Input for creating a delegation rule */
interface DelegationRule {
  delegator: string;
  delegate: string;
  scope: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

/** Input for creating a routing rule */
interface RoutingRuleInput {
  entityType: string;
  conditions: WorkflowCondition[];
  approverRole: string;
  priorityOrder?: number;
}

/** Input for creating a parallel approval request */
interface ParallelApprovalInput {
  workflowInstanceId: string;
  stepId: string;
  approvers: { user_id: string; role: string; decision?: string }[];
  logic: 'AND' | 'OR';
}

/** Result of a workflow simulation run */
interface SimulationResult {
  success: boolean;
  error?: string;
  steps: Record<string, unknown>[];
  totalSteps?: number;
}

/** Aggregated workflow analytics */
interface WorkflowAnalytics {
  statusBreakdown: GenericRow[];
  averageCycleTimeHours: number;
  slaCompliance: GenericRow | undefined;
  bottlenecks: GenericRow[];
}

function toComparableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function evaluateCondition(condition: WorkflowCondition, context: Record<string, unknown>): boolean {
  const val = context[condition.field];
  switch (condition.operator) {
    case 'eq':
      return val === condition.value;
    case 'ne':
      return val !== condition.value;
    case 'gt': {
      const a = toComparableNumber(val);
      const b = toComparableNumber(condition.value);
      return a != null && b != null ? a > b : false;
    }
    case 'lt': {
      const a = toComparableNumber(val);
      const b = toComparableNumber(condition.value);
      return a != null && b != null ? a < b : false;
    }
    case 'gte': {
      const a = toComparableNumber(val);
      const b = toComparableNumber(condition.value);
      return a != null && b != null ? a >= b : false;
    }
    case 'lte': {
      const a = toComparableNumber(val);
      const b = toComparableNumber(condition.value);
      return a != null && b != null ? a <= b : false;
    }
    case 'in':
      return Array.isArray(condition.value) ? condition.value.includes(val) : false;
    case 'contains':
      return String(val).includes(String(condition.value));
    default:
      return false;
  }
}

// ============================================
// 10.1 Visual Workflow Condition Builder
//      (backend support)
// ============================================

/**
 * Save branch rules (condition-based routing) on a workflow definition.
 * Stored as JSONB in the branch_rules column.
 */
export async function saveWorkflowConditions(
  tenantId: string,
  workflowId: string,
  branches: BranchRule[],
): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".workflow_definitions
     SET branch_rules = $1::jsonb, updated_at = now()
     WHERE workflow_id = $2
     RETURNING *`,
    [JSON.stringify(branches), workflowId],
  );
  return result.rows[0] || null;
}

/**
 * Retrieve the branch rules for a workflow definition.
 */
export async function getWorkflowConditions(
  tenantId: string,
  workflowId: string,
): Promise<BranchRule[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT branch_rules FROM "${schema}".workflow_definitions WHERE workflow_id = $1`,
    [workflowId],
  );
  return result.rows[0]?.branch_rules || [];
}

/**
 * Evaluate all branch rules against the provided context data.
 * Returns the targetStepId of the first matching branch, or null.
 */
export async function evaluateConditions(
  tenantId: string,
  workflowId: string,
  context: Record<string, unknown>,
): Promise<string | null> {
  const branches = await getWorkflowConditions(tenantId, workflowId);

  for (const branch of branches) {
    const results = branch.conditions.map((c) => evaluateCondition(c, context));

    const match = branch.logic === 'AND'
      ? results.every(Boolean)
      : results.some(Boolean);

    if (match) return branch.targetStepId;
  }

  return null;
}

// ============================================
// 10.2 Delegation Rules Engine
// ============================================

/**
 * Create a new delegation rule allowing one user to delegate
 * approval authority to another for a given scope and time range.
 */
export async function createDelegationRule(
  tenantId: string,
  data: DelegationRule,
): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".approval_delegation_rules
       (delegator, delegate, scope, start_date, end_date, active)
     VALUES ($1, $2, $3, $4::date, $5::date, $6)
     RETURNING *`,
    [data.delegator, data.delegate, data.scope, data.startDate, data.endDate, data.active ?? true],
  );
  return result.rows[0];
}

/**
 * List active delegation rules, optionally filtered by delegator.
 */
export async function getDelegationRules(
  tenantId: string,
  userId?: string,
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".approval_delegation_rules WHERE active = true`;
  const params: unknown[] = [];

  if (userId) {
    sql += ` AND delegator = $1`;
    params.push(userId);
  }

  sql += ` ORDER BY created_at DESC`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

/**
 * Soft-delete a delegation rule by marking it inactive.
 */
export async function deleteDelegationRule(
  tenantId: string,
  ruleId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".approval_delegation_rules
     SET active = false
     WHERE rule_id = $1
     RETURNING rule_id`,
    [ruleId],
  );
  return result.rows.length > 0;
}

/**
 * Resolve the effective approver for a given original approver.
 * If an active delegation rule exists for the current date range,
 * returns the delegate; otherwise returns the original approver.
 */
export async function resolveApprover(
  tenantId: string,
  originalApprover: string,
): Promise<string> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT delegate FROM "${schema}".approval_delegation_rules
     WHERE delegator = $1
       AND active = true
       AND start_date <= CURRENT_DATE
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)
     ORDER BY created_at DESC
     LIMIT 1`,
    [originalApprover],
  );
  return result.rows[0]?.delegate || originalApprover;
}

// ============================================
// 10.3 Workflow Simulation
// ============================================

/**
 * Simulate a workflow execution using test data without
 * persisting any changes. Walks through steps, evaluates
 * branch conditions, and resolves approver delegations.
 */
export async function simulateWorkflow(
  tenantId: string,
  workflowId: string,
  testData: Record<string, unknown>,
): Promise<SimulationResult> {
  const schema = tenantSchema(tenantId);

  const wfResult = await safeQuery(
    `SELECT * FROM "${schema}".workflow_definitions WHERE workflow_id = $1`,
    [workflowId],
  );
  const workflow = wfResult.rows[0];

  if (!workflow) {
    return { success: false, error: 'Workflow not found', steps: [] };
  }

  const steps = Array.isArray(workflow.steps) ? workflow.steps : [];
  const simulatedSteps: Record<string, unknown>[] = [];
  let currentStep = steps[0];
  let stepIndex = 0;
  const maxIterations = 50; // Guard against infinite loops

  while (currentStep && stepIndex < maxIterations) {
    const branchTarget = await evaluateConditions(
      tenantId,
      workflowId,
      { ...testData, currentStep: currentStep.id },
    );

    simulatedSteps.push({
      step: currentStep.name || currentStep.id,
      action: currentStep.type || 'approve',
      branchedTo: branchTarget || 'next',
      approver: currentStep.assignee
        ? await resolveApprover(tenantId, currentStep.assignee)
        : null,
    });

    if (branchTarget) {
      // Follow the branch to a specific step
      currentStep = steps.find((s: GenericRow) => s.id === branchTarget);
    } else {
      // Continue to the next sequential step
      stepIndex++;
      currentStep = steps[stepIndex];
    }
  }

  return {
    success: true,
    steps: simulatedSteps,
    totalSteps: simulatedSteps.length,
  };
}

// ============================================
// 10.4 Dynamic Approval Routing
// ============================================

/**
 * Create a routing rule that maps entity-type conditions to an approver role.
 */
export async function createRoutingRule(
  tenantId: string,
  data: RoutingRuleInput,
): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".approval_routing_rules
       (entity_type, conditions, approver_role, priority_order, active)
     VALUES ($1, $2::jsonb, $3, $4, true)
     RETURNING *`,
    [data.entityType, JSON.stringify(data.conditions), data.approverRole, data.priorityOrder || 0],
  );
  return result.rows[0];
}

/**
 * List active routing rules, optionally filtered by entity type.
 */
export async function getRoutingRules(
  tenantId: string,
  entityType?: string,
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".approval_routing_rules WHERE active = true`;
  const params: unknown[] = [];

  if (entityType) {
    sql += ` AND entity_type = $1`;
    params.push(entityType);
  }

  sql += ` ORDER BY priority_order ASC`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

/**
 * Given an entity type and context data, resolve which approver roles
 * should handle the approval. Evaluates all matching routing rules
 * in priority order and returns matching approver roles.
 */
export async function resolveApprovalRoute(
  tenantId: string,
  entityType: string,
  context: Record<string, unknown>,
): Promise<string[]> {
  const rules = await getRoutingRules(tenantId, entityType);
  const approvers: string[] = [];

  for (const rule of rules) {
    const conditions: WorkflowCondition[] = rule.conditions || [];

    // All conditions must match for a rule to apply
    const match = conditions.every((c) => evaluateCondition(c, context));

    if (match) {
      approvers.push(rule.approver_role);
    }
  }

  return approvers.length > 0 ? approvers : ['default_approver'];
}

// ============================================
// 10.5 Parallel Approval Support
// ============================================

/**
 * Create a parallel approval request that requires multiple
 * approvers to vote on a single workflow step.
 */
export async function createParallelApproval(
  tenantId: string,
  data: ParallelApprovalInput,
): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".parallel_approvals
       (workflow_instance_id, step_id, approvers, logic, status)
     VALUES ($1, $2, $3::jsonb, $4, 'pending')
     RETURNING *`,
    [data.workflowInstanceId, data.stepId, JSON.stringify(data.approvers), data.logic || 'AND'],
  );
  return result.rows[0];
}

/**
 * Record a vote from one approver in a parallel approval.
 * After recording, determine the final status based on logic:
 * - AND: all must approve; any rejection fails the approval
 * - OR:  any single approval passes; all must reject to fail
 */
export async function recordParallelVote(
  tenantId: string,
  approvalId: string,
  approverId: string,
  decision: 'approved' | 'rejected',
  notes?: string,
): Promise<Record<string, unknown> | null> {
  const schema = tenantSchema(tenantId);

  // Fetch the current parallel approval record
  const current = await safeQuery(
    `SELECT * FROM "${schema}".parallel_approvals WHERE approval_id = $1`,
    [approvalId],
  );

  if (!current.rows[0]) {
    return null;
  }

  const approvers = current.rows[0].approvers || [];
  const logic = current.rows[0].logic;

  // Update the specific approver's decision
  const updated = approvers.map((a: GenericRow) =>
    a.user_id === approverId
      ? { ...a, decision, notes: notes || null, decided_at: new Date().toISOString() }
      : a,
  );

  // Determine the final status based on the approval logic
  const decisions = updated.filter((a: GenericRow) => a.decision);
  let finalStatus = 'pending';

  if (logic === 'AND') {
    // AND logic: any rejection fails; all approved = approved
    if (decisions.some((a: GenericRow) => a.decision === 'rejected')) {
      finalStatus = 'rejected';
    } else if (decisions.length === updated.length) {
      finalStatus = 'approved';
    }
  } else {
    // OR logic: any approval passes; all rejected = rejected
    if (decisions.some((a: GenericRow) => a.decision === 'approved')) {
      finalStatus = 'approved';
    } else if (decisions.length === updated.length) {
      finalStatus = 'rejected';
    }
  }

  // Persist the updated approvers and status
  const result = await safeQuery(
    `UPDATE "${schema}".parallel_approvals
     SET approvers = $1::jsonb, status = $2, updated_at = now()
     WHERE approval_id = $3
     RETURNING *`,
    [JSON.stringify(updated), finalStatus, approvalId],
  );

  return result.rows[0];
}

// ============================================
// 10.6 Workflow Analytics
// ============================================

/**
 * Retrieve aggregated workflow analytics including status
 * breakdown, average cycle time, SLA compliance, and
 * bottleneck identification.
 */
export async function getWorkflowAnalytics(
  tenantId: string,
  period?: string,
): Promise<WorkflowAnalytics> {
  const schema = tenantSchema(tenantId);

  // Build date filter based on the requested period
  let dateFilter = '';
  if (period) {
    const intervalMap: Record<string, string> = {
      '30d': '30 days',
      '90d': '90 days',
      '365d': '365 days',
    };
    const interval = intervalMap[period] || '365 days';
    dateFilter = `AND created_at >= now() - interval '${interval}'`;
  }

  // Run all analytics queries in parallel for performance
  const [totalRes, avgTimeRes, slaRes, bottleneckRes] = await Promise.all([
    // Status breakdown
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT status, COUNT(*)::int AS count
       FROM "${schema}".workflow_instances
       WHERE 1=1 ${dateFilter}
       GROUP BY status`,
    ), { tenantId: tenantId, operation: 'query workflow_instances' }),

    // Average cycle time in hours
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ avg_hours: 0 }]), safeQuery(
      `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)::numeric(10,1) AS avg_hours
       FROM "${schema}".workflow_instances
       WHERE completed_at IS NOT NULL ${dateFilter}`,
    ), { tenantId: tenantId, operation: 'query workflow_instances' }),

    // SLA compliance metrics
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ on_time: 0, breached: 0, total: 0 }]), safeQuery(
      `SELECT
         COUNT(CASE WHEN completed_at <= sla_deadline THEN 1 END)::int AS on_time,
         COUNT(CASE WHEN completed_at > sla_deadline THEN 1 END)::int AS breached,
         COUNT(*)::int AS total
       FROM "${schema}".workflow_instances
       WHERE completed_at IS NOT NULL AND sla_deadline IS NOT NULL ${dateFilter}`,
    ), { tenantId: tenantId, operation: 'query workflow_instances' }),

    // Bottleneck identification: steps with longest average wait times
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT
         current_step,
         AVG(EXTRACT(EPOCH FROM (now() - updated_at)) / 3600)::numeric(10,1) AS avg_wait_hours,
         COUNT(*)::int AS stuck_count
       FROM "${schema}".workflow_instances
       WHERE status = 'in_progress'
       GROUP BY current_step
       ORDER BY avg_wait_hours DESC
       LIMIT 5`,
    ), { tenantId: tenantId, operation: 'query workflow_instances' }),
  ]);

  return {
    statusBreakdown: totalRes.rows,
    averageCycleTimeHours: Number(avgTimeRes.rows[0]?.avg_hours || 0),
    slaCompliance: slaRes.rows[0] || { on_time: 0, breached: 0, total: 0 },
    bottlenecks: bottleneckRes.rows,
  };
}
