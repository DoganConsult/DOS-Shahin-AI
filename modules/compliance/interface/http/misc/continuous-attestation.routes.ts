import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Continuous Attestation Routes
// API endpoints for continuous attestation engine:
// readiness scoring, draft generation, monitoring.
// Requirements: Feature 22 - Continuous Attestation Engine
// ============================================


import { authenticate, requirePermission } from '../../../ports/auth.port';
import { auditMiddleware, setAuditData, validate, automationMiddleware } from '../../../ports/middleware.port';
import {
  calculateFrameworkReadiness,
  calculateControlReadiness,
  generateAttestationDraft,
  runContinuousAttestationCheck,
} from '../../../compliance/services/misc/continuous-attestation.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createGenerateBody, createCheckBody } from '../../../schemas/compliance.schemas';
const router = Router();
router.use(auditMiddleware("compliance"));
router.use(automationMiddleware("compliance"));

// GET /frameworks/:id/readiness — calculate framework readiness score
router.get('/frameworks/:id/readiness', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const frameworkId = req.params.id;
      const readiness = await calculateFrameworkReadiness(tenantId, frameworkId);
      res.json({ data: readiness });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

// GET /controls/:id/readiness — calculate control readiness score
router.get('/controls/:id/readiness', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const controlId = req.params.id;
      const readiness = await calculateControlReadiness(tenantId, controlId);
      res.json({ data: readiness });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

// POST /drafts/generate — generate attestation draft for framework or control
router.post('/drafts/generate', authenticate, requirePermission('attestation.record.manage'),
  validate({ body: createGenerateBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { entityType, entityId } = req.body;
      
      if (!entityType || !entityId) {
        res.status(400).json({ error: 'entityType and entityId are required' });
        return;
      }
      
      if (entityType !== 'framework' && entityType !== 'control') {
        res.status(400).json({ error: 'entityType must be "framework" or "control"' });
        return;
      }
      
      const draft = await generateAttestationDraft(tenantId, entityType, entityId);
      setAuditData(res as any, {
        action: 'create',
        entityType: 'attestation_draft',
        entityId: draft.draftId,
        afterState: draft,
      });
      swallow(EC.EVENT_BUS, emitEvent(({
              tenantId,
              userId: req.user!.userId!,
              module: 'compliance',
              event: 'created',
              entityType: 'attestation_draft',
              entityId: draft.draftId,
            } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.attestation_draft.created' });
      res.status(201).json({ data: draft });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

// POST /check — manually trigger continuous attestation check
router.post('/check', authenticate, requirePermission('attestation.record.manage'),
  validate({ body: createCheckBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { frameworkIds, controlIds, minReadinessThreshold } = req.body;
      
      const result = await runContinuousAttestationCheck(tenantId, {
        frameworkIds,
        controlIds,
        minReadinessThreshold,
      });
      
      setAuditData(res as any, {
        action: 'execute',
        entityType: 'continuous_attestation_check',
        entityId: 'manual',
        afterState: result,
      });
      swallow(EC.EVENT_BUS, emitEvent(({
              tenantId,
              userId: req.user!.userId!,
              module: 'compliance',
              event: 'executed',
              entityType: 'continuous_attestation_check',
              entityId: 'manual',
            } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.continuous_attestation_check.executed' });
      res.json({ data: result });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

export default router;

