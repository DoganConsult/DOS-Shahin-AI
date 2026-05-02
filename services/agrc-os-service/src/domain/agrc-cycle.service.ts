import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface CycleRecord {
  cycle_id: string;
  tenant_id: string;
  mode: string;
  status: string;
  agents: string[];
  context: Record<string, unknown>;
  results: Record<string, unknown> | null;
  wave_count: number;
  discovery_count: number;
  action_count: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

const CYCLE_COLUMNS = `cycle_id, tenant_id, mode, status, agents, context, results, wave_count, discovery_count, action_count, started_at, completed_at, created_at`;

export async function startCycle(
  tenantId: string,
  input: { mode?: string; agents?: string[]; context?: Record<string, unknown> },
): Promise<CycleRecord> {
  const id = randomUUID();
  const agents = input.agents || ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12'];
  try {
    const result = await safeQuery(
      `INSERT INTO dos.agrc_cycles (cycle_id, tenant_id, mode, status, agents, context, wave_count, discovery_count, action_count, started_at, created_at)
       VALUES ($1, $2, $3, 'running', $4, $5, 0, 0, 0, NOW(), NOW())
       RETURNING ${CYCLE_COLUMNS}`,
      [id, tenantId, input.mode || 'hybrid', JSON.stringify(agents), JSON.stringify(input.context || {})],
    );
    logger.info('[agrc-os] Cycle started', { cycleId: id, tenantId, mode: input.mode, agentCount: agents.length });
    return result.rows[0] as CycleRecord;
  } catch (err) {
    logger.error('[agrc-os] Failed to start cycle', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function listCycles(
  tenantId: string,
  options: { page?: number; pageSize?: number; status?: string; sortBy?: string; sortOrder?: string } = {},
): Promise<{ data: CycleRecord[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 25));
  const offset = (page - 1) * pageSize;
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (options.status) {
    conditions.push(`status = $${idx}`);
    params.push(options.status);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const sortCol = ['created_at', 'started_at', 'status'].includes(options.sortBy || '') ? options.sortBy! : 'created_at';
  const sortDir = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM dos.agrc_cycles ${where}`, params);
  const dataResult = await safeQuery(
    `SELECT ${CYCLE_COLUMNS} FROM dos.agrc_cycles ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
    params,
  );
  return { data: dataResult.rows as CycleRecord[], total: countResult.rows[0]?.total || 0, page, pageSize };
}

export async function getCycleById(tenantId: string, id: string): Promise<CycleRecord | null> {
  const result = await safeQuery(
    `SELECT ${CYCLE_COLUMNS} FROM dos.agrc_cycles WHERE tenant_id = $1 AND cycle_id = $2`,
    [tenantId, id],
  );
  return (result.rows[0] as CycleRecord) || null;
}

export async function cancelCycle(tenantId: string, id: string): Promise<boolean> {
  const result = await safeQuery(
    `UPDATE dos.agrc_cycles SET status = 'cancelled', completed_at = NOW() WHERE tenant_id = $1 AND cycle_id = $2 AND status = 'running'`,
    [tenantId, id],
  );
  return result.rowCount > 0;
}

export async function getCycleResults(tenantId: string, id: string): Promise<Record<string, unknown>> {
  const cycle = await getCycleById(tenantId, id);
  if (!cycle) return { error: 'Cycle not found' };

  const discoveries = await safeQuery(
    `SELECT * FROM dos.agrc_discoveries WHERE tenant_id = $1 AND cycle_id = $2 ORDER BY created_at DESC`,
    [tenantId, id],
  );
  const actions = await safeQuery(
    `SELECT * FROM dos.agrc_proposed_actions WHERE tenant_id = $1 AND cycle_id = $2 ORDER BY created_at DESC`,
    [tenantId, id],
  );

  return {
    cycle,
    discoveries: discoveries.rows,
    actions: actions.rows,
    summary: {
      discoveryCount: discoveries.rows.length,
      actionCount: actions.rows.length,
      status: cycle.status,
    },
  };
}
