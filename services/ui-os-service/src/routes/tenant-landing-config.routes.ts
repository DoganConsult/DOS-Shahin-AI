// ZERO-LEGACY tenant landing-config resolver.
//
//   GET /tenant-landing-config/:tenantId
//     200 → { tenantId, authenticatedRoute, unauthenticatedRoute,
//             sessionExpiredRoute, postAuthRoute, enabled }
//     404 → { error: 'LANDING_CONFIG_NOT_SEEDED', tenantId }
//
// Doctrine: DB stores. Resolver returns DB row only. No fallback object,
// no '/workspace-home' literal, no '/' literal. If the operator has not
// seeded a row for the tenant, the resolver returns a typed 404 and the
// frontend renders empty / no-op (per AGENTS.md NO FRONTEND INVENTION).
//
// Reads dos.tenant_landing_config (created by migration
// 20260505_0903_tenant_landing_config.sql; defaults stripped by
// 20260510_0300_zero_legacy_landing_route_and_chrome_strings.sql).
//
// Wired via services/ui-os-service/src/routes/index.ts.

import { Router } from 'express';
import type { DbPool } from '../db.js';

interface TenantLandingConfigRow {
  tenant_id: string;
  authenticated_route: string | null;
  unauthenticated_route: string | null;
  session_expired_route: string | null;
  post_auth_route: string | null;
  enabled: boolean;
}

export function createTenantLandingConfigRouter(pool: DbPool): Router {
  const router = Router();

  router.get('/tenant-landing-config/:tenantId', async (req, res) => {
    const tenantId = String(req.params.tenantId ?? '').trim();
    if (!tenantId) {
      res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
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
        res.status(404).json({
          error: 'LANDING_CONFIG_NOT_SEEDED',
          tenantId,
          hint: 'Operator must seed dos.tenant_landing_config for this tenant. Frontend must render empty / no-op when this resolver returns 404.',
        });
        return;
      }
      res.json({
        tenantId: row.tenant_id,
        authenticatedRoute:   row.authenticated_route,
        unauthenticatedRoute: row.unauthenticated_route,
        sessionExpiredRoute:  row.session_expired_route,
        postAuthRoute:        row.post_auth_route,
        enabled:              row.enabled,
      });
    } catch (e) {
      res.status(500).json({
        error: 'TENANT_LANDING_CONFIG_RESOLVER_FAILED',
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  });

  return router;
}
