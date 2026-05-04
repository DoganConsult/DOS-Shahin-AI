// Phase 1: DB-Driven Logo/Home-Link Configuration
// Backend API for tenant landing page configuration
//
//   GET /tenant-landing-config/:tenantId
//     → { tenantId, authenticatedRoute, unauthenticatedRoute, sessionExpiredRoute, postAuthRoute, enabled }
//
// Reads dos.tenant_landing_config (created by migration
// 20260505_0903_tenant_landing_config.sql).
//
// Wired via services/ui-os-service/src/routes/index.ts.

import { Router } from 'express';
import type { DbPool } from '../db.js';

interface TenantLandingConfigRow {
  tenant_id: string;
  authenticated_route: string;
  unauthenticated_route: string;
  session_expired_route: string;
  post_auth_route: string | null;
  enabled: boolean;
}

export function createTenantLandingConfigRouter(pool: DbPool): Router {
  const router = Router();

  router.get('/tenant-landing-config/:tenantId', async (req, res) => {
    const tenantId = String(req.params.tenantId ?? '').trim();
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }
    try {
      const result = await pool.query<TenantLandingConfigRow>(
        `SELECT tenant_id, authenticated_route, unauthenticated_route, session_expired_route, post_auth_route, enabled
           FROM dos.tenant_landing_config
          WHERE tenant_id = $1`,
        [tenantId],
      );
      const row = result.rows[0];
      if (!row) {
        // Return default config if not found
        res.json({
          tenantId,
          authenticatedRoute: '/workspace-home',
          unauthenticatedRoute: '/',
          sessionExpiredRoute: '/',
          postAuthRoute: '/workspace-home',
          enabled: true,
        });
        return;
      }
      res.json({
        tenantId: row.tenant_id,
        authenticatedRoute: row.authenticated_route,
        unauthenticatedRoute: row.unauthenticated_route,
        sessionExpiredRoute: row.session_expired_route,
        postAuthRoute: row.post_auth_route,
        enabled: row.enabled,
      });
    } catch (e) {
      res.status(500).json({
        error: 'tenant-landing-config resolver failed',
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  });

  return router;
}
