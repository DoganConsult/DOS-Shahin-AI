// @ts-nocheck
import { logger } from '../../ports/logger.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { recordDecision as _recordDecision } from './ai-decision-engine.service';
import type { ProcessTaskType } from '../../ports/lifecycle.port';
import { getFirstRow } from '@dos/db';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

export interface RecommendationInput {
  tenantId: string;
  agentId: string;
  runId?: string;
  entityType: string;
  entityId?: string;
  recommendationType: string;
  title: string;
  description: string;
  confidence?: number;
  suggestedAction?: Record<string, unknown>;
  priority?: string;
  recommendedActions?: string[];
  evidence?: any;
  source?: string;
  createdBy?: string;
}

export interface Recommendation {
  recommendation_id: string;
  tenant_id: string;
  agent_id: string;
  run_id: string | null;
  entity_type: string;
  entity_id: string | null;
  recommendation_type: string;
  title: string;
  description: string;
  confidence: number | null;
  suggested_action: Record<string, unknown>;
  priority: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string;
  created_at: string;
}

export async function createRecommendation(input: RecommendationInput): Promise<Recommendation | null> {
  const schema = tenantSchema(input.tenantId);
  try {
    const result = await safeQuery(
      `INSERT INTO "${schema}".decision_record
         (tenant_id, run_id, agent_id, decision_type, entity_type, entity_id,
          confidence, explanation, outcome, input_summary, created_by)
       VALUES ($1,$2,$3,'recommendation',$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        input.tenantId, input.runId || null, input.agentId,
        input.entityType, input.entityId || null,
        input.confidence ?? null, input.description,
        JSON.stringify({
          title: input.title,
          recommendationType: input.recommendationType,
          suggestedAction: input.suggestedAction || {},
          priority: input.priority || 'medium',
          status: 'pending',
        }),
        JSON.stringify({ entityType: input.entityType, entityId: input.entityId }),
        input.createdBy || SYSTEM_JOB_ACTOR,
      ],
    );
    const row = getFirstRow(result);
    if (row) {
      eventBus.publish(({
              eventType: 'ai.recommendation.created', tenantId: input.tenantId,
              sourceService: 'ai-recommendation-engine',
              entityType: 'ai-recommendation', entityId: row.decision_id,
              severity: 'info',
              payload: { agentId: input.agentId, decisionId: row.decision_id, title: input.title },
            } as any));
    }
    return row ? { ...row, recommendation_id: row.decision_id, recommendation_type: input.recommendationType, title: input.title, description: input.description, suggested_action: input.suggestedAction || {}, priority: input.priority || 'medium', status: 'pending', reviewed_by: null, reviewed_at: null } : null;
  } catch {
    return null;
  }
}

/**
 * Maps recommendation types to process task types.
 * This ensures every accepted recommendation becomes a tracked, SLA-enforced task.
 */
function recommendationTypeToTaskType(recommendationType: string | undefined): ProcessTaskType {
  if (!recommendationType) return 'remediation';

  const type = recommendationType.toLowerCase();
  
  // Control-related recommendations
  if (type.includes('control') || type.includes('gap') || type.includes('remediation')) {
    return 'remediation';
  }
  if (type.includes('control_review') || type.includes('control_review')) {
    return 'control_review';
  }
  
  // Evidence-related recommendations
  if (type.includes('evidence') || type.includes('collect') || type.includes('upload')) {
    return 'evidence_request';
  }
  
  // Risk-related recommendations
  if (type.includes('risk') || type.includes('assessment') || type.includes('mitigate')) {
    return 'risk_assessment';
  }
  
  // Policy-related recommendations
  if (type.includes('policy') || type.includes('governance') || type.includes('procedure')) {
    return 'policy_creation';
  }
  
  // Audit-related recommendations
  if (type.includes('audit') || type.includes('finding') || type.includes('response')) {
    return 'audit_response';
  }
  
  // Incident-related recommendations
  if (type.includes('incident') || type.includes('response') || type.includes('contain')) {
    return 'incident_response';
  }
  
  // Approval-related recommendations
  if (type.includes('approval') || type.includes('approve') || type.includes('authorize')) {
    return 'approval';
  }
  
  // Verification-related recommendations
  if (type.includes('verify') || type.includes('validation') || type.includes('confirm')) {
    return 'verification';
  }
  
  // Vendor-related recommendations
  if (type.includes('vendor')) {
    if (type.includes('risk')) return 'vendor_risk_propagation';
    if (type.includes('gap')) return 'vendor_gap_remediation';
    if (type.includes('evidence')) return 'vendor_evidence_review';
    if (type.includes('audit') || type.includes('finding')) return 'vendor_audit_finding';
    if (type.includes('framework') || type.includes('sync')) return 'vendor_framework_sync';
  }
  
  // Default fallback
  return 'remediation';
}

export async function acceptRecommendation(tenantId: string, decisionId: string, userId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `UPDATE "${schema}".decision_record
       SET outcome = jsonb_set(outcome, '{status}', '"accepted"'),
           created_by = $2
       WHERE decision_id = $1 AND decision_type = 'recommendation'
       RETURNING *`,
      [decisionId, userId],
    );
    if (getFirstRow(result)) {
      eventBus.publish(({ eventType: 'ai.recommendation.accepted', tenantId, sourceService: 'ai-recommendation-engine', severity: 'info', payload: { decisionId, userId } } as any));

      // Always create follow-up work from accepted recommendation
      try {
        const row = getFirstRow(result);
        const outcome = typeof row.outcome === 'string' ? JSON.parse(row.outcome) : (row.outcome || {});
        const suggestedAction = outcome?.suggestedAction;
        
        // Extract entityType and entityId from outcome or row
        const entityType = row.entity_type || outcome?.entityType || 'ai_recommendation';
        const entityId = row.entity_id || outcome?.entityId || decisionId;
        const recommendationType = outcome?.recommendationType || suggestedAction?.recommendationType;
        
        // Determine task type: prefer suggestedAction.taskType, fall back to mapping
        const taskType: ProcessTaskType = suggestedAction?.taskType 
          ? (suggestedAction.taskType as ProcessTaskType)
          : recommendationTypeToTaskType(recommendationType);

        const { createProcessTask } = await import('@dos/platform-core/workflows');
        await createProcessTask(tenantId, {
          title: `[AI Rec] ${outcome.title || row.explanation || 'Accepted recommendation'}`,
          description: recommendationType
            ? `Follow-up from AI recommendation (${recommendationType}): ${row.explanation || 'Accepted AI recommendation requires action'}`
            : (row.explanation || 'Accepted AI recommendation requires action'),
          taskType,
          priority: (outcome.priority || suggestedAction?.priority || 'medium') as 'critical' | 'high' | 'medium' | 'low',
          entityType,
          entityId: entityId || null,
          assigneeRole: suggestedAction?.assigneeRole || 'compliance_analyst',
          dueInHours: suggestedAction?.dueInHours || 168,
          triggerSource: 'ai-recommendation-accepted',
          triggerData: { decisionId, userId, recommendationType, entityType, entityId },
          createdBy: userId,
        });
        
        eventBus.publish(({
                  eventType: 'ai.recommendation.actioned', tenantId,
                  sourceService: 'ai-recommendation-engine', severity: 'info',
                  entityType, entityId,
                  payload: { decisionId, userId, taskType, recommendationType },
                } as any));
      } catch (err) {
        // Log error but don't fail acceptance
        logger.warn(`[AI Recommendation] Failed to create process task for accepted recommendation ${decisionId}: ${err instanceof Error ? err.message : String(err)}`);
      }

      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function rejectRecommendation(tenantId: string, decisionId: string, userId: string, reason?: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `UPDATE "${schema}".decision_record
       SET outcome = jsonb_set(jsonb_set(outcome, '{status}', '"rejected"'), '{rejectReason}', $3::jsonb)
       WHERE decision_id = $1 AND decision_type = 'recommendation'
       RETURNING *`,
      [decisionId, userId, JSON.stringify(reason || '')],
    );
    if (getFirstRow(result)) {
      eventBus.publish(({ eventType: 'ai.recommendation.rejected', tenantId, sourceService: 'ai-recommendation-engine', severity: 'info', payload: { decisionId, userId, reason } } as any));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function listRecommendations(
  tenantId: string,
  filters?: { status?: string; agentId?: string; limit?: number; offset?: number },
): Promise<{ items: unknown[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions = ["tenant_id = $1", "decision_type = 'recommendation'"];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (filters?.agentId) { conditions.push(`agent_id = $${idx++}`); params.push(filters.agentId); }
  if (filters?.status) { conditions.push(`outcome->>'status' = $${idx++}`); params.push(filters.status); }
  if ((filters as Record<string, unknown>)?.priority) { conditions.push(`outcome->>'priority' = $${idx++}`); params.push((filters as Record<string, unknown>).priority); }
  if ((filters as Record<string, unknown>)?.search) { conditions.push(`(explanation ILIKE $${idx} OR outcome->>'title' ILIKE $${idx})`); params.push(`%${(filters as Record<string, unknown>).search}%`); idx++; }

  const where = conditions.join(' AND ');
  const limit = Math.min(filters?.limit || 50, 200);
  const offset = filters?.offset || 0;

  const [dataRes, countRes] = await Promise.all([
    safeQuery(`SELECT * FROM "${schema}".decision_record WHERE ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]),
    safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".decision_record WHERE ${where}`, params),
  ]);

  return { items: dataRes.rows, total: getFirstRow(countRes)?.total || 0 };
}

export async function batchAcceptRecommendations(tenantId: string, decisionIds: string[], userId: string): Promise<number> {
  let accepted = 0;
  for (const id of decisionIds) {
    const ok = await acceptRecommendation(tenantId, id, userId);
    if (ok) accepted++;
  }
  return accepted;
}

export async function batchRejectRecommendations(tenantId: string, decisionIds: string[], userId: string, reason?: string): Promise<number> {
  let rejected = 0;
  for (const id of decisionIds) {
    const ok = await rejectRecommendation(tenantId, id, userId, reason);
    if (ok) rejected++;
  }
  return rejected;
}

export async function getRecommendationStats(tenantId: string): Promise<{
  pending: number; accepted: number; rejected: number; total: number;
}> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE outcome->>'status' = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE outcome->>'status' = 'accepted')::int AS accepted,
         COUNT(*) FILTER (WHERE outcome->>'status' = 'rejected')::int AS rejected
       FROM "${schema}".decision_record WHERE tenant_id = $1 AND decision_type = 'recommendation'`,
      [tenantId],
    );
    const r = getFirstRow(result);
    return { pending: r?.pending || 0, accepted: r?.accepted || 0, rejected: r?.rejected || 0, total: r?.total || 0 };
  } catch {
    return { pending: 0, accepted: 0, rejected: 0, total: 0 };
  }
}
