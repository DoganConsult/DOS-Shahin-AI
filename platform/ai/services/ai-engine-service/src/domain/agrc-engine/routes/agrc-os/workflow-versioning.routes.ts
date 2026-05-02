import { Request, Response, Router } from 'express';
// AGRC-OS — Workflow Graph Versioning routes
// Covers: version list, version diff


import { authenticate, requirePermission } from '../../ports/auth.port';
import { errMsg } from '../../../../i18n/error-messages';
import { validate } from "../ports/middleware.port";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();

// ════════════════════════════════════════════════════════════════
// Workflow Graph Versioning
// ════════════════════════════════════════════════════════════════

router.get('/workflow-versions/:runId', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  try {
    const { getGraphVersions } = await import('../../../workflow/services/templates/workflow-versioning.service');
    const versions = await getGraphVersions(req.tenantId, req.params.runId);
    res.json({ versions, count: versions.length });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

router.get('/workflow-versions/:runId/diff', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  try {
    const { diffGraphVersions } = await import('../../../workflow/services/templates/workflow-versioning.service');
    const { versionA, versionB } = req.query;
    if (!versionA || !versionB) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
    const diff = await diffGraphVersions(req.tenantId, versionA as string, versionB as string);
    res.json(diff);
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

export default router;
