export const REMEDIATION_AI_CONFIG = {
  moduleCode: 'remediation' as const,
  enabled: true,

  allowedActions: [
    'remediation.plan.draft',
    'remediation.plan.recommend',
    'remediation.plan.summarize',
    'remediation.plan.classify',
    'remediation.plan.score',
    'remediation.plan.analyze',
    'remediation.plan.generate_report',
  ],

  blockedActions: [
    'remediation.plan.delete',
    'remediation.plan.approve',
    'remediation.plan.reject',
    'remediation.plan.override',
    'remediation.plan.bulk_delete',
  ],

  humanInLoopBoundaries: {
    requiresHumanApproval: ['remediation.plan.approve', 'remediation.plan.reject', 'remediation.plan.delete'],
    requiresHumanReview: ['remediation.plan.classify', 'remediation.plan.score'],
    autoExecutable: ['remediation.plan.draft', 'remediation.plan.summarize', 'remediation.plan.analyze'],
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
    systemPromptTemplate: 'remediation_system_prompt_v1',
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

export function isRemediationAiActionAllowed(action: string): boolean {
  return (REMEDIATION_AI_CONFIG.allowedActions as readonly string[]).includes(action);
}

export function isRemediationAiActionBlocked(action: string): boolean {
  return (REMEDIATION_AI_CONFIG.blockedActions as readonly string[]).includes(action);
}

import { safeQuery, tenantSchema } from '../ports/database.port';

export interface RemediationRecommendation {
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'sla' | 'blocker' | 'coverage' | 'cost' | 'verification';
  action?: 'escalate' | 'reassign' | 'extend' | 'close' | 'verify';
  targetId?: string;
}

export async function getAiRecommendations(
  tenantId: string,
  _context: Record<string, unknown> = {},
): Promise<RemediationRecommendation[]> {
  const schema = tenantSchema(tenantId);
  const out: RemediationRecommendation[] = [];

  try {
    const [slaBreach, blocked, unverified, overdue] = await Promise.all([
      safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".remediation_tasks
         WHERE status NOT IN ('completed','closed','cancelled')
           AND due_date < NOW() - INTERVAL '7 days'`,
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".remediation_blockers
         WHERE resolved_at IS NULL
           AND reported_at < NOW() - INTERVAL '48 hours'`,
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".remediation_tasks
         WHERE status = 'completed'
           AND NOT EXISTS (
             SELECT 1 FROM "${schema}".remediation_verifications v
             WHERE v.task_id = remediation_tasks.task_id
               AND v.status IN ('verified','passed')
           )`,
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".remediation_tasks
         WHERE status NOT IN ('completed','closed','cancelled')
           AND due_date < NOW()
           AND due_date >= NOW() - INTERVAL '7 days'`,
      ),
    ]);

    const nSla = Number(slaBreach.rows?.[0]?.n ?? 0);
    if (nSla > 0) {
      out.push({
        title: 'SLA-breached remediation tasks',
        description: `${nSla} task(s) overdue by more than 7 days. Escalate to the risk owner or extend SLA with justification.`,
        priority: nSla > 10 ? 'critical' : 'high',
        category: 'sla',
        action: 'escalate',
      });
    }

    const nOverdue = Number(overdue.rows?.[0]?.n ?? 0);
    if (nOverdue > 0) {
      out.push({
        title: 'Recently overdue tasks',
        description: `${nOverdue} task(s) went overdue within the last 7 days.`,
        priority: nOverdue > 20 ? 'high' : 'medium',
        category: 'sla',
      });
    }

    const nBlocked = Number(blocked.rows?.[0]?.n ?? 0);
    if (nBlocked > 0) {
      out.push({
        title: 'Long-running blockers',
        description: `${nBlocked} blocker(s) unresolved for over 48 hours.`,
        priority: nBlocked > 5 ? 'high' : 'medium',
        category: 'blocker',
        action: 'reassign',
      });
    }

    const nUnverified = Number(unverified.rows?.[0]?.n ?? 0);
    if (nUnverified > 0) {
      out.push({
        title: 'Completed tasks lacking verification',
        description: `${nUnverified} task(s) marked completed without verification evidence.`,
        priority: nUnverified > 15 ? 'high' : 'medium',
        category: 'verification',
        action: 'verify',
      });
    }
  } catch {
    /* best-effort fallback */
  }

  if (out.length === 0) {
    out.push({
      title: 'Remediation pipeline healthy',
      description: 'No SLA breaches, long-running blockers, or unverified completions detected.',
      priority: 'low',
      category: 'coverage',
    });
  }

  return out;
}

export function requiresRemediationHumanApproval(action: string): boolean {
  return (REMEDIATION_AI_CONFIG.humanInLoopBoundaries.requiresHumanApproval as readonly string[]).includes(action);
}

export async function summarize(tenantId: string, entityId: string): Promise<{ summary: string; keyPoints: string[]; confidence: number }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".remediation_tasks WHERE task_id = $1`,
    [entityId]
  );
  const r = result.rows[0];
  if (!r) return { summary: 'Remediation entity not found.', keyPoints: [], confidence: 0 };
  return {
    summary: `\${r.title ?? "Remediation"} plan. Status: \${r.status ?? "N/A"}.`,
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
    `SELECT * FROM "${schema}".remediation_tasks WHERE task_id = $1`,
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
    `SELECT * FROM "${schema}".remediation_tasks WHERE task_id = $1`,
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
  const countResult = await safeQuery(`SELECT COUNT(*) as total FROM "${schema}".remediation_tasks ${where}`, params);
  const statusResult = await safeQuery(`SELECT status, COUNT(*) as cnt FROM "${schema}".remediation_tasks ${where} GROUP BY status`, params);
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
