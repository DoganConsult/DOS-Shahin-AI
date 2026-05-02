import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { emitEvent } from '../ports/events.port';
import { ExceptionRepository } from '../repositories/exception.repository';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface CompensatingControlLink {
  linkId: string;
  exceptionId: string;
  controlId: string;
  controlTitle: string;
  effectivenessRating: 'effective' | 'partially_effective' | 'ineffective' | 'not_assessed';
  linkedBy: string;
  linkedAt: string;
}

export interface LinkCompensatingControlData {
  exceptionId: string;
  controlId: string;
  controlTitle: string;
  effectivenessRating?: CompensatingControlLink['effectivenessRating'];
  linkedBy: string;
}

function validateLinkData(data: LinkCompensatingControlData): void {
  const errors: string[] = [];
  if (!data.exceptionId?.trim()) errors.push('exceptionId is required');
  if (!data.controlId?.trim()) errors.push('controlId is required');
  if (!data.controlTitle?.trim()) errors.push('controlTitle is required');
  if (data.controlTitle && data.controlTitle.length > 500) errors.push('controlTitle must not exceed 500 characters');
  if (!data.linkedBy?.trim()) errors.push('linkedBy is required');
  if (errors.length > 0) throw Object.assign(new Error(`Invalid link: ${errors.join(', ')}`), { statusCode: 400 });
}

export async function linkCompensatingControl(
  tenantId: string,
  data: LinkCompensatingControlData,
): Promise<CompensatingControlLink> {
  validateLinkData(data);
  const schema = tenantSchema(tenantId);
  const repo = new ExceptionRepository(tenantId);

  const r = await withTransaction(tenantId, async (client) => {
    const exc = await repo.findByIdForUpdate(data.exceptionId, client);
    if (!exc) throw Object.assign(new Error('Exception not found'), { statusCode: 404 });

    const result = await safeQueryWithClient(
      `INSERT INTO "${schema}".exception_compensating_controls
        (exception_id, control_id, control_title, effectiveness_rating, linked_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.exceptionId, data.controlId, data.controlTitle, data.effectivenessRating || 'not_assessed', data.linkedBy],
      client,
    );

    return getFirstRow(result)!;
  });

  await recordAudit({
    tenantId, userId: data.linkedBy, module: 'exception', action: 'compensating_control_linked',
    entityType: 'exception', entityId: data.exceptionId,
    afterState: { controlId: data.controlId, effectiveness: data.effectivenessRating },
  }).catch(catchHandler(EC.EVENT_BUS));

  emitEvent(({
      tenantId, userId: data.linkedBy, module: 'exception', event: 'compensating_control_assigned',
      entityType: 'exception', entityId: data.exceptionId,
      data: { controlId: data.controlId, effectiveness: data.effectivenessRating },
    } as any)).catch(catchHandler(EC.EVENT_BUS));

  return mapRow(r);
}

export async function unlinkCompensatingControl(
  tenantId: string,
  linkId: string,
  removedBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  const r = await withTransaction(tenantId, async (client) => {
    const existing = await safeQueryWithClient(
      `SELECT * FROM "${schema}".exception_compensating_controls WHERE link_id = $1 FOR UPDATE`,
      [linkId],
      client,
    );
    const row = getFirstRow(existing)!;
    if (!row) throw Object.assign(new Error('Link not found'), { statusCode: 404 });

    await safeQueryWithClient(
      `DELETE FROM "${schema}".exception_compensating_controls WHERE link_id = $1`,
      [linkId],
      client,
    );

    return row;
  });

  await recordAudit({
    tenantId, userId: removedBy, module: 'exception', action: 'compensating_control_unlinked',
    entityType: 'exception', entityId: r.exception_id,
    beforeState: { controlId: r.control_id, linkId },
  }).catch(catchHandler(EC.EVENT_BUS));

  emitEvent(({
      tenantId, userId: removedBy, module: 'exception', event: 'compensating_control_removed',
      entityType: 'exception', entityId: r.exception_id,
      data: { controlId: r.control_id, linkId },
    } as any)).catch(catchHandler(EC.EVENT_BUS));
}

export async function updateEffectiveness(
  tenantId: string,
  linkId: string,
  rating: CompensatingControlLink['effectivenessRating'],
  updatedBy: string,
): Promise<CompensatingControlLink> {
  const schema = tenantSchema(tenantId);

  const { row, prevRating } = await withTransaction(tenantId, async (client) => {
    const existing = await safeQueryWithClient(
      `SELECT * FROM "${schema}".exception_compensating_controls WHERE link_id = $1 FOR UPDATE`,
      [linkId],
      client,
    );
    const prev = getFirstRow(existing)!;
    if (!prev) throw Object.assign(new Error('Link not found'), { statusCode: 404 });

    const result = await safeQueryWithClient(
      `UPDATE "${schema}".exception_compensating_controls
       SET effectiveness_rating = $1, updated_at = NOW()
       WHERE link_id = $2
       RETURNING *`,
      [rating, linkId],
      client,
    );

    return { row: getFirstRow(result)!, prevRating: prev.effectiveness_rating };
  });

  await recordAudit({
    tenantId, userId: updatedBy, module: 'exception', action: 'effectiveness_updated',
    entityType: 'exception', entityId: row.exception_id,
    beforeState: { linkId, rating: prevRating },
    afterState: { linkId, rating },
  }).catch(catchHandler(EC.EVENT_BUS));

  emitEvent(({
      tenantId, userId: updatedBy, module: 'exception', event: 'effectiveness_updated',
      entityType: 'exception', entityId: row.exception_id,
      data: { linkId, previousRating: prevRating, newRating: rating },
    } as any)).catch(catchHandler(EC.EVENT_BUS));

  return mapRow(row);
}

export async function getCompensatingControls(
  tenantId: string,
  exceptionId: string,
  page = 1,
  pageSize = 25,
): Promise<{ items: CompensatingControlLink[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const safePage = Math.max(1, page);
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const offset = (safePage - 1) * safeSize;
  const [countResult, result] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".exception_compensating_controls WHERE exception_id = $1`, [exceptionId]),
    safeQuery(`SELECT * FROM "${schema}".exception_compensating_controls WHERE exception_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3`, [exceptionId, safeSize, offset]),
  ]);
  return {
    items: result.rows.map(mapRow),
    total: countResult.rows[0]?.total ?? 0,
  };
}

function mapRow( r: Record<string, unknown>): CompensatingControlLink {
  return {

    linkId: r.link_id || r.id,

    exceptionId: r.exception_id,

    controlId: r.control_id,

    controlTitle: r.control_title,

    effectivenessRating: r.effectiveness_rating || 'not_assessed',

    linkedBy: r.linked_by,

    linkedAt: r.created_at?.toISOString?.() || r.created_at,
  };
}
