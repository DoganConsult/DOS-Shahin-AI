import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  milestonesPhase1, commits5, gitStatus, ciGuards, services9, cli29,
  controlledDdl, doctrine, ppd, compensationOrchestrator, autoEvaluator,
  controlledWriteEnforcement, rolloutLedger, negativeProof, evidencePack,
  authWhoami, authEmailLogin,
} from '../lib/dos-master-evidence.js';
import { PLATFORM_ADMIN_SPA_HTML } from '../lib/platform-admin-spa.js';

export const dosMasterEvidenceRouter = Router();

// Carbon-styled SPA shell. Hash-based routing inside the page handles all
// /platform-admin/dos-master/* sub-routes. Auth via Bearer-from-localStorage
// (DB-backed platform_admin_session token).
dosMasterEvidenceRouter.get('/platform-admin', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(PLATFORM_ADMIN_SPA_HTML);
});
dosMasterEvidenceRouter.get(/^\/platform-admin\/.*$/, (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(PLATFORM_ADMIN_SPA_HTML);
});

function readToken(req: Request): string | null {
  const h = req.header('authorization') ?? '';
  if (h.toLowerCase().startsWith('bearer ')) return h.slice(7).trim();
  const c = req.header('x-dos-admin-token');
  return c ? String(c) : null;
}

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = readToken(req);
  if (!token) { res.status(401).json({ error: 'token_required' }); return; }
  const who = await authWhoami(token);
  if (!who) { res.status(401).json({ error: 'invalid_or_expired_token' }); return; }
  (req as Request & { admin?: unknown }).admin = who;
  next();
}

dosMasterEvidenceRouter.post('/auth/email-login', async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? '').toLowerCase().trim();
  if (!email) { res.status(400).json({ error: 'email_required' }); return; }
  const out = await authEmailLogin(email);
  if (!out) { res.status(404).json({ error: 'no_active_session_for_email' }); return; }
  res.json({ ok: true, ...out });
});

dosMasterEvidenceRouter.get('/auth/whoami', requireAdmin, (req: Request, res: Response) => {
  res.json((req as Request & { admin: unknown }).admin);
});

dosMasterEvidenceRouter.get('/dos-master/milestones', requireAdmin, async (_req, res) => {
  res.json({ milestones: await milestonesPhase1(), commits: await commits5(), git: await gitStatus() });
});

dosMasterEvidenceRouter.get('/dos-master/ci-guards', requireAdmin, async (_req, res) => {
  res.json(await ciGuards());
});

dosMasterEvidenceRouter.get('/dos-master/services', requireAdmin, async (_req, res) => {
  res.json({ services: await services9() });
});

dosMasterEvidenceRouter.get('/dos-master/cli', requireAdmin, async (_req, res) => {
  res.json(await cli29());
});

dosMasterEvidenceRouter.get('/dos-master/controlled-ddl', requireAdmin, async (_req, res) => {
  res.json(await controlledDdl());
});

dosMasterEvidenceRouter.get('/dos-master/doctrine', requireAdmin, async (_req, res) => {
  res.json(await doctrine());
});

dosMasterEvidenceRouter.get('/dos-master/ppd', requireAdmin, async (_req, res) => {
  res.json(await ppd());
});

dosMasterEvidenceRouter.get('/dos-master/compensation', requireAdmin, async (_req, res) => {
  res.json(await compensationOrchestrator());
});

dosMasterEvidenceRouter.get('/dos-master/auto-evaluator', requireAdmin, async (_req, res) => {
  res.json(await autoEvaluator());
});

dosMasterEvidenceRouter.get('/dos-master/controlled-write', requireAdmin, async (_req, res) => {
  res.json(await controlledWriteEnforcement());
});

dosMasterEvidenceRouter.get('/dos-master/rollout-ledger', requireAdmin, async (_req, res) => {
  res.json({ ledger: await rolloutLedger() });
});

dosMasterEvidenceRouter.get('/dos-master/negative-proof', requireAdmin, async (_req, res) => {
  res.json(await negativeProof());
});

dosMasterEvidenceRouter.get('/dos-master/evidence-pack', requireAdmin, async (_req, res) => {
  const pack = await evidencePack();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="dos-master-phase-1-evidence-${new Date().toISOString().slice(0,10)}.json"`);
  res.send(JSON.stringify(pack, null, 2));
});

dosMasterEvidenceRouter.get('/dos-master/phase-1', requireAdmin, async (_req, res) => {
  res.json(await evidencePack());
});
