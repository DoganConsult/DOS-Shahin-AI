// services/ui-os-service/src/routes/route-metadata.routes.ts
//
//   GET /route-metadata
//     → { routes: [{ route, renderMode, templateBindingRequired, version }] }
//
//   GET /route-metadata?route=/workspace-home
//     → { route, renderMode, templateBindingRequired, version }
//        404 when no row exists.
//
// Backed by dos.dynamic_ui_route_metadata. Read-only. Used by the SPA
// DynamicTemplatePageComponent to decide whether a given route should
// resolve a template binding at all (shell-only routes skip the
// /api/ui-os/template-binding call entirely).
//
// Wired via services/ui-os-service/src/routes/index.ts.

import { Router } from 'express';
import type { DbPool } from '../db.js';

interface RouteMetadataRow {
  route: string;
  render_mode: string;
  template_binding_required: boolean;
  version: number;
}

function shape(r: RouteMetadataRow) {
  return {
    route: r.route,
    renderMode: r.render_mode,
    templateBindingRequired: r.template_binding_required,
    version: r.version,
  };
}

export function createRouteMetadataRouter(pool: DbPool): Router {
  const router = Router();

  router.get('/route-metadata', async (req, res) => {
    const route = typeof req.query.route === 'string' ? req.query.route.trim() : '';
    try {
      if (route) {
        const { rows } = await pool.query<RouteMetadataRow>(
          `SELECT route, render_mode, template_binding_required, version
             FROM dos.dynamic_ui_route_metadata
            WHERE route = $1`,
          [route],
        );
        if (!rows[0]) {
          return res.status(404).json({ error: 'ROUTE_METADATA_NOT_FOUND', route });
        }
        return res.json(shape(rows[0]));
      }
      const { rows } = await pool.query<RouteMetadataRow>(
        `SELECT route, render_mode, template_binding_required, version
           FROM dos.dynamic_ui_route_metadata
          ORDER BY route`,
      );
      return res.json({ routes: rows.map(shape) });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error('[route-metadata] query failed', msg);
      return res.status(500).json({ error: 'ROUTE_METADATA_QUERY_FAILED' });
    }
  });

  return router;
}
