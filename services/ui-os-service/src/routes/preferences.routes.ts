import { Router, type Request, type Response } from 'express';
import type { DbPool } from '../db.js';
import { UiOsPreferenceManager, type PreferencePatch } from '../managers/ui-os-preference.manager.js';
import {
  PreferencePatchSchema,
  LocalePatchSchema,
  ThemePatchSchema,
  DensityPatchSchema,
} from '../schemas/preferences.schemas.js';

interface Context { tenantId: string; userId: string }

function context(req: Request, res: Response): Context | null {
  const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId) as string | undefined;
  const userId = (req.header('x-dos-user-id') ?? req.query.userId) as string | undefined;
  if (!tenantId || !userId) {
    res.status(400).json({ error: 'missing_identity', message: 'x-dos-tenant-id and x-dos-user-id headers are required' });
    return null;
  }
  return { tenantId, userId };
}

export function createPreferencesRouter(pool: DbPool): Router {
  const router = Router();
  const manager = new UiOsPreferenceManager(pool);

  router.get('/preferences', async (req, res) => {
    const ctx = context(req, res);
    if (!ctx) return;
    try {
      const prefs = await manager.get(ctx.tenantId, ctx.userId);
      res.json(prefs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown_error';
      res.status(500).json({ error: 'preferences_get_failed', message });
    }
  });

  router.put('/preferences', async (req, res) => {
    const ctx = context(req, res);
    if (!ctx) return;
    const parsed = PreferencePatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
      return;
    }
    try {
      const prefs = await manager.upsert(ctx.tenantId, ctx.userId, parsed.data as PreferencePatch);
      res.json(prefs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown_error';
      res.status(500).json({ error: 'preferences_put_failed', message });
    }
  });

  router.put('/preferences/locale', async (req, res) => {
    const ctx = context(req, res);
    if (!ctx) return;
    const parsed = LocalePatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
      return;
    }
    try {
      const prefs = await manager.setLocale(ctx.tenantId, ctx.userId, parsed.data.locale as string, parsed.data.direction);
      res.json(prefs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown_error';
      res.status(500).json({ error: 'preferences_locale_failed', message });
    }
  });

  router.put('/preferences/theme', async (req, res) => {
    const ctx = context(req, res);
    if (!ctx) return;
    const parsed = ThemePatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
      return;
    }
    try {
      const prefs = await manager.setTheme(ctx.tenantId, ctx.userId, parsed.data.appearance as string, parsed.data.accent_color ?? null);
      res.json(prefs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown_error';
      res.status(500).json({ error: 'preferences_theme_failed', message });
    }
  });

  router.put('/preferences/density', async (req, res) => {
    const ctx = context(req, res);
    if (!ctx) return;
    const parsed = DensityPatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
      return;
    }
    try {
      const prefs = await manager.setDensity(ctx.tenantId, ctx.userId, parsed.data.density as string);
      res.json(prefs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown_error';
      res.status(500).json({ error: 'preferences_density_failed', message });
    }
  });

  return router;
}
