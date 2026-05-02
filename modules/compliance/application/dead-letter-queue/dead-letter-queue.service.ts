/**
 * Dead-Letter-Queue (W67) — terminal sink for outbox events that exhausted
 * retry budget. Operators can list, inspect, replay (re-publish a fresh
 * outbox row), or archive entries in `<tenant_schema>.event_dead_letter`.
 *
 * Status enum: open | replayed | archived
 *
 * Replay produces a new row in `<tenant_schema>.event_outbox` with status
 * `pending`, attempts=0, payload+aggregate copied from the DLQ entry, and
 * stamps the source DLQ row with status=`replayed` + replayedAt + replayedBy.
 */
import type { DbClient } from '../../db/runner';

export type DlqStatus = 'open' | 'replayed' | 'archived';
const STATUSES: ReadonlyArray<DlqStatus> = ['open', 'replayed', 'archived'];

export interface DlqRow {
  dlqId: string;
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  attempts: number;
  errorMessage: string | null;
  status: DlqStatus;
  createdAt: string;
  createdBy: string;
  replayedAt: string | null;
  replayedBy: string | null;
  newEventId: string | null;
}

export interface MoveToDlqInput {
  tenantSchema: string;
  actorId: string;
  eventId: string;
  errorMessage?: string | null;
}

export interface ListDlqInput {
  tenantSchema: string;
  status?: DlqStatus;
  eventType?: string;
  aggregateId?: string;
  limit?: number;
  offset?: number;
}

export interface ReplayDlqInput {
  tenantSchema: string;
  actorId: string;
  dlqId: string;
}

export interface ArchiveDlqInput {
  tenantSchema: string;
  actorId: string;
  dlqId: string;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS =
  `dlq_id, event_id, event_type, aggregate_type, aggregate_id, payload,
   attempts, error_message, status, created_at, created_by,
   replayed_at, replayed_by, new_event_id`;

const mapRow = (x: {
  dlq_id: string; event_id: string; event_type: string;
  aggregate_type: string; aggregate_id: string;
  payload: Record<string, unknown> | null;
  attempts: string | number; error_message: string | null;
  status: string; created_at: string; created_by: string;
  replayed_at: string | null; replayed_by: string | null;
  new_event_id: string | null;
}): DlqRow => ({
  dlqId: x.dlq_id, eventId: x.event_id, eventType: x.event_type,
  aggregateType: x.aggregate_type, aggregateId: x.aggregate_id,
  payload: x.payload ?? {}, attempts: Number(x.attempts),
  errorMessage: x.error_message, status: x.status as DlqStatus,
  createdAt: x.created_at, createdBy: x.created_by,
  replayedAt: x.replayed_at, replayedBy: x.replayed_by,
  newEventId: x.new_event_id,
});

export async function listDlq(
  client: DbClient,
  input: ListDlqInput,
): Promise<{ rows: DlqRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.eventType) { params.push(input.eventType); where += ` AND event_type = $${params.length}`; }
  if (input.aggregateId) { params.push(input.aggregateId); where += ` AND aggregate_id = $${params.length}`; }
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".event_dead_letter
      WHERE ${where} ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".event_dead_letter WHERE ${where}`,
    params,
  );
  return { rows: r.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getDlq(
  client: DbClient,
  input: { tenantSchema: string; dlqId: string },
): Promise<DlqRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".event_dead_letter WHERE dlq_id = $1`,
    [input.dlqId],
  );
  return r.rowCount === 0 ? null : mapRow(r.rows[0] as never);
}

export async function moveToDlq(
  client: DbClient,
  input: MoveToDlqInput,
): Promise<DlqRow> {
  assertSchema(input.tenantSchema);
  if (!input.eventId) {
    throw Object.assign(new Error('eventId required'), { code: 'bad_input' });
  }
  const src = await client.query(
    `SELECT event_id, event_type, aggregate_type, aggregate_id, payload,
            attempts, error_message
       FROM "${input.tenantSchema}".event_outbox WHERE event_id = $1`,
    [input.eventId],
  );
  if (src.rowCount === 0) {
    throw Object.assign(new Error(`event ${input.eventId} not found`), { code: 'not_found' });
  }
  const s = src.rows[0] as {
    event_id: string; event_type: string; aggregate_type: string;
    aggregate_id: string; payload: Record<string, unknown> | null;
    attempts: string | number; error_message: string | null;
  };
  const ins = await client.query(
    `INSERT INTO "${input.tenantSchema}".event_dead_letter
       (event_id, event_type, aggregate_type, aggregate_id, payload,
        attempts, error_message, status, created_by)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, 'open', $8)
     RETURNING ${COLS}`,
    [
      s.event_id, s.event_type, s.aggregate_type, s.aggregate_id,
      JSON.stringify(s.payload ?? {}),
      Number(s.attempts), input.errorMessage ?? s.error_message ?? null,
      input.actorId,
    ],
  );
  return mapRow(ins.rows[0] as never);
}

export async function replayDlq(
  client: DbClient,
  input: ReplayDlqInput,
): Promise<DlqRow> {
  assertSchema(input.tenantSchema);
  const cur = await getDlq(client, { tenantSchema: input.tenantSchema, dlqId: input.dlqId });
  if (!cur) throw Object.assign(new Error(`dlq ${input.dlqId} not found`), { code: 'not_found' });
  if (cur.status !== 'open') {
    throw Object.assign(
      new Error(`dlq ${input.dlqId} is ${cur.status}, only open can be replayed`),
      { code: 'bad_state' },
    );
  }
  const newEvt = await client.query<{ event_id: string }>(
    `INSERT INTO "${input.tenantSchema}".event_outbox
       (event_type, aggregate_type, aggregate_id, payload, status,
        attempts, error_message, created_by)
     VALUES ($1, $2, $3, $4::jsonb, 'pending', 0, NULL, $5)
     RETURNING event_id`,
    [
      cur.eventType, cur.aggregateType, cur.aggregateId,
      JSON.stringify(cur.payload ?? {}), input.actorId,
    ],
  );
  const newEventId = newEvt.rows[0]?.event_id ?? null;
  const upd = await client.query(
    `UPDATE "${input.tenantSchema}".event_dead_letter
        SET status = 'replayed', replayed_at = NOW(),
            replayed_by = $2, new_event_id = $3
      WHERE dlq_id = $1
      RETURNING ${COLS}`,
    [input.dlqId, input.actorId, newEventId],
  );
  return mapRow(upd.rows[0] as never);
}

export async function archiveDlq(
  client: DbClient,
  input: ArchiveDlqInput,
): Promise<DlqRow> {
  assertSchema(input.tenantSchema);
  const cur = await getDlq(client, { tenantSchema: input.tenantSchema, dlqId: input.dlqId });
  if (!cur) throw Object.assign(new Error(`dlq ${input.dlqId} not found`), { code: 'not_found' });
  if (cur.status === 'archived') return cur;
  const upd = await client.query(
    `UPDATE "${input.tenantSchema}".event_dead_letter
        SET status = 'archived'
      WHERE dlq_id = $1
      RETURNING ${COLS}`,
    [input.dlqId],
  );
  return mapRow(upd.rows[0] as never);
}

export const DLQ_STATUSES = STATUSES;
