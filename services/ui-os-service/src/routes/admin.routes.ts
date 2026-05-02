import { Router, type Request, type Response } from 'express';
import type { DbPool } from '../db.js';
import { UiOsAdminManager, type DraftCreate, type DraftPatch } from '../managers/ui-os-admin.manager.js';
import { DraftCreateSchema, DraftPatchSchema, RollbackSchema } from '../schemas/admin.schemas.js';
import { requireFga } from '../middleware/openfga.js';

interface Context { tenantId: string; userId: string }

function context(req: Request, res: Response): Context | null {
  const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId) as string | undefined;
  const userId = (req.header('x-dos-user-id') ?? req.query.userId) as string | undefined;
  if (!tenantId || !userId) {
    res.status(400).json({ error: 'missing_identity' });
    return null;
  }
  return { tenantId, userId };
}

const UUID = /^[0-9a-fA-F-]{36}$/;

export function createAdminRouter(pool: DbPool): Router {
  const router = Router();
  const admin = new UiOsAdminManager(pool);

  // Wave 10b — OpenFGA gate for admin governance surface. Requires
  // (user:<sub>, ui_admin, ui_os_tenant:<tenantId>) in the FGA store.
  // Disabled gracefully when OPENFGA_API_URL is unset (boot warning).
  router.use('/admin', requireFga({
    build: (req) => {
      const p = req.principal;
      if (!p?.sub || !p?.tenantId) return null;
      return { user: `user:${p.sub}`, relation: 'ui_admin', object: `ui_os_tenant:${p.tenantId}` };
    },
  }));

  router.get('/admin/drafts', async (req, res) => {
    const ctx = context(req, res); if (!ctx) return;
    try { res.json({ drafts: await admin.listDrafts(ctx.tenantId, (req.query.targetType as string | undefined) ?? null) }); }
    catch (e) { res.status(500).json({ error: 'drafts_list_failed', message: (e as Error).message }); }
  });

  router.post('/admin/drafts', async (req, res) => {
    const ctx = context(req, res); if (!ctx) return;
    const parsed = DraftCreateSchema.safeParse(req.body ?? {});
    if (!parsed.success) { res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() }); return; }
    try { res.status(201).json(await admin.createDraft(ctx.tenantId, ctx.userId, parsed.data as unknown as DraftCreate)); }
    catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('duplicate key')) { res.status(409).json({ error: 'draft_exists' }); return; }
      res.status(500).json({ error: 'draft_create_failed', message: msg });
    }
  });

  router.put('/admin/drafts/:draftId', async (req, res) => {
    const ctx = context(req, res); if (!ctx) return;
    if (!UUID.test(req.params.draftId)) { res.status(400).json({ error: 'invalid_draft_id' }); return; }
    const parsed = DraftPatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) { res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() }); return; }
    try {
      const r = await admin.updateDraft(ctx.tenantId, req.params.draftId, parsed.data as unknown as DraftPatch);
      if (!r) { res.status(404).json({ error: 'draft_not_found' }); return; }
      res.json(r);
    } catch (e) { res.status(500).json({ error: 'draft_update_failed', message: (e as Error).message }); }
  });

  router.post('/admin/drafts/:draftId/validate', async (req, res) => {
    const ctx = context(req, res); if (!ctx) return;
    if (!UUID.test(req.params.draftId)) { res.status(400).json({ error: 'invalid_draft_id' }); return; }
    try {
      const r = await admin.validateDraft(ctx.tenantId, req.params.draftId);
      if (!r) { res.status(404).json({ error: 'draft_not_found' }); return; }
      res.json(r);
    } catch (e) { res.status(500).json({ error: 'draft_validate_failed', message: (e as Error).message }); }
  });

  router.post('/admin/drafts/:draftId/submit', async (req, res) => {
    const ctx = context(req, res); if (!ctx) return;
    if (!UUID.test(req.params.draftId)) { res.status(400).json({ error: 'invalid_draft_id' }); return; }
    try {
      const r = await admin.submitDraft(ctx.tenantId, ctx.userId, req.params.draftId);
      if (!r) { res.status(404).json({ error: 'draft_not_submittable' }); return; }
      res.json(r);
    } catch (e) { res.status(500).json({ error: 'draft_submit_failed', message: (e as Error).message }); }
  });

  router.post('/admin/publish/:draftId', async (req, res) => {
    const ctx = context(req, res); if (!ctx) return;
    if (!UUID.test(req.params.draftId)) { res.status(400).json({ error: 'invalid_draft_id' }); return; }
    try {
      const r = await admin.publish(ctx.tenantId, ctx.userId, req.params.draftId);
      if (!r) { res.status(404).json({ error: 'draft_not_found' }); return; }
      res.json(r);
    } catch (e) { res.status(500).json({ error: 'draft_publish_failed', message: (e as Error).message }); }
  });

  router.post('/admin/rollback/:versionId', async (req, res) => {
    const ctx = context(req, res); if (!ctx) return;
    if (!UUID.test(req.params.versionId)) { res.status(400).json({ error: 'invalid_version_id' }); return; }
    const parsed = RollbackSchema.safeParse(req.body ?? {});
    if (!parsed.success) { res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() }); return; }
    try {
      const r = await admin.rollback(ctx.tenantId, ctx.userId, req.params.versionId, parsed.data.reason);
      if (!r) { res.status(404).json({ error: 'version_not_found' }); return; }
      res.json(r);
    } catch (e) { res.status(500).json({ error: 'rollback_failed', message: (e as Error).message }); }
  });

  return router;
}
