export const CONTROLS_AI_CONFIG = {
  moduleCode: 'controls' as const,
  enabled: true,

  allowedActions: [
    'controls.control.draft',
    'controls.control.recommend',
    'controls.control.summarize',
    'controls.control.classify',
    'controls.control.score',
    'controls.control.analyze',
    'controls.mapping.suggest',
    'controls.effectiveness.narrate',
  ],

  blockedActions: [
    'controls.control.delete',
    'controls.control.approve',
    'controls.control.retire',
    'controls.control.override',
    'controls.test.approve',
  ],

  humanInLoopBoundaries: {
    requiresHumanApproval: ['controls.control.approve', 'controls.control.retire', 'controls.test.approve'],
    requiresHumanReview: ['controls.control.classify', 'controls.control.score', 'controls.mapping.suggest'],
    autoExecutable: ['controls.control.draft', 'controls.control.summarize', 'controls.effectiveness.narrate'],
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
    systemPromptTemplate: 'controls_system_prompt_v1',
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

export function isControlsAiActionAllowed(action: string): boolean {
  return (CONTROLS_AI_CONFIG.allowedActions as readonly string[]).includes(action);
}

export function isControlsAiActionBlocked(action: string): boolean {
  return (CONTROLS_AI_CONFIG.blockedActions as readonly string[]).includes(action);
}

export function requiresControlsHumanApproval(action: string): boolean {
  return (CONTROLS_AI_CONFIG.humanInLoopBoundaries.requiresHumanApproval as readonly string[]).includes(action);
}

import { safeQuery, tenantSchema } from '../../ports/database.port';

export async function summarizeControl(tenantId: string, controlId: string): Promise<{ summary: string; keyPoints: string[]; confidence: number }> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".controls WHERE control_id = $1`,
    [controlId]
  ).catch(() => ({ rows: [] }));
  const r = rows[0];
  if (!r) return { summary: 'Control not found.', keyPoints: [], confidence: 0 };
  return {
    summary: `${r.title ?? 'Control'}: ${r.description ?? 'No description'}. Status: ${r.status ?? 'N/A'}.`,
    keyPoints: [
      `Status: ${r.status ?? 'N/A'}`,
      `Type: ${r.control_type ?? 'N/A'}`,
      `Effectiveness: ${r.effectiveness_rating ?? 'N/A'}`,
    ],
    confidence: 0.85,
  };
}

export async function suggestMappings(tenantId: string, controlId: string): Promise<{ suggestions: Array<{ frameworkCode: string; obligationCode: string; confidence: number; reasoning: string }>; generatedAt: string }> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".controls WHERE control_id = $1`,
    [controlId]
  ).catch(() => ({ rows: [] }));
  const r = rows[0];
  if (!r) return { suggestions: [], generatedAt: new Date().toISOString() };
  return {
    suggestions: [
      { frameworkCode: 'ISO27001', obligationCode: 'A.8', confidence: 0.7, reasoning: `Based on control type (${r.control_type ?? 'general'}) and domain.` },
    ],
    generatedAt: new Date().toISOString(),
  };
}

export async function scoreEffectiveness(tenantId: string, controlId: string): Promise<{ score: number; maxScore: number; factors: string[]; generatedAt: string }> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT c.*, (SELECT COUNT(*)::int FROM "${schema}".control_test_results t WHERE t.control_id = c.control_id) AS test_count FROM "${schema}".controls c WHERE c.control_id = $1`,
    [controlId]
  ).catch(() => ({ rows: [] }));
  const r = rows[0];
  if (!r) return { score: 0, maxScore: 100, factors: ['Control not found'], generatedAt: new Date().toISOString() };
  const factors: string[] = [];
  let score = 50;
  if (r.status === 'active') { score += 20; factors.push('Active status (+20)'); }
  if ((r.test_count ?? 0) > 0) { score += 15; factors.push(`Has ${r.test_count} test results (+15)`); }
  if (r.owner_id) { score += 15; factors.push('Owner assigned (+15)'); }
  return { score: Math.min(score, 100), maxScore: 100, factors, generatedAt: new Date().toISOString() };
}
