export const PROACTIVE_LEADERSHIP_AI_CONFIG = {
  moduleCode: 'proactive-leadership' as const,
  enabled: true,

  allowedActions: [
    'proactive_leadership.insight.generate',
    'proactive_leadership.alert.classify',
    'proactive_leadership.brief.draft',
    'proactive_leadership.risk.summarize',
    'proactive_leadership.trend.detect',
    'proactive_leadership.anomaly.explain',
  ],

  blockedActions: [
    'proactive_leadership.insight.delete',
    'proactive_leadership.alert.dismiss',
    'proactive_leadership.brief.approve',
    'proactive_leadership.config.override',
  ],

  humanInLoopBoundaries: {
    requiresHumanApproval: ['proactive_leadership.brief.approve', 'proactive_leadership.alert.dismiss'],
    requiresHumanReview: ['proactive_leadership.insight.generate', 'proactive_leadership.alert.classify'],
    autoExecutable: ['proactive_leadership.brief.draft', 'proactive_leadership.risk.summarize', 'proactive_leadership.anomaly.explain'],
  },

  modelDependencies: {
    primary: 'azure-openai',
    fallback: 'ollama-llama3',
    embeddingModel: 'text-embedding-3-small',
  },

  promptContracts: {
    maxInputTokens: 12000,
    maxOutputTokens: 6000,
    temperature: 0.4,
    systemPromptTemplate: 'proactive_leadership_system_prompt_v1',
  },

  safetyHooks: {
    inputValidation: true,
    outputValidation: true,
    promptInjectionProtection: true,
    piiRedaction: true,
    auditAllInvocations: true,
    maxInvocationsPerHour: 80,
    rateLimitPerTenant: 40,
  },
} as const;

export function isProactiveLeadershipAiActionAllowed(action: string): boolean {
  return (PROACTIVE_LEADERSHIP_AI_CONFIG.allowedActions as readonly string[]).includes(action);
}

export function isProactiveLeadershipAiActionBlocked(action: string): boolean {
  return (PROACTIVE_LEADERSHIP_AI_CONFIG.blockedActions as readonly string[]).includes(action);
}

export function requiresProactiveLeadershipHumanApproval(action: string): boolean {
  return (PROACTIVE_LEADERSHIP_AI_CONFIG.humanInLoopBoundaries.requiresHumanApproval as readonly string[]).includes(action);
}

import { safeQuery, tenantSchema } from '../ports/database.port';

export async function generateInsight(tenantId: string, domain: string): Promise<{ insight: string; severity: string; confidence: number; generatedAt: string }> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT COUNT(*)::int AS total, COUNT(*) FILTER(WHERE priority IN ('critical','high'))::int AS high_priority FROM "${schema}".proactive_leadership_alerts WHERE domain = $1 AND status = 'active'`,
    [domain]
  ).catch(() => ({ rows: [{ total: 0, high_priority: 0 }] }));
  const { total, high_priority } = rows[0] ?? { total: 0, high_priority: 0 };
  const severity = high_priority > 3 ? 'critical' : high_priority > 0 ? 'high' : total > 0 ? 'medium' : 'low';
  return {
    insight: `Domain "${domain}": ${total} active alerts, ${high_priority} high-priority. Severity: ${severity}.`,
    severity,
    confidence: 0.8,
    generatedAt: new Date().toISOString(),
  };
}

export async function draftExecutiveBrief(tenantId: string): Promise<{ title: string; sections: Array<{ heading: string; content: string }>; generatedAt: string }> {
  const schema = tenantSchema(tenantId);
  const { rows: alerts } = await safeQuery(
    `SELECT domain, COUNT(*)::int AS cnt, COUNT(*) FILTER(WHERE priority = 'critical')::int AS critical FROM "${schema}".proactive_leadership_alerts WHERE status = 'active' GROUP BY domain ORDER BY critical DESC, cnt DESC LIMIT 5`
  ).catch(() => ({ rows: [] }));

  const sections: Array<{ heading: string; content: string }> = [];
  if (alerts.length === 0) {
    sections.push({ heading: 'Overview', content: 'No active alerts across monitored domains.' });
  } else {
    sections.push({ heading: 'Overview', content: `${alerts.length} domains with active alerts.` });
    for (const a of alerts) {
      sections.push({ heading: a.domain, content: `${a.cnt} alerts (${a.critical} critical).` });
    }
  }
  return { title: 'Executive Leadership Brief', sections, generatedAt: new Date().toISOString() };
}

export async function detectAnomalies(tenantId: string): Promise<{ anomalies: Array<{ domain: string; description: string; severity: string }>; generatedAt: string }> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT domain, COUNT(*)::int AS cnt FROM "${schema}".proactive_leadership_alerts WHERE status = 'active' AND created_at > NOW() - INTERVAL '24 hours' GROUP BY domain HAVING COUNT(*) > 5`
  ).catch(() => ({ rows: [] }));
  const anomalies = rows.map((r: { domain: string; cnt: number }) => ({
    domain: r.domain,
    description: `Unusual spike: ${r.cnt} alerts in last 24h.`,
    severity: r.cnt > 10 ? 'critical' : 'high',
  }));
  return { anomalies, generatedAt: new Date().toISOString() };
}
