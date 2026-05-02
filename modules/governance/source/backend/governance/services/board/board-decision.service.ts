/**
 * BoardDecisionService — Real DB implementation
 */
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { randomUUID } from 'crypto';

export type DecisionStatus = 'draft' | 'under_review' | 'approved' | 'rejected' | 'deferred';

export interface CreateDecisionInput {
  tenantId: string; boardId: string; title: string; description?: string;
  decisionType?: string; entityType?: string; entityId?: string;
  createdBy: string;
}

export async function createBoardDecision(input: CreateDecisionInput): Promise<string> {
  const id = randomUUID();
  const decisionRef = `DEC-${Date.now().toString(36).toUpperCase()}`;
  await safeQuery(
    `INSERT INTO __TENANT_SCHEMA__.board_decisions
       (id, tenant_id, board_id, decision_ref, title, description,
        decision_type, entity_type, entity_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, input.tenantId, input.boardId, decisionRef, input.title,
     input.description ?? null, input.decisionType ?? 'resolution',
     input.entityType ?? null, input.entityId ?? null, input.createdBy],
  );
  logger.info('[BoardDecision] Created', { id, boardId: input.boardId });
  return id;
}

export async function submitDecisionForReview(
  id: string, tenantId: string, submittedBy: string,
): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.board_decisions
     SET status = 'under_review', updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND status = 'draft'`,
    [id, tenantId],
  );
}

export async function finalizeDecision(
  id: string, tenantId: string, status: 'approved' | 'rejected' | 'deferred',
  decidedBy: string, rationale?: string,
): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.board_decisions
     SET status = $1, decided_by = $2, decided_at = NOW(), rationale = $3, updated_at = NOW()
     WHERE id = $4 AND tenant_id = $5 AND status = 'under_review'`,
    [status, decidedBy, rationale ?? null, id, tenantId],
  );
  logger.info('[BoardDecision] Finalized', { id, status, decidedBy });
}

export async function listBoardDecisions(boardId: string, tenantId: string, opts: {
  status?: DecisionStatus; limit?: number; offset?: number;
}): Promise<{ data: unknown[]; total: number }> {
  const conds = ['board_id = $1', 'tenant_id = $2'];
  const params: unknown[] = [boardId, tenantId];
  let idx = 3;
  if (opts.status) { conds.push(`status = $${idx++}`); params.push(opts.status); }
  const where = `WHERE ${conds.join(' AND ')}`;
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;
  const [c, d] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int AS total FROM __TENANT_SCHEMA__.board_decisions ${where}`, params),
    safeQuery(
      `SELECT id, decision_ref, title, decision_type, status, decided_by, decided_at,
              entity_type, entity_id, created_at
       FROM __TENANT_SCHEMA__.board_decisions ${where}
       ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, params,
    ),
  ]);
  return { data: d.rows, total: (c.rows[0] as { total: number })?.total ?? 0 };
}

export async function getGovernanceHealthScore(tenantId: string): Promise<{
  score: number; components: Record<string, number>;
}> {
  const [decisionRes, boardRes] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
         COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
         COUNT(*)::int AS total
       FROM __TENANT_SCHEMA__.board_decisions WHERE tenant_id = $1`, [tenantId],
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS total FROM __TENANT_SCHEMA__.governance_boards
       WHERE tenant_id = $1 AND status = 'active'`, [tenantId],
    ),
  ]);
  const dr = decisionRes.rows[0] as { approved: number; total: number; draft: number } ?? { approved: 0, total: 0, draft: 0 };
  const decisionScore = dr.total > 0 ? Math.round((dr.approved / dr.total) * 100) : 0;
  const draftPenalty  = dr.draft > 5 ? 10 : 0;
  const boardCount    = (boardRes.rows[0] as { total: number })?.total ?? 0;
  const boardScore    = boardCount > 0 ? 100 : 0;
  const score = Math.max(0, Math.round((decisionScore * 0.6 + boardScore * 0.4) - draftPenalty));
  return { score, components: { decisionCompletionRate: decisionScore, activeBoardsPresence: boardScore } };
}

export const BoardDecisionService = {
  createBoardDecision, submitDecisionForReview, finalizeDecision,
  listBoardDecisions, getGovernanceHealthScore,
};
