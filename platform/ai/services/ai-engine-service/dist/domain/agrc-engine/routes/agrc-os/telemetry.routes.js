// @ts-nocheck
import { Router } from 'express';
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { auditMiddleware, validate, validateTelemetryIngest, validateTelemetryBatch } from '../../ports/middleware.port.js';
import { emitEvent } from '../../ports/events.port.js';
import { createIngestBody, createIngestBatchBody } from '../../schemas/agrc-engine.schemas.js';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
const router = Router();
router.use(auditMiddleware('agrc-engine'));
router.post('/telemetry/ingest', authenticate, requirePermission('tenant.config.manage'), validateTelemetryIngest, validate({ body: createIngestBody }), async (req, res) => {
    const { ingestSignal } = await import('../../../analytics/services/misc/telemetry-aggregator.service.js');
    const result = await ingestSignal(req.tenantId, { ...req.body, tenantId: req.tenantId });
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json(result);
});
router.post('/telemetry/ingest-batch', authenticate, requirePermission('tenant.config.manage'), validateTelemetryBatch, validate({ body: createIngestBatchBody }), async (req, res) => {
    const { ingestSignals } = await import('../../../analytics/services/misc/telemetry-aggregator.service.js');
    const signals = (req.body.signals || []).map((s) => ({ ...s, tenantId: req.tenantId }));
    const result = await ingestSignals(req.tenantId, signals);
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json(result);
});
router.get('/telemetry/threat-probability/:subjectKey', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('risk.record.read'), async (req, res) => {
    const { getThreatProbability } = await import('../../../analytics/services/misc/telemetry-aggregator.service.js');
    const windowHours = parseInt(req.query.windowHours) || 24;
    const result = await getThreatProbability(req.tenantId, req.params.subjectKey, windowHours);
    res.json(result);
});
router.get('/telemetry/signals', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('risk.record.read'), async (req, res) => {
    const { getSignals } = await import('../../../analytics/services/misc/telemetry-aggregator.service.js');
    const result = await getSignals(req.tenantId, {
        subjectKey: req.query.subjectKey,
        signalType: req.query.signalType,
        limit: parseInt(req.query.limit) || 100,
    });
    res.json(result);
});
export default router;
//# sourceMappingURL=telemetry.routes.js.map