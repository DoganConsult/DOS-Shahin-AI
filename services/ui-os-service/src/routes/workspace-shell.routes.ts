// Phase WS-5 — Workspace-shell binding resolver.
//
//   GET /workspace-shell/:tenantId
//     → { tenantId, version, surfaces: [{ component_key, enabled, position,
//                                         perms_required, props }] }
//
// Reads dos.workspace_shell_binding (created by Phase WS-1 migration
// 20260504_0010_workspace_shell_registry.sql). The 10 default surfaces are:
//   workspace.{header, sidebar, mobile-nav, command-search, status-bar,
//              action-queue, agent-strip, inbox-center, context-panel,
//              quick-create}
//
// Wired via services/ui-os-service/src/routes/index.ts.

import { Router } from 'express';
import type { DbPool } from '../db.js';

const WORKSPACE_SHELL_KEYS = [
  // Group 1: Shell Layout Framework (4)
  'shell.app',
  'shell.desktop',
  'shell.mobile',
  'shell.desktop-sidebar',
  // Group 2: Header & Navigation (7)
  'workspace.header',
  'workspace.sidebar',
  'workspace.mobile-nav',
  'shell.mobile-drawer',
  'shell.workspace-nav',
  'shell.nav-section',
  'shell.nav-item',
  // Group 3: Global Action Surfaces (5)
  'workspace.command-search',
  'workspace.inbox-center',
  'workspace.quick-create',
  'workspace.context-panel',
  'shell.account-menu',
  // Group 4: Work Activity & Status (3)
  'workspace.status-bar',
  'workspace.action-queue',
  'workspace.agent-strip',
  // Group 5: Alerts & Singletons (2)
  'shell.banner-strip',
  'shell.toast-outlet',
  // Group 6: Page Content Infrastructure (5)
  'page.layout',
  'page.masthead',
  'page.header',
  'page.tabs',
  'page.widget-frame',
] as const;

interface WorkspaceShellRow {
  component_key: string;
  enabled: boolean;
  position: number;
  perms_required: string[];
  props: Record<string, unknown>;
  version: number;
}

export function createWorkspaceShellRouter(pool: DbPool): Router {
  const router = Router();

  router.get('/workspace-shell/:tenantId', async (req, res) => {
    const tenantId = String(req.params.tenantId ?? '').trim();
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }
    try {
      const result = await pool.query<WorkspaceShellRow>(
        `SELECT component_key, enabled, position, perms_required, props, version
           FROM dos.workspace_shell_binding
          WHERE tenant_id = $1
          ORDER BY position`,
        [tenantId],
      );
      const surfaces = result.rows;
      const aggregateVersion = surfaces.reduce(
        (acc, r) => acc + (r.version ?? 0),
        0,
      );
      res.json({
        tenantId,
        version: aggregateVersion,
        surfaces,
        knownKeys: WORKSPACE_SHELL_KEYS,
      });
    } catch (e) {
      res.status(500).json({
        error: 'workspace-shell resolver failed',
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  });

  return router;
}
