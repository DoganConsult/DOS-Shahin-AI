/**
 * Calendar service — tenant-scoped CRUD over `<tenant_schema>.compliance_calendar`.
 *
 * status enum: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue'
 * Default 'scheduled' (matches schema default).
 */
import type { DbClient } from '../../db/runner';

export type CalendarStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';

export interface CalendarRow {
  id: string;
  tenantId: string;
  title: string;
  eventType: string;
  frameworkId: string | null;
  startDate: string;
  endDate: string | null;
  recurrence: string | null;
  ownerId: string | null;
  status: CalendarStatus;
  reminders: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface ListCalendarInput {
  tenantSchema: string;
  tenantId: string;
  eventType?: string;
  frameworkId?: string;
  status?: CalendarStatus;
  /** ISO date inclusive lower bound on start_date. */
  fromDate?: string;
  /** ISO date inclusive upper bound on start_date. */
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface CreateCalendarInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  title: string;
  eventType: string;
  startDate: string;
  endDate?: string | null;
  frameworkId?: string | null;
  recurrence?: string | null;
  ownerId?: string | null;
  status?: CalendarStatus;
  reminders?: unknown[];
}

export interface UpdateCalendarStatusInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
  status: CalendarStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;
const STATUSES: ReadonlySet<CalendarStatus> = new Set([
  'scheduled', 'in_progress', 'completed', 'cancelled', 'overdue',
]);

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}
function assertStatus(s: string): asserts s is CalendarStatus {
  if (!STATUSES.has(s as CalendarStatus)) throw Object.assign(new Error(`bad_status:${s}`), { code: 'bad_status' });
}

const COLS = `id, tenant_id, title, event_type, framework_id,
              start_date, end_date, recurrence, owner_id, status, reminders,
              created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; title: string;
  event_type: string; framework_id: string | null;
  start_date: string; end_date: string | null;
  recurrence: string | null; owner_id: string | null;
  status: CalendarStatus; reminders: unknown[];
  created_at: string; updated_at: string;
}): CalendarRow => ({
  id: x.id, tenantId: x.tenant_id, title: x.title,
  eventType: x.event_type, frameworkId: x.framework_id,
  startDate: x.start_date, endDate: x.end_date,
  recurrence: x.recurrence, ownerId: x.owner_id,
  status: x.status, reminders: x.reminders ?? [],
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listCalendar(
  client: DbClient,
  input: ListCalendarInput,
): Promise<{ rows: CalendarRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.eventType) { params.push(input.eventType); where += ` AND event_type = $${params.length}`; }
  if (input.frameworkId) { params.push(input.frameworkId); where += ` AND framework_id = $${params.length}`; }
  if (input.status) { assertStatus(input.status); params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.fromDate) { params.push(input.fromDate); where += ` AND start_date >= $${params.length}`; }
  if (input.toDate) { params.push(input.toDate); where += ` AND start_date <= $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_calendar
     WHERE ${where} ORDER BY start_date ASC, created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_calendar WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getCalendar(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<CalendarRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_calendar
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createCalendar(
  client: DbClient,
  input: CreateCalendarInput,
): Promise<CalendarRow> {
  assertSchema(input.tenantSchema);
  if (!input.title || !input.eventType || !input.startDate) {
    throw Object.assign(new Error('title, eventType and startDate required'), { code: 'bad_input' });
  }
  if (input.status) assertStatus(input.status);
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_calendar
       (tenant_id, title, event_type, framework_id,
        start_date, end_date, recurrence, owner_id, status, reminders)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.title, input.eventType,
      input.frameworkId ?? null, input.startDate, input.endDate ?? null,
      input.recurrence ?? null, input.ownerId ?? null,
      input.status ?? 'scheduled',
      JSON.stringify(input.reminders ?? []),
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateCalendarStatus(
  client: DbClient,
  input: UpdateCalendarStatusInput,
): Promise<CalendarRow | null> {
  assertSchema(input.tenantSchema);
  assertStatus(input.status);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_calendar
        SET status = $3, updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id, input.status],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
