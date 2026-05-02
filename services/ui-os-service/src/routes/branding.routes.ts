import { Router, type Request, type Response } from 'express';
import type { DbPool } from '../db.js';
import { UiOsBrandingManager, type BrandingPatch } from '../managers/ui-os-branding.manager.js';
import { UiOsThemeManager, type ThemePatch } from '../managers/ui-os-theme.manager.js';
import { UiOsI18nManager, type TranslationPut } from '../managers/ui-os-i18n.manager.js';
import {
  BrandingPatchSchema,
  ThemePatchSchema,
  TranslationPutSchema,
} from '../schemas/branding.schemas.js';

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

function tenantOnly(req: Request, res: Response): string | null {
  const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId) as string | undefined;
  if (!tenantId) {
    res.status(400).json({ error: 'missing_tenant' });
    return null;
  }
  return tenantId;
}

export function createBrandingRouter(pool: DbPool): Router {
  const router = Router();
  const branding = new UiOsBrandingManager(pool);
  const theme = new UiOsThemeManager(pool);
  const i18n = new UiOsI18nManager(pool);

  router.get('/branding', async (req, res) => {
    const ctx = context(req, res); if (!ctx) return;
    try { res.json(await branding.get(ctx.tenantId)); }
    catch (e) { res.status(500).json({ error: 'branding_get_failed', message: (e as Error).message }); }
  });

  router.put('/branding', async (req, res) => {
    const ctx = context(req, res); if (!ctx) return;
    const parsed = BrandingPatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) { res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() }); return; }
    try { res.json(await branding.upsert(ctx.tenantId, parsed.data as unknown as BrandingPatch)); }
    catch (e) { res.status(500).json({ error: 'branding_put_failed', message: (e as Error).message }); }
  });

  router.get('/theme', async (req, res) => {
    const ctx = context(req, res); if (!ctx) return;
    try { res.json(await theme.get(ctx.tenantId, (req.query.moduleCode as string | undefined) ?? null)); }
    catch (e) { res.status(500).json({ error: 'theme_get_failed', message: (e as Error).message }); }
  });

  router.put('/theme', async (req, res) => {
    const ctx = context(req, res); if (!ctx) return;
    const parsed = ThemePatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) { res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() }); return; }
    try { res.json(await theme.upsert(ctx.tenantId, parsed.data as unknown as ThemePatch)); }
    catch (e) { res.status(500).json({ error: 'theme_put_failed', message: (e as Error).message }); }
  });

  router.post('/theme/preview', async (req, res) => {
    const ctx = context(req, res); if (!ctx) return;
    const parsed = ThemePatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) { res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() }); return; }
    try { res.json(await theme.preview(ctx.tenantId, parsed.data as unknown as ThemePatch)); }
    catch (e) { res.status(500).json({ error: 'theme_preview_failed', message: (e as Error).message }); }
  });

  router.post('/theme/publish', async (req, res) => {
    const ctx = context(req, res); if (!ctx) return;
    const parsed = ThemePatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) { res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() }); return; }
    try { res.json(await theme.publish(ctx.tenantId, parsed.data as unknown as ThemePatch)); }
    catch (e) { res.status(500).json({ error: 'theme_publish_failed', message: (e as Error).message }); }
  });

  router.get('/locales', async (_req, res) => {
    try { res.json({ locales: await i18n.listLocales() }); }
    catch (e) { res.status(500).json({ error: 'locales_failed', message: (e as Error).message }); }
  });

  router.get('/translations/:locale', async (req, res) => {
    const tenantId = tenantOnly(req, res); if (!tenantId) return;
    try { res.json({ locale: req.params.locale, translations: await i18n.getTranslations(tenantId, req.params.locale) }); }
    catch (e) { res.status(500).json({ error: 'translations_get_failed', message: (e as Error).message }); }
  });

  router.put('/translations/:locale', async (req, res) => {
    const ctx = context(req, res); if (!ctx) return;
    const parsed = TranslationPutSchema.safeParse(req.body ?? {});
    if (!parsed.success) { res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() }); return; }
    try { res.json(await i18n.putTranslations(ctx.tenantId, req.params.locale, parsed.data as unknown as TranslationPut)); }
    catch (e) { res.status(500).json({ error: 'translations_put_failed', message: (e as Error).message }); }
  });

  router.post('/translations/import', async (req, res) => {
    const ctx = context(req, res); if (!ctx) return;
    const locale = (req.body?.locale ?? req.query.locale) as string | undefined;
    if (!locale) { res.status(400).json({ error: 'missing_locale' }); return; }
    const parsed = TranslationPutSchema.safeParse(req.body ?? {});
    if (!parsed.success) { res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() }); return; }
    try { res.json(await i18n.putTranslations(ctx.tenantId, locale, parsed.data as unknown as TranslationPut)); }
    catch (e) { res.status(500).json({ error: 'translations_import_failed', message: (e as Error).message }); }
  });

  router.get('/translations/export/:locale', async (req, res) => {
    const tenantId = tenantOnly(req, res); if (!tenantId) return;
    try { res.json({ locale: req.params.locale, translations: await i18n.exportLocale(tenantId, req.params.locale) }); }
    catch (e) { res.status(500).json({ error: 'translations_export_failed', message: (e as Error).message }); }
  });

  return router;
}
