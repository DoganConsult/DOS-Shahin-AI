import { Router, type Request, type Response } from 'express';
import type { DbPool } from '../db.js';
import { UiOsI18nExtManager } from '../managers/ui-os-i18n-ext.manager.js';
import {
  NamespaceSchema, VersionSchema, SetCurrentVersionSchema,
  OverrideSchema, LocalePreferencesSchema, RtlValidationSchema,
} from '../schemas/i18n-ext.schemas.js';
import { requireFga } from '../middleware/openfga.js';

const UUID = /^[0-9a-fA-F-]{36}$/;
function ctx(req: Request, res: Response) {
  const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId) as string | undefined;
  const userId = (req.header('x-dos-user-id') ?? req.query.userId) as string | undefined;
  if (!tenantId || !userId) { res.status(400).json({ error: 'missing_identity' }); return null; }
  return { tenantId, userId };
}
function fail(res: Response, code: string, e: unknown) {
  const m = (e as Error).message;
  if (m.includes('duplicate key')) { res.status(409).json({ error: 'conflict' }); return; }
  if (m.includes('violates foreign key')) { res.status(400).json({ error: 'fk_violation', message: m }); return; }
  res.status(500).json({ error: code, message: m });
}

export function createI18nExtRouter(pool: DbPool): Router {
  const router = Router();
  const m = new UiOsI18nExtManager(pool);
  const fgaViewer = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
    ? { user: `user:${req.principal.sub}`, relation: 'viewer', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
  const fgaEditor = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
    ? { user: `user:${req.principal.sub}`, relation: 'editor', object: `ui_os_tenant:${req.principal.tenantId}` } : null });

  // Namespaces
  router.get('/i18n/namespaces', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ namespaces: await m.listNamespaces(c.tenantId) }); } catch (e) { fail(res, 'namespaces_list_failed', e); }
  });
  router.put('/i18n/namespaces', fgaEditor, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = NamespaceSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertNamespace(c.tenantId, p.data)); } catch (e) { fail(res, 'namespace_upsert_failed', e); }
  });
  router.delete('/i18n/namespaces/:namespaceId', fgaEditor, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.namespaceId)) { res.status(400).json({ error: 'invalid_namespace_id' }); return; }
    try {
      const ok = await m.deleteNamespace(c.tenantId, req.params.namespaceId);
      if (!ok) { res.status(404).json({ error: 'namespace_not_found' }); return; }
      res.status(204).send();
    } catch (e) { fail(res, 'namespace_delete_failed', e); }
  });

  // Versions
  router.get('/i18n/namespaces/:namespaceId/versions', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.namespaceId)) { res.status(400).json({ error: 'invalid_namespace_id' }); return; }
    try { res.json({ versions: await m.listVersions(c.tenantId, req.params.namespaceId, (req.query.locale as string | undefined) ?? null) }); } catch (e) { fail(res, 'versions_list_failed', e); }
  });
  router.put('/i18n/namespaces/:namespaceId/versions', fgaEditor, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.namespaceId)) { res.status(400).json({ error: 'invalid_namespace_id' }); return; }
    const p = VersionSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertVersion(c.tenantId, req.params.namespaceId, p.data)); } catch (e) { fail(res, 'version_upsert_failed', e); }
  });
  router.post('/i18n/namespaces/:namespaceId/versions/set-current', fgaEditor, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.namespaceId)) { res.status(400).json({ error: 'invalid_namespace_id' }); return; }
    const p = SetCurrentVersionSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try {
      const r = await m.setCurrentVersion(c.tenantId, req.params.namespaceId, p.data.locale, p.data.version);
      if (!r) { res.status(404).json({ error: 'version_not_found' }); return; }
      res.json(r);
    } catch (e) { fail(res, 'set_current_failed', e); }
  });

  // Overrides
  router.get('/i18n/namespaces/:namespaceId/overrides', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.namespaceId)) { res.status(400).json({ error: 'invalid_namespace_id' }); return; }
    try { res.json({ overrides: await m.listOverrides(c.tenantId, req.params.namespaceId, (req.query.locale as string | undefined) ?? null) }); } catch (e) { fail(res, 'overrides_list_failed', e); }
  });
  router.put('/i18n/namespaces/:namespaceId/overrides', fgaEditor, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.namespaceId)) { res.status(400).json({ error: 'invalid_namespace_id' }); return; }
    const p = OverrideSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertOverride(c.tenantId, c.userId, req.params.namespaceId, p.data)); } catch (e) { fail(res, 'override_upsert_failed', e); }
  });
  router.delete('/i18n/overrides/:overrideId', fgaEditor, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.overrideId)) { res.status(400).json({ error: 'invalid_override_id' }); return; }
    try {
      const ok = await m.deleteOverride(c.tenantId, req.params.overrideId);
      if (!ok) { res.status(404).json({ error: 'override_not_found' }); return; }
      res.status(204).send();
    } catch (e) { fail(res, 'override_delete_failed', e); }
  });

  // Locale user preferences
  router.get('/i18n/locale-preferences', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json(await m.getLocalePreferences(c.tenantId, c.userId) ?? {}); } catch (e) { fail(res, 'locale_prefs_get_failed', e); }
  });
  router.put('/i18n/locale-preferences', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = LocalePreferencesSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertLocalePreferences(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'locale_prefs_put_failed', e); }
  });

  // RTL validation results
  router.get('/i18n/rtl-validations', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ results: await m.listRtlValidations(c.tenantId, {
      subjectKind: (req.query.subjectKind as string | undefined) ?? null,
      subjectId: (req.query.subjectId as string | undefined) ?? null,
      limit: parseInt(String(req.query.limit ?? 100), 10),
    }) }); } catch (e) { fail(res, 'rtl_validations_list_failed', e); }
  });
  router.post('/i18n/rtl-validations', fgaEditor, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = RtlValidationSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.status(201).json(await m.recordRtlValidation(c.tenantId, p.data)); } catch (e) { fail(res, 'rtl_validation_record_failed', e); }
  });

  return router;
}
