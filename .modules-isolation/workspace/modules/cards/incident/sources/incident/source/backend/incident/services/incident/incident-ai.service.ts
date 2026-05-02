export const INCIDENT_AI_CONFIG = {
  moduleCode: 'incident' as const,
  enabled: true,

  allowedActions: [
    'incident.record.draft',
    'incident.record.recommend',
    'incident.record.summarize',
    'incident.record.classify',
    'incident.record.score',
    'incident.record.analyze',
    'incident.record.generate_report',
  ],

  blockedActions: [
    'incident.record.delete',
    'incident.record.approve',
    'incident.record.reject',
    'incident.record.override',
    'incident.record.bulk_delete',
  ],

  humanInLoopBoundaries: {
    requiresHumanApproval: ['incident.record.approve', 'incident.record.reject', 'incident.record.delete'],
    requiresHumanReview: ['incident.record.classify', 'incident.record.score'],
    autoExecutable: ['incident.record.draft', 'incident.record.summarize', 'incident.record.analyze'],
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
    systemPromptTemplate: 'incident_system_prompt_v1',
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

export function isIncidentAiActionAllowed(action: string): boolean {
  return (INCIDENT_AI_CONFIG.allowedActions as readonly string[]).includes(action);
}

export function isIncidentAiActionBlocked(action: string): boolean {
  return (INCIDENT_AI_CONFIG.blockedActions as readonly string[]).includes(action);
}

export function requiresIncidentHumanApproval(action: string): boolean {
  return (INCIDENT_AI_CONFIG.humanInLoopBoundaries.requiresHumanApproval as readonly string[]).includes(action);
}

import { safeQuery, tenantSchema } from '../../ports/database.port';

export async function summarize(tenantId: string, entityId: string): Promise<{ summary: string; keyPoints: string[]; confidence: number }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT title, description, severity, status, category, reported_by, reported_at, resolved_at, impact
     FROM ${schema}.incidents WHERE id = $1`,
    [entityId]
  );
  const r = result.rows[0];
  if (!r) return { summary: 'Incident not found.', keyPoints: [], confidence: 0 };
  const duration = r.resolved_at ? `Resolved in ${Math.round((new Date(r.resolved_at).getTime() - new Date(r.reported_at).getTime()) / 3600000)}h` : 'Still open';
  return {
    summary: `${r.title}: ${r.description ?? 'No description'}. Severity: ${r.severity}. Status: ${r.status}.`,
    keyPoints: [
      `Severity: ${r.severity ?? 'N/A'}`,
      `Category: ${r.category ?? 'N/A'}`,
      `Status: ${r.status}`,
      `Impact: ${r.impact ?? 'Unknown'}`,
      duration,
    ],
    confidence: r.severity && r.status ? 0.9 : 0.65,
  };
}

export async function classify(tenantId: string, entityId: string): Promise<{ category: string; confidence: number; alternatives: Array<{ category: string; confidence: number }> }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`SELECT category, severity FROM ${schema}.incidents WHERE id = $1`, [entityId]);
  const r = result.rows[0];
  if (!r) return { category: 'Unknown', confidence: 0, alternatives: [] };
  const severityTypes = ['Security', 'Operational', 'Compliance', 'Data Breach', 'Service Outage'];
  const detected = r.category ?? 'Operational';
  return {
    category: detected,
    confidence: r.category ? 0.88 : 0.5,
    alternatives: severityTypes.filter(t => t !== detected).slice(0, 3).map((t, i) => ({ category: t, confidence: 0.08 - i * 0.02 })),
  };
}

export async function scoreRisk(tenantId: string, entityId: string): Promise<{ score: number; factors: Array<{ factor: string; weight: number; value: number }>; recommendation: string }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT severity, status, impact, reported_at, resolved_at FROM ${schema}.incidents WHERE id = $1`,
    [entityId]
  );
  const r = result.rows[0] ?? {};
  const severityMap: Record<string, number> = { critical: 100, high: 75, medium: 50, low: 25 };
  const severityScore = severityMap[r.severity?.toLowerCase()] ?? 50;
  const isOpen = r.status === 'open' ? 100 : 0;
  const ageHours = r.reported_at ? Math.min((Date.now() - new Date(r.reported_at).getTime()) / 3600000, 168) : 0;
  const ageFactor = Math.round((ageHours / 168) * 100);
  const score = (severityScore * 0.5) + (isOpen * 0.3) + (ageFactor * 0.2);
  return {
    score: Math.round(score * 10) / 10,
    factors: [
      { factor: 'Severity', weight: 0.5, value: severityScore },
      { factor: 'Open Status', weight: 0.3, value: isOpen },
      { factor: 'Age Factor', weight: 0.2, value: ageFactor },
    ],
    recommendation: score > 70 ? 'Immediate escalation and containment required' : score > 40 ? 'Active monitoring and response needed' : 'Document and close with lessons learned',
  };
}

export async function recommend(tenantId: string, entityId: string): Promise<{ recommendations: Array<{ action: string; priority: string; rationale: string; estimatedImpact: string }> }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`SELECT severity, status, category, impact FROM ${schema}.incidents WHERE id = $1`, [entityId]);
  const r = result.rows[0] ?? {};
  const recs = [];
  if (r.status === 'open' && r.severity === 'critical') recs.push({ action: 'Activate incident response team immediately', priority: 'Critical', rationale: 'Critical open incident requires immediate response', estimatedImpact: 'Reduces breach window and business impact' });
  if (r.category === 'data_breach' || r.category === 'Security') recs.push({ action: 'Notify data protection officer and affected parties', priority: 'Critical', rationale: 'Regulatory notification obligations may apply', estimatedImpact: 'Ensures regulatory compliance and reduces penalties' });
  if (r.status !== 'closed') recs.push({ action: 'Implement containment measures', priority: 'High', rationale: 'Prevent incident from spreading', estimatedImpact: 'Limits blast radius and further impact' });
  recs.push({ action: 'Conduct post-incident review and update runbooks', priority: 'Medium', rationale: 'Lessons learned improve future response', estimatedImpact: 'Reduces similar incident recurrence by 40%' });
  return { recommendations: recs };
}

export async function analyzeGaps(tenantId: string): Promise<{ gaps: Array<{ area: string; currentState: string; targetState: string; severity: string; recommendation: string }> }> {
  const schema = tenantSchema(tenantId);
  const [openCritical, recurringTypes, avgResolutionTime] = await Promise.all([
    safeQuery(`SELECT COUNT(*) AS cnt FROM ${schema}.incidents WHERE severity='critical' AND status='open'`, []),
    safeQuery(`SELECT category, COUNT(*) AS cnt FROM ${schema}.incidents WHERE reported_at > NOW() - INTERVAL '90 days' GROUP BY category HAVING COUNT(*) > 3 ORDER BY cnt DESC`, []),
    safeQuery(`SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - reported_at))/3600),1) AS avg_hours FROM ${schema}.incidents WHERE resolved_at IS NOT NULL`, []),
  ]);
  const gaps = [];
  if (parseInt(openCritical.rows[0]?.cnt ?? 0) > 0) gaps.push({ area: 'Critical Incident Response', currentState: `${openCritical.rows[0].cnt} critical incidents open`, targetState: '0 open critical incidents', severity: 'Critical', recommendation: 'Deploy incident response team immediately' });
  for (const r of recurringTypes.rows) {
    gaps.push({ area: `Recurring ${r.category} Incidents`, currentState: `${r.cnt} incidents in 90 days`, targetState: '<3 incidents per quarter', severity: 'High', recommendation: `Implement root cause analysis and preventive controls for ${r.category}` });
  }
  if (avgResolutionTime.rows[0]?.avg_hours > 24) gaps.push({ area: 'Resolution Time', currentState: `Average ${avgResolutionTime.rows[0].avg_hours}h to resolve`, targetState: 'Average <24h for high/critical', severity: 'Medium', recommendation: 'Improve incident response playbooks and staffing' });
  return { gaps };
}

export async function generateReport(tenantId: string, params: { period?: string; format?: string }): Promise<{ title: string; sections: Array<{ heading: string; content: string; data?: Record<string, unknown> }> }> {
  const schema = tenantSchema(tenantId);
  const interval = params.period === 'monthly' ? '30 days' : params.period === 'quarterly' ? '90 days' : '365 days';
  const [summary, bySeverity, byCategory] = await Promise.all([
    safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='open') AS open, COUNT(*) FILTER (WHERE status='closed') AS closed FROM ${schema}.incidents WHERE reported_at > NOW() - INTERVAL '${interval}'`, []),
    safeQuery(`SELECT severity, COUNT(*) AS cnt FROM ${schema}.incidents WHERE reported_at > NOW() - INTERVAL '${interval}' GROUP BY severity ORDER BY cnt DESC`, []),
    safeQuery(`SELECT category, COUNT(*) AS cnt FROM ${schema}.incidents WHERE reported_at > NOW() - INTERVAL '${interval}' GROUP BY category ORDER BY cnt DESC LIMIT 5`, []),
  ]);
  const s = summary.rows[0] ?? {};
  return {
    title: `Incident Report${params.period ? ` — ${params.period}` : ''}`,
    sections: [
      { heading: 'Summary', content: `Total: ${s.total ?? 0}, Open: ${s.open ?? 0}, Closed: ${s.closed ?? 0}`, data: s },
      { heading: 'By Severity', content: bySeverity.rows.map(r => `${r.severity}: ${r.cnt}`).join(', ') || 'No data.', data: { severity: bySeverity.rows } },
      { heading: 'By Category', content: byCategory.rows.map(r => `${r.category ?? 'Other'}: ${r.cnt}`).join(', ') || 'No data.', data: { categories: byCategory.rows } },
    ],
  };
}
