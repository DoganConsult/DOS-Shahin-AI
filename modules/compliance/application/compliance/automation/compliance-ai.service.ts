export const COMPLIANCE_AI_CONFIG = {
  moduleCode: 'compliance' as const,
  enabled: true,

  allowedActions: [
    'compliance.program.draft',
    'compliance.program.recommend',
    'compliance.program.summarize',
    'compliance.program.classify',
    'compliance.program.score',
    'compliance.program.analyze',
    'compliance.program.generate_report',
  ],

  blockedActions: [
    'compliance.program.delete',
    'compliance.program.approve',
    'compliance.program.reject',
    'compliance.program.override',
    'compliance.program.bulk_delete',
  ],

  humanInLoopBoundaries: {
    requiresHumanApproval: ['compliance.program.approve', 'compliance.program.reject', 'compliance.program.delete'],
    requiresHumanReview: ['compliance.program.classify', 'compliance.program.score'],
    autoExecutable: ['compliance.program.draft', 'compliance.program.summarize', 'compliance.program.analyze'],
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
    systemPromptTemplate: 'compliance_system_prompt_v1',
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

export function isComplianceAiActionAllowed(action: string): boolean {
  return (COMPLIANCE_AI_CONFIG.allowedActions as readonly string[]).includes(action);
}

export function isComplianceAiActionBlocked(action: string): boolean {
  return (COMPLIANCE_AI_CONFIG.blockedActions as readonly string[]).includes(action);
}

export function requiresComplianceHumanApproval(action: string): boolean {
  return (COMPLIANCE_AI_CONFIG.humanInLoopBoundaries.requiresHumanApproval as readonly string[]).includes(action);
}

import { withTenantClient } from '../../../ports/database.port';

export async function summarize(tenantId: string, entityId: string): Promise<{ summary: string; keyPoints: string[]; confidence: number }> {
  const r = await withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `SELECT ca.title, ca.framework, ca.status, ca.score, ca.assessment_date, ca.assessor
       FROM compliance_assessments ca WHERE ca.id = $1`,
      [entityId],
    );
    return result.rows[0];
  });
  if (!r) return { summary: 'Assessment not found.', keyPoints: [], confidence: 0 };
  return {
    summary: `${r.title} assessment for ${r.framework ?? 'unknown framework'}. Status: ${r.status}. Score: ${r.score ?? 'N/A'}.`,
    keyPoints: [
      `Framework: ${r.framework ?? 'N/A'}`,
      `Score: ${r.score ?? 'N/A'}%`,
      `Status: ${r.status}`,
      `Assessor: ${r.assessor ?? 'Unassigned'}`,
      `Assessment date: ${r.assessment_date ? new Date(r.assessment_date).toDateString() : 'N/A'}`,
    ],
    confidence: r.score != null ? 0.92 : 0.65,
  };
}

export async function classify(tenantId: string, entityId: string): Promise<{ category: string; confidence: number; alternatives: Array<{ category: string; confidence: number }> }> {
  const r = await withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `SELECT framework, score, status FROM compliance_assessments WHERE id = $1`,
      [entityId],
    );
    return result.rows[0];
  });
  if (!r) return { category: 'Unknown', confidence: 0, alternatives: [] };
  const score = r.score ?? 0;
  const category = score >= 90 ? 'Compliant' : score >= 70 ? 'Substantially Compliant' : score >= 50 ? 'Partially Compliant' : 'Non-Compliant';
  const all = ['Compliant', 'Substantially Compliant', 'Partially Compliant', 'Non-Compliant'];
  return {
    category,
    confidence: 0.88,
    alternatives: all.filter(c => c !== category).map((c, i) => ({ category: c, confidence: 0.08 - i * 0.02 })),
  };
}

export async function scoreRisk(tenantId: string, entityId: string): Promise<{ score: number; factors: Array<{ factor: string; weight: number; value: number }>; recommendation: string }> {
  const r = await withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `SELECT ca.score, ca.framework,
              COUNT(ci.id) AS total_controls,
              COUNT(ci.id) FILTER (WHERE ci.status = 'compliant') AS compliant_controls,
              COUNT(ci.id) FILTER (WHERE ci.status = 'non_compliant') AS non_compliant
       FROM compliance_assessments ca
       LEFT JOIN compliance_items ci ON ci.assessment_id = ca.id
       WHERE ca.id = $1
       GROUP BY ca.id, ca.score, ca.framework`,
      [entityId],
    );
    return result.rows[0] ?? {};
  });
  const coverageScore = r.total_controls > 0 ? (parseInt(r.compliant_controls) / parseInt(r.total_controls)) * 100 : 0;
  const overallScore = (coverageScore + (r.score ?? 50)) / 2;
  return {
    score: Math.round(overallScore * 10) / 10,
    factors: [
      { factor: 'Assessment Score', weight: 0.5, value: r.score ?? 0 },
      { factor: 'Control Coverage', weight: 0.3, value: Math.round(coverageScore) },
      { factor: 'Non-Compliant Controls', weight: 0.2, value: parseInt(r.non_compliant) ?? 0 },
    ],
    recommendation: overallScore < 50 ? 'Urgent remediation required' : overallScore < 75 ? 'Develop improvement plan' : 'Maintain and monitor',
  };
}

export async function recommend(tenantId: string, entityId: string): Promise<{ recommendations: Array<{ action: string; priority: string; rationale: string; estimatedImpact: string }> }> {
  const r = await withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `SELECT ca.score, ca.framework, ca.status,
              COUNT(ci.id) FILTER (WHERE ci.status = 'non_compliant') AS gaps
       FROM compliance_assessments ca
       LEFT JOIN compliance_items ci ON ci.assessment_id = ca.id
       WHERE ca.id = $1
       GROUP BY ca.id, ca.score, ca.framework, ca.status`,
      [entityId],
    );
    return result.rows[0] ?? {};
  });
  const recs = [];
  const gaps = parseInt(r.gaps ?? 0);
  if (gaps > 10) recs.push({ action: `Remediate ${gaps} non-compliant controls`, priority: 'Critical', rationale: 'High gap count threatens compliance status', estimatedImpact: 'Improves compliance score by 20-30%' });
  if ((r.score ?? 0) < 60) recs.push({ action: 'Engage external auditor for gap analysis', priority: 'High', rationale: 'Score below acceptable threshold', estimatedImpact: 'Provides roadmap to achieve compliance' });
  if (r.status === 'in_review') recs.push({ action: 'Complete pending assessment review', priority: 'Medium', rationale: 'Assessment awaiting finalization', estimatedImpact: 'Unlocks certification process' });
  recs.push({ action: 'Schedule next compliance assessment', priority: 'Low', rationale: 'Continuous compliance monitoring required', estimatedImpact: 'Maintains compliance posture' });
  return { recommendations: recs };
}

export async function analyzeGaps(tenantId: string): Promise<{ gaps: Array<{ area: string; currentState: string; targetState: string; severity: string; recommendation: string }> }> {
  const { lowScore, overdue } = await withTenantClient(tenantId, async (client) => {
    const [lowScore, _nonCompliant, overdue] = await Promise.all([
      client.query(`SELECT framework, score FROM compliance_assessments WHERE score < 70 AND status != 'closed' ORDER BY score ASC LIMIT 5`),
      client.query(`SELECT framework, COUNT(*) AS cnt FROM compliance_assessments ca JOIN compliance_items ci ON ci.assessment_id = ca.id WHERE ci.status = 'non_compliant' GROUP BY framework ORDER BY cnt DESC LIMIT 5`),
      client.query(`SELECT COUNT(*) AS cnt FROM compliance_assessments WHERE next_review_date < NOW() AND status != 'closed'`),
    ]);
    return { lowScore, overdue };
  });
  const gaps = [];
  for (const r of lowScore.rows) {
    gaps.push({ area: `${r.framework} Compliance`, currentState: `Score: ${r.score}%`, targetState: 'Score ≥ 70%', severity: r.score < 50 ? 'Critical' : 'High', recommendation: 'Prioritize gap remediation for this framework' });
  }
  if (parseInt(overdue.rows[0]?.cnt ?? 0) > 0) {
    gaps.push({ area: 'Assessment Currency', currentState: `${overdue.rows[0].cnt} overdue assessments`, targetState: 'All assessments current', severity: 'Medium', recommendation: 'Schedule overdue compliance assessments' });
  }
  return { gaps };
}

export async function generateReport(tenantId: string, params: { period?: string; format?: string }): Promise<{ title: string; sections: Array<{ heading: string; content: string; data?: Record<string, unknown> }> }> {
  const { summary, byFramework } = await withTenantClient(tenantId, async (client) => {
    const [summary, byFramework] = await Promise.all([
      client.query(`SELECT COUNT(*) AS total, ROUND(AVG(score),1) AS avg_score, COUNT(*) FILTER (WHERE score>=70) AS passing FROM compliance_assessments`),
      client.query(`SELECT framework, COUNT(*) AS cnt, ROUND(AVG(score),1) AS avg_score FROM compliance_assessments GROUP BY framework ORDER BY avg_score ASC LIMIT 10`),
    ]);
    return { summary, byFramework };
  });
  const s = summary.rows[0] ?? {};
  return {
    title: `Compliance Status Report${params.period ? ` — ${params.period}` : ''}`,
    sections: [
      { heading: 'Executive Summary', content: `${s.total ?? 0} assessments. Average score: ${s.avg_score ?? 'N/A'}%. Passing (≥70%): ${s.passing ?? 0}.`, data: s },
      { heading: 'Framework Coverage', content: byFramework.rows.map((r: { framework: string; avg_score: number; cnt: number }) => `${r.framework}: ${r.avg_score}% avg (${r.cnt} assessments)`).join('; ') || 'No data.', data: { frameworks: byFramework.rows } },
    ],
  };
}
