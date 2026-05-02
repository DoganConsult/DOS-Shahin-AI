import { safeQuery, tenantSchema } from '../../ports/database.port';
import { emitEvent } from '../../ports/events.port';
import { getFirstRow } from '../../ports/database.port';
import type { GenericRow } from '@dos/types';
import { catchHandler, EC } from '../../ports/resilience.port';

export interface PositionData {
  dept_id?: string;
  title_en: string;
  title_ar?: string;
  grade?: string;
  reports_to_position_id?: string;
  status?: 'active' | 'inactive' | 'vacant';
  metadata?: Record<string, unknown>;
}

export async function listPositions(
  tenantId: string,
  filters: { departmentId?: string; limit?: number; offset?: number } = {},
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const params: unknown[] = [];
  let sql = `SELECT * FROM "${schema}".positions WHERE deleted_at IS NULL`;

  if (filters.departmentId) {
    params.push(filters.departmentId);
    sql += ` AND dept_id = $${params.length}`;
  }

  sql += ` ORDER BY title_en ASC`;

  if (filters.limit) {
    params.push(filters.limit);
    sql += ` LIMIT $${params.length}`;
  }
  if (filters.offset) {
    params.push(filters.offset);
    sql += ` OFFSET $${params.length}`;
  }

  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function getPositionById(tenantId: string, positionId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".positions WHERE position_id = $1 AND deleted_at IS NULL`,
    [positionId],
  );
  return getFirstRow(result);
}

export async function createPosition(
  tenantId: string,
  data: PositionData,
  actorId: string,
): Promise<GenericRow> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".positions
       (dept_id, title_en, title_ar, grade, reports_to_position_id, status, metadata, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.dept_id || null,
      data.title_en,
      data.title_ar || null,
      data.grade || null,
      data.reports_to_position_id || null,
      data.status || 'active',
      data.metadata ? JSON.stringify(data.metadata) : null,
      actorId,
    ],
  );
  const newPosition = getFirstRow(result);

  if (newPosition) {
    emitEvent({
      event_type: 'foundation.position.created',
      tenantId,
      userId: actorId,
      module: 'foundation',
      event: 'position.created',
      entityType: 'position',
      entityId: newPosition.position_id,
      data: newPosition,
    }).catch(catchHandler(EC.EVENT_BUS, { operation: 'emit foundation.position.created' }));
  }

  return newPosition;
}

export async function updatePosition(
  tenantId: string,
  positionId: string,
  data: Partial<PositionData>,
  actorId: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const dbKey = key === 'departmentId' ? 'dept_id' : key;
      sets.push(`${dbKey} = $${idx++}`);
      params.push(key === 'metadata' ? JSON.stringify(value) : value);
    }
  }

  if (sets.length === 0) {
    return getPositionById(tenantId, positionId);
  }

  sets.push(`updated_at = NOW()`, `updated_by = $${idx++}`);
  params.push(actorId, positionId);

  const result = await safeQuery(
    `UPDATE "${schema}".positions SET ${sets.join(', ')} WHERE position_id = $${idx} AND deleted_at IS NULL RETURNING *`,
    params,
  );

  const updatedPosition = getFirstRow(result);

  if (updatedPosition) {
    emitEvent({
      event_type: 'foundation.position.updated',
      tenantId,
      userId: actorId,
      module: 'foundation',
      event: 'position.updated',
      entityType: 'position',
      entityId: positionId,
      data: { changes: data },
    }).catch(catchHandler(EC.EVENT_BUS, { operation: 'emit foundation.position.updated' }));
  }

  return updatedPosition;
}

export async function deletePosition(
  tenantId: string,
  positionId: string,
  actorId: string,
): Promise<{ deleted: boolean }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".positions SET deleted_at = NOW(), updated_by = $2 WHERE position_id = $1 AND deleted_at IS NULL`,
    [positionId, actorId],
  );

  const deleted = (result.rowCount ?? 0) > 0;
  if (deleted) {
    emitEvent({
      event_type: 'foundation.position.deleted',
      tenantId,
      userId: actorId,
      module: 'foundation',
      event: 'position.deleted',
      entityType: 'position',
      entityId: positionId,
    }).catch(catchHandler(EC.EVENT_BUS, { operation: 'emit foundation.position.deleted' }));
  }

  return { deleted };
}
