import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, EC } from '@dos/platform-core/resilience';

/**
 * Incident Case Service
 * ---------------------
 * Manages investigation cases, case-incident linking,
 * case notes, and unified case timelines.
 */

/* ── Cases ────────────────────────────────────────────────────────────── */

export async function createCase(
  tenantId: string,
  data: {
    title: string;
    description?: string;
    case_type?: string;
    priority?: string;
    severity?: string;
    assigned_to?: string;
    lead_investigator?: string;
    department_id?: string;
    created_by: string;
  },
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `INSERT INTO "${schema}".cases
       (title, description, case_type, priority, severity,
        assigned_to, lead_investigator, department_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      data.title,
      data.description || null,
      data.case_type || null,
      data.priority || null,
      data.severity || null,
      data.assigned_to || null,
      data.lead_investigator || null,
      data.department_id || null,
      data.created_by,
    ],
  );

  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'incident.case_created',
      tenantId,
      sourceService: 'incident-case',
      entityType: 'case',
      entityId: getFirstRow(r)?.case_id,
      severity: 'info',
      payload: { title: data.title, createdBy: data.created_by },
    } as any)), { tenantId, operation: 'eventBus:incident.case_created' });

  return getFirstRow(r);
}

export async function getCases(
  tenantId: string,
  filters?: { status?: string; case_type?: string; priority?: string },
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".cases WHERE deleted_at IS NULL`;
  const params: unknown[] = [];

  if (filters?.status) { params.push(filters.status); sql += ` AND status = $${params.length}`; }
  if (filters?.case_type) { params.push(filters.case_type); sql += ` AND case_type = $${params.length}`; }
  if (filters?.priority) { params.push(filters.priority); sql += ` AND priority = $${params.length}`; }

  sql += ` ORDER BY created_at DESC`;
  return (await safeQuery(sql, params)).rows;
}

export async function getCaseById(tenantId: string, caseId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `SELECT c.*,
       (SELECT COUNT(*) FROM "${schema}".case_incidents ci WHERE ci.case_id = c.case_id) AS incident_count
     FROM "${schema}".cases c
     WHERE c.case_id = $1 AND c.deleted_at IS NULL`,
    [caseId],
  );
  return getFirstRow(r);
}

/** Allowed fields for case updates. */
const CASE_UPDATE_FIELDS = [
  'title', 'description', 'case_type', 'status', 'priority',
  'severity', 'assigned_to', 'lead_investigator', 'resolution_summary',
] as const;

export async function updateCase(
  tenantId: string,
  caseId: string,
  data: Record<string, unknown>,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const fields: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;

  for (const [k, v] of Object.entries(data)) {
    if ((CASE_UPDATE_FIELDS as readonly string[]).includes(k)) {
      fields.push(`${k} = $${idx}`);
      vals.push(v);
      idx++;
    }
  }
  if (!fields.length) return null;

  fields.push(`updated_at = NOW()`);

  // Auto-set closed_at when status transitions to closed
  if (data.status === 'closed') {
    fields.push(`closed_at = NOW()`);
  }

  vals.push(caseId);
  const r = await safeQuery(
    `UPDATE "${schema}".cases SET ${fields.join(', ')} WHERE case_id = $${idx} AND deleted_at IS NULL RETURNING *`,
    vals,
  );
  return getFirstRow(r);
}

export async function updateCaseStatus(
  tenantId: string,
  caseId: string,
  status: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const closedClause = status === 'closed' ? `, closed_at = NOW()` : '';
  const r = await safeQuery(
    `UPDATE "${schema}".cases
     SET status = $2, updated_at = NOW()${closedClause}
     WHERE case_id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [caseId, status],
  );
  return getFirstRow(r);
}

/* ── Case-Incident Linking ───────────────────────────────────────────── */

export async function linkIncidentToCase(
  tenantId: string,
  caseId: string,
  incidentId: string,
  linkedBy: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `INSERT INTO "${schema}".case_incidents (case_id, incident_id, linked_by)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [caseId, incidentId, linkedBy],
  );

  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'incident.case_linked',
      tenantId,
      sourceService: 'incident-case',
      entityType: 'case',
      entityId: caseId,
      severity: 'info',
      payload: { caseId, incidentId, linkedBy },
    } as any)), { tenantId, operation: 'eventBus:incident.case_linked' });

  return getFirstRow(r);
}

export async function unlinkIncidentFromCase(
  tenantId: string,
  caseId: string,
  incidentId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `DELETE FROM "${schema}".case_incidents WHERE case_id = $1 AND incident_id = $2`,
    [caseId, incidentId],
  );
}

export async function getCaseIncidents(tenantId: string, caseId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT i.*
     FROM "${schema}".incidents i
     JOIN "${schema}".case_incidents ci ON ci.incident_id = i.incident_id
     WHERE ci.case_id = $1 AND i.deleted_at IS NULL
     ORDER BY i.created_at DESC`,
    [caseId],
  )).rows;
}

/* ── Case Notes ──────────────────────────────────────────────────────── */

export async function addCaseNote(
  tenantId: string,
  caseId: string,
  data: { author_id: string; content: string; note_type?: string },
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `INSERT INTO "${schema}".case_notes (case_id, author_id, content, note_type)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [caseId, data.author_id, data.content, data.note_type || 'general'],
  );
  return getFirstRow(r);
}

export async function getCaseNotes(tenantId: string, caseId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT * FROM "${schema}".case_notes
     WHERE case_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [caseId],
  )).rows;
}

/* ── Case Timeline ───────────────────────────────────────────────────── */

/** Unified timeline combining case notes and incident updates from linked incidents. */
export async function getCaseTimeline(tenantId: string, caseId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT cn.note_id AS entry_id,
            'note' AS entry_type,
            cn.content,
            cn.author_id,
            cn.created_at AS timestamp
     FROM "${schema}".case_notes cn
     WHERE cn.case_id = $1 AND cn.deleted_at IS NULL

     UNION ALL

     SELECT iu.update_id AS entry_id,
            'incident_update' AS entry_type,
            iu.content,
            iu.author_id,
            iu.created_at AS timestamp
     FROM "${schema}".incident_updates iu
     JOIN "${schema}".case_incidents ci ON ci.incident_id = iu.incident_id
     WHERE ci.case_id = $1

     ORDER BY timestamp DESC`,
    [caseId],
  )).rows;
}
