import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// AGRC-OS -- Saudi Regulatory Score Routes
// Saudi multi-framework compliance scoring
// and bilingual Arabic policy generation
// ============================================
import { authenticate, requirePermission } from '../../../ports/auth.port';

import { auditMiddleware, setAuditData, automationMiddleware, asyncHandler, validate, moduleStack, mutationEventHook } from '../../../ports/middleware.port';
import {
  computeSaudiRegulatoryScore,
  generateArabicPolicyDraft,
} from '../../services/misc/saudi-regulatory-score.service';
import { generatePolicyDraftBody } from "../../../schemas/compliance.schemas";

// -- Zod schemas --
const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));
router.use(mutationEventHook('compliance'));
router.use(auditMiddleware('compliance'));
router.use(automationMiddleware('compliance'));

// GET /api/compliance/saudi-score -- Compute Saudi regulatory compliance score
router.get(
  '/saudi-score',
  authenticate,
  requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const score = await computeSaudiRegulatoryScore(tenantId);
    res.json(score);
  }),
);

// POST /api/compliance/generate-policy-draft -- Generate bilingual policy draft
router.post(
  '/generate-policy-draft',
  authenticate,
  requirePermission('policy.document.write'),
  validate({ body: generatePolicyDraftBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { control_code, framework_code, policy_type } = req.body;

    const draft = await generateArabicPolicyDraft(tenantId, {
      control_code,
      framework_code,
      policy_type,
    });

    setAuditData(res as any, {
      action: 'create',
      entityType: 'policy_draft',
      entityId: control_code,
      afterState: { control_code, framework_code, policy_type },
    });

    res.status(201).json(draft);
  }),
);

export default router;

