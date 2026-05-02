export const KSA_REGULATORY_AI_CONFIG = {
  moduleCode: 'ksa-regulatory' as const,
  enabled: true,

  allowedActions: [
    'ksa_regulatory.change.classify',
    'ksa_regulatory.obligation.recommend',
    'ksa_regulatory.readiness.score',
    'ksa_regulatory.gap.analyze',
    'ksa_regulatory.change.summarize',
    'ksa_regulatory.mapping.suggest',
  ],

  blockedActions: [
    'ksa_regulatory.obligation.approve',
    'ksa_regulatory.obligation.delete',
    'ksa_regulatory.change.dismiss',
    'ksa_regulatory.authority.override',
  ],

  humanInLoopBoundaries: {
    requiresHumanApproval: ['ksa_regulatory.obligation.approve', 'ksa_regulatory.change.dismiss'],
    requiresHumanReview: ['ksa_regulatory.change.classify', 'ksa_regulatory.readiness.score', 'ksa_regulatory.mapping.suggest'],
    autoExecutable: ['ksa_regulatory.change.summarize', 'ksa_regulatory.gap.analyze'],
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
    systemPromptTemplate: 'ksa_regulatory_system_prompt_v1',
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

export function isKsaRegulatoryAiActionAllowed(action: string): boolean {
  return (KSA_REGULATORY_AI_CONFIG.allowedActions as readonly string[]).includes(action);
}

export function isKsaRegulatoryAiActionBlocked(action: string): boolean {
  return (KSA_REGULATORY_AI_CONFIG.blockedActions as readonly string[]).includes(action);
}

export function requiresKsaRegulatoryHumanApproval(action: string): boolean {
  return (KSA_REGULATORY_AI_CONFIG.humanInLoopBoundaries.requiresHumanApproval as readonly string[]).includes(action);
}

import { safeQuery, tenantSchema } from '../ports/database.port';

export async function classifyRegulatoryChange(tenantId: string, changeId: string): Promise<{ impactLevel: string; affectedAreas: string[]; confidence: number; reasoning: string }> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".ksa_regulatory_changes WHERE change_id = $1`,
    [changeId]
  ).catch(() => ({ rows: [] }));
  const r = rows[0];
  if (!r) return { impactLevel: 'unknown', affectedAreas: [], confidence: 0, reasoning: 'Change not found.' };
  const impactLevel = r.impact_level ?? 'medium';
  return {
    impactLevel,
    affectedAreas: r.affected_frameworks ? (Array.isArray(r.affected_frameworks) ? r.affected_frameworks : []) : [],
    confidence: 0.75,
    reasoning: `Classified as ${impactLevel} based on change type (${r.change_type ?? 'unknown'}) and affected scope.`,
  };
}

export async function scoreReadiness(tenantId: string, authorityCode: string): Promise<{ score: number; maturityLevel: number; gaps: number; generatedAt: string }> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT COUNT(*)::int AS total, COUNT(*) FILTER(WHERE status = 'met')::int AS met, COUNT(*) FILTER(WHERE status IN ('not_met','overdue'))::int AS gaps FROM "${schema}".ksa_regulatory_obligations WHERE authority_code = $1`,
    [authorityCode]
  ).catch(() => ({ rows: [{ total: 0, met: 0, gaps: 0 }] }));
  const { total, met, gaps } = rows[0] ?? { total: 0, met: 0, gaps: 0 };
  const score = total > 0 ? Math.round((met / total) * 100) : 0;
  const maturityLevel = score >= 80 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1;
  return { score, maturityLevel, gaps, generatedAt: new Date().toISOString() };
}

export async function recommendObligationActions(tenantId: string, obligationId: string): Promise<{ recommendations: Array<{ action: string; priority: string; reasoning: string }>; generatedAt: string }> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".ksa_regulatory_obligations WHERE obligation_id = $1`,
    [obligationId]
  ).catch(() => ({ rows: [] }));
  const r = rows[0];
  const recommendations: Array<{ action: string; priority: string; reasoning: string }> = [];
  if (!r) return { recommendations, generatedAt: new Date().toISOString() };
  if (r.status === 'not_met') recommendations.push({ action: 'Create remediation plan', priority: 'high', reasoning: 'Obligation is not met.' });
  if (r.status === 'overdue') recommendations.push({ action: 'Escalate to compliance lead', priority: 'critical', reasoning: 'Obligation is overdue.' });
  if (!r.owner_id) recommendations.push({ action: 'Assign owner', priority: 'high', reasoning: 'No owner assigned.' });
  if (r.evidence_count === 0) recommendations.push({ action: 'Collect supporting evidence', priority: 'medium', reasoning: 'No evidence attached.' });
  return { recommendations, generatedAt: new Date().toISOString() };
}
