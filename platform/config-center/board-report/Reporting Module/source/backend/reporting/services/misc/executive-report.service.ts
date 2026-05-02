// ============================================================================
// Executive Summary Auto-Generation Service (W2-16)
// Generates board-ready compliance reports with KPIs, trends, risk
// heatmaps, and actionable recommendations.
// ============================================================================

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { resolveRegulatoryProfileForTenant } from '../../../compliance/services/regulatory/regulatory-resolution.service';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

export interface ExecutiveReport {
  tenantId: string;
  generatedAt: string;
  reportPeriod: { from: string; to: string };
  executiveSummary: string;
  overallComplianceScore: number;
  overallRiskScore: number;
  frameworkScores: FrameworkScore[];
  keyFindings: Finding[];
  riskHeatmap: RiskHeatmapEntry[];
  trendData: TrendPoint[];
  recommendations: Recommendation[];
  upcomingDeadlines: Deadline[];
  agentInsights: AgentInsight[];
}

interface FrameworkScore {
  code: string;
  name: string;
  totalControls: number;
  compliantControls: number;
  complianceRate: number;
  trend: "improving" | "stable" | "declining";
  criticalGaps: number;
}

interface Finding {
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  affectedFramework: string;
  recommendation: string;
}

interface RiskHeatmapEntry {
  riskName: string;
  category: string;
  impact: number;
  likelihood: number;
  score: number;
  trend: "improving" | "stable" | "worsening";
}

interface TrendPoint {
  date: string;
  complianceRate: number;
  riskScore: number;
  openFindings: number;
  evidenceFreshness: number;
}

interface Recommendation {
  priority: number;
  title: string;
  description: string;
  estimatedEffort: string;
  responsibleRole: string;
}

interface Deadline {
  title: string;
  dueDate: string;
  framework: string;
  daysRemaining: number;
  status: "on_track" | "at_risk" | "overdue";
}

interface AgentInsight {
  agentId: string;
  agentName: string;
  insight: string;
  actionsTaken: number;
  lastRunAt: string;
}

/**
 * Generate a comprehensive executive compliance report for a tenant.
 */
export async function generateExecutiveReport(
  tenantId: string,
  periodDays: number = 30
): Promise<ExecutiveReport> {
  const schema = tenantSchema(tenantId);
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // 1. Get regulatory profile
  const _profile = await resolveRegulatoryProfileForTenant(tenantId);

  // 2. Framework compliance scores
  const fwScores = await getFrameworkScores(schema);

  // 3. Overall compliance score (weighted average)
  const totalControls = fwScores.reduce((s, f) => s + f.totalControls, 0);
  const totalCompliant = fwScores.reduce((s, f) => s + f.compliantControls, 0);
  const overallComplianceScore = totalControls > 0
    ? Math.round((totalCompliant / totalControls) * 100) : 0;

  // 4. Risk heatmap
  const riskHeatmap = await getRiskHeatmap(schema);
  const avgRiskScore = riskHeatmap.length > 0
    ? Math.round(riskHeatmap.reduce((s, r) => s + r.score, 0) / riskHeatmap.length) : 0;

  // 5. Key findings
  const keyFindings = await getKeyFindings(schema, periodStart);

  // 6. Trend data (last N days, sampled weekly)
  const trendData = await getTrendData(schema, periodDays);

  // 7. Recommendations (auto-generated from gaps)
  const recommendations = generateRecommendations(fwScores, riskHeatmap, keyFindings);

  // 8. Upcoming deadlines
  const deadlines = await getUpcomingDeadlines(schema);

  // 9. Agent insights
  const agentInsights = await getAgentInsights(tenantId, periodStart);

  // 10. Executive summary text
  const executiveSummary = buildExecutiveSummary(
    overallComplianceScore, avgRiskScore, fwScores,
    keyFindings.length, recommendations.length
  );

  return {
    tenantId,
    generatedAt: now.toISOString(),
    reportPeriod: {
      from: periodStart.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    },
    executiveSummary,
    overallComplianceScore,
    overallRiskScore: avgRiskScore,
    frameworkScores: fwScores,
    keyFindings,
    riskHeatmap,
    trendData,
    recommendations,
    upcomingDeadlines: deadlines,
    agentInsights,
  };
}

// ── Helpers ──

async function getFrameworkScores(schema: string): Promise<FrameworkScore[]> {
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT c.framework_code AS code,
            COALESCE(f.framework_name, c.framework_code) AS name,
            COUNT(*)::int AS "totalControls",
            COUNT(*) FILTER (WHERE c.compliance_status = 'compliant')::int AS "compliantControls",
            COUNT(*) FILTER (WHERE c.criticality = 'critical' AND c.compliance_status <> 'compliant')::int AS "criticalGaps"
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".frameworks f ON f.framework_code = c.framework_code
     WHERE c.status = 'active' AND c.framework_code IS NOT NULL
     GROUP BY c.framework_code, f.framework_name
     ORDER BY c.framework_code`,
    []
  ), { operation: 'query controls' });

  return res.rows.map((r: GenericRow) => ({
    code: r.code as string,
    name: r.name as string,
    totalControls: r.totalControls as number,
    compliantControls: r.compliantControls as number,
    criticalGaps: r.criticalGaps as number,
    complianceRate: (r.totalControls as number) > 0
      ? Math.round(((r.compliantControls as number) / (r.totalControls as number)) * 100) : 0,
    trend: "stable" as const,
  }));
}

async function getRiskHeatmap(schema: string): Promise<RiskHeatmapEntry[]> {
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT risk_name AS "riskName",
            COALESCE(risk_category, 'general') AS category,
            CASE impact WHEN 'critical' THEN 5 WHEN 'high' THEN 4 WHEN 'medium' THEN 3 WHEN 'low' THEN 2 ELSE 1 END AS impact,
            CASE likelihood WHEN 'almost_certain' THEN 5 WHEN 'likely' THEN 4 WHEN 'possible' THEN 3 WHEN 'unlikely' THEN 2 ELSE 1 END AS likelihood,
            COALESCE(risk_score, 0) AS score
     FROM "${schema}".risks
     WHERE status IN ('open', 'mitigating', 'active')
     ORDER BY risk_score DESC NULLS LAST
     LIMIT 20`,
    []
  ), { operation: 'query risks' });

  return res.rows.map((r: GenericRow) => ({
    riskName: r.riskName as string,
    category: r.category as string,
    impact: r.impact as number,
    likelihood: r.likelihood as number,
    score: r.score as number,
    trend: "stable" as const,
  }));
}

async function getKeyFindings(schema: string, since: Date): Promise<Finding[]> {
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT severity, title, description, framework_code AS "affectedFramework"
     FROM "${schema}".findings
     WHERE status = 'open' AND created_at >= $1
     ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
     LIMIT 10`,
    [since.toISOString()]
  ), { operation: 'query findings' });

  return res.rows.map((r: GenericRow) => ({
    severity: (r.severity || 'medium') as Finding['severity'],
    title: (r.title || '') as string,
    description: (r.description || '') as string,
    affectedFramework: (r.affectedFramework || '') as string,
    recommendation: `Address ${r.severity} finding in ${r.affectedFramework || 'general'} domain.`,
  }));
}

async function getTrendData(schema: string, periodDays: number): Promise<TrendPoint[]> {
  // Generate weekly data points
  const points: TrendPoint[] = [];
  const weeks = Math.ceil(periodDays / 7);

  for (let i = weeks; i >= 0; i--) {
    const date = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
    points.push({
      date: date.toISOString().slice(0, 10),
      complianceRate: 0,
      riskScore: 0,
      openFindings: 0,
      evidenceFreshness: 0,
    });
  }

  // Try to get actual snapshot data
  const snapRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT snapshot_date::text AS date,
            COALESCE((data->>'compliance_rate')::int, 0) AS "complianceRate",
            COALESCE((data->>'risk_score')::int, 0) AS "riskScore",
            COALESCE((data->>'open_findings')::int, 0) AS "openFindings",
            COALESCE((data->>'evidence_freshness')::int, 0) AS "evidenceFreshness"
     FROM "${schema}".dashboard_snapshots
     WHERE snapshot_date >= CURRENT_DATE - ($1 || ' days')::interval
     ORDER BY snapshot_date`,
    [periodDays]
  ), { operation: 'query dashboard_snapshots' });

  if (snapRes.rows.length > 0) return snapRes.rows;
  return points;
}

function generateRecommendations(
  fwScores: FrameworkScore[],
  risks: RiskHeatmapEntry[],
  findings: Finding[]
): Recommendation[] {
  const recs: Recommendation[] = [];
  let priority = 1;

  // Critical gaps in frameworks
  for (const fw of fwScores) {
    if (fw.criticalGaps > 0) {
      recs.push({
        priority: priority++,
        title: `Address ${fw.criticalGaps} critical control gaps in ${fw.name}`,
        description: `Framework ${fw.code} has ${fw.criticalGaps} critical controls that are non-compliant. These represent the highest regulatory risk.`,
        estimatedEffort: `${fw.criticalGaps * 3}-${fw.criticalGaps * 5} days`,
        responsibleRole: "CISO",
      });
    }
  }

  // Low compliance frameworks
  for (const fw of fwScores.filter(f => f.complianceRate < 50 && f.totalControls > 10)) {
    recs.push({
      priority: priority++,
      title: `Improve ${fw.name} compliance (currently ${fw.complianceRate}%)`,
      description: `Only ${fw.compliantControls}/${fw.totalControls} controls are compliant. Consider a focused remediation sprint.`,
      estimatedEffort: "2-4 weeks",
      responsibleRole: "GRC Manager",
    });
  }

  // High-score risks
  for (const risk of risks.filter(r => r.score >= 15)) {
    recs.push({
      priority: priority++,
      title: `Mitigate high-scoring risk: ${risk.riskName}`,
      description: `Risk score ${risk.score}/25 (impact: ${risk.impact}, likelihood: ${risk.likelihood}). Implement additional controls or transfer risk.`,
      estimatedEffort: "1-2 weeks",
      responsibleRole: "Risk Manager",
    });
  }

  // Critical findings
  for (const finding of findings.filter(f => f.severity === "critical")) {
    recs.push({
      priority: priority++,
      title: `Resolve critical finding: ${finding.title}`,
      description: finding.description || "Critical finding requires immediate attention.",
      estimatedEffort: "3-5 days",
      responsibleRole: "CISO",
    });
  }

  // General recommendations if few specific ones
  if (recs.length < 3) {
    recs.push({
      priority: priority++,
      title: "Schedule quarterly compliance review",
      description: "Regular compliance reviews ensure continuous improvement and audit readiness.",
      estimatedEffort: "2-3 days",
      responsibleRole: "Compliance Officer",
    });
    recs.push({
      priority: priority++,
      title: "Update evidence collection for upcoming audit cycle",
      description: "Ensure all evidence tasks are current and freshness thresholds are met.",
      estimatedEffort: "1 week",
      responsibleRole: "Evidence Manager",
    });
  }

  return recs.slice(0, 10);
}

async function getUpcomingDeadlines(schema: string): Promise<Deadline[]> {
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT title, due_date AS "dueDate", framework_code AS framework,
            EXTRACT(DAY FROM due_date - CURRENT_DATE)::int AS "daysRemaining"
     FROM "${schema}".tasks
     WHERE due_date IS NOT NULL
       AND due_date >= CURRENT_DATE
       AND status NOT IN ('completed', 'cancelled')
     ORDER BY due_date ASC
     LIMIT 10`,
    []
  ), { operation: 'query tasks' });

  return res.rows.map((r: GenericRow) => ({
    title: (r.title || '') as string,
    dueDate: (r.dueDate || '') as string,
    framework: (r.framework || '') as string,
    daysRemaining: (r.daysRemaining || 0) as number,
    status: ((r.daysRemaining as number) <= 0 ? "overdue" : (r.daysRemaining as number) <= 7 ? "at_risk" : "on_track") as Deadline['status'],
  }));
}

async function getAgentInsights(tenantId: string, since: Date): Promise<AgentInsight[]> {
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT agent_id AS "agentId",
            COUNT(*)::int AS "actionsTaken",
            MAX(created_at) AS "lastRunAt"
     FROM "${tenantSchema(tenantId)}".agrc_agent_actions
     WHERE created_at >= $1
     GROUP BY agent_id
     ORDER BY agent_id`,
    [since.toISOString()]
  ), { operation: 'query agrc_agent_actions' });

  const agentNames: Record<string, string> = {
    "A01": "Compliance Sentinel", "A02": "Risk Analyzer", "A03": "Evidence Collector",
    "A04": "Policy Drafter", "A05": "Audit Assistant", "A06": "Vendor Watchdog",
    "A07": "Incident Responder", "A08": "Training Coach", "A09": "Report Generator",
    "A10": "Data Protection Officer",
  };

  return res.rows.map((r: GenericRow) => ({
    agentId: (r.agentId || '') as string,
    agentName: (agentNames[r.agentId as string] || r.agentId || '') as string,
    actionsTaken: (r.actionsTaken || 0) as number,
    lastRunAt: (r.lastRunAt || '') as string,
    insight: `Executed ${r.actionsTaken} actions since last report period.`,
  }));
}

function buildExecutiveSummary(
  complianceRate: number, riskScore: number,
  frameworks: FrameworkScore[], findingCount: number, recCount: number
): string {
  const status = complianceRate >= 80 ? "strong" : complianceRate >= 60 ? "moderate" : "requires attention";
  const fwCount = frameworks.length;
  const criticalGaps = frameworks.reduce((s, f) => s + f.criticalGaps, 0);

  let summary = `Overall compliance posture is ${status} at ${complianceRate}% across ${fwCount} active frameworks. `;

  if (criticalGaps > 0) {
    summary += `There are ${criticalGaps} critical control gaps requiring immediate attention. `;
  }

  if (riskScore > 15) {
    summary += `Average risk score is elevated at ${riskScore}/25 — risk treatment plans should be prioritized. `;
  } else if (riskScore > 0) {
    summary += `Average risk score is ${riskScore}/25, within acceptable thresholds. `;
  }

  if (findingCount > 0) {
    summary += `${findingCount} open findings require remediation. `;
  }

  summary += `${recCount} recommendations have been generated for this reporting period.`;

  return summary;
}
