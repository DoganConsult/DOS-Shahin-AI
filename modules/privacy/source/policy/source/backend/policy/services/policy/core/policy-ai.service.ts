export const POLICY_AI_CONFIG = {
  moduleCode: 'policy' as const,
  enabled: true,

  allowedActions: [
    'policy.document.draft',
    'policy.document.recommend',
    'policy.document.summarize',
    'policy.document.classify',
    'policy.document.score',
    'policy.document.analyze',
    'policy.document.generate_report',
  ],

  blockedActions: [
    'policy.document.delete',
    'policy.document.approve',
    'policy.document.reject',
    'policy.document.override',
    'policy.document.bulk_delete',
  ],

  humanInLoopBoundaries: {
    requiresHumanApproval: ['policy.document.approve', 'policy.document.reject', 'policy.document.delete'],
    requiresHumanReview: ['policy.document.classify', 'policy.document.score'],
    autoExecutable: ['policy.document.draft', 'policy.document.summarize', 'policy.document.analyze'],
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
    systemPromptTemplate: 'policy_system_prompt_v1',
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

export function isPolicyAiActionAllowed(action: string): boolean {
  return (POLICY_AI_CONFIG.allowedActions as readonly string[]).includes(action);
}

export function isPolicyAiActionBlocked(action: string): boolean {
  return (POLICY_AI_CONFIG.blockedActions as readonly string[]).includes(action);
}

export function requiresPolicyHumanApproval(action: string): boolean {
  return (POLICY_AI_CONFIG.humanInLoopBoundaries.requiresHumanApproval as readonly string[]).includes(action);
}

import { safeQuery, tenantSchema } from '../../../ports/database.port';

export async function summarize(tenantId: string, entityId: string): Promise<{ summary: string; keyPoints: string[]; confidence: number }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT title, category, status, version, owner, effective_date, review_date, description
     FROM ${schema}.policies WHERE id = $1`,
    [entityId]
  );
  const r = result.rows[0];
  if (!r) return { summary: 'Policy not found.', keyPoints: [], confidence: 0 };
  const isOverdue = r.review_date && new Date(r.review_date) < new Date();
  return {
    summary: `${r.title} (v${r.version ?? '1.0'}): ${r.description ?? 'No description'}. Status: ${r.status}.`,
    keyPoints: [
      `Category: ${r.category ?? 'N/A'}`,
      `Status: ${r.status}`,
      `Owner: ${r.owner ?? 'Unassigned'}`,
      `Effective: ${r.effective_date ? new Date(r.effective_date).toDateString() : 'N/A'}`,
      isOverdue ? 'OVERDUE for review' : `Next review: ${r.review_date ? new Date(r.review_date).toDateString() : 'Not scheduled'}`,
    ],
    confidence: r.status && r.owner ? 0.9 : 0.65,
  };
}

export async function classify(tenantId: string, entityId: string): Promise<{ category: string; confidence: number; alternatives: Array<{ category: string; confidence: number }> }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT category, status FROM ${schema}.policies WHERE id = $1`,
    [entityId]
  );
  const r = result.rows[0];
  if (!r) return { category: 'Unknown', confidence: 0, alternatives: [] };
  const knownCategories = ['Security', 'Privacy', 'Compliance', 'HR', 'IT', 'Financial', 'Operational'];
  const detected = r.category ?? 'Operational';
  return {
    category: detected,
    confidence: r.category ? 0.92 : 0.55,
    alternatives: knownCategories.filter(c => c !== detected).slice(0, 3).map((c, i) => ({ category: c, confidence: 0.1 - i * 0.02 })),
  };
}

export async function scoreRisk(tenantId: string, entityId: string): Promise<{ score: number; factors: Array<{ factor: string; weight: number; value: number }>; recommendation: string }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT status, review_date, effective_date, version, owner FROM ${schema}.policies WHERE id = $1`,
    [entityId]
  );
  const r = result.rows[0] ?? {};
  const isApproved = r.status === 'approved' ? 100 : r.status === 'in_review' ? 50 : 20;
  const isOverdue = r.review_date && new Date(r.review_date) < new Date() ? 0 : 100;
  const hasOwner = r.owner ? 100 : 0;
  const score = (isApproved * 0.4) + (isOverdue * 0.35) + (hasOwner * 0.25);
  return {
    score: Math.round(score * 10) / 10,
    factors: [
      { factor: 'Approval Status', weight: 0.4, value: isApproved },
      { factor: 'Review Currency', weight: 0.35, value: isOverdue },
      { factor: 'Ownership', weight: 0.25, value: hasOwner },
    ],
    recommendation: score < 50 ? 'Policy requires immediate attention' : score < 75 ? 'Schedule review and update' : 'Policy is well-maintained',
  };
}

export async function recommend(tenantId: string, entityId: string): Promise<{ recommendations: Array<{ action: string; priority: string; rationale: string; estimatedImpact: string }> }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT title, status, review_date, owner, version FROM ${schema}.policies WHERE id = $1`,
    [entityId]
  );
  const r = result.rows[0] ?? {};
  const recs = [];
  if (!r.owner) recs.push({ action: 'Assign a policy owner', priority: 'High', rationale: 'Unowned policies lack accountability', estimatedImpact: 'Ensures accountability and timely reviews' });
  if (r.status === 'draft') recs.push({ action: 'Submit policy for approval', priority: 'High', rationale: 'Policy in draft state cannot be enforced', estimatedImpact: 'Enables enforcement and compliance mapping' });
  if (r.review_date && new Date(r.review_date) < new Date()) recs.push({ action: 'Conduct overdue policy review', priority: 'Critical', rationale: 'Policy review is past due', estimatedImpact: 'Reduces compliance risk and keeps policy current' });
  recs.push({ action: 'Link policy to relevant controls', priority: 'Medium', rationale: 'Unmapped policies reduce compliance traceability', estimatedImpact: 'Improves audit trail and control coverage' });
  return { recommendations: recs };
}

export async function analyzeGaps(tenantId: string): Promise<{ gaps: Array<{ area: string; currentState: string; targetState: string; severity: string; recommendation: string }> }> {
  const schema = tenantSchema(tenantId);
  const [drafts, overdue, unowned] = await Promise.all([
    safeQuery(`SELECT COUNT(*) AS cnt FROM ${schema}.policies WHERE status = 'draft'`, []),
    safeQuery(`SELECT COUNT(*) AS cnt FROM ${schema}.policies WHERE review_date < NOW() AND status != 'archived'`, []),
    safeQuery(`SELECT COUNT(*) AS cnt FROM ${schema}.policies WHERE owner IS NULL`, []),
  ]);
  const gaps = [];
  if (parseInt(drafts.rows[0]?.cnt ?? 0) > 0) gaps.push({ area: 'Policy Approval', currentState: `${drafts.rows[0].cnt} policies in draft`, targetState: '0 unapproved policies', severity: 'High', recommendation: 'Review and approve pending draft policies' });
  if (parseInt(overdue.rows[0]?.cnt ?? 0) > 0) gaps.push({ area: 'Policy Review Cycle', currentState: `${overdue.rows[0].cnt} policies past review date`, targetState: 'All policies current', severity: 'Medium', recommendation: 'Schedule immediate review for overdue policies' });
  if (parseInt(unowned.rows[0]?.cnt ?? 0) > 0) gaps.push({ area: 'Policy Ownership', currentState: `${unowned.rows[0].cnt} policies without owners`, targetState: 'All policies owned', severity: 'Medium', recommendation: 'Assign owners to all policies' });
  return { gaps };
}

export async function generateReport(tenantId: string, params: { period?: string; format?: string }): Promise<{ title: string; sections: Array<{ heading: string; content: string; data?: Record<string, unknown> }> }> {
  const schema = tenantSchema(tenantId);
  const [summary, byStatus, byCategory] = await Promise.all([
    safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='approved') AS approved, COUNT(*) FILTER (WHERE review_date < NOW()) AS overdue FROM ${schema}.policies`, []),
    safeQuery(`SELECT status, COUNT(*) AS cnt FROM ${schema}.policies GROUP BY status ORDER BY cnt DESC`, []),
    safeQuery(`SELECT category, COUNT(*) AS cnt FROM ${schema}.policies GROUP BY category ORDER BY cnt DESC LIMIT 5`, []),
  ]);
  const s = summary.rows[0] ?? {};
  return {
    title: `Policy Register Report${params.period ? ` — ${params.period}` : ''}`,
    sections: [
      { heading: 'Executive Summary', content: `Total policies: ${s.total ?? 0}. Approved: ${s.approved ?? 0}. Overdue for review: ${s.overdue ?? 0}.`, data: s },
      { heading: 'Policies by Status', content: byStatus.rows.map(r => `${r.status}: ${r.cnt}`).join(', ') || 'No data.', data: { statuses: byStatus.rows } },
      { heading: 'Policies by Category', content: byCategory.rows.map(r => `${r.category ?? 'Uncategorized'}: ${r.cnt}`).join(', ') || 'No data.', data: { categories: byCategory.rows } },
    ],
  };
}
