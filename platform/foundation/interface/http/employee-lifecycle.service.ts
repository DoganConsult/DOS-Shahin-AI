/**
 * Foundation — Employee Lifecycle Service (G1).
 *
 * State machine over `dos.foundation_employee_lifecycle_state`. Every
 * transition writes a row to `dos.foundation_employee_lifecycle_transitions`
 * (the canonical history) and, for workflow-triggered states, materializes
 * task rows in `dos.foundation_employee_lifecycle_tasks` from the workflow's
 * step definitions.
 *
 * Exposed in routes/employee-lifecycle.routes.ts.
 */
import { randomUUID } from 'node:crypto';
import { withTenantClient } from '../../ports/database.port';
import { userMetrics } from '../../infrastructure/observability/metrics';

export type LifecycleState =
  | 'candidate' | 'hired' | 'onboarding' | 'active' | 'probation'
  | 'confirmed' | 'on_leave' | 'under_review' | 'pip'
  | 'transfer_pending' | 'promoted' | 'exiting' | 'alumni';

/**
 * Allowed transitions. The graph encodes HR + governance rules:
 *  - new hire → onboarding → probation → confirmed/active
 *  - any active state can go to_leave / under_review / transfer / promotion / exit
 *  - exit → alumni is terminal
 */
const ALLOWED: Record<LifecycleState, LifecycleState[]> = {
  candidate:        ['hired'],
  hired:            ['onboarding','exiting'],
  onboarding:       ['probation','active','exiting'],
  active:           ['probation','on_leave','under_review','pip','transfer_pending','exiting'],
  probation:        ['confirmed','exiting','pip'],
  confirmed:        ['active','on_leave','under_review','pip','transfer_pending','exiting'],
  on_leave:         ['active','exiting'],
  under_review:     ['active','promoted','pip','exiting'],
  pip:              ['active','exiting'],
  transfer_pending: ['active','exiting'],
  promoted:         ['active'],
  exiting:          ['alumni'],
  alumni:           [],
};

const STATES_REQUIRING_WORKFLOW: Partial<Record<LifecycleState, string>> = {
  hired:            'onboarding',          // entering "hired" kicks off onboarding
  onboarding:       'onboarding',
  exiting:          'offboarding',
  transfer_pending: 'transfer',
  under_review:     'promotion',
  probation:        'probation_review',    // tasks generated at day-90 mark via cron
};

const HIGH_RISK_TRANSITIONS = new Set([
  'active->exiting','confirmed->exiting','probation->exiting','onboarding->exiting',
  'pip->exiting','under_review->exiting','transfer_pending->exiting','on_leave->exiting',
]);

export interface LifecycleStateRow {
  user_id: string;
  tenant_id: string;
  state: LifecycleState;
  state_since: string;
  state_due_by: string | null;
  state_owner: string | null;
  state_meta: Record<string, unknown>;
  workflow_id: string | null;
  updated_at: string;
}

export interface LifecycleTransitionRow {
  id: string;
  tenant_id: string;
  user_id: string;
  from_state: LifecycleState | null;
  to_state: LifecycleState;
  workflow_code: string | null;
  workflow_id: string | null;
  approved_by: string[] | null;
  evidence_refs: string[] | null;
  reason: string | null;
  occurred_at: string;
  actor_id: string;
  meta: Record<string, unknown>;
}

export interface LifecycleTaskRow {
  id: string;
  tenant_id: string;
  user_id: string;
  workflow_code: string;
  workflow_id: string | null;
  step_code: string;
  title_en: string;
  title_ar: string | null;
  assigned_to: string | null;
  due_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  status: 'open'|'in_progress'|'blocked'|'done'|'skipped';
  blocked_reason: string | null;
  evidence_refs: string[] | null;
  sort_order: number;
}

export interface TransitionInput {
  userId: string;
  toState: LifecycleState;
  actorId: string;
  reason?: string;
  evidenceRefs?: string[];
  approvedBy?: string[];
  meta?: Record<string, unknown>;
}

export interface TransitionResult {
  state: LifecycleStateRow;
  transition: LifecycleTransitionRow;
  tasksCreated: number;
  workflowId: string | null;
}

function track<T>(op: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => userMetrics.observeDb(op, Date.now() - start));
}

export class LifecycleStateMachineError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_TRANSITION'
      | 'EVIDENCE_REQUIRED'
      | 'APPROVAL_REQUIRED'
      | 'STATE_NOT_FOUND',
    message: string,
    public readonly details?: Record<string, unknown>,
  ) { super(message); this.name = 'LifecycleStateMachineError'; }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getCurrentState(tenantId: string, userId: string): Promise<LifecycleStateRow | null> {
  return track('foundation.lifecycle.getCurrentState', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.foundation_employee_lifecycle_state
          WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId],
      );
      return (r.rows[0] as LifecycleStateRow) ?? null;
    }),
  );
}

export async function getHistory(tenantId: string, userId: string, limit = 50): Promise<LifecycleTransitionRow[]> {
  return track('foundation.lifecycle.getHistory', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.foundation_employee_lifecycle_transitions
          WHERE tenant_id = $1 AND user_id = $2
          ORDER BY occurred_at DESC LIMIT $3`,
        [tenantId, userId, limit],
      );
      return r.rows as LifecycleTransitionRow[];
    }),
  );
}

export async function listByState(
  tenantId: string,
  state: LifecycleState,
  opts: { page?: number; pageSize?: number } = {},
) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 25;
  const offset = (page - 1) * pageSize;
  return track('foundation.lifecycle.listByState', () =>
    withTenantClient(tenantId, async (c) => {
      const total = await c.query(
        `SELECT COUNT(*)::int AS count FROM dos.foundation_employee_lifecycle_state
          WHERE tenant_id = $1 AND state = $2`,
        [tenantId, state],
      );
      const list = await c.query(
        `SELECT s.*, u.first_name, u.last_name, u.email
           FROM dos.foundation_employee_lifecycle_state s
           LEFT JOIN dos.users u ON u.user_id = s.user_id AND u.tenant_id = s.tenant_id
          WHERE s.tenant_id = $1 AND s.state = $2
          ORDER BY s.state_since DESC
          LIMIT $3 OFFSET $4`,
        [tenantId, state, pageSize, offset],
      );
      return { data: list.rows, total: total.rows[0].count as number };
    }),
  );
}

export async function listOnboardingKanban(tenantId: string) {
  return track('foundation.lifecycle.kanban', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT s.user_id, s.state, s.state_since, s.state_due_by, s.workflow_id,
                u.first_name, u.last_name, u.email,
                (SELECT COUNT(*)::int FROM dos.foundation_employee_lifecycle_tasks t
                  WHERE t.tenant_id = s.tenant_id AND t.user_id = s.user_id
                    AND t.workflow_id = s.workflow_id AND t.status = 'done') AS tasks_done,
                (SELECT COUNT(*)::int FROM dos.foundation_employee_lifecycle_tasks t
                  WHERE t.tenant_id = s.tenant_id AND t.user_id = s.user_id
                    AND t.workflow_id = s.workflow_id) AS tasks_total
           FROM dos.foundation_employee_lifecycle_state s
           LEFT JOIN dos.users u ON u.user_id = s.user_id AND u.tenant_id = s.tenant_id
          WHERE s.tenant_id = $1 AND s.state IN ('hired','onboarding','probation')
          ORDER BY s.state, s.state_since DESC`,
        [tenantId],
      );
      return r.rows;
    }),
  );
}

export async function listProbationDue(tenantId: string, opts: { withinDays?: number } = {}) {
  const within = opts.withinDays ?? 14;
  return track('foundation.lifecycle.probationDue', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT s.user_id, s.state, s.state_since, s.state_due_by,
                u.first_name, u.last_name, u.email
           FROM dos.foundation_employee_lifecycle_state s
           LEFT JOIN dos.users u ON u.user_id = s.user_id AND u.tenant_id = s.tenant_id
          WHERE s.tenant_id = $1 AND s.state = 'probation'
            AND (s.state_due_by IS NULL OR s.state_due_by <= NOW() + ($2 || ' days')::interval)
          ORDER BY s.state_due_by ASC NULLS LAST`,
        [tenantId, within],
      );
      return r.rows;
    }),
  );
}

export async function listTasks(
  tenantId: string,
  filter: { userId?: string; assignedTo?: string; workflowId?: string; status?: string } = {},
) {
  const conds = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  if (filter.userId)     { params.push(filter.userId);     conds.push(`user_id = $${params.length}`); }
  if (filter.assignedTo) { params.push(filter.assignedTo); conds.push(`assigned_to = $${params.length}`); }
  if (filter.workflowId) { params.push(filter.workflowId); conds.push(`workflow_id = $${params.length}`); }
  if (filter.status)     { params.push(filter.status);     conds.push(`status = $${params.length}`); }
  return track('foundation.lifecycle.listTasks', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.foundation_employee_lifecycle_tasks
          WHERE ${conds.join(' AND ')}
          ORDER BY sort_order ASC, due_at ASC NULLS LAST`,
        params,
      );
      return r.rows as LifecycleTaskRow[];
    }),
  );
}

export async function getWorkflowTemplate(tenantId: string | null, workflowCode: string) {
  return track('foundation.lifecycle.getWorkflow', () =>
    withTenantClient(tenantId ?? '00000000-0000-0000-0000-000000000000', async (c) => {
      // Prefer tenant override, fall back to platform default.
      const r = await c.query(
        `SELECT * FROM dos.foundation_employee_lifecycle_workflows
          WHERE workflow_code = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
          ORDER BY tenant_id NULLS LAST LIMIT 1`,
        [workflowCode, tenantId],
      );
      return r.rows[0] ?? null;
    }),
  );
}

// ---------------------------------------------------------------------------
// Transition — the heart of the state machine.
// ---------------------------------------------------------------------------

export async function transition(tenantId: string, input: TransitionInput): Promise<TransitionResult> {
  return track('foundation.lifecycle.transition', () =>
    withTenantClient(tenantId, async (c) => {
      // 1. Read current state (or null if first transition)
      const cur = await c.query(
        `SELECT * FROM dos.foundation_employee_lifecycle_state
          WHERE tenant_id = $1 AND user_id = $2 FOR UPDATE`,
        [tenantId, input.userId],
      );
      const fromState = (cur.rows[0]?.state as LifecycleState | undefined) ?? null;

      // 2. Validate transition is allowed
      if (fromState !== null) {
        const allowed = ALLOWED[fromState];
        if (!allowed.includes(input.toState)) {
          throw new LifecycleStateMachineError(
            'INVALID_TRANSITION',
            `Cannot transition ${fromState} → ${input.toState}`,
            { fromState, toState: input.toState, allowedNext: allowed },
          );
        }
      } else {
        // First transition — must be one of the entry states
        const entryStates: LifecycleState[] = ['candidate','hired'];
        if (!entryStates.includes(input.toState)) {
          throw new LifecycleStateMachineError(
            'INVALID_TRANSITION',
            `First state must be candidate or hired, got ${input.toState}`,
            { toState: input.toState, validEntry: entryStates },
          );
        }
      }

      // 3. Enforce evidence on high-risk transitions
      const transitionKey = `${fromState ?? '_'}->${input.toState}`;
      if (HIGH_RISK_TRANSITIONS.has(transitionKey) && (!input.evidenceRefs || input.evidenceRefs.length === 0)) {
        throw new LifecycleStateMachineError(
          'EVIDENCE_REQUIRED',
          `Transition ${transitionKey} requires evidence_refs`,
          { transitionKey },
        );
      }

      // 4. If the new state has a workflow, materialize it
      const workflowCode = STATES_REQUIRING_WORKFLOW[input.toState] ?? null;
      let workflowId: string | null = null;
      let tasksCreated = 0;

      if (workflowCode) {
        // Pick tenant override or platform default
        const wf = await c.query(
          `SELECT * FROM dos.foundation_employee_lifecycle_workflows
            WHERE workflow_code = $1
              AND (tenant_id = $2 OR tenant_id IS NULL)
              AND is_active = true
            ORDER BY tenant_id NULLS LAST LIMIT 1`,
          [workflowCode, tenantId],
        );
        const tpl = wf.rows[0];
        if (tpl) {
          workflowId = randomUUID();
          // Materialize tasks
          const steps: any[] = Array.isArray(tpl.steps) ? tpl.steps : [];
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const dueAt = step.sla_hours ? `NOW() + INTERVAL '${Number(step.sla_hours)} hours'` : 'NULL';
            await c.query(
              `INSERT INTO dos.foundation_employee_lifecycle_tasks
                 (tenant_id, user_id, workflow_code, workflow_id, step_code,
                  title_en, title_ar, sort_order, due_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${dueAt})`,
              [tenantId, input.userId, workflowCode, workflowId, step.step_code,
               step.title_en, step.title_ar ?? null, i],
            );
            tasksCreated++;
          }
        }
      }

      // 5. Compute state_due_by based on workflow SLA
      const stateDueBySql = workflowCode
        ? `NOW() + (SELECT (sla_hours || ' hours')::interval FROM dos.foundation_employee_lifecycle_workflows
                   WHERE workflow_code = $5 AND (tenant_id = $1 OR tenant_id IS NULL)
                   ORDER BY tenant_id NULLS LAST LIMIT 1)`
        : 'NULL';

      // 6. Upsert state
      await c.query(
        `INSERT INTO dos.foundation_employee_lifecycle_state
           (tenant_id, user_id, state, state_since, state_due_by, state_owner,
            state_meta, workflow_id, updated_at)
         VALUES ($1, $2, $3, NOW(), ${stateDueBySql}, $4, $6, $7, NOW())
         ON CONFLICT (tenant_id, user_id) DO UPDATE
            SET state = EXCLUDED.state, state_since = NOW(),
                state_due_by = EXCLUDED.state_due_by, state_owner = EXCLUDED.state_owner,
                state_meta = EXCLUDED.state_meta, workflow_id = EXCLUDED.workflow_id,
                updated_at = NOW()`,
        workflowCode
          ? [tenantId, input.userId, input.toState, input.actorId, workflowCode, input.meta ?? {}, workflowId]
          : [tenantId, input.userId, input.toState, input.actorId, null, input.meta ?? {}, workflowId],
      );

      const newState = await c.query(
        `SELECT * FROM dos.foundation_employee_lifecycle_state
          WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, input.userId],
      );

      // 7. Append transition history row
      const txn = await c.query(
        `INSERT INTO dos.foundation_employee_lifecycle_transitions
           (tenant_id, user_id, from_state, to_state, workflow_code, workflow_id,
            approved_by, evidence_refs, reason, actor_id, meta)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [tenantId, input.userId, fromState, input.toState, workflowCode, workflowId,
         input.approvedBy ?? null, input.evidenceRefs ?? null, input.reason ?? null,
         input.actorId, input.meta ?? {}],
      );

      return {
        state: newState.rows[0] as LifecycleStateRow,
        transition: txn.rows[0] as LifecycleTransitionRow,
        tasksCreated,
        workflowId,
      };
    }),
  );
}

// ---------------------------------------------------------------------------
// Task management
// ---------------------------------------------------------------------------

export async function completeTask(
  tenantId: string,
  taskId: string,
  actorId: string,
  evidenceRefs?: string[],
): Promise<LifecycleTaskRow | null> {
  return track('foundation.lifecycle.completeTask', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.foundation_employee_lifecycle_tasks
            SET status = 'done', completed_at = NOW(), completed_by = $3,
                evidence_refs = COALESCE($4, evidence_refs), updated_at = NOW()
          WHERE id = $1 AND tenant_id = $2 AND status <> 'done'
          RETURNING *`,
        [taskId, tenantId, actorId, evidenceRefs ?? null],
      );
      return (r.rows[0] as LifecycleTaskRow) ?? null;
    }),
  );
}

export async function blockTask(
  tenantId: string,
  taskId: string,
  reason: string,
): Promise<LifecycleTaskRow | null> {
  return track('foundation.lifecycle.blockTask', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.foundation_employee_lifecycle_tasks
            SET status = 'blocked', blocked_reason = $3, updated_at = NOW()
          WHERE id = $1 AND tenant_id = $2
          RETURNING *`,
        [taskId, tenantId, reason],
      );
      return (r.rows[0] as LifecycleTaskRow) ?? null;
    }),
  );
}

export async function getMetrics(tenantId: string) {
  return track('foundation.lifecycle.metrics', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT
           state,
           COUNT(*)::int AS count,
           COUNT(*) FILTER (WHERE state_due_by < NOW())::int AS overdue,
           AVG(EXTRACT(EPOCH FROM (NOW() - state_since)) / 86400)::int AS avg_days_in_state
         FROM dos.foundation_employee_lifecycle_state
         WHERE tenant_id = $1
         GROUP BY state
         ORDER BY state`,
        [tenantId],
      );
      return r.rows;
    }),
  );
}
