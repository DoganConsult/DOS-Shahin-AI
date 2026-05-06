// services/ui-os-service/src/routes/route-metadata.routes.ts
//
//   GET /route-metadata
//     → { routes: [{ route, renderMode, templateBindingRequired,
//                    isPublic, metadata, version }] }
//     Anonymous callers receive ONLY rows where is_public=true.
//
//   GET /route-metadata?route=/workspace-home
//     → { route, renderMode, templateBindingRequired, isPublic,
//         metadata, version }
//        404 when no row exists.
//        401 ROUTE_METADATA_UNAUTHENTICATED when an anonymous caller
//        asks for a non-public row; the response includes a typed
//        DB-stored redirect target so the FE never invents one.
//
// Backed by dos.dynamic_ui_route_metadata. Read-only. Used by the SPA
// DynamicTemplatePageComponent to decide whether a given route should
// resolve a template binding at all (shell-only routes skip the
// /api/ui-os/template-binding call entirely; redirect routes execute
// the typed DB-stored navigation).
//
// Mounted twice in services/ui-os-service/src/server.ts:
//   1. PUBLIC: before requireGatewayOrigin so anonymous "/" et al. resolve.
//   2. PRIVATE (full set): inside the gateway-origin gate via
//      services/ui-os-service/src/routes/index.ts so authenticated
//      callers see the complete table.

import { Router, type Request } from 'express';
import type { DbPool } from '../db.js';

interface RouteMetadataRow {
  route: string;
  render_mode: string;
  template_binding_required: boolean;
  is_public: boolean;
  metadata_public: boolean;
  metadata: Record<string, unknown> | null;
  version: number;
}

function shape(r: RouteMetadataRow) {
  return {
    route: r.route,
    renderMode: r.render_mode,
    templateBindingRequired: r.template_binding_required,
    isPublic: r.is_public === true,
    metadataPublic: r.metadata_public === true,
    metadata: (r.metadata && typeof r.metadata === 'object') ? r.metadata : {},
    version: r.version,
  };
}

function isAuthenticated(req: Request): boolean {
  const p = (req as unknown as { principal?: { sub?: string } }).principal;
  return typeof p?.sub === 'string' && p.sub.length > 0;
}

async function loadRedirectFallback(pool: DbPool): Promise<{ default: string } | null> {
  try {
    const { rows } = await pool.query<{ metadata: Record<string, unknown> | null }>(
      `SELECT metadata FROM dos.dynamic_ui_route_metadata WHERE route = '/'`,
    );
    const md = rows[0]?.metadata as Record<string, unknown> | undefined;
    const redirect = md && typeof md === 'object' ? (md['redirect'] as Record<string, unknown> | undefined) : undefined;
    const def = redirect && typeof redirect['default'] === 'string' ? (redirect['default'] as string) : null;
    return def ? { default: def } : null;
  } catch {
    return null;
  }
}

/**
 * Public router: anonymous-readable rows only. Mounted BEFORE
 * requireGatewayOrigin in server.ts.
 */
export function createPublicRouteMetadataRouter(pool: DbPool): Router {
  const router = Router();

  router.get('/route-metadata', async (req, res) => {
    const route = typeof req.query.route === 'string' ? req.query.route.trim() : '';
    try {
      if (route) {
        // Single-route classification lookup. Two flags govern visibility:
        //   * is_public=true       — full public route (also bypasses
        //                            template-binding auth gate). Implies
        //                            metadata_public.
        //   * metadata_public=true — classification visibility ONLY
        //                            (route-access stays authenticated;
        //                            shell-only protected routes use this).
        // The render-mode classification is NOT tenant data; making it
        // anon-readable for a protected route does not leak identity or
        // payload because the actual surface (workspace-runtime,
        // template-binding) remains gated.
        const { rows } = await pool.query<RouteMetadataRow>(
          `SELECT route, render_mode, template_binding_required, is_public,
                  metadata_public, metadata, version
             FROM dos.dynamic_ui_route_metadata
            WHERE route = $1`,
          [route],
        );
        if (!rows[0]) {
          return res.status(404).json({ error: 'ROUTE_METADATA_NOT_FOUND', route });
        }
        const classifiable = rows[0].is_public === true || rows[0].metadata_public === true;
        if (!classifiable) {
          // Row exists but is not anonymously classifiable (metadata_public=false,
          // is_public=false). Anonymous callers must not read the contract.
          // Authenticated SPA traffic often hits this PUBLIC mount before the
          // gateway-gated router — returning 404 here left the FE with null
          // metadata and template-binding-only heuristics. Mirror the private
          // mount: return the shaped row for authenticated principals.
          if (isAuthenticated(req)) return res.json(shape(rows[0]));
          const redirect = await loadRedirectFallback(pool);
          return res.status(401).json({
            error: 'ROUTE_METADATA_UNAUTHENTICATED',
            route,
            redirect: redirect ?? null,
          });
        }
        return res.json(shape(rows[0]));
      }
      // Bulk fetch — anonymous callers receive only is_public=true rows.
      // The bulk listing is consumed by the gateway public template-binding
      // allowlist (services/gateway/src/server.ts), which MUST stay narrow:
      // only fully-public routes belong in the template-binding bypass.
      // Routes with metadata_public=true / is_public=false are intentionally
      // excluded from the bulk response.
      const { rows } = await pool.query<RouteMetadataRow>(
        `SELECT route, render_mode, template_binding_required, is_public,
                metadata_public, metadata, version
           FROM dos.dynamic_ui_route_metadata
          WHERE is_public = true
          ORDER BY route`,
      );
      return res.json({ routes: rows.map(shape) });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error('[route-metadata public] query failed', msg);
      return res.status(500).json({ error: 'ROUTE_METADATA_QUERY_FAILED' });
    }
  });

  return router;
}

/**
 * Authenticated/full router: returns the complete table. Mounted INSIDE
 * the gateway-origin gate via routes/index.ts.
 */
export function createRouteMetadataRouter(pool: DbPool): Router {
  const router = Router();

  router.get('/route-metadata', async (req, res) => {
    const route = typeof req.query.route === 'string' ? req.query.route.trim() : '';
    try {
      if (route) {
        const { rows } = await pool.query<RouteMetadataRow>(
          `SELECT route, render_mode, template_binding_required, is_public,
                  metadata_public, metadata, version
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
        `SELECT route, render_mode, template_binding_required, is_public,
                metadata_public, metadata, version
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
