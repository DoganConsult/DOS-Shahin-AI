import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, EC } from '@dos/platform-core/resilience';

/**
 * Incident Breach Reporting Service
 * ----------------------------------
 * Manages regulatory breach notification records, SLA deadlines
 * per KSA reporting authority, and overdue report tracking.
 */

/** Hours allowed per authority before a breach must be reported. */
const AUTHORITY_SLA_HOURS: Record<string, number> = {
  NCA: 2,
  SAMA: 24,
  SDAIA: 72,
  NDMO: 72,
  DPA: 72,
  CITC: 48,
};

export async function createBreachRecord(
  tenantId: string,
  incidentId: string,
  data: {
    breach_type: string;
    reporting_authority: string;
    affected_individuals_count?: number;
    data_categories_affected?: string[];
    cross_border?: boolean;
    created_by: string;
  },
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const slaHours = AUTHORITY_SLA_HOURS[data.reporting_authority] ?? 72;

  const r = await safeQuery(
    `INSERT INTO "${schema}".breach_reporting_records
       (incident_id, breach_type, reporting_authority,
        affected_individuals_count, data_categories_affected, cross_border,
        reporting_deadline, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, NOW() + ($7 || ' hours')::INTERVAL, $8)
     RETURNING *`,
    [
      incidentId,
      data.breach_type,
      data.reporting_authority,
      data.affected_individuals_count ?? null,
      data.data_categories_affected ? JSON.stringify(data.data_categories_affected) : null,
      data.cross_border ?? false,
      String(slaHours),
      data.created_by,
    ],
  );

  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'incident.breach_record_created',
      tenantId,
      sourceService: 'incident-breach-reporting',
      entityType: 'breach_record',
      entityId: getFirstRow(r)?.record_id,
      severity: 'warning',
      payload: {
        incidentId,
        breachType: data.breach_type,
        authority: data.reporting_authority,
        deadlineHours: slaHours,
        createdBy: data.created_by,
      },
    } as any)), { tenantId, operation: 'eventBus:incident.breach_record_created' });

  return getFirstRow(r);
}

export async function getBreachRecords(
  tenantId: string,
  filters?: { status?: string; reporting_authority?: string; breach_type?: string; incident_id?: string },
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `
    SELECT br.*, i.title AS incident_title
    FROM "${schema}".breach_reporting_records br
    JOIN "${schema}".incidents i ON i.incident_id = br.incident_id
    WHERE br.deleted_at IS NULL`;
  const params: unknown[] = [];

  if (filters?.status) { params.push(filters.status); sql += ` AND br.status = $${params.length}`; }
  if (filters?.reporting_authority) { params.push(filters.reporting_authority); sql += ` AND br.reporting_authority = $${params.length}`; }
  if (filters?.breach_type) { params.push(filters.breach_type); sql += ` AND br.breach_type = $${params.length}`; }
  if (filters?.incident_id) { params.push(filters.incident_id); sql += ` AND br.incident_id = $${params.length}`; }

  sql += ` ORDER BY br.reporting_deadline ASC NULLS LAST`;
  return (await safeQuery(sql, params)).rows;
}

export async function getBreachRecordById(tenantId: string, recordId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `SELECT br.*, i.title AS incident_title
     FROM "${schema}".breach_reporting_records br
     JOIN "${schema}".incidents i ON i.incident_id = br.incident_id
     WHERE br.record_id = $1 AND br.deleted_at IS NULL`,
    [recordId],
  );
  return getFirstRow(r);
}

/** Allowed fields for breach record updates (only when status is draft or pending_review). */
const BREACH_UPDATE_FIELDS = [
  'notification_content', 'affected_individuals_count',
  'data_categories_affected', 'cross_border', 'reviewer_id', 'status',
] as const;

export async function updateBreachRecord(
  tenantId: string,
  recordId: string,
  data: Record<string, unknown>,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const fields: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;

  for (const [k, v] of Object.entries(data)) {
    if ((BREACH_UPDATE_FIELDS as readonly string[]).includes(k)) {
      fields.push(`${k} = $${idx}`);
      vals.push(k === 'data_categories_affected' && Array.isArray(v) ? JSON.stringify(v) : v);
      idx++;
    }
  }
  if (!fields.length) return null;

  fields.push(`updated_at = NOW()`);
  vals.push(recordId);

  // Only allow updates when the record is still in draft or pending_review
  const r = await safeQuery(
    `UPDATE "${schema}".breach_reporting_records
     SET ${fields.join(', ')}
     WHERE record_id = $${idx}
       AND status IN ('draft', 'pending_review')
       AND deleted_at IS NULL
     RETURNING *`,
    vals,
  );
  return getFirstRow(r);
}

/** Submit a breach report to the authority. */
export async function submitBreachReport(
  tenantId: string,
  recordId: string,
  submittedBy: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `UPDATE "${schema}".breach_reporting_records
     SET status = 'submitted', reported_at = NOW(), submitted_by = $2, updated_at = NOW()
     WHERE record_id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [recordId, submittedBy],
  );

  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'incident.breach_submitted',
      tenantId,
      sourceService: 'incident-breach-reporting',
      entityType: 'breach_record',
      entityId: recordId,
      severity: 'warning',
      payload: { recordId, submittedBy },
    } as any)), { tenantId, operation: 'eventBus:incident.breach_submitted' });

  return getFirstRow(r);
}

/** Mark a breach report as acknowledged by the authority. */
export async function acknowledgeBreachReport(
  tenantId: string,
  recordId: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `UPDATE "${schema}".breach_reporting_records
     SET status = 'acknowledged', updated_at = NOW()
     WHERE record_id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [recordId],
  );
  return getFirstRow(r);
}

/** Fetch all breach reports that are overdue (past deadline and not yet submitted/acknowledged/closed). */
export async function getOverdueBreachReports(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT * FROM "${schema}".breach_reporting_records
     WHERE reporting_deadline < NOW()
       AND status NOT IN ('submitted', 'acknowledged', 'closed')
       AND deleted_at IS NULL
     ORDER BY reporting_deadline ASC`
  )).rows;
}
