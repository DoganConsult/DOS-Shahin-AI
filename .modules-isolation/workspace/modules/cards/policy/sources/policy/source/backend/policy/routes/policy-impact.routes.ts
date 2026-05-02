import { Request, Response, Router } from 'express';
import { z } from "zod";
import { catchHandler, EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Policy Impact Simulator Routes
// API endpoints for policy impact simulation:
// trace entity relationships, generate impact reports.
// Requirements: Feature 23 - Policy Impact Simulation
// ============================================


import { authenticate, requirePermission } from '../ports/auth.port';
import {
  simulatePolicyImpact,
  simulateBatchPolicyImpact,
} from '../services/policy/policy-impact-simulator.service';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../ports/middleware.port';
import { createSimulateBody, createSimulateBatchBody } from "../schemas/policy.schemas";

const router = Router();
router.use(moduleStack('policy'));
router.use(auditMiddleware("governance"));
router.use(automationMiddleware("governance"));

// POST /simulate — simulate policy impact
router.post('/simulate', authenticate, requirePermission('policy.document.read'), validate({ body: createSimulateBody }),
  async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { policyId, simulationType, maxDepth, includeIndirect } = req.body;

    if (!policyId || !simulationType) {
      res.status(400).json({ error: 'policyId and simulationType are required' });
      return;
    }

    if (!['create', 'update', 'retire', 'approve'].includes(simulationType)) {
      res.status(400).json({ error: 'simulationType must be one of: create, update, retire, approve' });
      return;
    }

    const report = await simulatePolicyImpact(tenantId, policyId, simulationType, {
      maxDepth: maxDepth ?? 3,
      includeIndirect: includeIndirect ?? true,
    });

    setAuditData(res as any, {
      action: 'simulate',
      entityType: 'policy_impact_report',
      entityId: report.reportId,
      afterState: report,
    });
    emitEvent(({
          tenantId,
          userId: req.user!.userId!,
          module: 'governance',
          event: 'simulated',
          entityType: 'policy_impact_report',
          entityId: report.reportId,
        } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json({ data: report });
  }
);

// POST /simulate/batch — simulate impact for multiple policies
router.post('/simulate/batch', authenticate, requirePermission('policy.document.read'), validate({ body: createSimulateBatchBody }),
  async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { policyIds, simulationType, maxDepth } = req.body;

    if (!policyIds || !Array.isArray(policyIds) || policyIds.length === 0) {
      res.status(400).json({ error: 'policyIds must be a non-empty array' });
      return;
    }

    if (!simulationType || !['create', 'update', 'retire', 'approve'].includes(simulationType)) {
      res.status(400).json({ error: 'simulationType must be one of: create, update, retire, approve' });
      return;
    }

    const reports = await simulateBatchPolicyImpact(tenantId, policyIds, simulationType, {
      maxDepth: maxDepth ?? 3,
    });

    setAuditData(res as any, {
      action: 'simulate_batch',
      entityType: 'policy_impact_report',
      entityId: 'batch',
      afterState: { count: reports.length },
    });
    emitEvent(({
          tenantId,
          userId: req.user!.userId!,
          module: 'governance',
          event: 'simulated_batch',
          entityType: 'policy_impact_report',
          entityId: 'batch',
        } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json({ data: reports });
  }
);

export default router;

