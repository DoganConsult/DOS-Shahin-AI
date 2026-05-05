// =============================================================================
// /api/role-profile — canonical FE-facing surface for role-profile management.
//
// All writes flow through RoleProfileService (Wave F1), which is the SOLE
// permitted writer to platform_dauth.user_role_assignments. Direct URA
// writes are rejected by trigger trg_ura_via_role_profile_only.
//
// Endpoints
//   GET    /api/role-profile/:userId           — list role-profiles for a user
//   PUT    /api/role-profile                   — upsert role-profile
//   DELETE /api/role-profile                   — revoke role-profile
//   GET    /api/role-profile/_meta/acceptors   — list registered sync acceptors
//   GET    /api/role-profile/_meta/log         — recent sync-log rows
// =============================================================================

import { Router, Request, Response } from 'express';
import { authenticate, requirePermission, requireTenantId } from '../adapters/auth.adapter';
import { asyncHandler, auditMiddleware } from '@dos/platform-core/http';
import { query } from '@dos/db';
import { RoleProfileService } from '../domain/foundation/role-profile.service';

export const roleProfileRouter = Router();
roleProfileRouter.use(authenticate);
roleProfileRouter.use(requireTenantId);
roleProfileRouter.use(auditMiddleware('role-profile'));

// GET /api/role-profile/:userId — list this user's role-profiles for the tenant.
roleProfileRouter.get('/:userId',
  requirePermission('foundation.user.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId as string;
    const rows = await RoleProfileService.listForUser(tenantId, req.params.userId);
    res.json({ ok: true, profiles: rows });
  }));

// PUT /api/role-profile — upsert. Body: { user_id, role_code, scope?, permissions?, lifecycle_state? }
roleProfileRouter.put('/',
  requirePermission('foundation.admin.write'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId as string;
    const actor    = (req as any).userId as string | undefined;
    const body = req.body ?? {};
    if (!body.user_id || !body.role_code) {
      return res.status(400).json({ ok: false, error: 'user_id and role_code are required' });
    }
    const row = await RoleProfileService.upsert({
      tenant_id:        tenantId,
      user_id:          body.user_id,
      role_code:        body.role_code,
      scope:            body.scope,
      permissions:      Array.isArray(body.permissions) ? body.permissions : undefined,
      business_unit_id: body.business_unit_id ?? null,
      location_id:      body.location_id ?? null,
      lifecycle_state:  body.lifecycle_state,
      external_idp_refs: body.external_idp_refs,
      source_system:    body.source_system ?? `actor:${actor ?? 'unknown'}`,
    });
    res.status(200).json({ ok: true, profile: row });
  }));

// DELETE /api/role-profile — body: { user_id, role_code, scope? }
roleProfileRouter.delete('/',
  requirePermission('foundation.admin.write'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId as string;
    const body = req.body ?? {};
    if (!body.user_id || !body.role_code) {
      return res.status(400).json({ ok: false, error: 'user_id and role_code are required' });
    }
    const removed = await RoleProfileService.revoke({
      tenant_id: tenantId, user_id: body.user_id,
      role_code: body.role_code, scope: body.scope,
    });
    res.json({ ok: true, removed });
  }));

// GET /api/role-profile/_meta/acceptors
roleProfileRouter.get('/_meta/acceptors',
  requirePermission('foundation.admin.read'),
  asyncHandler(async (_req: Request, res: Response) => {
    const r = await query(
      `SELECT acceptor_id, display_name, direction, enabled, last_sync_at, last_status
         FROM dos.role_profile_acceptors ORDER BY acceptor_id`);
    res.json({ ok: true, acceptors: r.rows });
  }));

// GET /api/role-profile/_meta/log?limit=50
roleProfileRouter.get('/_meta/log',
  requirePermission('audit_trail.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId as string;
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 500);
    const r = await query(
      `SELECT id, occurred_at, acceptor_id, direction, profile_id,
              tenant_id, user_id, role_code, outcome, details
         FROM dos.role_profile_sync_log
        WHERE tenant_id = $1
        ORDER BY occurred_at DESC
        LIMIT $2`,
      [tenantId, limit]);
    res.json({ ok: true, log: r.rows });
  }));
