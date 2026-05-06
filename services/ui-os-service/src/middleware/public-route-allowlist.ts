// services/ui-os-service/src/middleware/public-route-allowlist.ts
//
// DB-driven public-route allowlist. Source of truth:
//   dos.dynamic_ui_route_metadata WHERE is_public = true
//
// Replaces the static TS literal `publicMarketingTemplateRoutes` that
// previously lived in services/ui-os-service/src/server.ts. AGENTS.md
// doctrine: zero static / zero legacy / zero fallback. Public surfaces
// must be declared in DB via the migration that owns the route metadata
// row, never in TypeScript.
//
// Strategy:
//   - Warm cache at startup (fire-and-forget; cache may be empty for the
//     first request if DB is slow, in which case the request falls
//     through to the gated mount and returns 401 — correct behaviour for
//     a private route).
//   - Periodically refresh (TTL) so newly-seeded public routes appear
//     without a service restart.
//
// Anonymous clients reading PUBLIC routes never need a gateway token.
// Anonymous clients reading PRIVATE routes still hit requireGatewayOrigin.

import type { DbPool } from '../db.js';

const REFRESH_INTERVAL_MS = 30_000;

export interface PublicRouteAllowlist {
  has(route: string): boolean;
  refresh(): Promise<void>;
  snapshot(): readonly string[];
  stop(): void;
}

export function createPublicRouteAllowlist(pool: DbPool): PublicRouteAllowlist {
  let routes = new Set<string>();
  let timer: NodeJS.Timeout | null = null;

  const refresh = async (): Promise<void> => {
    try {
      const { rows } = await pool.query<{ route: string }>(
        `SELECT route FROM dos.dynamic_ui_route_metadata WHERE is_public = true`,
      );
      const next = new Set<string>();
      for (const r of rows) {
        if (typeof r.route === 'string' && r.route.length > 0) next.add(r.route);
      }
      routes = next;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[public-route-allowlist] refresh failed', String(err));
    }
  };

  // Fire-and-forget warm-up.
  void refresh();
  timer = setInterval(() => { void refresh(); }, REFRESH_INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();

  return {
    has: (route: string) => routes.has(route),
    refresh,
    snapshot: () => Array.from(routes).sort(),
    stop: () => { if (timer) { clearInterval(timer); timer = null; } },
  };
}
