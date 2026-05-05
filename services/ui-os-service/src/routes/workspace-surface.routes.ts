// =====================================================================
// WS-DB-2 — Workspace surface content endpoints.
//
// Backs the FE `WorkspaceSurfaceDataService` (per
// platform/ui-system/module_ui_os_contract-pack/workspace-db-driven-rewrite-plan.md
// §3.1, §9). Each endpoint returns a JSON envelope with the catalog
// rows the resolver composes into ResolvedWorkspaceSurface.
//
// Tenant context is read from the same headers as the rest of
// ui-os-service:
//   - x-dos-tenant-id        (preferred)
//   - ?tenant_id=             (optional override for unauthenticated probes)
//
// All endpoints are read-only and idempotent.
// =====================================================================
import { Router, type Request } from 'express';
import type { DbPool } from '../db.js';
import { UiOsWorkspaceSurfaceManager } from '../managers/ui-os-workspace-surface.manager.js';

function tenant(req: Request): string | null {
  const v = (req.header('x-dos-tenant-id') ?? req.query.tenant_id ?? '') as string;
  const t = String(v).trim();
  return t.length ? t : null;
}

export function createWorkspaceSurfaceRouter(pool: DbPool): Router {
  const router = Router();
  const mgr = new UiOsWorkspaceSurfaceManager(pool);

  router.get('/workspace-surface/setup-steps', async (req, res) => {
    try {
      const steps = await mgr.listSetupSteps(tenant(req));
      res.json({ steps });
    } catch (e) {
      res.status(500).json({ error: 'workspace_surface_failed', detail: String((e as Error).message) });
    }
  });

  router.get('/workspace-surface/quick-actions', async (req, res) => {
    try {
      const surfaceKey = String(req.query.surface_key ?? '').trim();
      if (!surfaceKey) { res.status(400).json({ error: 'missing_surface_key' }); return; }
      const actions = await mgr.listQuickActions(tenant(req), surfaceKey);
      res.json({ actions });
    } catch (e) {
      res.status(500).json({ error: 'workspace_surface_failed', detail: String((e as Error).message) });
    }
  });

  router.get('/workspace-surface/ai-tips', async (req, res) => {
    try {
      const tips = await mgr.listAiTips(tenant(req));
      res.json({ tips });
    } catch (e) {
      res.status(500).json({ error: 'workspace_surface_failed', detail: String((e as Error).message) });
    }
  });

  router.get('/workspace-surface/health-probes', async (req, res) => {
    try {
      const probes = await mgr.listHealthProbes(tenant(req));
      res.json({ probes });
    } catch (e) {
      res.status(500).json({ error: 'workspace_surface_failed', detail: String((e as Error).message) });
    }
  });

  router.get('/workspace-surface/page-header', async (req, res) => {
    try {
      const route = String(req.query.route ?? '');
      if (!route) { res.status(400).json({ error: 'missing_route' }); return; }
      const header = await mgr.getPageHeader(route, tenant(req));
      res.json({ header });
    } catch (e) {
      res.status(500).json({ error: 'workspace_surface_failed', detail: String((e as Error).message) });
    }
  });

  router.get('/workspace-surface/grid-columns', async (req, res) => {
    try {
      const scope = String(req.query.scope ?? '');
      if (!scope) { res.status(400).json({ error: 'missing_scope' }); return; }
      const columns = await mgr.listGridColumns(scope, tenant(req));
      res.json({ columns });
    } catch (e) {
      res.status(500).json({ error: 'workspace_surface_failed', detail: String((e as Error).message) });
    }
  });

  router.get('/workspace-surface/empty-states', async (_req, res) => {
    try {
      const states = await mgr.listEmptyStates();
      res.json({ states });
    } catch (e) {
      res.status(500).json({ error: 'workspace_surface_failed', detail: String((e as Error).message) });
    }
  });

  return router;
}
