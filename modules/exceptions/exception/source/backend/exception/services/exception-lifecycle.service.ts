import { safeQuery, tenantSchema } from '../ports/database.port';
import { EXCEPTION_TRANSITIONS } from '../workflows/exception-lifecycle';
import { catchHandler, EC } from '@dos/platform-core/resilience';

const ALLOWED_TRANSITIONS: Record<string, string[]> = EXCEPTION_TRANSITIONS;

export async function getExceptionTimeline(
  tenantId: string,
  exceptionId: string,
  page = 1,
  pageSize = 50,
): Promise<{ items: Array<{ fromStatus: string; toStatus: string; changedBy: string; reason: string | null; changedAt: string }>; total: number }> {
  const schema = tenantSchema(tenantId);
  const safePage = Math.max(1, page);
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const offset = (safePage - 1) * safeSize;
  try {
    const [countResult, result] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".exception_status_history WHERE exception_id = $1`, [exceptionId]),
      safeQuery(
        `SELECT from_status AS "fromStatus", to_status AS "toStatus", changed_by AS "changedBy", reason, changed_at AS "changedAt"
         FROM "${schema}".exception_status_history WHERE exception_id = $1 ORDER BY changed_at ASC LIMIT $2 OFFSET $3`,
        [exceptionId, safeSize, offset],
      ),
    ]);
    return { items: result.rows, total: countResult.rows[0]?.total ?? 0 };
  } catch { return { items: [], total: 0 }; }
}

export async function extendException(
  tenantId: string,
  exceptionId: string,
  data: { additionalDays: number; justification: string; requestedBy: string },
): Promise<{ exceptionId: string; newExpiry: string }> {
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(`SELECT status, expiry_date FROM "${schema}".exceptions WHERE exception_id = $1 AND deleted_at IS NULL`, [exceptionId]);

  if (current.rows.length === 0) { const e: unknown = new Error('Exception not found'); e.statusCode = 404; throw e; }
  const row = current.rows[0];

  if (row.status !== 'active' && row.status !== 'approved') { const e: unknown = new Error('Only active or approved exceptions can be extended'); e.statusCode = 400; throw e; }
  const oldExpiry = row.expiry_date ? new Date(row.expiry_date) : new Date();
  const newExpiry = new Date(oldExpiry.getTime() + data.additionalDays * 24 * 60 * 60 * 1000).toISOString();
  await safeQuery(`UPDATE "${schema}".exceptions SET expiry_date = $1, updated_at = NOW() WHERE exception_id = $2`, [newExpiry, exceptionId]);
  await safeQuery(`INSERT INTO "${schema}".exception_status_history (exception_id, from_status, to_status, changed_by, reason, changed_at) VALUES ($1,$2,$2,$3,$4,NOW())`,
    [exceptionId, row.status, data.requestedBy, `Extended by ${data.additionalDays} days: ${data.justification}`]).catch(catchHandler(EC.EVENT_BUS));
  return { exceptionId, newExpiry };
}

export async function revokeException(
  tenantId: string,
  exceptionId: string,
  data: { reason: string; revokedBy: string; effectiveImmediately?: boolean },
): Promise<{ fromStatus: string; toStatus: string }> {
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(`SELECT status FROM "${schema}".exceptions WHERE exception_id = $1 AND deleted_at IS NULL`, [exceptionId]);

  if (current.rows.length === 0) { const e: unknown = new Error('Exception not found'); e.statusCode = 404; throw e; }
  const fromStatus: string = current.rows[0].status;
  const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];

  if (!allowed.includes('revoked')) { const e: unknown = new Error(`Cannot revoke exception in status ${fromStatus}`); e.statusCode = 400; throw e; }
  await safeQuery(`UPDATE "${schema}".exceptions SET status = 'revoked', revoked_at = NOW(), revoked_by = $1, revocation_reason = $2, updated_at = NOW() WHERE exception_id = $3`, [data.revokedBy, data.reason, exceptionId]);
  await safeQuery(`INSERT INTO "${schema}".exception_status_history (exception_id, from_status, to_status, changed_by, reason, changed_at) VALUES ($1,$2,'revoked',$3,$4,NOW())`,
    [exceptionId, fromStatus, data.revokedBy, data.reason]).catch(catchHandler(EC.EVENT_BUS));
  return { fromStatus, toStatus: 'revoked' };
}
