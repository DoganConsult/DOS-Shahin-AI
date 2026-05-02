import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
const genericPayloadSchema = z.record(z.unknown());
/**
 * Autonomous Remediation API — Pillar 7c
 * POST /api/remediation/run — trigger a remediation cycle for the current tenant.
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { runRemediationCycle } from '../services/autonomous-remediation.service';
import { validate, auditMiddleware } from '../ports/middleware.port';

import { createRunBody } from '../schemas/remediation.schemas';

const router = Router();
router.use(auditMiddleware('remediation'));

router.post('/run', authenticate, requirePermission('remediation.task.execute'), validate({ body: createRunBody }), async (req: Request, res: Response) => {
  try {
    const result = await runRemediationCycle(req.tenantId!);
    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: (e instanceof Error ? e.message : String(e)) });
  }
});

export default router;

