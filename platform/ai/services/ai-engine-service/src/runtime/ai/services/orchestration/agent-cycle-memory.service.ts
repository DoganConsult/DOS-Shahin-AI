import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '../../ports/platform.port';

export interface CycleMemoryEntry {
  cycle_memory_id: string;
  tenant_id: string;
  cycle_id: string;
  agent_id: string;
  memory_type: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function recordCycleFinding(
  tenantId: string,
  cycleId: string,
  agentId: string,
  content: string,
  memoryType: string = 'cycle_finding',
  metadata?: Record<string, unknown>,
): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `INSERT INTO "${schema}".agent_cycle_memory
         (tenant_id, cycle_id, agent_id, memory_type, content, metadata)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING cycle_memory_id`,
      [tenantId, cycleId, agentId, memoryType, content, JSON.stringify(metadata || {})],
    );
    return getFirstRow(result)?.cycle_memory_id || null;
  } catch {
    return null;
  }
}

export async function getCycleMemory(
  tenantId: string,
  cycleId: string,
  agentId?: string,
): Promise<CycleMemoryEntry[]> {
  const schema = tenantSchema(tenantId);
  try {
    let q = `SELECT * FROM "${schema}".agent_cycle_memory WHERE tenant_id = $1 AND cycle_id = $2`;
    const params: unknown[] = [tenantId, cycleId];
    if (agentId) { q += ` AND agent_id = $3`; params.push(agentId); }
    q += ` ORDER BY created_at ASC`;

    const result = await safeQuery(q, params);
    return result.rows.map((r: GenericRow) => ({
      ...r,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
    })) as any;
  } catch {
    return [];
  }
}

export async function getPreviousCycleFindings(
  tenantId: string,
  agentId: string,
  limit: number = 10,
): Promise<CycleMemoryEntry[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".agent_cycle_memory
       WHERE tenant_id = $1 AND agent_id = $2
       ORDER BY created_at DESC LIMIT $3`,
      [tenantId, agentId, limit],
    );
    return result.rows;
  } catch {
    return [];
  }
}

export async function getCycleIds(
  tenantId: string,
  limit: number = 20,
): Promise<Array<{ cycle_id: string; agent_count: number; entry_count: number; started_at: string }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT cycle_id,
              COUNT(DISTINCT agent_id)::int AS agent_count,
              COUNT(*)::int AS entry_count,
              MIN(created_at) AS started_at
       FROM "${schema}".agent_cycle_memory
       WHERE tenant_id = $1
       GROUP BY cycle_id
       ORDER BY MIN(created_at) DESC
       LIMIT $2`,
      [tenantId, limit],
    );
    return result.rows;
  } catch {
    return [];
  }
}

export async function cleanupOldCycles(
  tenantId: string,
  keepDays: number = 90,
): Promise<number> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `DELETE FROM "${schema}".agent_cycle_memory
       WHERE tenant_id = $1 AND created_at < NOW() - make_interval(days => $2)
       RETURNING cycle_memory_id`,
      [tenantId, keepDays],
    );
    return result.rows.length;
  } catch {
    return 0;
  }
}
