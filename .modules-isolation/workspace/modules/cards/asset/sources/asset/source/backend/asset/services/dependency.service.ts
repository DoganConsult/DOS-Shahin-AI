// ============================================
// Dependency Service
// Graph queries: upstream/downstream via recursive CTE,
// cycle detection, impact path analysis
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

interface CreateDependencyInput {
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  dependency_type?: string;
  criticality?: string;
  direction?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export async function listDependencies(tenantId: string, params: {
  source_type?: string; source_id?: string;
  target_type?: string; target_id?: string;
  dependency_type?: string; page?: number; pageSize?: number;
} = {}) {
  const ts = tenantSchema(tenantId);
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(200, Math.max(1, params.pageSize || 50));
  const offset = (page - 1) * pageSize;

  const conds: string[] = ['deleted_at IS NULL'];
  const vals: unknown[] = [];
  let idx = 0;

  if (params.source_type) { idx++; conds.push(`source_type = $${idx}`); vals.push(params.source_type); }
  if (params.source_id) { idx++; conds.push(`source_id = $${idx}`); vals.push(params.source_id); }
  if (params.target_type) { idx++; conds.push(`target_type = $${idx}`); vals.push(params.target_type); }
  if (params.target_id) { idx++; conds.push(`target_id = $${idx}`); vals.push(params.target_id); }
  if (params.dependency_type) { idx++; conds.push(`dependency_type = $${idx}`); vals.push(params.dependency_type); }

  const where = conds.join(' AND ');
  const countR = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${ts}".asset_dependencies WHERE ${where}`, vals);
  const total = countR.rows[0]?.total || 0;
  const dataR = await safeQuery(`
    SELECT * FROM "${ts}".asset_dependencies WHERE ${where}
    ORDER BY created_at DESC LIMIT $${idx + 1} OFFSET $${idx + 2}
  `, [...vals, pageSize, offset]);

  return { data: dataR.rows, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function createDependency(tenantId: string, userId: string, input: CreateDependencyInput) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    INSERT INTO "${ts}".asset_dependencies (
      source_type, source_id, target_type, target_id,
      dependency_type, criticality, direction, notes, metadata, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (source_type, source_id, target_type, target_id, dependency_type) WHERE deleted_at IS NULL
    DO UPDATE SET notes = EXCLUDED.notes, criticality = EXCLUDED.criticality, updated_at = NOW()
    RETURNING *
  `, [
    input.source_type, input.source_id, input.target_type, input.target_id,
    input.dependency_type || 'depends_on', input.criticality || 'medium',
    input.direction || 'outbound', input.notes || '', input.metadata || {}, userId,
  ]);

  emitEvent(({ tenantId, userId, module: 'asset', event: 'dependency_created', entityType: 'dependency', entityId: rows[0].dependency_id, data: rows[0] } as any)).catch(catchHandler(EC.EVENT_BUS));
  return rows[0];
}

export async function deleteDependency(tenantId: string, userId: string, id: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`UPDATE "${ts}".asset_dependencies SET deleted_at = NOW() WHERE dependency_id = $1 AND deleted_at IS NULL RETURNING dependency_id`, [id]);
  if (rows[0]) emitEvent(({ tenantId, userId, module: 'asset', event: 'dependency_deleted', entityType: 'dependency', entityId: id } as any)).catch(catchHandler(EC.EVENT_BUS));
  return rows[0] || null;
}

export async function getUpstreamChain(tenantId: string, entityType: string, entityId: string, maxDepth = 10) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    WITH RECURSIVE chain AS (
      SELECT dependency_id, source_type, source_id, target_type, target_id,
             dependency_type, criticality, 1 AS depth
      FROM "${ts}".asset_dependencies
      WHERE target_type = $1 AND target_id = $2 AND deleted_at IS NULL
      UNION ALL
      SELECT d.dependency_id, d.source_type, d.source_id, d.target_type, d.target_id,
             d.dependency_type, d.criticality, c.depth + 1
      FROM "${ts}".asset_dependencies d
      JOIN chain c ON d.target_type = c.source_type AND d.target_id = c.source_id
      WHERE d.deleted_at IS NULL AND c.depth < $3
    )
    SELECT * FROM chain ORDER BY depth
  `, [entityType, entityId, maxDepth]);
  return rows;
}

export async function getDownstreamChain(tenantId: string, entityType: string, entityId: string, maxDepth = 10) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    WITH RECURSIVE chain AS (
      SELECT dependency_id, source_type, source_id, target_type, target_id,
             dependency_type, criticality, 1 AS depth
      FROM "${ts}".asset_dependencies
      WHERE source_type = $1 AND source_id = $2 AND deleted_at IS NULL
      UNION ALL
      SELECT d.dependency_id, d.source_type, d.source_id, d.target_type, d.target_id,
             d.dependency_type, d.criticality, c.depth + 1
      FROM "${ts}".asset_dependencies d
      JOIN chain c ON d.source_type = c.target_type AND d.source_id = c.target_id
      WHERE d.deleted_at IS NULL AND c.depth < $3
    )
    SELECT * FROM chain ORDER BY depth
  `, [entityType, entityId, maxDepth]);
  return rows;
}

export async function detectCycles(tenantId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    WITH RECURSIVE chain AS (
      SELECT source_type, source_id, target_type, target_id,
             ARRAY[source_type || ':' || source_id::text] AS path,
             false AS is_cycle
      FROM "${ts}".asset_dependencies WHERE deleted_at IS NULL
      UNION ALL
      SELECT d.source_type, d.source_id, d.target_type, d.target_id,
             c.path || (d.source_type || ':' || d.source_id::text),
             (d.target_type || ':' || d.target_id::text) = ANY(c.path)
      FROM "${ts}".asset_dependencies d
      JOIN chain c ON d.source_type = c.target_type AND d.source_id = c.target_id
      WHERE d.deleted_at IS NULL AND NOT c.is_cycle AND array_length(c.path, 1) < 20
    )
    SELECT DISTINCT path || (target_type || ':' || target_id::text) AS cycle_path
    FROM chain WHERE is_cycle
  `);
  return rows;
}

export async function getBlastRadius(tenantId: string, entityType: string, entityId: string) {
  const downstream = await getDownstreamChain(tenantId, entityType, entityId, 5);
  const uniqueEntities = new Set<string>();
  for (const d of downstream) {
    uniqueEntities.add(`${d.target_type}:${d.target_id}`);
  }
  return {
    entityType, entityId,
    impactedCount: uniqueEntities.size,
    impactedEntities: Array.from(uniqueEntities).map(e => {
      const [type, id] = e.split(':');
      return { type, id };
    }),
    maxDepth: downstream.length > 0 ? Math.max(...downstream.map(d => d.depth)) : 0,
  };
}

export async function getDependencyStats(tenantId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT
      COUNT(*)::int AS total_edges,
      COUNT(DISTINCT source_type || ':' || source_id::text)::int AS unique_sources,
      COUNT(DISTINCT target_type || ':' || target_id::text)::int AS unique_targets,
      COUNT(*) FILTER (WHERE criticality = 'critical')::int AS critical_deps,
      COUNT(*) FILTER (WHERE dependency_type = 'depends_on')::int AS hard_dependencies
    FROM "${ts}".asset_dependencies WHERE deleted_at IS NULL
  `);
  return rows[0];
}
