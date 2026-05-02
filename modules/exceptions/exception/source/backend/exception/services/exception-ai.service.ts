import { safeQuery, tenantSchema } from '../ports/database.port';
import { chatCompletion, type LLMMessage } from '../../ai/services/gateway/llm.service';
import { logger } from '../ports/logger.port';
import {
  type ModuleAiConfig,
  registerModuleAiConfig,
  resolveAiConfig,
  isActionAllowed,
  isActionBlocked,
  requiresHumanApproval as registryRequiresHumanApproval,
} from '@dos/ai-gateway/ai-config.registry';

const EXCEPTION_AI_DEFAULTS: ModuleAiConfig = {
  moduleCode: 'exception',
  enabled: true,

  allowedActions: [
    'exception.record.draft',
    'exception.record.recommend',
    'exception.record.summarize',
    'exception.record.classify',
    'exception.record.score',
    'exception.record.analyze',
    'exception.record.generate_report',
  ],

  blockedActions: [
    'exception.record.delete',
    'exception.record.approve',
    'exception.record.reject',
    'exception.record.override',
    'exception.record.bulk_delete',
  ],

  humanInLoopBoundaries: {
    requiresHumanApproval: ['exception.record.approve', 'exception.record.reject', 'exception.record.delete'],
    requiresHumanReview: ['exception.record.classify', 'exception.record.score'],
    autoExecutable: ['exception.record.draft', 'exception.record.summarize', 'exception.record.analyze'],
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
    systemPromptTemplate: 'exception_system_prompt_v1',
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
};

registerModuleAiConfig(EXCEPTION_AI_DEFAULTS);

export { EXCEPTION_AI_DEFAULTS as EXCEPTION_AI_CONFIG };

export function isExceptionAiActionAllowed(action: string): boolean {
  return isActionAllowed(EXCEPTION_AI_DEFAULTS, action);
}

export function isExceptionAiActionBlocked(action: string): boolean {
  return isActionBlocked(EXCEPTION_AI_DEFAULTS, action);
}

export function requiresExceptionHumanApproval(action: string): boolean {
  return registryRequiresHumanApproval(EXCEPTION_AI_DEFAULTS, action);
}

async function getConfig(tenantId: string): Promise<ModuleAiConfig> {
  return resolveAiConfig(tenantId, 'exception');
}

const SYSTEM_PROMPT = `You are an enterprise GRC exception analysis assistant. Respond only with valid JSON matching the requested schema. Do not include markdown fences.`;

async function tryLlm<T>(tenantId: string, messages: LLMMessage[], fallback: () => T): Promise<{ result: T; aiPowered: boolean }> {
  const config = await getConfig(tenantId);
  if (!config.enabled) return { result: fallback(), aiPowered: false };

  try {
    const response = await chatCompletion(messages, 'exception-ai', {
      maxTokens: config.promptContracts.maxOutputTokens,
      temperature: config.promptContracts.temperature,
    });
    if (response.provider === 'none') return { result: fallback(), aiPowered: false };
    const parsed = JSON.parse(response.content) as T;
    return { result: parsed, aiPowered: true };
  } catch (err) {
    logger.warn(`[ExceptionAI] LLM call failed, using rule-based fallback: ${err}`);
    return { result: fallback(), aiPowered: false };
  }
}

async function loadException(tenantId: string, entityId: string) {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT title, description, status, risk_level, justification, owner, expiry_date, requested_by, created_at, compensating_controls, exception_type
     FROM "${schema}".exceptions WHERE exception_id = $1`,
    [entityId],
  );
  return result.rows[0] ?? null;
}

export async function summarize(tenantId: string, entityId: string): Promise<{ summary: string; keyPoints: string[]; confidence: number; aiPowered: boolean }> {
  const r = await loadException(tenantId, entityId);
  if (!r) return { summary: 'Exception not found.', keyPoints: [], confidence: 0, aiPowered: false };

  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Summarize this GRC exception for a risk committee review. Return JSON: {"summary":"...","keyPoints":["..."],"confidence":0.0-1.0}\n\nException data:\n${JSON.stringify(r)}` },
  ];

  const fallback = () => {
    const isExpired = r.expiry_date && new Date(r.expiry_date) < new Date();
    return {
      summary: `${r.title}: ${r.justification ?? 'No justification provided'}. Risk level: ${r.risk_level ?? 'N/A'}. Status: ${r.status}.`,
      keyPoints: [
        `Risk Level: ${r.risk_level ?? 'N/A'}`,
        `Status: ${r.status}`,
        `Owner: ${r.owner ?? 'Unassigned'}`,
        `Expiry: ${r.expiry_date ? new Date(r.expiry_date).toDateString() : 'No expiry'}`,
        isExpired ? 'WARNING: Exception has expired' : '',
      ].filter(Boolean),
      confidence: r.risk_level && r.owner ? 0.88 : 0.6,
    };
  };

  const { result, aiPowered } = await tryLlm(tenantId, messages, fallback);
  return { ...result, aiPowered };
}

export async function classify(tenantId: string, entityId: string): Promise<{ category: string; confidence: number; alternatives: Array<{ category: string; confidence: number }>; aiPowered: boolean }> {
  const r = await loadException(tenantId, entityId);
  if (!r) return { category: 'Unknown', confidence: 0, alternatives: [], aiPowered: false };

  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Classify this GRC exception. Categories: High-Risk Exception, Standard Exception, Expired, Compensating Control, Temporary Waiver, Process Exception. Return JSON: {"category":"...","confidence":0.0-1.0,"alternatives":[{"category":"...","confidence":0.0-1.0}]}\n\nException data:\n${JSON.stringify(r)}` },
  ];

  const fallback = () => {
    const isExpired = r.expiry_date && new Date(r.expiry_date) < new Date();
    const category = isExpired ? 'Expired' : r.risk_level === 'critical' || r.risk_level === 'high' ? 'High-Risk Exception' : 'Standard Exception';
    return {
      category,
      confidence: 0.85,
      alternatives: ['High-Risk Exception', 'Standard Exception', 'Expired', 'Compensating Control'].filter(c => c !== category).map((c, i) => ({ category: c, confidence: 0.08 - i * 0.02 })),
    };
  };

  const { result, aiPowered } = await tryLlm(tenantId, messages, fallback);
  return { ...result, aiPowered };
}

export async function scoreRisk(tenantId: string, entityId: string): Promise<{ score: number; factors: Array<{ factor: string; weight: number; value: number }>; recommendation: string; aiPowered: boolean }> {
  const r = await loadException(tenantId, entityId);
  if (!r) return { score: 0, factors: [], recommendation: 'Exception not found', aiPowered: false };

  const schema = tenantSchema(tenantId);
  const compControls = await safeQuery(
    `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE effectiveness_rating = 'effective')::int AS effective FROM "${schema}".exception_compensating_controls WHERE exception_id = $1`,
    [entityId],
  ).catch(() => ({ rows: [{ total: 0, effective: 0 }] }));

  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Score the risk of this GRC exception from 0-100. Consider risk level, expiry status, compensating control effectiveness, and justification strength. Return JSON: {"score":0-100,"factors":[{"factor":"...","weight":0.0-1.0,"value":0-100}],"recommendation":"..."}\n\nException: ${JSON.stringify(r)}\nCompensating controls: ${JSON.stringify(compControls.rows[0])}` },
  ];

  const fallback = () => {
    const riskMap: Record<string, number> = { critical: 100, high: 75, medium: 50, low: 25 };
    const riskScore = riskMap[r.risk_level?.toLowerCase()] ?? 50;
    const isExpired = r.expiry_date && new Date(r.expiry_date) < new Date() ? 100 : 0;
    const hasCompensating = r.compensating_controls ? 0 : 50;
    const score = (riskScore * 0.5) + (isExpired * 0.3) + (hasCompensating * 0.2);
    return {
      score: Math.round(score * 10) / 10,
      factors: [
        { factor: 'Risk Level', weight: 0.5, value: riskScore },
        { factor: 'Expiry Status', weight: 0.3, value: isExpired },
        { factor: 'Missing Compensating Controls', weight: 0.2, value: hasCompensating },
      ],
      recommendation: score > 70 ? 'Revoke or require immediate remediation' : score > 40 ? 'Add compensating controls and set expiry' : 'Monitor with regular review',
    };
  };

  const { result, aiPowered } = await tryLlm(tenantId, messages, fallback);
  return { ...result, aiPowered };
}

export async function recommend(tenantId: string, entityId: string): Promise<{ recommendations: Array<{ action: string; priority: string; rationale: string; estimatedImpact: string }>; aiPowered: boolean }> {
  const r = await loadException(tenantId, entityId);
  if (!r) return { recommendations: [], aiPowered: false };

  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Provide actionable recommendations for this GRC exception. Return JSON: {"recommendations":[{"action":"...","priority":"Critical|High|Medium|Low","rationale":"...","estimatedImpact":"..."}]}\n\nException: ${JSON.stringify(r)}` },
  ];

  const fallback = () => {
    const recs = [];
    if (r.expiry_date && new Date(r.expiry_date) < new Date()) recs.push({ action: 'Revoke expired exception immediately', priority: 'Critical', rationale: 'Exception validity has lapsed', estimatedImpact: 'Restores control compliance' });
    if (!r.compensating_controls) recs.push({ action: 'Define compensating controls for the exception', priority: 'High', rationale: 'No compensating controls documented', estimatedImpact: 'Reduces net risk exposure by 40%' });
    if (!r.owner) recs.push({ action: 'Assign an exception owner', priority: 'High', rationale: 'Unowned exceptions lack accountability', estimatedImpact: 'Ensures proper monitoring and renewal' });
    recs.push({ action: 'Schedule exception review before expiry', priority: 'Medium', rationale: 'Proactive review prevents lapses', estimatedImpact: 'Maintains controlled risk posture' });
    return { recommendations: recs };
  };

  const { result, aiPowered } = await tryLlm(tenantId, messages, fallback);
  return { ...result, aiPowered };
}

export async function analyzeGaps(tenantId: string): Promise<{ gaps: Array<{ area: string; currentState: string; targetState: string; severity: string; recommendation: string }>; aiPowered: boolean }> {
  const schema = tenantSchema(tenantId);
  const [expired, highRisk, noCompensating] = await Promise.all([
    safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".exceptions WHERE expiry_date < NOW() AND status = 'approved'`, []),
    safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".exceptions WHERE risk_level IN ('critical','high') AND status = 'approved'`, []),
    safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".exceptions WHERE compensating_controls IS NULL AND status = 'approved'`, []),
  ]);

  const counts = {
    expired: parseInt(expired.rows[0]?.cnt ?? 0),
    highRisk: parseInt(highRisk.rows[0]?.cnt ?? 0),
    noCompensating: parseInt(noCompensating.rows[0]?.cnt ?? 0),
  };

  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Analyze gaps in this exception register. Return JSON: {"gaps":[{"area":"...","currentState":"...","targetState":"...","severity":"Critical|High|Medium|Low","recommendation":"..."}]}\n\nStats: ${JSON.stringify(counts)}` },
  ];

  const fallback = () => {
    const gaps = [];
    if (counts.expired > 0) gaps.push({ area: 'Expired Exceptions', currentState: `${counts.expired} expired exceptions still active`, targetState: '0 active expired exceptions', severity: 'Critical', recommendation: 'Revoke all expired exceptions immediately' });
    if (counts.highRisk > 0) gaps.push({ area: 'High-Risk Exceptions', currentState: `${counts.highRisk} high/critical risk exceptions approved`, targetState: 'High-risk exceptions minimized', severity: 'High', recommendation: 'Review and challenge all high-risk exception justifications' });
    if (counts.noCompensating > 0) gaps.push({ area: 'Compensating Controls', currentState: `${counts.noCompensating} exceptions without compensating controls`, targetState: 'All exceptions have compensating controls', severity: 'High', recommendation: 'Define compensating controls for all approved exceptions' });
    return { gaps };
  };

  const { result, aiPowered } = await tryLlm(tenantId, messages, fallback);
  return { ...result, aiPowered };
}

export async function generateReport(tenantId: string, params: { period?: string; format?: string }): Promise<{ title: string; sections: Array<{ heading: string; content: string; data?: Record<string, unknown> }>; aiPowered: boolean }> {
  const schema = tenantSchema(tenantId);
  const [summary, byRiskLevel, expiring] = await Promise.all([
    safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='approved') AS approved, COUNT(*) FILTER (WHERE expiry_date < NOW()) AS expired FROM "${schema}".exceptions`, []),
    safeQuery(`SELECT risk_level, COUNT(*) AS cnt FROM "${schema}".exceptions WHERE status='approved' GROUP BY risk_level ORDER BY cnt DESC`, []),
    safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".exceptions WHERE expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' AND status='approved'`, []),
  ]);
  const s = summary.rows[0] ?? {};

  const reportData = {
    total: s.total ?? 0, approved: s.approved ?? 0, expired: s.expired ?? 0,
    expiringSoon: expiring.rows[0]?.cnt ?? 0,
    riskLevels: byRiskLevel.rows,
  };

  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Generate an executive-level exception register report. Return JSON: {"title":"...","sections":[{"heading":"...","content":"..."}]}\n\nData: ${JSON.stringify(reportData)}\nPeriod: ${params.period || 'current'}` },
  ];

  const fallback = () => ({
    title: `Exception Register Report${params.period ? ` — ${params.period}` : ''}`,
    sections: [
      { heading: 'Summary', content: `Total: ${s.total ?? 0}, Approved: ${s.approved ?? 0}, Expired: ${s.expired ?? 0}, Expiring (30d): ${expiring.rows[0]?.cnt ?? 0}`, data: { ...s, expiring_soon: expiring.rows[0]?.cnt } },
      { heading: 'By Risk Level', content: byRiskLevel.rows.map(( r: Record<string, unknown>) => `${r.risk_level}: ${r.cnt}`).join(', ') || 'No data.', data: { risk_levels: byRiskLevel.rows } },
    ],
  });

  const { result, aiPowered } = await tryLlm(tenantId, messages, fallback);
  return { ...result, aiPowered };
}
