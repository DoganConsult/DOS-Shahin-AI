import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================================
// Cooperative Workflow #4 — Risk Assessment Pair Review
// A02 runs quantitative scoring, human adds qualitative,
// disagreements trigger structured dialogue, final = blend.
// ============================================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { recordAudit } from '../../../../infrastructure/adapters/audit.adapter';
import type { RiskPairReview, DialogueEntry } from '@dos/types';
import { randomUUID } from 'crypto';
import { getFirstRow } from '@dos/db';

const DISAGREEMENT_THRESHOLD = 20; // score difference that triggers dialogue

// ── Create Agent Assessment ────────────────────────────────────────────────

export async function createAgentAssessment(tenantId: string, input: {
  riskId: string; humanAnalystId: string; agentScore: number; agentReasoning: string;
}): Promise<RiskPairReview> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `INSERT INTO "${schema}".risk_pair_reviews
       (risk_id, agent_id, human_analyst_id, agent_score, agent_reasoning)
     VALUES ($1, 'AGENT-A02', $2, $3, $4) RETURNING review_id, created_at`,
    [input.riskId, input.humanAnalystId, input.agentScore, input.agentReasoning],
  );

  await eventBus.publish(({
      tenantId, eventType: 'risk_pair.agent_assessed', severity: 'info',
      entityId: input.riskId,
      payload: { reviewId: getFirstRow(res)?.review_id, agentScore: input.agentScore },
    } as any));

  return getReview(tenantId, getFirstRow(res)?.review_id);
}

// ── Submit Human Assessment ────────────────────────────────────────────────

export async function submitHumanAssessment(tenantId: string, reviewId: string, input: {
  humanScore: number; humanReasoning: string; userId: string;
}): Promise<RiskPairReview> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

// ── Add Dialogue Entry ─────────────────────────────────────────────────────

export async function addDialogueEntry(tenantId: string, reviewId: string, entry: {
  from: 'agent' | 'human'; message: string;
}): Promise<RiskPairReview> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

// ── Finalize Review ────────────────────────────────────────────────────────

export async function finalizeReview(tenantId: string, reviewId: string, input: {
  finalScore: number; finalMethod: 'agent_only' | 'human_only' | 'blended'; userId: string;
}): Promise<RiskPairReview> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".risk_pair_reviews
     SET final_score = $1, final_method = $2, status = 'finalized', finalized_at = NOW()
     WHERE review_id = $3`,
    [input.finalScore, input.finalMethod, reviewId],
  );

  // Update the actual risk score
  const rev = await safeQuery(`SELECT risk_id FROM "${schema}".risk_pair_reviews WHERE review_id = $1`, [reviewId]);
  if (rev.rows.length) {
    await safeQuery(
      `UPDATE "${schema}".risks SET inherent_score = $1 WHERE risk_id = $2`,
      [input.finalScore, getFirstRow(rev)?.risk_id],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  await recordAudit({
    tenantId, userId: input.userId, module: 'cooperative-workflows',
    action: 'update', entityType: 'risk_pair_review', entityId: reviewId,
    afterState: { finalScore: input.finalScore, finalMethod: input.finalMethod },
  });

  return getReview(tenantId, reviewId);
}

// ── Query ──────────────────────────────────────────────────────────────────

export async function getReview(tenantId: string, reviewId: string): Promise<RiskPairReview> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

export async function listReviews(tenantId: string, status?: string): Promise<RiskPairReview[]> {
  const schema = tenantSchema(tenantId);
  const where = status ? `WHERE status = $1` : '';
  const res = await safeQuery(`SELECT * FROM "${schema}".risk_pair_reviews ${where} ORDER BY created_at DESC LIMIT 100`, status ? [status] : []);
  return res.rows.map(mapReview);
}

function mapReview( r: Record<string, unknown>): RiskPairReview {
  return {

    reviewId: r.review_id, riskId: r.risk_id, agentId: r.agent_id,

    humanAnalystId: r.human_analyst_id, agentScore: r.agent_score,

    agentReasoning: r.agent_reasoning, humanScore: r.human_score,

    humanReasoning: r.human_reasoning, finalScore: r.final_score,

    finalMethod: r.final_method, disagreementFlag: r.disagreement_flag,
    dialogueEntries: typeof r.dialogue_entries === 'string' ? JSON.parse(r.dialogue_entries) : r.dialogue_entries || [],

    status: r.status, createdAt: r.created_at?.toISOString?.() || r.created_at,

    finalizedAt: r.finalized_at?.toISOString?.() || r.finalized_at,
  };
}
