// @ts-nocheck
import { Router } from 'express';
import { validate, auditMiddleware } from '../../ports/middleware.port.js';
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { emitEvent } from '../../ports/events.port.js';
import { heavyOpLimiter } from './shared.js';
import { createRunBody, createScanBody, createOrchestrateBody } from '../../schemas/agrc-engine.schemas.js';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
const router = Router();
router.use(auditMiddleware('agrc-engine'));
// ── CCM ────────────────────────────────────────────────────────────────────
router.post('/ccm/run', authenticate, requirePermission('tenant.config.manage'), heavyOpLimiter, validate({ body: createRunBody }), async (req, res) => {
    const { runCCMCycle } = await import('../../../compliance/services/ccm/ccm-worker.service.js');
    const result = await runCCMCycle(req.tenantId);
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json(result);
});
router.get('/ccm/history', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ccm.record.read'), async (req, res) => {
    const { getCCMHistory } = await import('../../../compliance/services/ccm/ccm-worker.service.js');
    const result = await getCCMHistory(req.tenantId, parseInt(req.query.limit) || 50);
    res.json(result);
});
// ── Regulatory Delta ───────────────────────────────────────────────────────
router.get('/regulatory-delta', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('framework.record.read'), async (req, res) => {
    const { getDeltaHistory } = await import('../../../compliance/services/regulatory/regulatory-delta.service.js');
    const result = await getDeltaHistory(req.query.instrumentId, parseInt(req.query.limit) || 50);
    res.json(result);
});
router.post('/regulatory-delta/scan', authenticate, requirePermission('platform.system.admin'), heavyOpLimiter, validate({ body: createScanBody }), async (req, res) => {
    const { scanAllInstruments } = await import('../../../compliance/services/regulatory/regulatory-delta.service.js');
    const result = await scanAllInstruments();
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json(result);
});
router.get('/regulatory-delta/impacts', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('framework.record.read'), async (req, res) => {
    const { getTenantDeltaImpacts } = await import('../../../compliance/services/regulatory/regulatory-delta.service.js');
    const result = await getTenantDeltaImpacts(req.tenantId, parseInt(req.query.limit) || 50);
    res.json(result);
});
// ── AGRC-OS Orchestrator ───────────────────────────────────────────────────
router.post('/orchestrate', authenticate, requirePermission('platform.agent.manage'), heavyOpLimiter, validate({ body: createOrchestrateBody }), async (req, res) => {
    const { runAGRCOSCycle } = await import('../../services/agrc-os-orchestrator.service.js');
    const result = await runAGRCOSCycle(req.tenantId);
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json(result);
});
router.get('/status', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req, res) => {
    const { getAGRCOSStatus } = await import('../../services/agrc-os-orchestrator.service.js');
    const result = await getAGRCOSStatus(req.tenantId);
    res.json(result);
});
router.get('/history', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req, res) => {
    const { getAGRCOSHistory } = await import('../../services/agrc-os-orchestrator.service.js');
    const result = await getAGRCOSHistory(req.tenantId, parseInt(req.query.limit) || 50);
    res.json(result);
});
// ── Autonomous GRC Engine ──────────────────────────────────────────────────
router.post('/autonomous/run', authenticate, requirePermission('platform.agent.manage'), heavyOpLimiter, validate({ body: createRunBody }), async (req, res) => {
    const { runAutonomousEngine } = await import('../../services/autonomous-grc-engine.service.js');
    const result = await runAutonomousEngine(req.tenantId);
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json(result);
});
router.get('/autonomous/status', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req, res) => {
    const { getAutonomousEngineStatus } = await import('../../services/autonomous-grc-engine.service.js');
    const result = await getAutonomousEngineStatus(req.tenantId);
    res.json(result);
});
router.get('/autonomous/history', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req, res) => {
    const { getAutonomousEngineHistory } = await import('../../services/autonomous-grc-engine.service.js');
    const result = await getAutonomousEngineHistory(req.tenantId, parseInt(req.query.limit) || 50);
    res.json(result);
});
// ── Event Bus ──────────────────────────────────────────────────────────────
router.get('/events', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('event.log.read'), async (req, res) => {
    const { eventBus } = await import('../../../platform/services/event/event-bus.service');
    const result = await eventBus.getEventLog(req.tenantId, {
        eventType: req.query.eventType,
        severity: req.query.severity,
        limit: parseInt(req.query.limit) || 100,
        since: req.query.since,
    });
    res.json(result);
});
router.get('/events/stats', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req, res) => {
    const { eventBus } = await import('../../../platform/services/event/event-bus.service');
    const hours = parseInt(req.query.hours) || 24;
    const result = await eventBus.getEventStats(req.tenantId, hours);
    res.json(result);
});
router.get('/events/subscribers', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.manage'), async (req, res) => {
    const { eventBus } = await import('../../../platform/services/event/event-bus.service');
    res.json(eventBus.getSubscribers());
});
export default router;
//# sourceMappingURL=ccm-regulatory-orchestration.routes.js.map