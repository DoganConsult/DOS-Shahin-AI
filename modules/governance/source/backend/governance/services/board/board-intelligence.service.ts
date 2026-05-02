/**
 * Board-Ready Intelligence Service — Pillar 7d
 *
 * AI-powered executive intelligence:
 * 1. One-click AI board packs with charts + narrative
 * 2. Natural language Q&A over GRC data
 * 3. Regulatory impact briefings
 * 4. Executive summary generation
 */

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

interface ComplianceRow { compliant: number; total: number }
interface RiskRow { total_risks: number; high_risks: number; avg_severity: number }
interface EvidenceRow { total: number; valid: number }
interface ControlRow { total: number; passing: number }
interface IncidentRow { open_incidents: number }
interface TaskRow { total: number; overdue: number }
interface CountRow { count: number }

export interface BoardPack {
  packId: string;
  generatedAt: string;
  executiveSummary: string;
  sections: BoardSection[];
  kpis: BoardKPI[];
  riskHighlights: unknown[];
  complianceStatus: Record<string, unknown>;
  recommendations: string[];
}

interface BoardSection {
  title: string;
  titleAr?: string;
  narrative: string;
  narrativeAr?: string;
  dataPoints: Record<string, unknown>;
  trend: 'improving' | 'stable' | 'declining' | 'critical';
}

interface BoardKPI {
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'green' | 'amber' | 'red';
}

/**
 * Generate a complete board pack from current GRC data.
 * Gathers compliance, risk, evidence, control, incident, and task KPIs
 * in parallel, then assembles narrative sections and recommendations.
 */
export async function generateBoardPack(tenantId: string): Promise<BoardPack> {
  const s = tenantSchema(tenantId);

  // Gather all KPI data in parallel
  const [compliance, risk, evidence, controls, incidents, tasks] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ compliant: 0, total: 0 }]), safeQuery(`SELECT
      COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant,
      COUNT(*)::int AS total
      FROM "${s}".controls`), { tenantId: tenantId, operation: 'query controls' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total_risks: 0, high_risks: 0, avg_severity: 0 }]), safeQuery(`SELECT
      COUNT(*)::int AS total_risks,
      COUNT(*) FILTER (WHERE severity = 'critical' OR severity = 'high')::int AS high_risks,
      AVG(CASE severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END)::real AS avg_severity
      FROM "${s}".risks WHERE status != 'closed'`), { tenantId: tenantId, operation: 'query controls' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, valid: 0 }]), safeQuery(`SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'valid' OR status = 'approved')::int AS valid
      FROM "${s}".evidence_tasks`), { tenantId: tenantId, operation: 'query risks' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, passing: 0 }]), safeQuery(`SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE test_status = 'passed')::int AS passing
      FROM "${s}".controls`), { tenantId: tenantId, operation: 'query risks' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ open_incidents: 0 }]), safeQuery(`SELECT COUNT(*)::int AS open_incidents FROM "${s}".process_tasks WHERE task_type = 'incident' AND status = 'open'`), { tenantId: tenantId, operation: 'query evidence_tasks' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, overdue: 0 }]), safeQuery(`SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'open' AND due_at < NOW())::int AS overdue
      FROM "${s}".process_tasks`), { tenantId: tenantId, operation: 'query controls' }),
  ]);

  const c = compliance.rows[0] as ComplianceRow;
  const r = risk.rows[0] as RiskRow;
  const e = evidence.rows[0] as EvidenceRow;
  const ctrl = controls.rows[0] as ControlRow;
  const inc = incidents.rows[0] as IncidentRow;
  const t = tasks.rows[0] as TaskRow;

  const complianceScore = c.total > 0 ? Math.round((c.compliant / c.total) * 100) : 0;
  const evidenceCoverage = e.total > 0 ? Math.round((e.valid / e.total) * 100) : 0;
  const controlEffectiveness = ctrl.total > 0 ? Math.round((ctrl.passing / ctrl.total) * 100) : 0;

  const kpis: BoardKPI[] = [
    { name: 'Compliance Score', value: complianceScore, target: 90, unit: '%', trend: complianceScore >= 85 ? 'up' : 'down', status: complianceScore >= 90 ? 'green' : complianceScore >= 70 ? 'amber' : 'red' },
    { name: 'High/Critical Risks', value: Number(r.high_risks), target: 0, unit: 'count', trend: r.high_risks > 5 ? 'up' : 'stable', status: r.high_risks === 0 ? 'green' : r.high_risks <= 3 ? 'amber' : 'red' },
    { name: 'Evidence Coverage', value: evidenceCoverage, target: 95, unit: '%', trend: evidenceCoverage >= 90 ? 'up' : 'down', status: evidenceCoverage >= 95 ? 'green' : evidenceCoverage >= 80 ? 'amber' : 'red' },
    { name: 'Control Effectiveness', value: controlEffectiveness, target: 85, unit: '%', trend: controlEffectiveness >= 80 ? 'up' : 'down', status: controlEffectiveness >= 85 ? 'green' : controlEffectiveness >= 70 ? 'amber' : 'red' },
    { name: 'Open Incidents', value: Number(inc.open_incidents), target: 0, unit: 'count', trend: inc.open_incidents > 3 ? 'up' : 'stable', status: inc.open_incidents === 0 ? 'green' : inc.open_incidents <= 2 ? 'amber' : 'red' },
    { name: 'Overdue Tasks', value: Number(t.overdue), target: 0, unit: 'count', trend: t.overdue > 5 ? 'up' : 'down', status: t.overdue === 0 ? 'green' : t.overdue <= 3 ? 'amber' : 'red' },
  ];

  const recommendations: string[] = [];
  if (complianceScore < 80) recommendations.push('Compliance score below 80% — prioritize control implementation and evidence collection.');
  if (r.high_risks > 3) recommendations.push(`${r.high_risks} high/critical risks open — convene risk committee for treatment decisions.`);
  if (evidenceCoverage < 85) recommendations.push('Evidence coverage gaps detected — initiate evidence collection campaign.');
  if (t.overdue > 5) recommendations.push(`${t.overdue} overdue tasks — review resource allocation and SLA configuration.`);
  if (recommendations.length === 0) recommendations.push('GRC program is performing within targets. Continue monitoring.');

  const sections: BoardSection[] = [
    {
      title: 'Compliance Posture',
      narrative: `Overall compliance stands at ${complianceScore}% with ${c.compliant} of ${c.total} controls compliant. ${complianceScore >= 90 ? 'The organization is meeting regulatory requirements.' : 'Action needed to close compliance gaps.'}`,
      dataPoints: { score: complianceScore, compliant: c.compliant, total: c.total },
      trend: complianceScore >= 90 ? 'improving' : complianceScore >= 70 ? 'stable' : 'declining',
    },
    {
      title: 'Risk Landscape',
      narrative: `${r.total_risks} active risks identified, ${r.high_risks} rated high/critical. Average risk severity: ${Number(r.avg_severity).toFixed(1)}/4.0.`,
      dataPoints: { totalRisks: r.total_risks, highRisks: r.high_risks, avgSeverity: r.avg_severity },
      trend: r.high_risks === 0 ? 'improving' : r.high_risks <= 3 ? 'stable' : 'critical',
    },
    {
      title: 'Evidence & Audit Readiness',
      narrative: `Evidence coverage at ${evidenceCoverage}% (${e.valid} valid of ${e.total} required). Control testing effectiveness: ${controlEffectiveness}%.`,
      dataPoints: { coverage: evidenceCoverage, valid: e.valid, total: e.total, controlEffectiveness },
      trend: evidenceCoverage >= 90 ? 'improving' : 'declining',
    },
    {
      title: 'Operational Health',
      narrative: `${t.total} total tasks, ${t.overdue} overdue. ${inc.open_incidents} open incidents.`,
      dataPoints: { totalTasks: t.total, overdue: t.overdue, openIncidents: inc.open_incidents },
      trend: t.overdue === 0 ? 'improving' : t.overdue <= 3 ? 'stable' : 'declining',
    },
  ];

  return {
    packId: `bp-${Date.now().toString(36)}`,
    generatedAt: new Date().toISOString(),
    executiveSummary: `GRC Board Pack — Compliance: ${complianceScore}%, Active Risks: ${r.total_risks} (${r.high_risks} high/critical), Evidence Coverage: ${evidenceCoverage}%, Overdue Tasks: ${t.overdue}. ${recommendations[0]}`,
    sections,
    kpis,
    riskHighlights: [],
    complianceStatus: { score: complianceScore, compliant: c.compliant, total: c.total },
    recommendations,
  };
}

/**
 * Natural language Q&A — answer executive GRC questions from data.
 * Uses pattern-matching to map common questions to safe SQL queries.
 */
export async function answerGrcQuestion(tenantId: string, question: string): Promise<{ answer: string; data: unknown; confidence: number }> {
  const s = tenantSchema(tenantId);
  const q = question.toLowerCase();

  // Pattern-match common executive questions
  if (q.includes('compliance') && (q.includes('score') || q.includes('status') || q.includes('posture'))) {
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ compliant: 0, total: 0 }]), safeQuery(`SELECT COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant, COUNT(*)::int AS total FROM "${s}".controls`), { tenantId: tenantId, operation: 'query controls' });
    const row = result.rows[0] as ComplianceRow;
    const score = row.total > 0 ? Math.round((row.compliant / row.total) * 100) : 0;
    return { answer: `Current compliance score is ${score}% (${row.compliant} of ${row.total} controls compliant).`, data: row, confidence: 0.95 };
  }

  if (q.includes('risk') && (q.includes('biggest') || q.includes('top') || q.includes('highest'))) {
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT risk_id, title, severity, status FROM "${s}".risks WHERE status != 'closed' ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END LIMIT 5`), { tenantId: tenantId, operation: 'query risks' });
    const risks = result.rows as { risk_id: string; title: string; severity: string; status: string }[];
    if (risks.length === 0) return { answer: 'No active risks found.', data: [], confidence: 0.9 };
    return { answer: `Top ${risks.length} risks: ${risks.map((ri, i) => `${i + 1}. ${ri.title} (${ri.severity})`).join('; ')}`, data: risks, confidence: 0.9 };
  }

  if (q.includes('overdue') || q.includes('late') || q.includes('behind')) {
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ overdue: 0 }]), safeQuery(`SELECT COUNT(*)::int AS overdue FROM "${s}".process_tasks WHERE status IN ('open', 'in_progress') AND due_at < NOW()`), { tenantId: tenantId, operation: 'query process_tasks' });
    const count = Number((result.rows[0] as { overdue: number })?.overdue || 0);
    return { answer: `There are ${count} overdue tasks requiring attention.`, data: { overdue: count }, confidence: 0.95 };
  }

  if (q.includes('evidence') && (q.includes('coverage') || q.includes('gaps'))) {
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, valid: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'valid' OR status = 'approved')::int AS valid FROM "${s}".evidence_tasks`), { tenantId: tenantId, operation: 'query evidence_tasks' });
    const row = result.rows[0] as EvidenceRow;
    const pct = row.total > 0 ? Math.round((row.valid / row.total) * 100) : 0;
    return { answer: `Evidence coverage is ${pct}% (${row.valid} valid of ${row.total} required). ${100 - pct}% gap remains.`, data: row, confidence: 0.9 };
  }

  if (q.includes('audit') && (q.includes('ready') || q.includes('readiness'))) {
    const [ctrlResult, evResult] = await Promise.all([
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ passing: 0, total: 0 }]), safeQuery(`SELECT COUNT(*) FILTER (WHERE test_status = 'passed')::int AS passing, COUNT(*)::int AS total FROM "${s}".controls`), { tenantId: tenantId, operation: 'query controls' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ valid: 0, total: 0 }]), safeQuery(`SELECT COUNT(*) FILTER (WHERE status = 'valid')::int AS valid, COUNT(*)::int AS total FROM "${s}".evidence_tasks`), { tenantId: tenantId, operation: 'query controls' }),
    ]);
    const ct = ctrlResult.rows[0] as { passing: number; total: number };
    const ev = evResult.rows[0] as { valid: number; total: number };
    const readiness = Math.round(((ct.total > 0 ? ct.passing / ct.total : 0) * 50 + (ev.total > 0 ? ev.valid / ev.total : 0) * 50));
    return { answer: `Audit readiness score: ${readiness}%. Controls passing: ${ct.passing}/${ct.total}. Evidence valid: ${ev.valid}/${ev.total}.`, data: { readiness, controls: ct, evidence: ev }, confidence: 0.85 };
  }

  // Fallback for unrecognized questions
  return { answer: 'I can answer questions about compliance score, top risks, overdue tasks, evidence coverage, and audit readiness. Please rephrase your question.', data: null, confidence: 0.3 };
}

/**
 * Generate regulatory impact briefing when a regulation changes.
 * Identifies affected controls and policies, then produces recommendations.
 */
export async function generateRegulatoryImpactBriefing(tenantId: string, regulationCode: string, changeDescription: string): Promise<{ briefing: string; affectedControls: number; affectedPolicies: number; recommendations: string[] }> {
  const s = tenantSchema(tenantId);

  const [controlsResult, policiesResult] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ count: 0 }]), safeQuery(`SELECT COUNT(*)::int AS count FROM "${s}".controls WHERE framework_id ILIKE $1 OR control_id ILIKE $1`, [`%${regulationCode}%`]), { tenantId: tenantId, operation: 'query controls' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ count: 0 }]), safeQuery(`SELECT COUNT(*)::int AS count FROM "${s}".policies WHERE regulatory_reference ILIKE $1 OR title ILIKE $1`, [`%${regulationCode}%`]), { tenantId: tenantId, operation: 'query controls' }),
  ]);

  const affectedControls = Number((controlsResult.rows[0] as CountRow)?.count || 0);
  const affectedPolicies = Number((policiesResult.rows[0] as CountRow)?.count || 0);

  const recommendations: string[] = [];
  if (affectedControls > 0) recommendations.push(`Review ${affectedControls} controls mapped to ${regulationCode} for compliance impact.`);
  if (affectedPolicies > 0) recommendations.push(`Update ${affectedPolicies} policies referencing ${regulationCode}.`);
  recommendations.push('Schedule regulatory change assessment within 30 days.');
  recommendations.push('Notify compliance team and affected control owners.');

  return {
    briefing: `Regulatory Impact Briefing: ${regulationCode}\n\nChange: ${changeDescription}\n\nImpact: ${affectedControls} controls and ${affectedPolicies} policies are potentially affected. ${recommendations[0]}`,
    affectedControls,
    affectedPolicies,
    recommendations,
  };
}
