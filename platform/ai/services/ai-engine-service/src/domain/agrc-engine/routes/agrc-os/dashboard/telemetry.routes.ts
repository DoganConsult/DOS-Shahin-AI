// @ts-nocheck
import { catchHandler, EC } from '../../../ports/resilience.port';
import { Router, Request, Response, NextFunction as _NextFunction } from 'express';
import { authenticate, requirePermission } from '../../../ports/auth.port';
import { validateTelemetryIngest, validateTelemetryBatch } from '../../../ports/middleware.port';
import { errMsg as _errMsg } from '../../../../../i18n/error-messages';
import { emitEvent } from '../../../ports/events.port';

import { createIngestBody, createIngestBatchBody } from '../../../schemas/agrc-engine.schemas';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();

router.use(auditMiddleware('agrc-engine'));

router.post('/telemetry/ingest', authenticate, requirePermission('tenant.config.manage'), validateTelemetryIngest, validate({ body: createIngestBody }), async (req: Request, res: Response) => {

  const { ingestSignal } = await import('../../../../analytics/services/misc/telemetry-aggregator.service');
  const result = await ingestSignal(req.tenantId, { ...req.body, tenantId: req.tenantId });
  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json(result);
});

router.post('/telemetry/ingest-batch', authenticate, requirePermission('tenant.config.manage'), validateTelemetryBatch, validate({ body: createIngestBatchBody }), async (req: Request, res: Response) => {

  const { ingestSignals } = await import('../../../../analytics/services/misc/telemetry-aggregator.service');
  const signals = (req.body.signals || []).map((s: Record<string, unknown>) => ({ ...s, tenantId: req.tenantId }));
  const result = await ingestSignals(req.tenantId, signals);
  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json(result);
});

router.get('/telemetry/threat-probability/:subjectKey', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('risk.record.read'), async (req: Request, res: Response) => {
  const { getThreatProbability } = await import('../../../../analytics/services/misc/telemetry-aggregator.service');
  const windowHours = parseInt(req.query.windowHours as string) || 24;
  const result = await getThreatProbability(req.tenantId, req.params.subjectKey, windowHours);
  res.json(result);
});

router.get('/telemetry/signals', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('risk.record.read'), async (req: Request, res: Response) => {

  const { getSignals } = await import('../../../../analytics/services/misc/telemetry-aggregator.service');
  const result = await getSignals(req.tenantId, {
    subjectKey: req.query.subjectKey as string,
    signalType: req.query.signalType as string,
    limit: parseInt(req.query.limit as string) || 100,
  });
  res.json(result);
});

export default router;

