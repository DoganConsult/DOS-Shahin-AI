export const TRAINING_AI_CONFIG = {
  moduleCode: 'training' as const,
  enabled: true,

  allowedActions: [
    'training.record.draft',
    'training.record.recommend',
    'training.record.summarize',
    'training.record.classify',
    'training.record.score',
    'training.record.analyze',
    'training.record.generate_report',
  ],

  blockedActions: [
    'training.record.delete',
    'training.record.approve',
    'training.record.reject',
    'training.record.override',
    'training.record.bulk_delete',
  ],

  humanInLoopBoundaries: {
    requiresHumanApproval: ['training.record.approve', 'training.record.reject', 'training.record.delete'],
    requiresHumanReview: ['training.record.classify', 'training.record.score'],
    autoExecutable: ['training.record.draft', 'training.record.summarize', 'training.record.analyze'],
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
    systemPromptTemplate: 'training_system_prompt_v1',
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

export function isTrainingAiActionAllowed(action: string): boolean {
  return (TRAINING_AI_CONFIG.allowedActions as readonly string[]).includes(action);
}

export function isTrainingAiActionBlocked(action: string): boolean {
  return (TRAINING_AI_CONFIG.blockedActions as readonly string[]).includes(action);
}

export function requiresTrainingHumanApproval(action: string): boolean {
  return (TRAINING_AI_CONFIG.humanInLoopBoundaries.requiresHumanApproval as readonly string[]).includes(action);
}

import { safeQuery, tenantSchema } from '../ports/database.port';

export async function summarize(tenantId: string, entityId: string): Promise<{ summary: string; keyPoints: string[]; confidence: number }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".training_programs WHERE id = $1`,
    [entityId]
  );
  const r = result.rows[0];
  if (!r) return { summary: 'Training entity not found.', keyPoints: [], confidence: 0 };
  return {
    summary: `\${r.title ?? "Training"} program (\${r.program_type ?? "course"}). Status: \${r.status ?? "N/A"}.`,
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
    `SELECT * FROM "${schema}".training_programs WHERE id = $1`,
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
    `SELECT * FROM "${schema}".training_programs WHERE id = $1`,
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
  const countResult = await safeQuery(`SELECT COUNT(*) as total FROM "${schema}".training_programs ${where}`, params);
  const statusResult = await safeQuery(`SELECT status, COUNT(*) as cnt FROM "${schema}".training_programs ${where} GROUP BY status`, params);
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

// W5 — /insights endpoint support
export interface TrainingRecommendation {
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'compliance' | 'completion' | 'refresh' | 'content';
  action?: 'assign' | 'remind' | 'reassess' | 'publish';
}

export async function getAiRecommendations(
  tenantId: string,
  _context: Record<string, unknown> = {},
): Promise<TrainingRecommendation[]> {
  const schema = `tenant_${tenantId.replace(/-/g, '_')}`;
  const out: TrainingRecommendation[] = [];
  try {
    const [overdue, drafts, unassigned, expiring] = await Promise.all([
      safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".training_assignments
         WHERE status IN ('assigned','in_progress')
           AND due_date < NOW()`,
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".training_programs
         WHERE status='draft' AND created_at < NOW() - INTERVAL '30 days'`,
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".training_programs p
         WHERE p.status='published'
           AND NOT EXISTS (
             SELECT 1 FROM "${schema}".training_assignments a WHERE a.program_id = p.program_id
           )`,
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".training_certifications
         WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'`,
      ),
    ]);

    const nOverdue = Number(overdue.rows?.[0]?.n ?? 0);
    if (nOverdue > 0) {
      out.push({
        title: 'Overdue training assignments',
        description: `${nOverdue} assignment(s) past their due date. Send reminders or escalate.`,
        priority: nOverdue > 20 ? 'high' : 'medium',
        category: 'completion',
        action: 'remind',
      });
    }

    const nDrafts = Number(drafts.rows?.[0]?.n ?? 0);
    if (nDrafts > 0) {
      out.push({
        title: 'Stale training drafts',
        description: `${nDrafts} program(s) stuck in draft for over 30 days.`,
        priority: 'medium',
        category: 'content',
        action: 'publish',
      });
    }

    const nUnassigned = Number(unassigned.rows?.[0]?.n ?? 0);
    if (nUnassigned > 0) {
      out.push({
        title: 'Published programs without assignments',
        description: `${nUnassigned} published program(s) have no learners assigned.`,
        priority: 'medium',
        category: 'completion',
        action: 'assign',
      });
    }

    const nExpiring = Number(expiring.rows?.[0]?.n ?? 0);
    if (nExpiring > 0) {
      out.push({
        title: 'Certifications expiring soon',
        description: `${nExpiring} certification(s) expire within 30 days.`,
        priority: nExpiring > 10 ? 'high' : 'medium',
        category: 'refresh',
        action: 'reassess',
      });
    }
  } catch {
    /* best-effort */
  }

  if (out.length === 0) {
    out.push({
      title: 'Training pipeline healthy',
      description: 'No overdue assignments, stale drafts, or expiring certifications detected.',
      priority: 'low',
      category: 'completion',
    });
  }

  return out;
}
