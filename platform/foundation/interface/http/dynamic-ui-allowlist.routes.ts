/**
 * Layer 2 of the Carbon-only enforcement stack — server-side allowlist
 * resolver. This router OWNS the canonical answer to "which component_keys
 * is the SPA allowed to render?" by joining:
 *
 *   dos.dynamic_ui_component_registry  (runtime registrations)
 *      ⨝ carbon_key
 *   dos.ui_carbon_components           (Carbon catalog, vendor-locked)
 *
 * and returning ONLY rows where:
 *   - registry row vendor='ibm-carbon' AND approval_status='approved'
 *   - catalog row vendor='ibm-carbon'
 *   - catalog runtime_status IN ('active','wrapper-required')
 *
 * Anything else is filtered out. The SPA never sees blocked rows; even if
 * a bad row got into the registry table (which Layer 1 trigger now also
 * blocks), Layer 2 strips it from the response.
 *
 * Mounted under /api/dynamic-ui in foundation-aggregator.routes.
 */
import { Router, type Request, type Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authenticate, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler } from '../../ports/middleware.port';
import { query } from '../../ports/database.port';

interface AllowlistRow {
  component_key: string;
  carbon_key: string | null;
  catalog_package_name: string;
  catalog_package_version: string;
  catalog_source_component_name: string | null;
  catalog_integration_mode: string;
  catalog_runtime_status: string;
  catalog_dynamic_ui_allowed: boolean;
}

const SQL_ALLOWLIST = `
  SELECT
    r.component_key,
    r.carbon_key,
    c.package_name           AS catalog_package_name,
    c.package_version        AS catalog_package_version,
    c.source_component_name  AS catalog_source_component_name,
    c.integration_mode       AS catalog_integration_mode,
    c.runtime_status         AS catalog_runtime_status,
    c.dynamic_ui_allowed     AS catalog_dynamic_ui_allowed
  FROM dos.dynamic_ui_component_registry r
  JOIN dos.ui_carbon_components c USING (carbon_key)
  WHERE r.vendor          = 'ibm-carbon'
    AND r.approval_status = 'approved'
    AND c.vendor          = 'ibm-carbon'
    AND c.runtime_status IN ('active', 'wrapper-required')
  ORDER BY r.component_key
`;

export function createDynamicUiAllowlistRouter(): ExpressRouter {
  const router = Router();

  /**
   * GET /api/dynamic-ui/allowlist
   *
   * Returns the full set of allowed component_keys plus their Carbon
   * catalog metadata. Cacheable; SPA fetches once on bootstrap and uses
   * it as a hard gate for every render.
   */
  router.get(
    '/allowlist',
    authenticate,
    requireTenantId,
    asyncHandler(async (_req: Request, res: Response) => {
      const result = await query<AllowlistRow>(SQL_ALLOWLIST);
      res.set('Cache-Control', 'private, max-age=60');
      res.json({
        version: 1,
        generated_at: new Date().toISOString(),
        count: result.rows.length,
        component_keys: result.rows.map((r) => r.component_key),
        rows: result.rows,
      });
    }),
  );

  /**
   * GET /api/dynamic-ui/allowlist/:component_key
   *
   * Single-key lookup. Returns 404 (not 200 with allowed=false) so any
   * caller that does not handle 404 fails-closed.
   */
  router.get(
    '/allowlist/:component_key',
    authenticate,
    requireTenantId,
    asyncHandler(async (req: Request, res: Response) => {
      const result = await query<AllowlistRow>(
        SQL_ALLOWLIST.replace('ORDER BY r.component_key', 'AND r.component_key = $1 ORDER BY r.component_key'),
        [req.params.component_key],
      );
      if (result.rows.length === 0) {
        res.status(404).json({
          error: {
            code: 'not_in_carbon_allowlist',
            message: `component_key "${req.params.component_key}" is not in the IBM Carbon allowlist`,
          },
        });
        return;
      }
      res.json({ data: result.rows[0] });
    }),
  );

  /**
   * GET /api/dynamic-ui/allowlist/_health
   *
   * Drift sentinel. Returns 503 if any catalog row has non-IBM vendor or
   * any runtime registry row points at a non-IBM catalog row. Health
   * probes (Layer 7) call this on boot.
   */
  router.get(
    '/allowlist/_health',
    asyncHandler(async (_req: Request, res: Response) => {
      const drift = await query<{ non_ibm_catalog: number; bad_links: number }>(
        `SELECT
           (SELECT COUNT(*) FROM dos.ui_carbon_components WHERE vendor <> 'ibm-carbon')                                                                  AS non_ibm_catalog,
           (SELECT COUNT(*) FROM dos.dynamic_ui_component_registry r LEFT JOIN dos.ui_carbon_components c USING (carbon_key)
              WHERE r.vendor <> 'ibm-carbon' OR r.approval_status <> 'approved' OR c.vendor <> 'ibm-carbon' OR c.vendor IS NULL) AS bad_links
         `,
      );
      const d = drift.rows[0]!;
      const ok = Number(d.non_ibm_catalog) === 0 && Number(d.bad_links) === 0;
      res.status(ok ? 200 : 503).json({
        status: ok ? 'ok' : 'drift',
        non_ibm_catalog: Number(d.non_ibm_catalog),
        bad_links: Number(d.bad_links),
      });
    }),
  );

  return router;
}
