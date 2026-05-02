import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { tryLifecycleTransition } from '../ports/platform.port';
import { emitEvent } from '../ports/events.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { ExceptionRepository } from '../repositories/exception.repository';

export interface RenewalIntakeData {
  exceptionId: string;
  requestedBy: string;
  additionalDays: number;
  justification: string;
  updatedCompensatingControls?: string;
}

export interface RenewalRecord {
  renewalId: string;
  exceptionId: string;
  requestedBy: string;
  additionalDays: number;
  justification: string;
  updatedCompensatingControls: string | null;
  status: string;
  createdAt: string;
}

function validateRenewalIntake(data: RenewalIntakeData): void {
  const errors: string[] = [];
  if (!data.exceptionId?.trim()) errors.push('exceptionId is required');
  if (!data.requestedBy?.trim()) errors.push('requestedBy is required');
  if (!data.additionalDays || data.additionalDays <= 0) errors.push('additionalDays must be positive');
  if (data.additionalDays > 3650) errors.push('additionalDays must not exceed 3650');
  if (!data.justification?.trim()) errors.push('justification is required');
  if (data.justification && data.justification.length > 5000) errors.push('justification must not exceed 5000 characters');
  if (data.updatedCompensatingControls && data.updatedCompensatingControls.length > 5000) errors.push('updatedCompensatingControls must not exceed 5000 characters');
  if (errors.length > 0) throw Object.assign(new Error(`Invalid renewal: ${errors.join(', ')}`), { statusCode: 400 });
}

export async function submitRenewalRequest(
  tenantId: string,
  data: RenewalIntakeData,
): Promise<RenewalRecord> {
  validateRenewalIntake(data);
  const schema = tenantSchema(tenantId);
  const repo = new ExceptionRepository(tenantId);

  const r = await withTransaction(tenantId, async (client) => {
    const row = await repo.findByIdForUpdate(data.exceptionId, client);
    if (!row) throw Object.assign(new Error('Exception not found'), { statusCode: 404 });
    if (row.status !== 'approved' && row.status !== 'active') {
      throw Object.assign(new Error('Only approved or active exceptions can be renewed'), { statusCode: 400 });
    }

    const lifecycle = await tryLifecycleTransition(tenantId, {
      moduleCode: 'exception', entityId: data.exceptionId,
      fromStatus: row.status, toStatus: 'renewal_pending', actorUserId: data.requestedBy,
    });
    if (lifecycle.handled && lifecycle.denied) {
      throw Object.assign(new Error(`Renewal denied: ${lifecycle.result?.reason}`), { statusCode: 403 });
    }

    const result = await safeQueryWithClient(
      `INSERT INTO "${schema}".exception_renewals
        (exception_id, requested_by, additional_days, justification, updated_compensating_controls, status)
       VALUES ($1, $2, $3, $4, $5, 'requested')
       RETURNING *`,
      [data.exceptionId, data.requestedBy, data.additionalDays, data.justification, data.updatedCompensatingControls || null],
      client,
    );

    return getFirstRow(result)!;
  });

  await recordAudit({
    tenantId, userId: data.requestedBy, module: 'exception', action: 'renewal_request',
    entityType: 'exception_renewal', entityId: r.renewal_id,
    afterState: { exceptionId: data.exceptionId, additionalDays: data.additionalDays },

  }).catch(catchHandler(EC.EVENT_BUS));

  swallow(EC.EVENT_BUS, emitEvent(({
      tenantId, userId: data.requestedBy, module: 'exception', event: 'renewal_requested',
      entityType: 'exception_renewal', entityId: r.renewal_id,
      data: { exceptionId: data.exceptionId, additionalDays: data.additionalDays },
    } as any)));

  return mapRenewalRow(r);
}

export async function getRenewalsByException(
  tenantId: string,
  exceptionId: string,
  page = 1,
  pageSize = 25,
): Promise<{ items: RenewalRecord[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const safePage = Math.max(1, page);
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const offset = (safePage - 1) * safeSize;
  const [countResult, result] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".exception_renewals WHERE exception_id = $1`, [exceptionId]),
    safeQuery(`SELECT * FROM "${schema}".exception_renewals WHERE exception_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [exceptionId, safeSize, offset]),
  ]);
  return {
    items: result.rows.map(mapRenewalRow),
    total: countResult.rows[0]?.total ?? 0,
  };
}

function mapRenewalRow( r: Record<string, unknown>): RenewalRecord {
  return {

    renewalId: r.renewal_id || r.id,

    exceptionId: r.exception_id,

    requestedBy: r.requested_by,

    additionalDays: r.additional_days,

    justification: r.justification,

    updatedCompensatingControls: r.updated_compensating_controls || null,

    status: r.status,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}
