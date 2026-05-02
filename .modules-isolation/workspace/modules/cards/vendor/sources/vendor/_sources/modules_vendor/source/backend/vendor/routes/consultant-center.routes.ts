import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Platform — Consultant Command Center Routes
// 8 endpoints for multi-client management,
// scoped to consultant_admin via Scoped JWT.
//
// GET    /clients
// GET    /clients/:id/context
// GET    /portfolio/health
// GET    /clients/:id/findings
// POST   /clients/:id/findings
// GET    /benchmarks
// GET    /engagement-timeline
// GET    /portfolio/report
//
// Requirements: 8.1, 21.1
// ============================================
import { validate, auditMiddleware, setAuditData, automationMiddleware } from '../ports/middleware.port';
import {
  getClients,
  getClientContext,
  getPortfolioHealth,
  getClientFindings,
  publishFinding,
  getBenchmarks,
  getEngagementTimeline,
  getPortfolioReport,
} from '../../vendor/services/misc/consultant-center.service';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { swallow, EC } from '@dos/platform-core/resilience';
import { publishFindingBody } from "../schemas/vendor.schemas";
import { externalAuthGuard, authenticate } from '../ports/auth.port';

// --- Zod Schemas ---
const router = Router();
router.use(authenticate);
router.use(auditMiddleware("governance"));
router.use(automationMiddleware("governance"));

// All routes require consultant_admin role
const auth = externalAuthGuard(['consultant_admin']);

// ── GET /clients ───────────────────────────────────────────────────────────

router.get('/clients', validate({ query: z.record(z.unknown()) }), auth, async (req: Request, res: Response) => {
  try {
    const scope = req.externalScope as unknown as Record<string, string>;
    const clients = await getClients(scope.sub);
    res.json({ clients, count: clients.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// ── GET /clients/:id/context ───────────────────────────────────────────────

router.get('/clients/:id/context', validate({ query: z.record(z.unknown()) }), auth, async (req: Request, res: Response) => {
  try {
    const scope = req.externalScope as unknown as Record<string, string>;
    const { id } = req.params;
    const result = await getClientContext(scope.sub, id);
    res.json(result);
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Access denied') {
      res.status(403).json({ error: toErrorMessage(err) });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

// ── GET /portfolio/health ──────────────────────────────────────────────────

router.get('/portfolio/health', validate({ query: z.record(z.unknown()) }), auth, async (req: Request, res: Response) => {
  try {
    const scope = req.externalScope as unknown as Record<string, string>;
    const health = await getPortfolioHealth(scope.sub);
    res.json(health);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// ── GET /clients/:id/findings ──────────────────────────────────────────────

router.get('/clients/:id/findings', validate({ query: z.record(z.unknown()) }), auth, async (req: Request, res: Response) => {
  try {
    const scope = req.externalScope as unknown as Record<string, string>;
    const { id } = req.params;
    const findings = await getClientFindings(scope.sub, id);
    res.json({ findings, count: findings.length });
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Access denied') {
      res.status(403).json({ error: toErrorMessage(err) });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

// ── POST /clients/:id/findings ─────────────────────────────────────────────

router.post('/clients/:id/findings', auth, validate({ body: publishFindingBody }), async (req: Request, res: Response) => {
  try {
    const scope = req.externalScope as unknown as Record<string, string>;
    const { id } = req.params;
    const { title, description, severity, frameworkRef, recommendation } = req.body;

    if (!title || !description || !severity || !recommendation) {
      res.status(400).json({ error: 'title, description, severity, and recommendation are required' });
      return;
    }

    const finding = await publishFinding(scope.sub, id, {
      title,
      description,
      severity,
      frameworkRef,
      recommendation,
    });
    setAuditData(res as any, { action: "create", entityType: "consultant", entityId: finding.findingId || id, afterState: finding });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'consultant_center', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.consultant_center.created' });
    res.status(201).json(finding);
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Access denied') {
      res.status(403).json({ error: toErrorMessage(err) });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

// ── GET /benchmarks ────────────────────────────────────────────────────────

router.get('/benchmarks', validate({ query: z.record(z.unknown()) }), auth, async (req: Request, res: Response) => {
  try {
    const scope = req.externalScope as unknown as Record<string, string>;
    const benchmarks = await getBenchmarks(scope.sub);
    res.json({ benchmarks, count: benchmarks.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// ── GET /engagement-timeline ───────────────────────────────────────────────

router.get('/engagement-timeline', validate({ query: z.record(z.unknown()) }), auth, async (req: Request, res: Response) => {
  try {
    const scope = req.externalScope as unknown as Record<string, string>;
    const events = await getEngagementTimeline(scope.sub);
    res.json({ events, count: events.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// ── GET /portfolio/report ──────────────────────────────────────────────────

router.get('/portfolio/report', validate({ query: z.record(z.unknown()) }), auth, async (req: Request, res: Response) => {
  try {
    const scope = req.externalScope as unknown as Record<string, string>;
    const pdfBuffer = await getPortfolioReport(scope.sub);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="portfolio-report.pdf"');
    res.send(pdfBuffer);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;

