/**
 * View preferences — per-user / per-tenant / per-module saved view configs.
 * Phase 14.2 — backs FE `switchView()` / `saveViewPreset()` / `shareView()`.
 *
 * Endpoints (all auth + tenant-scoped):
 *   GET    /api/users/me/view-preferences              — list my prefs (optionally filter by module)
 *   GET    /api/users/me/view-preferences/:module/:view — read a single view
 *   PUT    /api/users/me/view-preferences/:module/:view — upsert
 *   DELETE /api/users/me/view-preferences/:module/:view — delete
 *   GET    /api/users/view-preferences/shared          — list tenant-shared presets (is_shared=true)
 */
import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import { asyncHandler, validate } from '@dos/platform-core/http';
import { z } from 'zod';
import * as viewPref from '../domain/view-preference.service';
import { UserServiceError } from '../domain/contracts/user-errors';

export const viewPreferencesRouter = Router();
viewPreferencesRouter.use(authenticate);
viewPreferencesRouter.use(requireTenantId);

const upsertBody = z.object({
  config: z.record(z.unknown()).default({}).describe('Arbitrary view configuration object'),
  isShared: z.boolean().optional().describe('Share this preset with the tenant (requires admin)'),
});

function hasShareAuthority(req: Request): boolean {
  const roles = (req.user as { roles?: string[]; role?: string } | undefined)?.roles;
  const primary = (req.user as { role?: string } | undefined)?.role;
  const candidates = new Set<string>([...(roles ?? []), ...(primary ? [primary] : [])]);
  return candidates.has('admin') || candidates.has('user_admin');
}

viewPreferencesRouter.get(
  '/me/view-preferences',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId!;
    const tenantId = req.tenantId!;
    const moduleFilter = typeof req.query.module === 'string' ? req.query.module : undefined;
    const rows = await viewPref.listForUser(tenantId, userId, moduleFilter);
    res.json({ success: true, data: rows });
  }),
);

viewPreferencesRouter.get(
  '/me/view-preferences/:module/:view',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId!;
    const tenantId = req.tenantId!;
    const row = await viewPref.getOne(tenantId, userId, req.params.module, req.params.view);
    if (!row) throw new UserServiceError('VIEW_PREF_NOT_FOUND');
    res.json({ success: true, data: row });
  }),
);

viewPreferencesRouter.put(
  '/me/view-preferences/:module/:view',
  validate({ body: upsertBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId!;
    const tenantId = req.tenantId!;
    const { config, isShared } = req.body as z.infer<typeof upsertBody>;
    const row = await viewPref.upsert(
      tenantId,
      userId,
      req.params.module,
      req.params.view,
      { config, isShared: isShared ?? null },
      { canShare: hasShareAuthority(req) },
    );
    res.status(200).json({ success: true, data: row });
  }),
);

viewPreferencesRouter.delete(
  '/me/view-preferences/:module/:view',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId!;
    const tenantId = req.tenantId!;
    const deleted = await viewPref.remove(tenantId, userId, req.params.module, req.params.view);
    res.json({ success: true, deleted });
  }),
);

viewPreferencesRouter.get(
  '/view-preferences/shared',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const moduleFilter = typeof req.query.module === 'string' ? req.query.module : undefined;
    const rows = await viewPref.listShared(tenantId, moduleFilter);
    res.json({ success: true, data: rows });
  }),
);

export default viewPreferencesRouter;
