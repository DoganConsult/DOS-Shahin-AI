import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';

export type CommentVisibility = 'public' | 'internal' | 'private';
export type CommentSource = 'human' | 'ai_note' | 'ai_recommendation' | 'system';

export interface WorkflowComment {
  comment_id: string;
  instance_id: string;
  step_id: string | null;
  commenter_id: string;
  comment_text: string;
  visibility: CommentVisibility;
  source: CommentSource;
  ai_agent_id: string | null;
  ai_confidence: number | null;
  ai_disclaimer: string | null;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentInput {
  instanceId: string;
  stepId?: string;
  commenterId: string;
  commentText: string;
  visibility?: CommentVisibility;
  source?: CommentSource;
  aiAgentId?: string;
  aiConfidence?: number;
  aiDisclaimer?: string;
  parentCommentId?: string;
}

export async function createWorkflowComment(
  tenantId: string,
  input: CreateCommentInput,
): Promise<WorkflowComment> {
  const schema = tenantSchema(tenantId);
  const source = input.source || 'human';
  const visibility = input.visibility || 'public';
  const disclaimer = source !== 'human'
    ? (input.aiDisclaimer || 'AI-generated content. Review before acting.')
    : null;

  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_comments
       (instance_id, step_id, commenter_id, comment_text, visibility, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.instanceId,
      input.stepId || null,
      input.commenterId,
      input.commentText,
      visibility,
      input.commenterId,
    ],
  );
  const row = getFirstRow(result)!;

  await recordAudit({
    tenantId,
    userId: input.commenterId,
    module: 'workflow',
    action: 'create',
    entityType: 'workflow_comment',
    entityId: row.comment_id,
    afterState: { instanceId: input.instanceId, visibility, source },
  });

  return mapRow(row, source, input.aiAgentId, input.aiConfidence, disclaimer);
}

export async function getCommentsByInstance(
  tenantId: string,
  instanceId: string,
  opts?: { visibility?: CommentVisibility; stepId?: string; limit?: number; offset?: number },
): Promise<{ items: WorkflowComment[]; count: number }> {
  const schema = tenantSchema(tenantId);
  const where: string[] = ['wc.instance_id = $1', 'wc.deleted_at IS NULL'];
  const params: unknown[] = [instanceId];
  let idx = 2;

  if (opts?.visibility) {
    where.push(`wc.visibility = $${idx}`);
    params.push(opts.visibility);
    idx++;
  }
  if (opts?.stepId) {
    where.push(`wc.step_id = $${idx}`);
    params.push(opts.stepId);
    idx++;
  }

  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS cnt FROM "${schema}".workflow_comments wc WHERE ${where.join(' AND ')}`,
    params,
  );
  const count = getFirstRow(countResult)?.cnt ?? 0;

  const limit = Math.min(opts?.limit || 50, 200);
  const offset = opts?.offset || 0;

  const result = await safeQuery(
    `SELECT wc.*, u.name AS commenter_name
     FROM "${schema}".workflow_comments wc
     LEFT JOIN users u ON u.user_id = wc.commenter_id
     WHERE ${where.join(' AND ')}
     ORDER BY wc.created_at ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return {
    items: result.rows.map(r => mapRow(r)),
    count,
  };
}

export async function updateComment(
  tenantId: string,
  commentId: string,
  userId: string,
  updates: { commentText?: string; visibility?: CommentVisibility },
): Promise<WorkflowComment | null> {
  const schema = tenantSchema(tenantId);
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (updates.commentText !== undefined) {
    sets.push(`comment_text = $${idx}`);
    params.push(updates.commentText);
    idx++;
  }
  if (updates.visibility !== undefined) {
    sets.push(`visibility = $${idx}`);
    params.push(updates.visibility);
    idx++;
  }
  if (sets.length === 0) return null;

  sets.push(`updated_at = NOW()`, `updated_by = $${idx}`);
  params.push(userId);
  idx++;
  params.push(commentId);

  const result = await safeQuery(
    `UPDATE "${schema}".workflow_comments SET ${sets.join(', ')}
     WHERE comment_id = $${idx} AND deleted_at IS NULL RETURNING *`,
    params,
  );
  if (result.rows.length === 0) return null;

  await recordAudit({
    tenantId,
    userId,
    module: 'workflow',
    action: 'update',
    entityType: 'workflow_comment',
    entityId: commentId,
    afterState: updates,
  });

  return mapRow(getFirstRow(result));
}

export async function deleteComment(
  tenantId: string,
  commentId: string,
  userId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".workflow_comments
     SET deleted_at = NOW(), updated_by = $1
     WHERE comment_id = $2 AND deleted_at IS NULL`,
    [userId, commentId],
  );
  if ((result.rowCount ?? 0) === 0) return false;

  await recordAudit({
    tenantId,
    userId,
    module: 'workflow',
    action: 'delete',
    entityType: 'workflow_comment',
    entityId: commentId,
  });

  return true;
}

function mapRow(
  row: any,
  source?: CommentSource,
  aiAgentId?: string | null,
  aiConfidence?: number | null,
  aiDisclaimer?: string | null,
): WorkflowComment {
  return {
    comment_id: row.comment_id,
    instance_id: row.instance_id,
    step_id: row.step_id || null,
    commenter_id: row.commenter_id,
    comment_text: row.comment_text,
    visibility: row.visibility || 'public',
    source: source || (row.commenter_id?.startsWith('ai-agent') ? 'ai_note' : 'human'),
    ai_agent_id: aiAgentId || null,
    ai_confidence: aiConfidence ?? null,
    ai_disclaimer: aiDisclaimer || null,
    parent_comment_id: row.parent_comment_id || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
