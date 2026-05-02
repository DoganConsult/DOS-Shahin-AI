import { safeQuery, tenantSchema } from '../../ports/database.port';
import { createProcessTask } from '../../ports/lifecycle.port';
import { eventBus } from '../../ports/events.port';
import type { GenericRow as _GenericRow } from '@dos/types';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CycleResult {
  tasksCreated: number;
  byType: {
    remediation: number;
    risk_assessment: number;
    evidence_request: number;
    control_review: number;
  };
}

export interface LinkedItems {
  gaps:       LinkedGap[];
  risks:      LinkedRisk[];
  evidence:   LinkedEvidence[];
  auditTasks: LinkedAuditTask[];
}

interface LinkedGap {
  gapId:        string;
  title:        string;
  severity:     string;
  status:       string;
  assignedUser: string | null;
  taskStatus:   string | null;
  slaStatus:    'green' | 'amber' | 'red' | null;
  dueDate:      string | null;
}
interface LinkedRisk {
  riskId:       string;
  title:        string;
  score:        number;
  assignedUser: string | null;
  taskStatus:   string | null;
  slaStatus:    'green' | 'amber' | 'red' | null;
  dueDate:      string | null;
}
interface LinkedEvidence {
  scheduleId:   string;
  controlId:    string;
  frequency:    string;
  assignedUser: string | null;
  taskStatus:   string | null;
  slaStatus:    'green' | 'amber' | 'red' | null;
  dueDate:      string | null;
}
interface LinkedAuditTask {
  taskId:       string;
  title:        string;
  assignedUser: string | null;
  taskStatus:   string;
  slaStatus:    'green' | 'amber' | 'red' | null;
  dueDate:      string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityToPriority(severity: string): 'critical' | 'high' | 'medium' | 'low' {
  if (severity === 'critical') return 'critical';
  if (severity === 'high')     return 'high';
  if (severity === 'medium')   return 'medium';
  return 'low';
}

function computeSlaStatus(dueDate: string | null, breachedAt: string | null): 'green' | 'amber' | 'red' | null {
  if (!dueDate) return null;
  if (breachedAt) return 'red';
  const now   = Date.now();
  const due   = new Date(dueDate).getTime();
  const slaMs = due - now;
  if (slaMs <= 0) return 'red';
  return 'green';
}

async function hasActiveTask(schema: string, controlId: string, entityType: string, entityId: string): Promise<boolean> {
  const res = await safeQuery(
    `SELECT 1 FROM "${schema}".process_tasks
     WHERE control_id::text = $1 AND entity_type = $2 AND entity_id = $3
       AND status NOT IN ('cancelled', 'auto_closed', 'completed')
     LIMIT 1`,
    [controlId, entityType, entityId],
  );
  return (res.rowCount ?? 0) > 0;
}

// ── Core Functions ────────────────────────────────────────────────────────────

export async function launchControlProcessCycle(
  tenantId: string,
  controlId: string,
  triggeredBy: string,
): Promise<CycleResult> {
  const schema = tenantSchema(tenantId);
  const byType = { remediation: 0, risk_assessment: 0, evidence_request: 0, control_review: 0 };

  // 1. Compliance gaps (findings) linked to this control
  const gapsRes = await safeQuery(
    `SELECT id::text AS id, title, severity
     FROM "${schema}".findings
     WHERE source_id = $1 AND source_type = 'control'
       AND COALESCE(status, '') != 'closed'`,
    [controlId],
  );
  for (const gap of gapsRes.rows) {
    if (await hasActiveTask(schema, controlId, 'compliance_gap', gap.id)) continue;
    await createProcessTask(tenantId, {
      taskType:      'remediation',
      title:         `Gap remediation: ${gap.title}`,
      description:   `Remediate compliance gap linked to control ${controlId}`,
      priority:      severityToPriority(gap.severity),
      entityType:    'compliance_gap',
      entityId:      gap.id,
      controlId,
      triggerSource: triggeredBy,
    });
    byType.remediation++;
  }

  // 2. Risks linked to this control
  const risksRes = await safeQuery(
    `SELECT risk_id::text AS id, title
     FROM "${schema}".risks
     WHERE $1 = ANY(COALESCE(control_ids, ARRAY[]::text[]))
        OR $1 = ANY(COALESCE(related_control_ids, ARRAY[]::text[]))`,
    [controlId],
  );
  for (const risk of risksRes.rows) {
    if (await hasActiveTask(schema, controlId, 'risk', risk.id)) continue;
    await createProcessTask(tenantId, {
      taskType:      'risk_assessment',
      title:         `Risk assessment: ${risk.title}`,
      description:   `Assess risk linked to control ${controlId}`,
      priority:      'medium',
      entityType:    'risk',
      entityId:      risk.id,
      controlId,
      triggerSource: triggeredBy,
    });
    byType.risk_assessment++;
  }

  // 3. Evidence schedules for this control
  const evRes = await safeQuery(
    `SELECT id::text AS id, cron_expression AS frequency
     FROM "${schema}".evidence_schedules
     WHERE control_id = $1 AND enabled = true`,
    [controlId],
  );
  for (const ev of evRes.rows) {
    if (await hasActiveTask(schema, controlId, 'evidence', ev.id)) continue;
    await createProcessTask(tenantId, {
      taskType:      'evidence_request',
      title:         `Evidence collection for control ${controlId}`,
      description:   `Collect evidence per schedule (${ev.frequency})`,
      priority:      'low',
      entityType:    'evidence',
      entityId:      ev.id,
      controlId,
      triggerSource: triggeredBy,
    });
    byType.evidence_request++;
  }

  // 4. Control review task (one per control)
  if (!(await hasActiveTask(schema, controlId, 'control', controlId))) {
    await createProcessTask(tenantId, {
      taskType:      'control_review',
      title:         `Control review: ${controlId}`,
      description:   `Periodic review of control effectiveness`,
      priority:      'medium',
      entityType:    'control',
      entityId:      controlId,
      controlId,
      triggerSource: triggeredBy,
    });
    byType.control_review++;
  }

  return { tasksCreated: Object.values(byType).reduce((a, b) => a + b, 0), byType };
}

export async function getControlProcessCycle(
  tenantId: string,
  controlId: string,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT
       pt.task_id, pt.task_type, pt.entity_type, pt.entity_id,
       pt.title, pt.status, pt.priority, pt.sla_hours,
       pt.due_date, pt.breached_at, pt.created_at,
       u.email AS assigned_email,
       t.name_en AS team_name
     FROM "${schema}".process_tasks pt
     LEFT JOIN public.users  u ON u.user_id    = pt.assigned_user_id
     LEFT JOIN "${schema}".teams t ON t.team_id = pt.team_id
     WHERE pt.control_id::text = $1
       AND pt.status NOT IN ('cancelled', 'auto_closed')
     ORDER BY pt.created_at DESC`,
    [controlId],
  );
  return res.rows.map(r => ({
    ...r,
    slaStatus: computeSlaStatus(r.due_date, r.breached_at),
  }));
}

export async function getControlLinkedItems(
  tenantId: string,
  controlId: string,
): Promise<LinkedItems> {
  const schema = tenantSchema(tenantId);

  // Active tasks indexed by entity_type+entity_id for O(1) lookup
  const tasksRes = await safeQuery(
    `SELECT pt.task_id, pt.entity_type, pt.entity_id, pt.status,
            pt.due_date, pt.breached_at,
            u.email AS assigned_email
     FROM "${schema}".process_tasks pt
     LEFT JOIN public.users u ON u.user_id = pt.assigned_user_id
     WHERE pt.control_id::text = $1
       AND pt.entity_type IS NOT NULL
       AND pt.status NOT IN ('cancelled', 'auto_closed', 'completed')`,
    [controlId],
  );
  const taskMap = new Map<string, (typeof tasksRes.rows)[0]>();
  for (const t of tasksRes.rows) taskMap.set(`${t.entity_type}:${t.entity_id}`, t);

  const pick = (entityType: string, entityId: string) => {
    const t = taskMap.get(`${entityType}:${entityId}`);
    return {
      assignedUser: t?.assigned_email ?? null,
      taskStatus:   t?.status ?? null,
      slaStatus:    t ? computeSlaStatus(t.due_date, t.breached_at) : null,
      dueDate:      t?.due_date ?? null,
    };
  };

  // Gaps
  const gapsRes = await safeQuery(
    `SELECT id::text AS id, title, severity, status
     FROM "${schema}".findings
     WHERE source_id = $1 AND source_type = 'control'
     ORDER BY created_at DESC`,
    [controlId],
  );
  const gaps: LinkedGap[] = gapsRes.rows.map(r => ({ gapId: r.id, title: r.title, severity: r.severity, status: r.status, ...pick('compliance_gap', r.id) }));

  // Risks
  const risksRes = await safeQuery(
    `SELECT risk_id::text AS id, title, COALESCE(risk_score, 0)::int AS score
     FROM "${schema}".risks
     WHERE $1 = ANY(COALESCE(control_ids, ARRAY[]::text[]))
        OR $1 = ANY(COALESCE(related_control_ids, ARRAY[]::text[]))
     ORDER BY risk_score DESC NULLS LAST`,
    [controlId],
  );
  const risks: LinkedRisk[] = risksRes.rows.map(r => ({ riskId: r.id, title: r.title, score: r.score, ...pick('risk', r.id) }));

  // Evidence schedules
  const evRes = await safeQuery(
    `SELECT id::text AS id, control_id::text AS "controlId", cron_expression AS frequency
     FROM "${schema}".evidence_schedules
     WHERE control_id = $1`,
    [controlId],
  );
  const evidence: LinkedEvidence[] = evRes.rows.map(r => ({ scheduleId: r.id, controlId: r.controlId, frequency: r.frequency, ...pick('evidence', r.id) }));

  // Audit tasks (control_review + audit_response)
  const auditRes = await safeQuery(
    `SELECT pt.task_id, pt.title, pt.status, pt.due_date, pt.breached_at,
            u.email AS assigned_email
     FROM "${schema}".process_tasks pt
     LEFT JOIN public.users u ON u.user_id = pt.assigned_user_id
     WHERE pt.control_id::text = $1
       AND pt.task_type IN ('control_review', 'audit_response')
       AND pt.status NOT IN ('cancelled', 'auto_closed')
     ORDER BY pt.created_at DESC`,
    [controlId],
  );
  const auditTasks: LinkedAuditTask[] = auditRes.rows.map(r => ({
    taskId:      r.task_id,
    title:       r.title,
    taskStatus:  r.status,
    assignedUser: r.assigned_email ?? null,
    slaStatus:   computeSlaStatus(r.due_date, r.breached_at),
    dueDate:     r.due_date ?? null,
  }));

  return { gaps, risks, evidence, auditTasks };
}

// ── Event Bus Subscribers ─────────────────────────────────────────────────────

export function registerControlProcessCycleSubscribers(): void {
  eventBus.subscribe('control.state_changed', 'control-process-cycle', async (event) => {

    const toState: string = event.payload?.toState ?? '';
    if (!['design', 'testing'].includes(toState)) return;
    const controlId = event.entityId;
    if (!controlId || !event.tenantId) return;
    await launchControlProcessCycle(event.tenantId, controlId, 'lifecycle_transition').catch(catchHandler(EC.EVENT_BUS, {}));
  });

  eventBus.subscribe('compliance.gap_detected', 'control-process-cycle', async (event) => {
    const { controlId, gapId, title, severity } = event.payload ?? {};
    if (!controlId || !gapId || !event.tenantId) return;
    const schema = tenantSchema(event.tenantId);

    if (await swallowDefault(EC.FALLBACK_QUERY, false, hasActiveTask(schema, (controlId as any), 'compliance_gap', gapId), { operation: 'fallback query' })) return;
    await createProcessTask(event.tenantId, {
      taskType:      'remediation',
      title:         `Gap remediation: ${title ?? gapId}`,
      priority:      severityToPriority((severity as any) ?? 'medium'),
      entityType:    'compliance_gap',
      entityId:      gapId,
      controlId,
      triggerSource: 'event:compliance.gap_detected',
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  eventBus.subscribe('control.failed', 'control-process-cycle', async (event) => {
    const controlId = event.entityId;
    if (!controlId || !event.tenantId) return;
    await createProcessTask(event.tenantId, {
      taskType:      'audit_response',
      title:         `Audit response: control failure ${controlId}`,
      priority:      'critical',
      entityType:    'control',
      entityId:      controlId,
      controlId,
      triggerSource: 'event:control.failed',
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });
}
