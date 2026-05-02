import { safeQuery, tenantSchema } from '../ports/database.port';
import { WORKFLOW_SLA_DEFAULTS, WORKFLOW_BUSINESS_THRESHOLDS, WORKFLOW_TIMEOUTS } from '../data/workflow-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".workflow_workflows
    WHERE deleted_at IS NULL
    GROUP BY status
  `);
  const stats: Record<string, number> = {};
  for (const row of result.rows) stats[row.status] = row.count;
  return stats;
}

export async function getKpiMetrics(tenantId: string): Promise<{
  totalWorkflows: number;
  activeWorkflows: number;
  completionRate: number;
  avgCompletionDays: number;
  slaComplianceRate: number;
  pendingApprovals: number;
  failedWorkflows: number;
  overdueWorkflows: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total_workflows,
      COUNT(*) FILTER (WHERE status IN ('active', 'paused'))::int AS active_workflows,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_workflows,
      COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled', 'archived', 'failed')
        AND due_date IS NOT NULL AND due_date < NOW())::int AS overdue_workflows,
      CASE WHEN COUNT(*) FILTER (WHERE status IN ('completed', 'cancelled', 'failed', 'archived')) > 0
        THEN ROUND(
          COUNT(*) FILTER (WHERE status IN ('completed', 'archived'))::numeric /
          COUNT(*) FILTER (WHERE status IN ('completed', 'cancelled', 'failed', 'archived'))::numeric * 100, 2)
        ELSE 0
      END AS completion_rate,
      COALESCE(
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400)
          FILTER (WHERE status IN ('completed', 'archived') AND completed_at IS NOT NULL),
        0
      )::numeric(10,2) AS avg_completion_days,
      CASE WHEN COUNT(*) FILTER (WHERE status IN ('completed', 'archived') AND completed_at IS NOT NULL) > 0
        THEN ROUND(
          COUNT(*) FILTER (
            WHERE status IN ('completed', 'archived')
              AND completed_at IS NOT NULL
              AND due_date IS NOT NULL
              AND completed_at <= due_date
          )::numeric /
          COUNT(*) FILTER (WHERE status IN ('completed', 'archived') AND completed_at IS NOT NULL)::numeric * 100, 2)
        ELSE 100
      END AS sla_compliance_rate
    FROM "${schema}".workflow_workflows
    WHERE deleted_at IS NULL
  `);

  const approvalResult = await safeQuery(`
    SELECT COUNT(*)::int AS pending_approvals
    FROM "${schema}".workflow_workflows
    WHERE deleted_at IS NULL
      AND status = 'active'
      AND current_step ILIKE '%approval%'
  `).catch(() => ({ rows: [{ pending_approvals: 0 }] }));

  const row = result.rows[0] || {};
  return {
    totalWorkflows: row.total_workflows || 0,
    activeWorkflows: row.active_workflows || 0,
    completionRate: Number(row.completion_rate) || 0,
    avgCompletionDays: Number(row.avg_completion_days) || 0,
    slaComplianceRate: Number(row.sla_compliance_rate) || 100,
    pendingApprovals: approvalResult.rows[0]?.pending_approvals || 0,
    failedWorkflows: row.failed_workflows || 0,
    overdueWorkflows: row.overdue_workflows || 0,
  };
}

export async function getWorkflowTypeBreakdown(tenantId: string): Promise<Array<{
  workflowType: string;
  count: number;
  activeCount: number;
  completedCount: number;
  failedCount: number;
  avgCompletionDays: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(workflow_type, 'general') AS workflow_type,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status IN ('active', 'paused'))::int AS active_count,
      COUNT(*) FILTER (WHERE status IN ('completed', 'archived'))::int AS completed_count,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
      COALESCE(
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400)
          FILTER (WHERE status IN ('completed', 'archived') AND completed_at IS NOT NULL),
        0
      )::numeric(10,2) AS avg_completion_days
    FROM "${schema}".workflow_workflows
    WHERE deleted_at IS NULL
    GROUP BY workflow_type
    ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    workflowType: r.workflow_type,
    count: r.count,
    activeCount: r.active_count,
    completedCount: r.completed_count,
    failedCount: r.failed_count,
    avgCompletionDays: Number(r.avg_completion_days) || 0,
  }));
}

export async function getTaskStatusBreakdown(tenantId: string): Promise<Array<{
  status: string;
  count: number;
  overdueCount: number;
  avgAgeDays: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      status,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date < NOW())::int AS overdue_count,
      COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400), 0)::numeric(10,2) AS avg_age_days
    FROM "${schema}".workflow_workflows
    WHERE deleted_at IS NULL
    GROUP BY status
    ORDER BY CASE status
      WHEN 'active' THEN 1 WHEN 'paused' THEN 2 WHEN 'draft' THEN 3
      WHEN 'completed' THEN 4 WHEN 'failed' THEN 5
      WHEN 'cancelled' THEN 6 WHEN 'archived' THEN 7 ELSE 8 END
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    status: r.status,
    count: r.count,
    overdueCount: r.overdue_count,
    avgAgeDays: Number(r.avg_age_days) || 0,
  }));
}

export async function getStuckWorkflows(tenantId: string, staleAfterDays?: number): Promise<Array<{
  id: string;
  title: string;
  workflowType: string;
  status: string;
  currentStep: string;
  assigneeId: string;
  priority: string;
  daysSinceUpdate: number;
  dueDate: string | null;
  isOverdue: boolean;
}>> {
  const schema = tenantSchema(tenantId);
  const threshold = staleAfterDays ?? WORKFLOW_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS;
  const result = await safeQuery(`
    SELECT
      id,
      COALESCE(title, 'Untitled') AS title,
      COALESCE(workflow_type, 'general') AS workflow_type,
      status,
      COALESCE(current_step, 'unknown') AS current_step,
      COALESCE(assignee_id, '') AS assignee_id,
      COALESCE(priority, 'medium') AS priority,
      EXTRACT(EPOCH FROM (NOW() - updated_at) / 86400)::int AS days_since_update,
      due_date,
      (due_date IS NOT NULL AND due_date < NOW()) AS is_overdue
    FROM "${schema}".workflow_workflows
    WHERE deleted_at IS NULL
      AND status IN ('active', 'paused')
      AND updated_at < NOW() - ($1 || ' days')::INTERVAL
    ORDER BY updated_at ASC
    LIMIT 100
  `, [threshold]);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    workflowType: r.workflow_type,
    status: r.status,
    currentStep: r.current_step,
    assigneeId: r.assignee_id,
    priority: r.priority,
    daysSinceUpdate: r.days_since_update || 0,
    dueDate: r.due_date ? new Date((r as any).due_date).toISOString() : null,
    isOverdue: Boolean(r.is_overdue),
  }));
}

export async function getApprovalBacklog(tenantId: string): Promise<Array<{
  id: string;
  title: string;
  workflowType: string;
  priority: string;
  requestedBy: string;
  hoursWaiting: number;
  slaHours: number;
  isSlaBreached: boolean;
}>> {
  const schema = tenantSchema(tenantId);
  // secrets-scan-allow: tenantSchema()-validated quoted schema + typed column/filter constants; all user values bound via $N
  const result = await safeQuery(`
    SELECT
      id,
      COALESCE(title, 'Untitled') AS title,
      COALESCE(workflow_type, 'general') AS workflow_type,
      COALESCE(priority, 'medium') AS priority,
      COALESCE(created_by, '') AS requested_by,
      EXTRACT(EPOCH FROM (NOW() - updated_at) / 3600)::int AS hours_waiting,
      CASE COALESCE(priority, 'medium')
        WHEN 'critical' THEN ${WORKFLOW_SLA_DEFAULTS.critical}
        WHEN 'high' THEN ${WORKFLOW_SLA_DEFAULTS.high}
        WHEN 'medium' THEN ${WORKFLOW_SLA_DEFAULTS.medium}
        ELSE ${WORKFLOW_SLA_DEFAULTS.low}
      END AS sla_hours
    FROM "${schema}".workflow_workflows
    WHERE deleted_at IS NULL
      AND status = 'active'
      AND current_step ILIKE '%approval%'
    ORDER BY CASE COALESCE(priority, 'medium')
      WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      updated_at ASC
    LIMIT 200
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    workflowType: r.workflow_type,
    priority: r.priority,
    requestedBy: r.requested_by,
    hoursWaiting: r.hours_waiting || 0,
    slaHours: r.sla_hours,
    isSlaBreached: (r.hours_waiting || 0) > r.sla_hours,
  }));
}

export async function getAgingReport(tenantId: string): Promise<Array<{ bucket: string; count: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      CASE
        WHEN created_at > NOW() - INTERVAL '7 days' THEN '0-7d'
        WHEN created_at > NOW() - INTERVAL '30 days' THEN '8-30d'
        WHEN created_at > NOW() - INTERVAL '90 days' THEN '31-90d'
        ELSE '90d+'
      END AS bucket,
      COUNT(*)::int AS count
    FROM "${schema}".workflow_workflows
    WHERE deleted_at IS NULL AND status NOT IN ('completed', 'cancelled', 'archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function getSlaComplianceByType(tenantId: string): Promise<Array<{
  workflowType: string;
  total: number;
  onTime: number;
  breached: number;
  complianceRate: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(workflow_type, 'general') AS workflow_type,
      COUNT(*) FILTER (WHERE status IN ('completed', 'archived') AND completed_at IS NOT NULL)::int AS total,
      COUNT(*) FILTER (WHERE status IN ('completed', 'archived') AND completed_at IS NOT NULL
        AND due_date IS NOT NULL AND completed_at <= due_date)::int AS on_time,
      COUNT(*) FILTER (WHERE status IN ('completed', 'archived') AND completed_at IS NOT NULL
        AND due_date IS NOT NULL AND completed_at > due_date)::int AS breached
    FROM "${schema}".workflow_workflows
    WHERE deleted_at IS NULL
    GROUP BY workflow_type
    ORDER BY total DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    workflowType: r.workflow_type,
    total: r.total || 0,
    onTime: r.on_time || 0,
    breached: r.breached || 0,
    complianceRate: (r as any).total > 0

      ? Number(((r.on_time / r.total) * 100).toFixed(2))
      : 100,
  }));
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  workflowType?: string;
  assigneeId?: string;
  priority?: string;
  slaStatus?: 'on_track' | 'at_risk' | 'breached';
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}): Promise<{ rows: unknown[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const offset = (page - 1) * pageSize;
  const sortBy = params.sortBy || 'created_at';
  const sortDir = params.sortDir === 'ASC' ? 'ASC' : 'DESC';
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;

  if (params.query) {
    conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
    values.push(`%${params.query}%`);
    idx++;
  }
  if (params.status) {
    conditions.push(`status = $${idx}`);
    values.push(params.status);
    idx++;
  }
  if (params.workflowType) {
    conditions.push(`workflow_type = $${idx}`);
    values.push(params.workflowType);
    idx++;
  }
  if (params.assigneeId) {
    conditions.push(`assignee_id = $${idx}`);
    values.push(params.assigneeId);
    idx++;
  }
  if (params.priority) {
    conditions.push(`priority = $${idx}`);
    values.push(params.priority);
    idx++;
  }
  if (params.slaStatus === 'breached') {
    conditions.push(`due_date IS NOT NULL AND due_date < NOW() AND status NOT IN ('completed', 'cancelled', 'archived')`);
  } else if (params.slaStatus === 'at_risk') {
    conditions.push(`due_date IS NOT NULL AND due_date BETWEEN NOW() AND NOW() + INTERVAL '${WORKFLOW_TIMEOUTS.REMINDER_BEFORE_HOURS} hours' AND status NOT IN ('completed', 'cancelled', 'archived')`);
  } else if (params.slaStatus === 'on_track') {
    conditions.push(`(due_date IS NULL OR due_date > NOW() + INTERVAL '${WORKFLOW_TIMEOUTS.REMINDER_BEFORE_HOURS} hours') AND status NOT IN ('completed', 'cancelled', 'archived')`);
  }

  const where = conditions.join(' AND ');
  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".workflow_workflows WHERE ${where}`,
    values,
  );
  const dataResult = await safeQuery(
    `SELECT * FROM "${schema}".workflow_workflows WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, pageSize, offset],
  );
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.workflowType) { conditions.push(`workflow_type = $${idx}`); values.push(filters.workflowType); idx++; }
  if (filters?.priority) { conditions.push(`priority = $${idx}`); values.push(filters.priority); idx++; }
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_workflows WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 5000`,
    values,
  );
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT w.id, w.title, w.status, w.workflow_type, w.priority, w.created_at,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".workflow_workflows w
    JOIN "${schema}".entity_links el ON el.source_entity_id = w.id AND el.source_module = 'workflow'
    WHERE w.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY w.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
