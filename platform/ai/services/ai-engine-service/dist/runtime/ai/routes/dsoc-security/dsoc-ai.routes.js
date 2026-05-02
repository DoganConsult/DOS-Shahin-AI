/**
 * DSOC AI Security — HTTP routes.
 *
 * Mounted on ai-engine-service at /api/ai-engine/dsoc-ai/* (gateway can
 * later reverse-proxy /api/dsoc/ai/* → here once dsoc-service grows the
 * AI subdomain natively).
 *
 * Read-only. RBAC: requirePermission('platform.dsoc.read') for views.
 */
import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { safeQuery } from '@dos/db';
import { getGateDecisions, getGateDecisionStats } from '../../services/dsoc-security/gate-decisions.service.js';
import { getHITLQueue, getHITLBacklogSummary } from '../../services/dsoc-security/hitl-queue.service.js';
const router = Router();
const platformQuery = async (text, params = []) => {
    const r = await safeQuery(text, params);
    return { rows: r.rows };
};
/** GET /api/ai-engine/dsoc-ai/health — module health probe (public, before authenticate). */
router.get('/health', (_req, res) => {
    res.json({ ok: true, module: 'dsoc-ai', service: 'ai-engine-service' });
});
router.use(authenticate);
/** GET /api/ai-engine/dsoc-ai/gate-decisions — every allow/deny/escalate. */
router.get('/gate-decisions', requirePermission('platform.dsoc.read'), async (req, res) => {
    try {
        const tenantId = req.query.tenant || undefined;
        const agentId = req.query.agent || undefined;
        const decision = req.query.decision;
        const decidedBy = req.query.decidedBy || undefined;
        const windowHours = req.query.window ? Number(req.query.window) : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const rows = await getGateDecisions(platformQuery, { tenantId, agentId, decision, decidedBy, windowHours, limit });
        res.json({ count: rows.length, rows });
    }
    catch (err) {
        res.status(500).json({ error: 'gate-decisions failed', details: err?.message });
    }
});
/** GET /api/ai-engine/dsoc-ai/gate-stats — aggregate counts by decidedBy. */
router.get('/gate-stats', requirePermission('platform.dsoc.read'), async (req, res) => {
    try {
        const tenantId = req.query.tenant || undefined;
        const windowHours = req.query.window ? Number(req.query.window) : undefined;
        const stats = await getGateDecisionStats(platformQuery, { tenantId, windowHours });
        res.json(stats);
    }
    catch (err) {
        res.status(500).json({ error: 'gate-stats failed', details: err?.message });
    }
});
/** GET /api/ai-engine/dsoc-ai/hitl-queue — pending HITL approvals across tenants. */
router.get('/hitl-queue', requirePermission('platform.dsoc.read'), async (req, res) => {
    try {
        const tenantId = req.query.tenant || undefined;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const rows = await getHITLQueue(platformQuery, { tenantId, limit });
        res.json({ count: rows.length, rows });
    }
    catch (err) {
        res.status(500).json({ error: 'hitl-queue failed', details: err?.message });
    }
});
/** GET /api/ai-engine/dsoc-ai/hitl-backlog — per-tenant pending counts + oldest age. */
router.get('/hitl-backlog', requirePermission('platform.dsoc.read'), async (req, res) => {
    try {
        const rows = await getHITLBacklogSummary(platformQuery);
        res.json({ count: rows.length, rows });
    }
    catch (err) {
        res.status(500).json({ error: 'hitl-backlog failed', details: err?.message });
    }
});
export default router;
//# sourceMappingURL=dsoc-ai.routes.js.map