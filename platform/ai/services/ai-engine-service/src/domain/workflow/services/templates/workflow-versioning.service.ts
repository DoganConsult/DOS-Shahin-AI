// ============================================
// Workflow Versioning Service
// Ported from modules/workflow/source/backend/workflow/services/templates/workflow-versioning.service.ts
// ============================================

import { withTenantClient, getFirstRow } from '@dos/db';

const SYSTEM_JOB_ACTOR = 'system';

export interface GraphVersion {
  version_id: string;
  tenant_id: string;
  run_id: string;
  version_number: number;
  graph_snapshot: unknown;
  change_summary: string | null;
  changed_by: string | null;
  change_type: string;
  created_at: string;
}

export async function bumpWorkflowVersion(
  tenantId: string,
  workflowId: string,
  definition: unknown,
  name: string,
  opts?: { changedBy?: string },
): Promise<{ version: number; row: Record<string, unknown> }> {
  return withTenantClient(tenantId, async (client) => {
    try {
      const result = await client.query(
        `UPDATE workflows
           SET definition = $1,
               name = $2,
               version = COALESCE(version, 0) + 1,
               updated_by = $3,
               updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [definition, name, opts?.changedBy ?? SYSTEM_JOB_ACTOR, workflowId],
      );
      const row = (getFirstRow(result) as Record<string, unknown> | null) ?? {};
      const version = typeof row.version === 'number' ? row.version : 1;
      return { version, row };
    } catch {
      return { version: 1, row: {} };
    }
  });
}

export async function snapshotGraph(
  tenantId: string,
  runId: string,
  graph: unknown = {},
  opts?: { changedBy?: string; changeSummary?: string; changeType?: string },
): Promise<string | null> {
  return withTenantClient(tenantId, async (client) => {
    try {
      const versionResult = await client.query(
        `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
         FROM workflow_graph_versions WHERE run_id = $1`,
        [runId],
      );
      const nextVersion =
        (getFirstRow(versionResult) as { next_version?: number } | undefined)?.next_version ?? 1;

      const result = await client.query(
        `INSERT INTO workflow_graph_versions
           (tenant_id, run_id, version_number, graph_snapshot, change_summary, changed_by, change_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING version_id`,
        [
          tenantId,
          runId,
          nextVersion,
          JSON.stringify(graph),
          opts?.changeSummary || `Auto-snapshot v${nextVersion}`,
          opts?.changedBy || SYSTEM_JOB_ACTOR,
          opts?.changeType || 'auto',
        ],
      );
      return (getFirstRow(result) as { version_id?: string } | undefined)?.version_id ?? null;
    } catch {
      return null;
    }
  });
}

export async function getGraphVersions(
  tenantId: string,
  runId: string,
): Promise<GraphVersion[]> {
  return withTenantClient(tenantId, async (client) => {
    try {
      const result = await client.query(
        `SELECT * FROM workflow_graph_versions
         WHERE run_id = $1 ORDER BY version_number DESC`,
        [runId],
      );
      return result.rows as GraphVersion[];
    } catch {
      return [];
    }
  });
}

export async function getGraphVersion(
  tenantId: string,
  versionId: string,
): Promise<GraphVersion | null> {
  return withTenantClient(tenantId, async (client) => {
    try {
      const result = await client.query(
        `SELECT * FROM workflow_graph_versions WHERE version_id = $1`,
        [versionId],
      );
      return (getFirstRow(result) as GraphVersion) ?? null;
    } catch {
      return null;
    }
  });
}

export async function diffGraphVersions(
  tenantId: string,
  versionIdA: string,
  versionIdB: string,
): Promise<{ added: string[]; removed: string[]; changed: string[] }> {
  const [a, b] = await Promise.all([
    getGraphVersion(tenantId, versionIdA),
    getGraphVersion(tenantId, versionIdB),
  ]);
  if (!a || !b) return { added: [], removed: [], changed: [] };

  const snapshotA = a.graph_snapshot as { nodes?: Array<{ id: string }> } | null;
  const snapshotB = b.graph_snapshot as { nodes?: Array<{ id: string }> } | null;
  const nodesA = new Map((snapshotA?.nodes ?? []).map((n) => [n.id, n]));
  const nodesB = new Map((snapshotB?.nodes ?? []).map((n) => [n.id, n]));

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const [id, node] of nodesB) {
    if (!nodesA.has(id)) {
      added.push(id);
    } else if (JSON.stringify(nodesA.get(id)) !== JSON.stringify(node)) {
      changed.push(id);
    }
  }
  for (const [id] of nodesA) {
    if (!nodesB.has(id)) removed.push(id);
  }

  return { added, removed, changed };
}
