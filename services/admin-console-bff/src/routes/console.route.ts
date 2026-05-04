import { Router, type Request, type Response } from 'express';
import {
  ensureUser, listUsers, ensureRole, listRoles,
  grantRole, listGrants, consoleBootstrap, pillarComposition,
} from '../lib/console-repo.js';
import {
  UserEnsureSchema, RoleEnsureSchema, GrantSchema, BootstrapQuerySchema,
} from '../schemas/console.schemas.js';

export const consoleRouter = Router();

consoleRouter.get('/console-bootstrap', async (req: Request, res: Response) => {
  const parse = BootstrapQuerySchema.safeParse({ email: req.query.email });
  if (!parse.success) { res.status(400).json({ error: 'validation', issues: parse.error.issues }); return; }
  try {
    res.json(await consoleBootstrap(parse.data.email));
  } catch (e) {
    const msg = (e as Error).message;
    res.status(msg === 'platform_admin_user_not_found' ? 404 : 500).json({ error: msg });
  }
});

consoleRouter.get('/users', async (_req, res) => {
  try { res.json({ users: await listUsers() }); }
  catch (e) { res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) }); }
});

consoleRouter.post('/users', async (req: Request, res: Response) => {
  const parse = UserEnsureSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: 'validation', issues: parse.error.issues }); return; }
  try {
    const u = await ensureUser(parse.data.email, parse.data.display_name);
    res.status(201).json({ user: u });
  } catch (e) {
    res.status(500).json({ error: 'user_failed', detail: String((e as Error).message) });
  }
});

consoleRouter.get('/roles', async (req, res) => {
  try {
    const pillar = typeof req.query.pillar === 'string' ? req.query.pillar : undefined;
    res.json({ roles: await listRoles(pillar) });
  } catch (e) {
    res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) });
  }
});

consoleRouter.post('/roles', async (req: Request, res: Response) => {
  const parse = RoleEnsureSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: 'validation', issues: parse.error.issues }); return; }
  try {
    await ensureRole(parse.data.role_code, parse.data.display_name, parse.data.pillar, parse.data.description);
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'role_failed', detail: String((e as Error).message) });
  }
});

consoleRouter.post('/grants', async (req: Request, res: Response) => {
  const parse = GrantSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: 'validation', issues: parse.error.issues }); return; }
  try {
    await grantRole(parse.data.user_id, parse.data.role_code, parse.data.granted_by);
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'grant_failed', detail: String((e as Error).message) });
  }
});

consoleRouter.get('/pillars/:pillar_code/composition', async (req, res) => {
  const allowed = new Set(['DNOC', 'DSOC', 'DOS', 'DAuth']);
  const code = req.params.pillar_code;
  if (!allowed.has(code)) { res.status(400).json({ error: 'unknown_pillar' }); return; }
  try { res.json({ pillar: code, pages: await pillarComposition(code) }); }
  catch (e) { res.status(500).json({ error: 'compose_failed', detail: String((e as Error).message) }); }
});

consoleRouter.get('/grants/:user_id', async (req, res) => {
  try { res.json({ grants: await listGrants(req.params.user_id) }); }
  catch (e) { res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) }); }
});
