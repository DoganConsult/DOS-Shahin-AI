/**
 * Incident Triage Routes — Zod-validated, DAuth-gated
 * Wires IncidentTriageService into Express router.
 * ALL mutations: Zod validate → authenticate → requirePermission → audit
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {

  authenticate, requirePermission,
} from '../ports/auth.port';

const genericPayloadSchema = z.record(z.unknown());
import {
  validate, auditMiddleware, setAuditData, asyncHandler, moduleStack,
} from '../ports/middleware.port';
import {
  IncidentTriageService,
} from '../services/incident/incident-triage.service';
import { ok, paginated } from '@dos/module-sdk';

// ── Zod schemas ──────────────────────────────────────────────────
const reportIncidentSchema = z.object({
  title:            z.string().min(3).max(255),
  description:      z.string().optional(),
  incidentType:     z.string().min(1).max(100),
  severity:         z.enum(['low', 'medium', 'high', 'critical']),
  affectedSystems:  z.array(z.string()).optional(),
  detectedAt:       z.string().datetime({ offset: true }).optional(),
  isBreachSuspected: z.boolean().optional(),
});

const triageSchema = z.object({
  assignedTo:   z.string().uuid(),
  triageNotes:  z.string().optional(),
});

const closeSchema = z.object({
  rootCause:       z.string().optional(),
  lessonsLearned:  z.string().optional(),
});

const capaSchema = z.object({
  actionType:   z.enum(['corrective', 'preventive']),
  title:        z.string().min(3).max(255),
  description:  z.string().optional(),
  assignedTo:   z.string().uuid().optional(),
  dueDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const timelineSchema = z.object({
  eventType:   z.string().min(1).max(100),
  description: z.string().min(1),
});

const listQuery = z.object({
  status:   z.enum(['new','triaged','investigating','contained','remediated','closed','post_incident']).optional(),
  severity: z.enum(['low','medium','high','critical']).optional(),
  limit:    z.coerce.number().int().min(1).max(200).optional(),
  offset:   z.coerce.number().int().min(0).optional(),
});

const idParam = z.object({ id: z.string().uuid() });

// ── Router ───────────────────────────────────────────────────────
const router = Router();
router.use(moduleStack('incident'));
router.use(auditMiddleware('incident'));

/** POST /api/incident/triage — report new incident */
router.post(
  '/',
  authenticate,
  requirePermission('incident.reports.create'),
  validate({ body: reportIncidentSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const actor = (req as any).user;
    const tenantId: string = (req as any).tenantId;
    const id = await IncidentTriageService.reportIncident({
      tenantId,
      ...req.body,
      reportedBy: actor.id,
    });
    setAuditData(res, { action: 'incident.reported', entityType: 'incident', entityId: id });
    return res.status(201).json(ok({ id }));
  }),
);

/** GET /api/incident/triage — list with filters */
router.get(
  '/',
  authenticate,
  requirePermission('incident.reports.read'),
  validate({ query: listQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const result = await IncidentTriageService.listIncidents(tenantId, req.query as any);
    return res.json(paginated(result.data, result.total, req.query as any));
  }),
);

/** POST /api/incident/triage/:id/triage — assign + triage */
router.post(
  '/:id/triage',
  authenticate,
  requirePermission('incident.triage.create'),
  validate({ params: idParam, body: triageSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    await IncidentTriageService.triageIncident(
      req.params.id, tenantId, req.body.assignedTo, req.body.triageNotes,
    );
    setAuditData(res, { action: 'incident.triaged', entityType: 'incident', entityId: req.params.id });
    return res.json(ok({ message: 'Incident triaged' }));
  }),
);

/** POST /api/incident/triage/:id/investigate */
router.post(
  '/:id/investigate',
  authenticate,
  requirePermission('incident.investigation.create'),
  validate({ params: idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const actor = (req as any).user;
    await IncidentTriageService.escalateToInvestigation(req.params.id, tenantId, actor.id);
    setAuditData(res, { action: 'incident.investigation_started', entityType: 'incident', entityId: req.params.id });
    return res.json(ok({ message: 'Investigation started' }));
  }),
);

/** POST /api/incident/triage/:id/contain */
router.post(
  '/:id/contain',
  authenticate,
  requirePermission('incident.containment.create'),
  validate({ params: idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const actor = (req as any).user;
    await IncidentTriageService.containIncident(req.params.id, tenantId, actor.id, req.body?.notes);
    setAuditData(res, { action: 'incident.contained', entityType: 'incident', entityId: req.params.id });
    return res.json(ok({ message: 'Incident contained' }));
  }),
);

/** POST /api/incident/triage/:id/close */
router.post(
  '/:id/close',
  authenticate,
  requirePermission('incident.closure.create'),
  validate({ params: idParam, body: closeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const actor = (req as any).user;
    await IncidentTriageService.closeIncident(
      req.params.id, tenantId, actor.id, req.body.rootCause, req.body.lessonsLearned,
    );
    setAuditData(res, { action: 'incident.closed', entityType: 'incident', entityId: req.params.id });
    return res.json(ok({ message: 'Incident closed' }));
  }),
);

/** POST /api/incident/triage/:id/capa — add CAPA */
router.post(
  '/:id/capa',
  authenticate,
  requirePermission('incident.capa.create'),
  validate({ params: idParam, body: capaSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const actor = (req as any).user;
    const capaId = await IncidentTriageService.addCapa(req.params.id, tenantId, {
      ...req.body, createdBy: actor.id,
    });
    setAuditData(res, { action: 'incident.capa_added', entityType: 'incident', entityId: req.params.id });
    return res.status(201).json(ok({ id: capaId }));
  }),
);

/** POST /api/incident/triage/:id/timeline — add timeline entry */
router.post(
  '/:id/timeline',
  authenticate,
  requirePermission('incident.timeline.create'),
  validate({ params: idParam, body: timelineSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const actor = (req as any).user;
    await IncidentTriageService.addTimelineEntry(
      req.params.id, tenantId, req.body.eventType, req.body.description, actor.id,
    );
    return res.json(ok({ message: 'Timeline entry added' }));
  }),
);

export default router;
