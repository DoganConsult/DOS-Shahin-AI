import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Platform — Regulator Portal Routes
// 8 read endpoints + 1 POST inquiry + 1 POST response
// scoped to regulator_inspector via Scoped JWT.
//
// GET    /organizations
// GET    /organizations/:id/compliance
// GET    /organizations/:id/evidence
// GET    /organizations/:id/evidence/:evidenceId
// POST   /organizations/:id/inquiries
// GET    /organizations/:id/inquiries
// GET    /organizations/:id/audit-trail
// GET    /organizations/:id/frameworks
// POST   /organizations/:id/response
//
// Requirements: 6.1, 6.5, 21.1
// ============================================
import { auditMiddleware, setAuditData as _setAuditData, validate } from '../../../ports/middleware.port';

import {
  getAssignedOrganizations,
  getOrganizationCompliance,
  getOrganizationEvidence,
  getEvidenceById,
  submitInquiry,
  getInquiries,
  getAuditTrail,
  getFrameworks,
  writeRegulatorResponse,
} from '../../../infrastructure/integrations/vendor/services/misc/regulator-portal.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { swallow, EC } from '@dos/platform-core/resilience';
import { organizationsIdInquiriesPostBody, organizationsIdResponsePostBody } from "../../../schemas/compliance.schemas";
import { externalAuthGuard, authenticate } from '../../../ports/auth.port';
import { requirePermission } from "@dos/module-auth";

// ── Zod Schemas ──────────────────────────────────────────────────────────
const router = Router();
router.use(authenticate);
router.use(auditMiddleware('compliance'));

// All routes require regulator_inspector role
const auth = externalAuthGuard(['regulator_inspector']);

// ── GET /organizations ─────────────────────────────────────────────────────

router.get('/organizations', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'), auth, async (req: Request, res: Response) => {
  try {
    const scope = req.externalScope as unknown as Record<string, string>;
    const orgs = await getAssignedOrganizations(scope.sub);
    res.json({ organizations: orgs, count: orgs.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// ── GET /organizations/:id/compliance ──────────────────────────────────────

router.get('/organizations/:id/compliance', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'), auth, async (req: Request, res: Response) => {
  try {
    const scope = req.externalScope as unknown as Record<string, string>;
    const { id } = req.params;
    const data = await getOrganizationCompliance(id, scope.sub);
    res.json(data);
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Access denied') {
      res.status(403).json({ error: toErrorMessage(err) });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

// ── GET /organizations/:id/evidence ────────────────────────────────────────

router.get('/organizations/:id/evidence', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'), auth, async (req: Request, res: Response) => {
  try {
    const scope = req.externalScope as unknown as Record<string, string>;
    const { id } = req.params;
    const evidence = await getOrganizationEvidence(id, scope.sub, req.query);
    res.json({ evidence, count: evidence.length });
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Access denied') {
      res.status(403).json({ error: toErrorMessage(err) });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

// ── GET /organizations/:id/evidence/:evidenceId ────────────────────────────

router.get('/organizations/:id/evidence/:evidenceId', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'), auth, async (req: Request, res: Response) => {
  try {
    const scope = req.externalScope as unknown as Record<string, string>;
    const { id, evidenceId } = req.params;
    const item = await getEvidenceById(id, scope.sub, evidenceId);
    res.json(item);
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Access denied') {
      res.status(403).json({ error: toErrorMessage(err) });
    } else if (toErrorMessage(err) === 'Evidence not found') {
      res.status(404).json({ error: toErrorMessage(err) });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

// ── POST /organizations/:id/inquiries ──────────────────────────────────────

router.post('/organizations/:id/inquiries', authenticate, requirePermission('compliance.program.manage'), auth, validate({ body: organizationsIdInquiriesPostBody }), async (req: Request, res: Response) => {
  try {
    const scope = req.externalScope as unknown as Record<string, string>;
    const { id } = req.params;
    const { requestType, subject, body } = req.body;

    if (!requestType || !subject || !body) {
      res.status(400).json({ error: 'requestType, subject, and body are required' });
      return;
    }

    const inquiry = await submitInquiry(id, scope.sub, { requestType, subject, body });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'regulator_portal', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.regulator_portal.created' });
    res.status(201).json(inquiry);
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Access denied') {
      res.status(403).json({ error: toErrorMessage(err) });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

// ── GET /organizations/:id/inquiries ───────────────────────────────────────

router.get('/organizations/:id/inquiries', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'), auth, async (req: Request, res: Response) => {
  try {
    const scope = req.externalScope as unknown as Record<string, string>;
    const { id } = req.params;
    const inquiries = await getInquiries(id, scope.sub);
    res.json({ inquiries, count: inquiries.length });
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Access denied') {
      res.status(403).json({ error: toErrorMessage(err) });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

// ── GET /organizations/:id/audit-trail ─────────────────────────────────────

router.get('/organizations/:id/audit-trail', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'), auth, async (req: Request, res: Response) => {
  try {
    const scope = req.externalScope as unknown as Record<string, string>;
    const { id } = req.params;
    const trail = await getAuditTrail(id, scope.sub);
    res.json({ auditTrail: trail, count: trail.length });
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Access denied') {
      res.status(403).json({ error: toErrorMessage(err) });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

// ── GET /organizations/:id/frameworks ──────────────────────────────────────

router.get('/organizations/:id/frameworks', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'), auth, async (req: Request, res: Response) => {
  try {
    const scope = req.externalScope as unknown as Record<string, string>;
    const { id } = req.params;
    const frameworks = await getFrameworks(id, scope.sub);
    res.json({ frameworks, count: frameworks.length });
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Access denied') {
      res.status(403).json({ error: toErrorMessage(err) });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

// ── POST /organizations/:id/response ───────────────────────────────────────

router.post('/organizations/:id/response', authenticate, requirePermission('compliance.program.manage'), auth, validate({ body: organizationsIdResponsePostBody }), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { requestId, context } = req.body;

    if (!requestId) {
      res.status(400).json({ error: 'requestId is required' });
      return;
    }

    const result = await writeRegulatorResponse(id, requestId, context || {});
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'regulator_portal', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.regulator_portal.created' });
    res.json(result);
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Request not found') {
      res.status(404).json({ error: toErrorMessage(err) });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

export default router;

