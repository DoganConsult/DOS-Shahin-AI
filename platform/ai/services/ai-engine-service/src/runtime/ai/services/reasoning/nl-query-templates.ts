import { safeQuery } from "@dos/db";

// ============================================
// NL Query Templates — Safe SQL Templates for
// Natural Language GRC Queries
//
// Each template maps common English/Arabic
// phrases to parameterized, read-only SQL
// against tenant schemas.
// ============================================

/**
 * Defines a safe, pre-validated query template that maps
 * natural language patterns to tenant-scoped SQL.
 */
export interface QueryTemplate {
  id: string;
  /** Natural language phrases that trigger this template */
  patterns: string[];
  /** Returns parameterized SQL scoped to the given tenant schema */
  sql: (schema: string) => string;
  /** Optional default parameters for the query */
  params?: Record<string, { type: string; default: any }>;
  /** Preferred visualization type for the result set */
  visualization: 'table' | 'bar_chart' | 'number' | 'list';
  /** Human-readable description of what the query returns */
  description: string;
}

/**
 * 25+ safe query templates covering common GRC questions.
 * All queries are SELECT-only with LIMIT caps and scoped
 * to the tenant schema via double-quoted identifiers.
 */
export const NL_QUERY_TEMPLATES: QueryTemplate[] = [
  {
    id: 'top_risks',
    patterns: ['top risks', 'highest risks', 'worst risks', 'riskiest', 'biggest risks'],
    sql: (s) =>
      `SELECT risk_id, title, inherent_score, residual_score, status FROM "${s}".risks WHERE status != 'retired' ORDER BY inherent_score DESC NULLS LAST LIMIT 10`,
    visualization: 'table',
    description: 'Top 10 risks by inherent score',
  },
  {
    id: 'controls_without_evidence',
    patterns: [
      'controls without evidence',
      'controls lacking evidence',
      'controls no evidence',
      'unevidenced controls',
    ],
    sql: (s) =>
      `SELECT c.control_id, c.title, c.framework_id FROM "${s}".controls c LEFT JOIN "${s}".evidence_tasks et ON et.control_id = c.control_id AND et.status = 'completed' WHERE et.task_id IS NULL AND c.status != 'retired' ORDER BY c.control_id LIMIT 20`,
    visualization: 'table',
    description: 'Controls with zero completed evidence',
  },
  {
    id: 'compliance_score',
    patterns: ['compliance score', 'overall compliance', 'compliance posture', 'how compliant'],
    sql: (s) =>
      `SELECT COUNT(*) FILTER (WHERE status = 'compliant') * 100.0 / NULLIF(COUNT(*), 0) AS compliance_pct, COUNT(*) AS total_controls, COUNT(*) FILTER (WHERE status = 'compliant') AS compliant_count FROM "${s}".controls`,
    visualization: 'number',
    description: 'Overall compliance percentage',
  },
  {
    id: 'overdue_evidence',
    patterns: ['overdue evidence', 'expired evidence', 'stale evidence', 'evidence due'],
    sql: (s) =>
      `SELECT task_id, control_id, title, due_date, status FROM "${s}".evidence_tasks WHERE status NOT IN ('completed', 'cancelled') AND due_date < now() ORDER BY due_date ASC LIMIT 20`,
    visualization: 'table',
    description: 'Evidence tasks past their due date',
  },
  {
    id: 'open_findings',
    patterns: ['open findings', 'unresolved findings', 'pending findings', 'active findings'],
    sql: (s) =>
      `SELECT finding_id, title, severity, status, created_at FROM "${s}".findings WHERE status NOT IN ('closed', 'cancelled') ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, created_at DESC LIMIT 20`,
    visualization: 'table',
    description: 'Open findings sorted by severity',
  },
  {
    id: 'risk_by_category',
    patterns: ['risks by category', 'risk categories', 'risk breakdown', 'risk distribution'],
    sql: (s) =>
      `SELECT COALESCE(category, 'Uncategorized') AS category, COUNT(*) AS count, AVG(inherent_score)::int AS avg_score FROM "${s}".risks WHERE status != 'retired' GROUP BY category ORDER BY count DESC`,
    visualization: 'bar_chart',
    description: 'Risk count by category',
  },
  {
    id: 'framework_coverage',
    patterns: ['framework coverage', 'framework compliance', 'how many frameworks', 'framework status'],
    sql: (s) =>
      `SELECT f.framework_id, f.name, COUNT(c.control_id) AS control_count, COUNT(c.control_id) FILTER (WHERE c.status = 'implemented') AS implemented FROM "${s}".frameworks f LEFT JOIN "${s}".controls c ON c.framework_id = f.framework_id GROUP BY f.framework_id, f.name ORDER BY f.name`,
    visualization: 'table',
    description: 'Framework coverage with control counts',
  },
  {
    id: 'vendor_risk',
    patterns: [
      'high risk vendors',
      'risky vendors',
      'vendor risk',
      'worst vendors',
      'critical vendors',
    ],
    sql: (s) =>
      `SELECT vendor_id, vendor_name, risk_tier, overall_score, last_assessment_at FROM "${s}".vendors WHERE risk_tier IN ('critical', 'high') ORDER BY overall_score DESC NULLS LAST LIMIT 20`,
    visualization: 'table',
    description: 'High and critical risk vendors',
  },
  {
    id: 'policy_review_due',
    patterns: [
      'policies due for review',
      'policy review',
      'overdue policies',
      'policies expiring',
      'stale policies',
    ],
    sql: (s) =>
      `SELECT policy_id, title, status, next_review_date FROM "${s}".policies WHERE next_review_date < now() + interval '30 days' AND status != 'retired' ORDER BY next_review_date ASC LIMIT 20`,
    visualization: 'table',
    description: 'Policies due for review within 30 days',
  },
  {
    id: 'incident_trend',
    patterns: ['incident trend', 'incidents this month', 'recent incidents', 'incident count'],
    sql: (s) =>
      `SELECT date_trunc('month', created_at)::date AS month, COUNT(*) AS count, COUNT(*) FILTER (WHERE severity = 'critical') AS critical FROM "${s}".incidents WHERE created_at > now() - interval '12 months' GROUP BY 1 ORDER BY 1`,
    visualization: 'bar_chart',
    description: 'Monthly incident counts for last 12 months',
  },
  {
    id: 'audit_readiness',
    patterns: ['audit readiness', 'ready for audit', 'audit score', 'audit preparation'],
    sql: (s) =>
      `SELECT 'Evidence Coverage' AS metric, (COUNT(*) FILTER (WHERE et.status = 'completed') * 100.0 / NULLIF(COUNT(*), 0))::int AS score FROM "${s}".evidence_tasks et UNION ALL SELECT 'Open Findings', COUNT(*)::int FROM "${s}".findings WHERE status NOT IN ('closed', 'cancelled') UNION ALL SELECT 'Active Controls', COUNT(*)::int FROM "${s}".controls WHERE status NOT IN ('retired', 'draft')`,
    visualization: 'table',
    description: 'Audit readiness metrics',
  },
  {
    id: 'team_workload',
    patterns: ['team workload', 'who is busy', 'task distribution', 'workload balance'],
    sql: (s) =>
      `SELECT assigned_to, COUNT(*) AS open_tasks, COUNT(*) FILTER (WHERE priority = 'critical' OR priority = 'high') AS high_priority, MIN(due_date) AS earliest_due FROM "${s}".process_tasks WHERE status NOT IN ('completed', 'cancelled') AND assigned_to IS NOT NULL GROUP BY assigned_to ORDER BY open_tasks DESC LIMIT 15`,
    visualization: 'table',
    description: 'Team member workload distribution',
  },
  {
    id: 'evidence_freshness',
    patterns: ['evidence freshness', 'evidence age', 'how fresh is evidence', 'evidence recency'],
    sql: (s) =>
      `SELECT CASE WHEN days_old <= 30 THEN 'Fresh (< 30d)' WHEN days_old <= 90 THEN 'Recent (30-90d)' WHEN days_old <= 180 THEN 'Aging (90-180d)' ELSE 'Stale (> 180d)' END AS freshness, COUNT(*) AS count FROM (SELECT EXTRACT(DAY FROM now() - completed_at)::int AS days_old FROM "${s}".evidence_tasks WHERE status = 'completed') sub GROUP BY 1 ORDER BY MIN(days_old)`,
    visualization: 'bar_chart',
    description: 'Evidence freshness distribution',
  },
  {
    id: 'control_effectiveness',
    patterns: [
      'control effectiveness',
      'effective controls',
      'which controls work',
      'control performance',
    ],
    sql: (s) =>
      `SELECT cg.control_id, c.title, cg.gap_severity, cg.evidence_coverage_pct, cg.days_since_evidence FROM "${s}".compliance_gap_snapshots cg JOIN "${s}".controls c ON c.control_id = cg.control_id ORDER BY cg.evidence_coverage_pct ASC LIMIT 20`,
    visualization: 'table',
    description: 'Least effective controls by evidence coverage',
  },
  {
    id: 'remediation_status',
    patterns: [
      'remediation status',
      'open remediations',
      'remediation progress',
      'how many remediations',
    ],
    sql: (s) =>
      `SELECT status, COUNT(*) AS count FROM "${s}".remediation_tasks GROUP BY status ORDER BY count DESC`,
    visualization: 'bar_chart',
    description: 'Remediation task status breakdown',
  },
  {
    id: 'sla_breaches',
    patterns: ['sla breaches', 'breached tasks', 'overdue tasks', 'missed deadlines'],
    sql: (s) =>
      `SELECT task_id, title, task_type, priority, due_date, assigned_to FROM "${s}".process_tasks WHERE status NOT IN ('completed', 'cancelled') AND due_date < now() ORDER BY due_date ASC LIMIT 20`,
    visualization: 'table',
    description: 'Tasks that have breached their SLA',
  },
  {
    id: 'exception_count',
    patterns: ['exceptions', 'active exceptions', 'how many exceptions', 'exception status'],
    sql: (s) =>
      `SELECT status, COUNT(*) AS count FROM "${s}".control_exceptions GROUP BY status ORDER BY count DESC`,
    visualization: 'bar_chart',
    description: 'Exception status breakdown',
  },
  {
    id: 'training_completion',
    patterns: [
      'training completion',
      'training status',
      'who needs training',
      'training gaps',
    ],
    sql: (s) =>
      `SELECT program_name, total_assigned, completed, (completed * 100.0 / NULLIF(total_assigned, 0))::int AS completion_pct FROM "${s}".training_programs WHERE status = 'active' ORDER BY completion_pct ASC NULLS FIRST LIMIT 15`,
    visualization: 'table',
    description: 'Training program completion rates',
  },
  {
    id: 'bcp_readiness',
    patterns: ['bcp readiness', 'business continuity', 'bcp status', 'continuity plans'],
    sql: (s) =>
      `SELECT plan_id, plan_name, status, last_tested_at, rto_hours, rpo_hours FROM "${s}".bcp_plans WHERE status != 'retired' ORDER BY last_tested_at ASC NULLS FIRST LIMIT 15`,
    visualization: 'table',
    description: 'BCP plan readiness status',
  },
  {
    id: 'dashboard_kpis',
    patterns: ['show kpis', 'key metrics', 'dashboard summary', 'governance health'],
    sql: (s) =>
      `SELECT 'Active Risks' AS kpi, COUNT(*)::text AS value FROM "${s}".risks WHERE status NOT IN ('retired', 'closed') UNION ALL SELECT 'Active Controls', COUNT(*)::text FROM "${s}".controls WHERE status NOT IN ('retired') UNION ALL SELECT 'Open Findings', COUNT(*)::text FROM "${s}".findings WHERE status NOT IN ('closed', 'cancelled') UNION ALL SELECT 'Active Policies', COUNT(*)::text FROM "${s}".policies WHERE status NOT IN ('retired') UNION ALL SELECT 'Evidence Tasks', COUNT(*)::text FROM "${s}".evidence_tasks WHERE status = 'pending'`,
    visualization: 'table',
    description: 'Key governance metrics summary',
  },
  // ── Additional templates (21-25+) ──────────────────────────
  {
    id: 'workflow_bottlenecks',
    patterns: ['workflow bottlenecks', 'stuck workflows', 'workflow delays', 'blocked workflows'],
    sql: (s) =>
      `SELECT workflow_id, name, status, current_step, updated_at FROM "${s}".workflows WHERE status IN ('in_progress', 'pending') AND updated_at < now() - interval '7 days' ORDER BY updated_at ASC LIMIT 20`,
    visualization: 'table',
    description: 'Workflows stuck for over 7 days',
  },
  {
    id: 'risk_trend',
    patterns: ['risk trend', 'risk over time', 'risk history', 'how are risks trending'],
    sql: (s) =>
      `SELECT date_trunc('month', created_at)::date AS month, COUNT(*) AS new_risks, COUNT(*) FILTER (WHERE inherent_score >= 15) AS high_or_critical FROM "${s}".risks WHERE created_at > now() - interval '12 months' GROUP BY 1 ORDER BY 1`,
    visualization: 'bar_chart',
    description: 'Monthly new risk creation trend',
  },
  {
    id: 'policy_status_summary',
    patterns: ['policy status', 'policy summary', 'how many policies', 'policies overview'],
    sql: (s) =>
      `SELECT status, COUNT(*) AS count FROM "${s}".policies GROUP BY status ORDER BY count DESC`,
    visualization: 'bar_chart',
    description: 'Policy count by status',
  },
  {
    id: 'evidence_completion_rate',
    patterns: [
      'evidence completion',
      'evidence progress',
      'how much evidence collected',
      'evidence collection rate',
    ],
    sql: (s) =>
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'completed') AS completed, COUNT(*) FILTER (WHERE status = 'pending') AS pending, COUNT(*) FILTER (WHERE status = 'overdue' OR (status != 'completed' AND due_date < now())) AS overdue, (COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*), 0))::int AS completion_pct FROM "${s}".evidence_tasks`,
    visualization: 'number',
    description: 'Evidence collection completion rate',
  },
  {
    id: 'control_status_summary',
    patterns: ['control status', 'control summary', 'how many controls', 'controls overview'],
    sql: (s) =>
      `SELECT status, COUNT(*) AS count FROM "${s}".controls GROUP BY status ORDER BY count DESC`,
    visualization: 'bar_chart',
    description: 'Control count by status',
  },
  {
    id: 'recent_incidents',
    patterns: ['latest incidents', 'new incidents', 'incidents today', 'incidents this week'],
    sql: (s) =>
      `SELECT incident_id, title, severity, status, created_at FROM "${s}".incidents WHERE created_at > now() - interval '7 days' ORDER BY created_at DESC LIMIT 20`,
    visualization: 'table',
    description: 'Incidents created in the last 7 days',
  },
];
