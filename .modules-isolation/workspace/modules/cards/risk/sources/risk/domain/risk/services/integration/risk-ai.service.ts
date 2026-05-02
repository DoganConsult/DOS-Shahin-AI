export const RISK_AI_CONFIG = {
  moduleCode: 'risk' as const,
  enabled: true,

  allowedActions: [
    'risk.record.draft',
    'risk.record.recommend',
    'risk.record.summarize',
    'risk.record.classify',
    'risk.record.score',
    'risk.record.analyze',
    'risk.record.generate_report',
  ],

  blockedActions: [
    'risk.record.delete',
    'risk.record.approve',
    'risk.record.reject',
    'risk.record.override',
    'risk.record.bulk_delete',
  ],

  humanInLoopBoundaries: {
    requiresHumanApproval: ['risk.record.approve', 'risk.record.reject', 'risk.record.delete'],
    requiresHumanReview: ['risk.record.classify', 'risk.record.score'],
    autoExecutable: ['risk.record.draft', 'risk.record.summarize', 'risk.record.analyze'],
  },

  modelDependencies: {
    primary: 'azure-openai',
    fallback: 'ollama-llama3',
    embeddingModel: 'text-embedding-3-small',
  },

  promptContracts: {
    maxInputTokens: 8000,
    maxOutputTokens: 4000,
    temperature: 0.3,
    systemPromptTemplate: 'risk_system_prompt_v1',
  },

  safetyHooks: {
    inputValidation: true,
    outputValidation: true,
    promptInjectionProtection: true,
    piiRedaction: true,
    auditAllInvocations: true,
    maxInvocationsPerHour: 100,
    rateLimitPerTenant: 50,
  },
} as const;

export function isRiskAiActionAllowed(action: string): boolean {
  return (RISK_AI_CONFIG.allowedActions as readonly string[]).includes(action);
}

export function isRiskAiActionBlocked(action: string): boolean {
  return (RISK_AI_CONFIG.blockedActions as readonly string[]).includes(action);
}

export function requiresRiskHumanApproval(action: string): boolean {
  return (RISK_AI_CONFIG.humanInLoopBoundaries.requiresHumanApproval as readonly string[]).includes(action);
}

import { safeQuery, tenantSchema } from '../../ports/database.port';

export async function summarize(tenantId: string, entityId: string): Promise<{ summary: string; keyPoints: string[]; confidence: number }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT r.title, r.description, r.category, r.likelihood, r.impact, r.status, r.owner,
            r.created_at, r.updated_at
     FROM ${schema}.risks r WHERE r.id = $1`,
    [entityId]
  );
  const r = result.rows[0];
  if (!r) return { summary: 'Risk not found.', keyPoints: [], confidence: 0 };
  const score = (r.likelihood ?? 1) * (r.impact ?? 1);
  const level = score >= 15 ? 'Critical' : score >= 9 ? 'High' : score >= 4 ? 'Medium' : 'Low';
  return {
    summary: `${r.title}: ${r.description ?? 'No description'}. Category: ${r.category ?? 'Uncategorized'}. Status: ${r.status ?? 'open'}.`,
    keyPoints: [
      `Inherent score: ${score} (${level})`,
      `Likelihood: ${r.likelihood ?? 'N/A'}, Impact: ${r.impact ?? 'N/A'}`,
      `Owner: ${r.owner ?? 'Unassigned'}`,
      `Status: ${r.status ?? 'open'}`,
    ],
    confidence: r.likelihood && r.impact ? 0.9 : 0.6,
  };
}

export async function classify(tenantId: string, entityId: string): Promise<{ category: string; confidence: number; alternatives: Array<{ category: string; confidence: number }> }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT category, likelihood, impact FROM ${schema}.risks WHERE id = $1`,
    [entityId]
  );
  const r = result.rows[0];
  if (!r) return { category: 'Unknown', confidence: 0, alternatives: [] };
  const score = (r.likelihood ?? 1) * (r.impact ?? 1);
  const primary = score >= 15 ? 'Critical' : score >= 9 ? 'High' : score >= 4 ? 'Medium' : 'Low';
  const allLevels = ['Critical', 'High', 'Medium', 'Low'];
  const alternatives = allLevels.filter(l => l !== primary).map((l, i) => ({ category: l, confidence: 0.1 - i * 0.02 }));
  return { category: r.category ?? primary, confidence: 0.85, alternatives };
}

// Law 12: scoreRisk consolidated into risk-scoring.service.ts

export async function recommend(tenantId: string, entityId: string): Promise<{ recommendations: Array<{ action: string; priority: string; rationale: string; estimatedImpact: string }> }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT r.title, r.category, r.likelihood, r.impact, r.status, r.owner,
            COUNT(rc.id) AS control_count
     FROM ${schema}.risks r
     LEFT JOIN ${schema}.risk_controls rc ON rc.risk_id = r.id
     WHERE r.id = $1 GROUP BY r.id, r.title, r.category, r.likelihood, r.impact, r.status, r.owner`,
    [entityId]
  );
  const r = result.rows[0] ?? {};
  const score = (r.likelihood ?? 3) * (r.impact ?? 3);
  const recs = [];
  if (!r.owner) recs.push({ action: 'Assign a risk owner', priority: 'High', rationale: 'Unowned risks lack accountability', estimatedImpact: 'Reduces governance exposure by 30%' });
  if (parseInt(r.control_count) === 0) recs.push({ action: 'Implement at least one mitigating control', priority: 'Critical', rationale: 'No controls mapped to this risk', estimatedImpact: 'Reduces residual score by up to 40%' });
  if (score >= 15) recs.push({ action: 'Escalate to risk committee for approval', priority: 'Critical', rationale: 'Critical inherent risk score', estimatedImpact: 'Ensures board-level awareness' });
  if (r.status === 'open') recs.push({ action: 'Review and update risk treatment plan', priority: 'Medium', rationale: 'Risk remains open without treatment', estimatedImpact: 'Reduces residual exposure by 20%' });
  return { recommendations: recs.length ? recs : [{ action: 'Continue monitoring', priority: 'Low', rationale: 'Risk is well-managed', estimatedImpact: 'Maintains current risk posture' }] };
}

export async function analyzeGaps(tenantId: string): Promise<{ gaps: Array<{ area: string; currentState: string; targetState: string; severity: string; recommendation: string }> }> {
  const schema = tenantSchema(tenantId);
  const [unmitigated, unowned, overdue] = await Promise.all([
    safeQuery(`SELECT COUNT(*) AS cnt FROM ${schema}.risks WHERE status = 'open' AND likelihood * impact >= 12`, []),
    safeQuery(`SELECT COUNT(*) AS cnt FROM ${schema}.risks WHERE owner IS NULL`, []),
    safeQuery(`SELECT COUNT(*) AS cnt FROM ${schema}.risks WHERE next_review_date < NOW() AND status = 'open'`, []),
  ]);
  const gaps = [];
  const highUnmitigated = parseInt(unmitigated.rows[0]?.cnt ?? 0);
  const unownedCount = parseInt(unowned.rows[0]?.cnt ?? 0);
  const overdueCount = parseInt(overdue.rows[0]?.cnt ?? 0);
  if (highUnmitigated > 0) gaps.push({ area: 'High Inherent Risks', currentState: `${highUnmitigated} critical/high risks open`, targetState: '0 critical risks without treatment', severity: 'Critical', recommendation: 'Assign treatment plans and controls immediately' });
  if (unownedCount > 0) gaps.push({ area: 'Risk Ownership', currentState: `${unownedCount} risks without owners`, targetState: 'All risks have assigned owners', severity: 'High', recommendation: 'Assign owners from risk register' });
  if (overdueCount > 0) gaps.push({ area: 'Review Currency', currentState: `${overdueCount} risks past review date`, targetState: 'All risks reviewed on schedule', severity: 'Medium', recommendation: 'Schedule overdue risk reviews' });
  return { gaps };
}

export async function generateReport(tenantId: string, params: { period?: string; format?: string }): Promise<{ title: string; sections: Array<{ heading: string; content: string; data?: Record<string, unknown> }> }> {
  const schema = tenantSchema(tenantId);
  const [summary, byCategory, bySeverity] = await Promise.all([
    safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='open') AS open, COUNT(*) FILTER (WHERE status='closed') AS closed, ROUND(AVG(likelihood * impact),2) AS avg_score FROM ${schema}.risks`, []),
    safeQuery(`SELECT category, COUNT(*) AS cnt FROM ${schema}.risks GROUP BY category ORDER BY cnt DESC LIMIT 5`, []),
    safeQuery(`SELECT CASE WHEN likelihood*impact>=15 THEN 'Critical' WHEN likelihood*impact>=9 THEN 'High' WHEN likelihood*impact>=4 THEN 'Medium' ELSE 'Low' END AS severity, COUNT(*) AS cnt FROM ${schema}.risks GROUP BY 1 ORDER BY cnt DESC`, []),
  ]);
  const s = summary.rows[0] ?? {};
  return {
    title: `Risk Register Report${params.period ? ` — ${params.period}` : ''}`,
    sections: [
      { heading: 'Executive Summary', content: `Total risks: ${s.total ?? 0}. Open: ${s.open ?? 0}. Closed: ${s.closed ?? 0}. Average score: ${s.avg_score ?? 'N/A'}.`, data: s },
      { heading: 'Risks by Category', content: byCategory.rows.map(r => `${r.category}: ${r.cnt}`).join(', ') || 'No data.', data: { categories: byCategory.rows } },
      { heading: 'Risks by Severity', content: bySeverity.rows.map(r => `${r.severity}: ${r.cnt}`).join(', ') || 'No data.', data: { severity: bySeverity.rows } },
    ],
  };
}
