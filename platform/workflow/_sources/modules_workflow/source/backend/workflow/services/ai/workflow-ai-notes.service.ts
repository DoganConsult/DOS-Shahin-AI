import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';

export type NoteType = 'guidance' | 'autofill' | 'recommendation' | 'summary' | 'coaching' | 'warning';
export type TrustLevel = 'assistive' | 'advisory' | 'authoritative';
export type ReviewDecision = 'accepted' | 'rejected' | 'modified';

export interface WorkflowAINote {
  note_id: string;
  instance_id: string;
  step_id: string | null;
  agent_id: string;
  note_type: NoteType;
  content: Record<string, unknown>;
  confidence: number | null;
  trust_level: TrustLevel;
  disclaimer: string;
  review_required: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_decision: ReviewDecision | null;
  context_sources: string[];
  created_at: string;
}

export interface CreateAINoteInput {
  instanceId: string;
  stepId?: string;
  agentId: string;
  noteType: NoteType;
  content: Record<string, unknown>;
  confidence?: number;
  trustLevel?: TrustLevel;
  disclaimer?: string;
  reviewRequired?: boolean;
  contextSources?: string[];
}

export async function createAINote(
  tenantId: string,
  input: CreateAINoteInput,
): Promise<WorkflowAINote> {
  const schema = tenantSchema(tenantId);
  const trustLevel = input.trustLevel || 'assistive';
  const disclaimer = input.disclaimer || 'AI-generated content. Review before acting.';

  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_ai_notes
       (instance_id, step_id, agent_id, note_type, content, confidence,
        trust_level, disclaimer, review_required, context_sources)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      input.instanceId,
      input.stepId || null,
      input.agentId,
      input.noteType,
      JSON.stringify(input.content),
      input.confidence ?? null,
      trustLevel,
      disclaimer,
      input.reviewRequired !== false,
      input.contextSources || [],
    ],
  );

  await recordAudit({
    tenantId,
    userId: `ai-agent-${input.agentId}`,
    module: 'workflow',
    action: 'create',
    entityType: 'workflow_ai_note',
    entityId: getFirstRow(result).note_id,
    afterState: { instanceId: input.instanceId, noteType: input.noteType, trustLevel },
  });

  return mapRow(getFirstRow(result));
}

export async function getNotesByInstance(
  tenantId: string,
  instanceId: string,
  opts?: { stepId?: string; noteType?: NoteType; reviewRequired?: boolean; limit?: number; offset?: number },
): Promise<{ items: WorkflowAINote[]; count: number }> {
  const schema = tenantSchema(tenantId);
  const where: string[] = ['n.instance_id = $1', 'n.deleted_at IS NULL'];
  const params: unknown[] = [instanceId];
  let idx = 2;

  if (opts?.stepId) {
    where.push(`n.step_id = $${idx}`); params.push(opts.stepId); idx++;
  }
  if (opts?.noteType) {
    where.push(`n.note_type = $${idx}`); params.push(opts.noteType); idx++;
  }
  if (opts?.reviewRequired !== undefined) {
    where.push(`n.review_required = $${idx}`); params.push(opts.reviewRequired); idx++;
  }

  const countRes = await safeQuery(
    `SELECT COUNT(*)::int AS cnt FROM "${schema}".workflow_ai_notes n WHERE ${where.join(' AND ')}`,
    params,
  );
  const count = getFirstRow(countRes)?.cnt ?? 0;

  const limit = Math.min(opts?.limit || 50, 200);
  const offset = opts?.offset || 0;

  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_ai_notes n
     WHERE ${where.join(' AND ')}
     ORDER BY n.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return { items: result.rows.map(mapRow), count };
}

export async function reviewAINote(
  tenantId: string,
  noteId: string,
  reviewedBy: string,
  decision: ReviewDecision,
): Promise<WorkflowAINote | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".workflow_ai_notes
     SET reviewed_by = $1, reviewed_at = NOW(), review_decision = $2
     WHERE note_id = $3 AND deleted_at IS NULL
     RETURNING *`,
    [reviewedBy, decision, noteId],
  );
  if (result.rows.length === 0) return null;

  await recordAudit({
    tenantId,
    userId: reviewedBy,
    module: 'workflow',
    action: 'update',
    entityType: 'workflow_ai_note',
    entityId: noteId,
    afterState: { decision },
  });

  return mapRow(getFirstRow(result));
}

export async function getPendingReviewNotes(
  tenantId: string,
  limit = 50,
): Promise<WorkflowAINote[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_ai_notes
     WHERE review_required = TRUE AND reviewed_at IS NULL AND deleted_at IS NULL
     ORDER BY created_at ASC LIMIT $1`,
    [limit],
  );
  return result.rows.map(mapRow);
}

function mapRow(row: Record<string, unknown>): WorkflowAINote {
  return {

    note_id: row.note_id,

    instance_id: row.instance_id,

    step_id: row.step_id || null,

    agent_id: row.agent_id,

    note_type: row.note_type,
    content: typeof row.content === 'string' ? JSON.parse(row.content) : (row.content || {}),
    confidence: row.confidence !== null && row.confidence !== undefined ? Number(row.confidence) : null,

    trust_level: row.trust_level || 'assistive',

    disclaimer: row.disclaimer || 'AI-generated content. Review before acting.',

    review_required: row.review_required ?? true,

    reviewed_by: row.reviewed_by || null,

    reviewed_at: row.reviewed_at || null,

    review_decision: row.review_decision || null,

    context_sources: row.context_sources || [],

    created_at: row.created_at,
  };
}
