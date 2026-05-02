export const AUDIT_AI_CONFIG = {
  moduleCode: 'audit' as const,
  enabled: true,

  allowedActions: [
    'audit.record.draft',
    'audit.record.recommend',
    'audit.record.summarize',
    'audit.record.classify',
    'audit.record.score',
    'audit.record.analyze',
    'audit.record.generate_report',
  ],

  blockedActions: [
    'audit.record.delete',
    'audit.record.approve',
    'audit.record.reject',
    'audit.record.override',
    'audit.record.bulk_delete',
  ],

  humanInLoopBoundaries: {
    requiresHumanApproval: ['audit.record.approve', 'audit.record.reject', 'audit.record.delete'],
    requiresHumanReview: ['audit.record.classify', 'audit.record.score'],
    autoExecutable: ['audit.record.draft', 'audit.record.summarize', 'audit.record.analyze'],
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
    systemPromptTemplate: 'audit_system_prompt_v1',
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

export function isAuditAiActionAllowed(action: string): boolean {
  return (AUDIT_AI_CONFIG.allowedActions as readonly string[]).includes(action);
}

export function isAuditAiActionBlocked(action: string): boolean {
  return (AUDIT_AI_CONFIG.blockedActions as readonly string[]).includes(action);
}

export function requiresAuditHumanApproval(action: string): boolean {
  return (AUDIT_AI_CONFIG.humanInLoopBoundaries.requiresHumanApproval as readonly string[]).includes(action);
}

import { safeQuery, tenantSchema } from '../../../ports/database.port';

export async function summarize(tenantId: string, entityId: string): Promise<{ summary: string; keyPoints: string[]; confidence: number }> {
  const schema = tenantSchema(tenantId);
  const [audit, findings] = await Promise.all([
    safeQuery(`SELECT title, audit_type, status, auditor, start_date, end_date, scope FROM ${schema}.audits WHERE id = $1`, [entityId]),
    safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE severity='critical') AS critical, COUNT(*) FILTER (WHERE severity='high') AS high, COUNT(*) FILTER (WHERE status='open') AS open FROM ${schema}.audit_findings WHERE audit_id = $1`, [entityId]),
  ]);
  const a = audit.rows[0];
  const f = findings.rows[0] ?? {};
  if (!a) return { summary: 'Audit not found.', keyPoints: [], confidence: 0 };
  return {
    summary: `${a.title} (${a.audit_type ?? 'internal'}) conducted by ${a.auditor ?? 'unknown'}. ${f.total ?? 0} findings, ${f.critical ?? 0} critical.`,
    keyPoints: [
      `Type: ${a.audit_type ?? 'N/A'}`,
      `Status: ${a.status}`,
      `Total findings: ${f.total ?? 0}`,
      `Critical findings: ${f.critical ?? 0}`,
      `Open findings: ${f.open ?? 0}`,
    ],
    confidence: a.status && f.total != null ? 0.91 : 0.6,
  };
}

export async function classify(tenantId: string, entityId: string): Promise<{ category: string; confidence: number; alternatives: Array<{ category: string; confidence: number }> }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`SELECT audit_type, status FROM ${schema}.audits WHERE id = $1`, [entityId]);
  const r = result.rows[0];
  if (!r) return { category: 'Unknown', confidence: 0, alternatives: [] };
  const types = ['Internal', 'External', 'Regulatory', 'Third-party', 'IT'];
  const detected = r.audit_type ?? 'Internal';
  return {
    category: detected,
    confidence: r.audit_type ? 0.9 : 0.55,
    alternatives: types.filter(t => t !== detected).slice(0, 3).map((t, i) => ({ category: t, confidence: 0.08 - i * 0.02 })),
  };
}

export async function scoreRisk(tenantId: string, entityId: string): Promise<{ score: number; factors: Array<{ factor: string; weight: number; value: number }>; recommendation: string }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT a.status,
            COUNT(af.id) AS total_findings,
            COUNT(af.id) FILTER (WHERE af.severity = 'critical') AS critical,
            COUNT(af.id) FILTER (WHERE af.severity = 'high') AS high,
            COUNT(af.id) FILTER (WHERE af.status = 'open') AS open_findings
     FROM ${schema}.audits a
     LEFT JOIN ${schema}.audit_findings af ON af.audit_id = a.id
     WHERE a.id = $1
     GROUP BY a.id, a.status`,
    [entityId]
  );
  const r = result.rows[0] ?? {};
  const criticalScore = Math.min(parseInt(r.critical ?? 0) * 20, 100);
  const highScore = Math.min(parseInt(r.high ?? 0) * 10, 50);
  const openRatio = r.total_findings > 0 ? (parseInt(r.open_findings) / parseInt(r.total_findings)) * 100 : 0;
  const riskScore = (criticalScore * 0.5) + (highScore * 0.3) + (openRatio * 0.2);
  return {
    score: Math.min(Math.round(riskScore * 10) / 10, 100),
    factors: [
      { factor: 'Critical Findings', weight: 0.5, value: parseInt(r.critical ?? 0) },
      { factor: 'High Severity Findings', weight: 0.3, value: parseInt(r.high ?? 0) },
      { factor: 'Open Finding Ratio', weight: 0.2, value: Math.round(openRatio) },
    ],
    recommendation: riskScore > 60 ? 'Escalate unresolved critical findings immediately' : riskScore > 30 ? 'Prioritize high finding remediation' : 'Monitor and track to closure',
  };
}

export async function recommend(tenantId: string, entityId: string): Promise<{ recommendations: Array<{ action: string; priority: string; rationale: string; estimatedImpact: string }> }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT a.status, COUNT(af.id) FILTER (WHERE af.severity='critical' AND af.status='open') AS open_critical
     FROM ${schema}.audits a
     LEFT JOIN ${schema}.audit_findings af ON af.audit_id = a.id
     WHERE a.id = $1
     GROUP BY a.id, a.status`,
    [entityId]
  );
  const r = result.rows[0] ?? {};
  const recs = [];
  if (parseInt(r.open_critical ?? 0) > 0) recs.push({ action: `Remediate ${r.open_critical} open critical findings`, priority: 'Critical', rationale: 'Critical findings unresolved', estimatedImpact: 'Eliminates top audit risk' });
  if (r.status === 'in_progress') recs.push({ action: 'Complete audit field work and compile report', priority: 'High', rationale: 'Audit still in progress', estimatedImpact: 'Enables finding remediation tracking' });
  recs.push({ action: 'Assign remediation owners to all open findings', priority: 'Medium', rationale: 'Unowned findings stall remediation', estimatedImpact: 'Accelerates finding closure by 40%' });
  recs.push({ action: 'Schedule follow-up audit to verify remediation', priority: 'Low', rationale: 'Verify control effectiveness post-remediation', estimatedImpact: 'Provides assurance of improvement' });
  return { recommendations: recs };
}

export async function analyzeGaps(tenantId: string): Promise<{ gaps: Array<{ area: string; currentState: string; targetState: string; severity: string; recommendation: string }> }> {
  const schema = tenantSchema(tenantId);
  const [openCritical, overdueAudits, unownedFindings] = await Promise.all([
    safeQuery(`SELECT COUNT(*) AS cnt FROM ${schema}.audit_findings WHERE severity='critical' AND status='open'`, []),
    safeQuery(`SELECT COUNT(*) AS cnt FROM ${schema}.audits WHERE status='in_progress' AND end_date < NOW()`, []),
    safeQuery(`SELECT COUNT(*) AS cnt FROM ${schema}.audit_findings WHERE owner IS NULL AND status='open'`, []),
  ]);
  const gaps = [];
  if (parseInt(openCritical.rows[0]?.cnt ?? 0) > 0) gaps.push({ area: 'Critical Finding Remediation', currentState: `${openCritical.rows[0].cnt} open critical findings`, targetState: '0 open critical findings', severity: 'Critical', recommendation: 'Assign owners and set remediation deadlines immediately' });
  if (parseInt(overdueAudits.rows[0]?.cnt ?? 0) > 0) gaps.push({ area: 'Audit Completion', currentState: `${overdueAudits.rows[0].cnt} overdue audits`, targetState: 'All audits completed on schedule', severity: 'High', recommendation: 'Escalate overdue audits to audit committee' });
  if (parseInt(unownedFindings.rows[0]?.cnt ?? 0) > 0) gaps.push({ area: 'Finding Ownership', currentState: `${unownedFindings.rows[0].cnt} unowned open findings`, targetState: 'All findings owned', severity: 'Medium', recommendation: 'Assign owners to all open audit findings' });
  return { gaps };
}

export async function generateReport(tenantId: string, params: { period?: string; format?: string }): Promise<{ title: string; sections: Array<{ heading: string; content: string; data?: Record<string, unknown> }> }> {
  const schema = tenantSchema(tenantId);
  const [summary, bySeverity, byStatus] = await Promise.all([
    safeQuery(`SELECT COUNT(*) AS total_audits, COUNT(*) FILTER (WHERE status='completed') AS completed FROM ${schema}.audits`, []),
    safeQuery(`SELECT severity, COUNT(*) AS cnt FROM ${schema}.audit_findings GROUP BY severity ORDER BY cnt DESC`, []),
    safeQuery(`SELECT status, COUNT(*) AS cnt FROM ${schema}.audit_findings GROUP BY status ORDER BY cnt DESC`, []),
  ]);
  const s = summary.rows[0] ?? {};
  return {
    title: `Audit Summary Report${params.period ? ` — ${params.period}` : ''}`,
    sections: [
      { heading: 'Executive Summary', content: `Total audits: ${s.total_audits ?? 0}. Completed: ${s.completed ?? 0}.`, data: s },
      { heading: 'Findings by Severity', content: bySeverity.rows.map(r => `${r.severity}: ${r.cnt}`).join(', ') || 'No findings.', data: { severity: bySeverity.rows } },
      { heading: 'Findings by Status', content: byStatus.rows.map(r => `${r.status}: ${r.cnt}`).join(', ') || 'No findings.', data: { status: byStatus.rows } },
    ],
  };
}
