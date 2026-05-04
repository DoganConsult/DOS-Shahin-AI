import { Router, type Request, type Response } from 'express';
import {
  composerBootstrap, tenantMembers, tenantEntitlements,
  tenantSoDRules, upsertMember,
} from '../lib/tenant-admin-repo.js';
import { TenantQuerySchema, MemberUpsertSchema } from '../schemas/tenant-admin.schemas.js';

export const tenantAdminRouter = Router();

tenantAdminRouter.get('/composer-bootstrap', async (req: Request, res: Response) => {
  const parse = TenantQuerySchema.safeParse({ tenant_id: req.query.tenant_id });
  if (!parse.success) { res.status(400).json({ error: 'validation', issues: parse.error.issues }); return; }
  try { res.json(await composerBootstrap(parse.data.tenant_id)); }
  catch (e) {
    const msg = (e as Error).message;
    res.status(msg === 'tenant_not_found' ? 404 : 500).json({ error: msg });
  }
});

tenantAdminRouter.get('/members', async (req, res) => {
  const id = String(req.query.tenant_id || '');
  if (!id) { res.status(400).json({ error: 'tenant_id_required' }); return; }
  try { res.json({ members: await tenantMembers(id) }); }
  catch (e) { res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) }); }
});

tenantAdminRouter.post('/members', async (req: Request, res: Response) => {
  const parse = MemberUpsertSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: 'validation', issues: parse.error.issues }); return; }
  try {
    await upsertMember(parse.data.tenant_id, parse.data.user_id, parse.data.role_code, parse.data.is_tenant_owner ?? false);
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'upsert_failed', detail: String((e as Error).message) });
  }
});

tenantAdminRouter.get('/entitlements', async (req, res) => {
  const id = String(req.query.tenant_id || '');
  if (!id) { res.status(400).json({ error: 'tenant_id_required' }); return; }
  try { res.json({ entitlements: await tenantEntitlements(id) }); }
  catch (e) { res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) }); }
});

tenantAdminRouter.get('/sod', async (req, res) => {
  const id = String(req.query.tenant_id || '');
  try { res.json({ rules: await tenantSoDRules(id) }); }
  catch (e) { res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) }); }
});
