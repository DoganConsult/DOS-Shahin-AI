import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================================
// Cooperative Workflow #4 — Risk Assessment Pair Review
// A02 runs quantitative scoring, human adds qualitative,
// disagreements trigger structured dialogue, final = blend.
// ============================================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
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
  const schema = tenantSchema(tenantId);

  const current = await safeQuery(
    `SELECT review_id, risk_id, agent_score
     FROM "${schema}".risk_pair_reviews
     WHERE review_id = $1`,
    [reviewId],
  );
  if (!current.rows.length) throw new Error('Review not found');
  const row = getFirstRow(current) as Record<string, unknown>;
  const agentScore = Number(row.agent_score ?? 0);
  const disagreement = Math.abs(agentScore - input.humanScore) >= DISAGREEMENT_THRESHOLD;
  const nextStatus: RiskPairReview['status'] = disagreement ? 'dialogue' : 'human_review';

  await safeQuery(
    `UPDATE "${schema}".risk_pair_reviews
     SET human_score = $1,
         human_reasoning = $2,
         disagreement_flag = $3,
         status = $4,
         updated_at = NOW()
     WHERE review_id = $5`,
    [input.humanScore, input.humanReasoning, disagreement, nextStatus, reviewId],
  );

  await recordAudit({
    tenantId, userId: input.userId, module: 'cooperative-workflows',
    action: 'update', entityType: 'risk_pair_review', entityId: reviewId,
    afterState: { humanScore: input.humanScore, disagreement },
  }).catch(catchHandler(EC.EVENT_BUS, {}));

  await eventBus.publish(({
    tenantId,
    eventType: 'risk_pair.human_assessed',
    severity: 'info',
    entityId: String(row.risk_id ?? ''),
    payload: { reviewId, humanScore: input.humanScore, disagreement },
  } as any));

  return getReview(tenantId, reviewId);
}

// ── Add Dialogue Entry ─────────────────────────────────────────────────────

export async function addDialogueEntry(tenantId: string, reviewId: string, entry: {
  from: 'agent' | 'human'; message: string;
}): Promise<RiskPairReview> {
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(
    `SELECT dialogue_entries
     FROM "${schema}".risk_pair_reviews
     WHERE review_id = $1`,
    [reviewId],
  );
  if (!current.rows.length) throw new Error('Review not found');

  const r = getFirstRow(current) as Record<string, unknown>;
  const existing = typeof r.dialogue_entries === 'string'
    ? (JSON.parse(r.dialogue_entries) as DialogueEntry[])
    : ((r.dialogue_entries as DialogueEntry[]) ?? []);

  const next: DialogueEntry = {
    id: randomUUID(),
    reviewId,
    from: entry.from,
    source: entry.from === 'agent' ? 'ai' : 'human',
    message: entry.message,
    timestamp: new Date().toISOString(),
  };

  existing.push(next);

  await safeQuery(
    `UPDATE "${schema}".risk_pair_reviews
     SET dialogue_entries = $1,
         status = 'dialogue',
         updated_at = NOW()
     WHERE review_id = $2`,
    [JSON.stringify(existing), reviewId],
  );

  await eventBus.publish(({
    tenantId,
    eventType: 'risk_pair.dialogue_added',
    severity: 'info',
    entityId: reviewId,
    payload: { from: entry.from },
  } as any)).catch(() => undefined);

  return getReview(tenantId, reviewId);
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
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".risk_pair_reviews WHERE review_id = $1`,
    [reviewId],
  );
  if (!res.rows.length) throw new Error('Review not found');
  return mapReview(getFirstRow(res) as Record<string, unknown>);
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
