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
  'workspace.header',
  'workspace.sidebar',
  'workspace.mobile-nav',
  'workspace.command-search',
  'workspace.status-bar',
  'workspace.action-queue',
  'workspace.agent-strip',
  'workspace.inbox-center',
  'workspace.context-panel',
  'workspace.quick-create',
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
