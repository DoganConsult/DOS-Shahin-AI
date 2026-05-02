import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';

export type DraftType = 'task' | 'email' | 'response' | 'approval' | 'entity_update' | 'escalation';
export type DraftStatus = 'pending' | 'accepted' | 'rejected' | 'modified' | 'expired' | 'converted';

export interface WorkflowDraftAction {
  draft_id: string;
  instance_id: string;
  step_id: string | null;
  agent_id: string;
  draft_type: DraftType;
  title: string;
  draft_content: Record<string, unknown>;
  confidence: number | null;
  recommendation_id: string | null;
  status: DraftStatus;
  accepted_by: string | null;
  accepted_at: string | null;
  converted_entity_type: string | null;
  converted_entity_id: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface CreateDraftInput {
  instanceId: string;
  stepId?: string;
  agentId: string;
  draftType: DraftType;
  title: string;
  draftContent: Record<string, unknown>;
  confidence?: number;
  recommendationId?: string;
  expiresAt?: string;
}

export async function createDraftAction(
  tenantId: string,
  input: CreateDraftInput,
): Promise<WorkflowDraftAction> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_draft_actions
       (instance_id, step_id, agent_id, draft_type, title, draft_content,
        confidence, recommendation_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.instanceId,
      input.stepId || null,
      input.agentId,
      input.draftType,
      input.title,
      JSON.stringify(input.draftContent),
      input.confidence ?? null,
      input.recommendationId || null,
      input.expiresAt || null,
    ],
  );

  await recordAudit({
    tenantId,
    userId: `ai-agent-${input.agentId}`,
    module: 'workflow',
    action: 'create',
    entityType: 'workflow_draft_action',
    entityId: getFirstRow(result).draft_id,
    afterState: { instanceId: input.instanceId, draftType: input.draftType },
  });

  return mapRow(getFirstRow(result));
}

export async function getDraftsByInstance(
  tenantId: string,
  instanceId: string,
  opts?: { status?: DraftStatus; draftType?: DraftType; limit?: number; offset?: number },
): Promise<{ items: WorkflowDraftAction[]; count: number }> {
  const schema = tenantSchema(tenantId);
  const where: string[] = ['d.instance_id = $1', 'd.deleted_at IS NULL'];
  const params: unknown[] = [instanceId];
  let idx = 2;

  if (opts?.status) {
    where.push(`d.status = $${idx}`); params.push(opts.status); idx++;
  }
  if (opts?.draftType) {
    where.push(`d.draft_type = $${idx}`); params.push(opts.draftType); idx++;
  }

  const countRes = await safeQuery(
    `SELECT COUNT(*)::int AS cnt FROM "${schema}".workflow_draft_actions d WHERE ${where.join(' AND ')}`,
    params,
  );
  const count = getFirstRow(countRes)?.cnt ?? 0;

  const limit = Math.min(opts?.limit || 50, 200);
  const offset = opts?.offset || 0;

  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_draft_actions d
     WHERE ${where.join(' AND ')}
     ORDER BY d.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return { items: result.rows.map(mapRow), count };
}

export async function acceptDraft(
  tenantId: string,
  draftId: string,
  userId: string,
  modifications?: Record<string, unknown>,
): Promise<WorkflowDraftAction | null> {
  const schema = tenantSchema(tenantId);
  const status: DraftStatus = modifications ? 'modified' : 'accepted';

  const sets: string[] = [
    `status = $1`, `accepted_by = $2`, `accepted_at = NOW()`,
  ];
  const params: unknown[] = [status, userId];
  let idx = 3;

  if (modifications) {
    sets.push(`draft_content = draft_content || $${idx}::jsonb`);
    params.push(JSON.stringify(modifications));
    idx++;
  }

  params.push(draftId);
  const result = await safeQuery(
    `UPDATE "${schema}".workflow_draft_actions
     SET ${sets.join(', ')}
     WHERE draft_id = $${idx} AND status = 'pending' AND deleted_at IS NULL
     RETURNING *`,
    params,
  );
  if (result.rows.length === 0) return null;

  await recordAudit({
    tenantId,
    userId,
    module: 'workflow',
    action: 'update',
    entityType: 'workflow_draft_action',
    entityId: draftId,
    afterState: { status, modifications: !!modifications },
  });

  return mapRow(getFirstRow(result));
}

export async function rejectDraft(
  tenantId: string,
  draftId: string,
  userId: string,
  reason: string,
): Promise<WorkflowDraftAction | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".workflow_draft_actions
     SET status = 'rejected', accepted_by = $1, accepted_at = NOW(), rejection_reason = $2
     WHERE draft_id = $3 AND status = 'pending' AND deleted_at IS NULL
     RETURNING *`,
    [userId, reason, draftId],
  );
  if (result.rows.length === 0) return null;

  await recordAudit({
    tenantId,
    userId,
    module: 'workflow',
    action: 'update',
    entityType: 'workflow_draft_action',
    entityId: draftId,
    afterState: { status: 'rejected', reason },
  });

  return mapRow(getFirstRow(result));
}

export async function convertDraft(
  tenantId: string,
  draftId: string,
  userId: string,
  convertedEntityType: string,
  convertedEntityId: string,
): Promise<WorkflowDraftAction | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".workflow_draft_actions
     SET status = 'converted', converted_entity_type = $1, converted_entity_id = $2,
         accepted_by = $3, accepted_at = NOW()
     WHERE draft_id = $4 AND status IN ('accepted','modified') AND deleted_at IS NULL
     RETURNING *`,
    [convertedEntityType, convertedEntityId, userId, draftId],
  );
  if (result.rows.length === 0) return null;

  await recordAudit({
    tenantId,
    userId,
    module: 'workflow',
    action: 'update',
    entityType: 'workflow_draft_action',
    entityId: draftId,
    afterState: { status: 'converted', convertedEntityType, convertedEntityId },
  });

  return mapRow(getFirstRow(result));
}

export async function getPendingDrafts(
  tenantId: string,
  limit = 50,
): Promise<WorkflowDraftAction[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_draft_actions
     WHERE status = 'pending' AND deleted_at IS NULL
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at ASC LIMIT $1`,
    [limit],
  );
  return result.rows.map(mapRow);
}

function mapRow(row: Record<string, unknown>): WorkflowDraftAction {
  return {

    draft_id: row.draft_id,

    instance_id: row.instance_id,

    step_id: row.step_id || null,

    agent_id: row.agent_id,

    draft_type: row.draft_type,

    title: row.title,
    draft_content: typeof row.draft_content === 'string' ? JSON.parse(row.draft_content) : (row.draft_content || {}),
    confidence: row.confidence !== null && row.confidence !== undefined ? Number(row.confidence) : null,

    recommendation_id: row.recommendation_id || null,

    status: row.status,

    accepted_by: row.accepted_by || null,

    accepted_at: row.accepted_at || null,

    converted_entity_type: row.converted_entity_type || null,

    converted_entity_id: row.converted_entity_id || null,

    rejection_reason: row.rejection_reason || null,

    expires_at: row.expires_at || null,

    created_at: row.created_at,
  };
}
