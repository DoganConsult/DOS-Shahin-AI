import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { emitModuleEvent } from '../../services/emit-event';
import { eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
// ── Zod Schemas ──────────────────────────────────────────────────────────
import { validate, asyncHandler, auditMiddleware, setAuditData, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';
import { entityTypeEntityIdReviewPostBody, batchReviewPostBody, autoEscalatePostBody } from "../../schemas/ai.schemas";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware("hitl"));
router.get("/queue", authenticate, requirePermission("ai.agent.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const schema = tenantSchema(req.tenantId);
    const conditions = [];
    const params = [];
    let idx = 1;
    if (req.query.state) {
        conditions.push(`hitl_state = $${idx++}`);
        params.push(req.query.state);
    }
    if (req.query.entityType) {
        conditions.push(`entity_type = $${idx++}`);
        params.push(req.query.entityType);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const result = await safeQuery(`SELECT state_id, entity_type, entity_id, hitl_state, ai_agent_id, confidence,
  last_actor_type, review_required, review_decision, updated_at
  FROM "${schema}".hitl_states ${where}
  ORDER BY updated_at DESC`, params);
    res.json({ items: result.rows, count: result.rows.length });
}));
router.get("/dashboard", authenticate, requirePermission("ai.agent.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const schema = tenantSchema(req.tenantId);
    const [stateResult, gateResult] = await Promise.all([
        safeQuery(`SELECT
      COUNT(*) FILTER (WHERE hitl_state = 'ai_draft')::int AS "totalAiDrafts",
      COUNT(*) FILTER (WHERE hitl_state = 'pending_review')::int AS "totalPendingReview",
      COUNT(*) FILTER (WHERE hitl_state = 'approved')::int AS "totalApproved",
      COUNT(*) FILTER (WHERE hitl_state = 'rejected')::int AS "totalRejected",
      COUNT(*) FILTER (WHERE hitl_state = 'escalated')::int AS "totalEscalated"
      FROM "${schema}".hitl_states`),
        safeQuery(`SELECT
      COUNT(*) FILTER (WHERE status = 'pending')::int AS "totalPendingGates",
      COUNT(*) FILTER (WHERE status = 'approved')::int AS "totalApprovedGates",
      COUNT(*) FILTER (WHERE status = 'rejected')::int AS "totalRejectedGates",
      COUNT(*) FILTER (WHERE status = 'expired')::int AS "totalExpiredGates"
      FROM "${schema}".hitl_gates`).catch(() => ({ rows: [{ totalPendingGates: 0, totalApprovedGates: 0, totalRejectedGates: 0, totalExpiredGates: 0 }] })),
    ]);
    const states = getFirstRow(stateResult) || { totalAiDrafts: 0, totalPendingReview: 0, totalApproved: 0, totalRejected: 0, totalEscalated: 0 };
    const gates = getFirstRow(gateResult) || { totalPendingGates: 0, totalApprovedGates: 0, totalRejectedGates: 0, totalExpiredGates: 0 };
    res.json({ ...states, ...gates });
}));
router.post("/:entityType/:entityId/review", authenticate, requirePermission("ai.governance.review"), validate({ body: entityTypeEntityIdReviewPostBody }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const { entityType, entityId } = req.params;
    const { decision, toState } = req.body;
    if (!decision) {
        res.status(400).json({ error: "decision required" });
        return;
    }
    const newState = toState || (decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'escalated');
    const result = await safeQuery(`UPDATE "${schema}".hitl_states
  SET hitl_state = $3, review_decision = $4, last_actor_type = 'human', updated_at = NOW()
  WHERE entity_type = $1 AND entity_id = $2
  RETURNING *`, [entityType, entityId, newState, decision]);
    if (!getFirstRow(result)) {
        res.status(404).json({ error: "HITL state not found" });
        return;
    }
    setAuditData(res, { action: "update", entityType: "hitl", entityId: getFirstRow(result)?.state_id, afterState: getFirstRow(result) });
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'hitl', entityId: req.params.id || '' }), { tenantId: tenantId, operation: 'grcEvent:governance.hitl.created' });
    eventBus.publish({ eventType: 'ai.hitl.completed', tenantId, sourceService: 'hitl', severity: 'info', payload: { entityType, entityId, decision: newState, reviewedBy: req.user?.userId } });
    res.json(getFirstRow(result));
}));
router.post("/batch/review", authenticate, requirePermission("ai.governance.review"), validate({ body: batchReviewPostBody }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const { items, decision } = req.body;
    if (!Array.isArray(items) || !decision) {
        res.status(400).json({ error: "items array and decision required" });
        return;
    }
    const newState = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'escalated';
    let updated = 0;
    for (const item of items) {
        const result = await safeQuery(`UPDATE "${schema}".hitl_states
  SET hitl_state = $3, review_decision = $4, last_actor_type = 'human', updated_at = NOW()
  WHERE entity_type = $1 AND entity_id = $2
  RETURNING state_id`, [item.entityType, item.entityId, newState, decision]);
        if (getFirstRow(result)) {
            updated++;
            eventBus.publish({ eventType: 'ai.hitl.completed', tenantId, sourceService: 'hitl', severity: 'info', payload: { entityType: item.entityType, entityId: item.entityId, decision: newState, reviewedBy: req.user?.userId } });
        }
    }
    res.json({ updated, decision: newState });
}));
router.get("/sla-status", authenticate, requirePermission("ai.agent.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const schema = tenantSchema(req.tenantId);
    const slaHours = Number(req.query.slaHours) || 48;
    const result = await safeQuery(`SELECT state_id, entity_type, entity_id, hitl_state, ai_agent_id, confidence, updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600 AS hours_pending,
  GREATEST(0, $2 - EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600) AS hours_remaining
  FROM "${schema}".hitl_states
  WHERE hitl_state IN ('pending_review', 'ai_draft')
  ORDER BY updated_at ASC`, [req.tenantId, slaHours]);
    const items = result.rows.map((r) => ({
        ...r,
        hours_pending: Math.round(parseFloat(r.hours_pending) * 10) / 10,
        hours_remaining: Math.round(parseFloat(r.hours_remaining) * 10) / 10,
        sla_breached: parseFloat(r.hours_remaining) <= 0,
    }));
    const breached = items.filter((i) => i.sla_breached).length;
    res.json({ items, total: items.length, breached, slaHours });
}));
router.post("/auto-escalate", authenticate, requirePermission("ai.governance.review"), validate({ body: autoEscalatePostBody }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const slaHours = Number(req.body.slaHours) || 48;
    const result = await safeQuery(`UPDATE "${schema}".hitl_states
  SET hitl_state = 'escalated', review_decision = 'auto_escalated', last_actor_type = 'system', updated_at = NOW()
  WHERE hitl_state IN ('pending_review', 'ai_draft')
  AND EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600 > $1
  RETURNING state_id, entity_type, entity_id`, [slaHours]);
    for (const row of result.rows) {
        eventBus.publish({ eventType: 'ai.hitl.completed', tenantId, sourceService: 'hitl', severity: 'warning', payload: { entityType: row.entity_type, entityId: row.entity_id, decision: 'escalated', reviewedBy: 'system:auto-escalation' } });
    }
    res.json({ escalated: result.rows.length, slaHours });
}));
router.get("/aging", authenticate, requirePermission("ai.agent.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const schema = tenantSchema(req.tenantId);
    const result = await safeQuery(`SELECT
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600 < 24)::int AS "under24h",
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600 BETWEEN 24 AND 48)::int AS "24to48h",
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600 BETWEEN 48 AND 72)::int AS "48to72h",
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600 > 72)::int AS "over72h",
  COUNT(*)::int AS "total"
  FROM "${schema}".hitl_states
  WHERE hitl_state IN ('pending_review', 'ai_draft')`);
    res.json(getFirstRow(result) || { under24h: 0, "24to48h": 0, "48to72h": 0, over72h: 0, total: 0 });
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=hitl.routes.js.map