export const ACTION_AI_CONFIG = {
  moduleCode: 'action' as const,
  enabled: true,

  allowedActions: [
    'action.item.draft',
    'action.item.recommend',
    'action.item.summarize',
    'action.item.classify',
    'action.item.score',
    'action.item.analyze',
    'action.item.generate_report',
  ],

  blockedActions: [
    'action.item.delete',
    'action.item.approve',
    'action.item.reject',
    'action.item.override',
    'action.item.bulk_delete',
  ],

  humanInLoopBoundaries: {
    requiresHumanApproval: ['action.item.approve', 'action.item.reject', 'action.item.delete'],
    requiresHumanReview: ['action.item.classify', 'action.item.score'],
    autoExecutable: ['action.item.draft', 'action.item.summarize', 'action.item.analyze'],
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
    systemPromptTemplate: 'action_system_prompt_v1',
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

export function isActionAiActionAllowed(action: string): boolean {
  return (ACTION_AI_CONFIG.allowedActions as readonly string[]).includes(action);
}

export function isActionAiActionBlocked(action: string): boolean {
  return (ACTION_AI_CONFIG.blockedActions as readonly string[]).includes(action);
}

export function requiresActionHumanApproval(action: string): boolean {
  return (ACTION_AI_CONFIG.humanInLoopBoundaries.requiresHumanApproval as readonly string[]).includes(action);
}

import { safeQuery, tenantSchema } from '../ports/database.port';

export async function summarize(tenantId: string, entityId: string): Promise<{ summary: string; keyPoints: string[]; confidence: number }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}"."action_items" WHERE action_id = $1`,
    [entityId]
  );
  const r = result.rows[0];
  if (!r) return { summary: 'Action entity not found.', keyPoints: [], confidence: 0 };
  return {
    summary: `${r.title ?? 'Action Item'}. Status: ${r.status ?? 'N/A'}.`,
    keyPoints: [
      `Status: ${r.status ?? 'N/A'}`,
      `Created: ${r.created_at ?? 'N/A'}`,
      `Title: ${r.title ?? 'N/A'}`,
    ],
    confidence: 0.85,
  };
}

export async function classify(tenantId: string, entityId: string, _data?: Record<string, unknown>): Promise<{ category: string; confidence: number; reasoning: string }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}"."action_items" WHERE action_id = $1`,
    [entityId]
  );
  const r = result.rows[0];
  if (!r) return { category: 'unknown', confidence: 0, reasoning: 'Entity not found' };
  const status = r.status ?? 'unknown';
  return {
    category: status,
    confidence: 0.8,
    reasoning: `Classified based on current status (${status}) and entity attributes.`,
  };
}

export async function recommendActions(tenantId: string, entityId: string): Promise<{ recommendations: Array<{ action: string; priority: string; reasoning: string }>; generatedAt: string }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}"."action_items" WHERE action_id = $1`,
    [entityId]
  );
  const r = result.rows[0];
  const recommendations: Array<{ action: string; priority: string; reasoning: string }> = [];
  if (!r) return { recommendations, generatedAt: new Date().toISOString() };
  if (!r.assigned_to && !r.owner) {
    recommendations.push({ action: 'Assign an owner', priority: 'high', reasoning: 'No owner assigned to this entity.' });
  }
  if (r.status === 'draft') {
    recommendations.push({ action: 'Move to next lifecycle stage', priority: 'medium', reasoning: 'Entity is still in draft status.' });
  }
  if (r.due_date && new Date(r.due_date) < new Date()) {
    recommendations.push({ action: 'Address overdue deadline', priority: 'critical', reasoning: 'The due date has passed.' });
  }
  return { recommendations, generatedAt: new Date().toISOString() };
}

export async function generateReport(tenantId: string, filters?: { status?: string; dateFrom?: string; dateTo?: string }): Promise<{ totalCount: number; byStatus: Record<string, number>; insights: string[]; generatedAt: string }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
  if (filters?.dateFrom) { conditions.push(`created_at >= $${idx++}`); params.push(filters.dateFrom); }
  if (filters?.dateTo) { conditions.push(`created_at <= $${idx++}`); params.push(filters.dateTo); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await safeQuery(`SELECT COUNT(*) as total FROM "${schema}"."action_items" ${where}`, params);
  const statusResult = await safeQuery(`SELECT status, COUNT(*) as cnt FROM "${schema}"."action_items" ${where} GROUP BY status`, params);
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);
  const byStatus: Record<string, number> = {};
  for (const row of statusResult.rows) {
    byStatus[row.status] = parseInt(row.cnt, 10);
  }
  const insights: string[] = [];
  if (total === 0) insights.push('No records found matching the criteria.');
  else insights.push(`Total records: ${total}.`);
  const draftCount = byStatus['draft'] ?? 0;
  if (draftCount > total * 0.3) insights.push(`High number of drafts (${draftCount}/${total}). Consider reviewing stale items.`);
  return { totalCount: total, byStatus, insights, generatedAt: new Date().toISOString() };
}
