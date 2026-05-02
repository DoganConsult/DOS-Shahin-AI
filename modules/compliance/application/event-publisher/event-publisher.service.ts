/**
 * Event-Publisher service — durable outbox over
 * `<tenant_schema>.event_outbox`. Producers append events, the dispatcher
 * picks pending rows and marks them `dispatched` (or `failed` on error). The
 * outbox is the canonical replay log for cross-module integration.
 */
import type { DbClient } from '../../db/runner';

export type OutboxStatus = 'pending' | 'dispatched' | 'failed';
const STATUSES: ReadonlyArray<OutboxStatus> = ['pending', 'dispatched', 'failed'];

export interface OutboxRow {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
  createdBy: string;
  dispatchedAt: string | null;
}

export interface PublishEventInput {
  tenantSchema: string;
  actorId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload?: Record<string, unknown>;
}

export interface ListOutboxInput {
  tenantSchema: string;
  status?: OutboxStatus;
  eventType?: string;
  aggregateId?: string;
  limit?: number;
  offset?: number;
}

export interface DispatchInput {
  tenantSchema: string;
  batch?: number;
  handler?: (row: OutboxRow) => Promise<void> | void;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `event_id, event_type, aggregate_type, aggregate_id,
              payload, status, attempts, error_message,
              created_at, created_by, dispatched_at`;

const mapRow = (x: {
  event_id: string; event_type: string; aggregate_type: string; aggregate_id: string;
  payload: Record<string, unknown> | null; status: string;
  attempts: string | number; error_message: string | null;
  created_at: string; created_by: string; dispatched_at: string | null;
}): OutboxRow => ({
  eventId: x.event_id, eventType: x.event_type,
  aggregateType: x.aggregate_type, aggregateId: x.aggregate_id,
  payload: x.payload ?? {},
  status: x.status as OutboxStatus,
  attempts: Number(x.attempts),
  errorMessage: x.error_message,
  createdAt: x.created_at, createdBy: x.created_by,
  dispatchedAt: x.dispatched_at,
});

export async function listOutboxEvents(
  client: DbClient,
  input: ListOutboxInput,
): Promise<{ rows: OutboxRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.eventType) { params.push(input.eventType); where += ` AND event_type = $${params.length}`; }
  if (input.aggregateId) { params.push(input.aggregateId); where += ` AND aggregate_id = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".event_outbox
     WHERE ${where} ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".event_outbox WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getOutboxEvent(
  client: DbClient,
  input: { tenantSchema: string; eventId: string },
): Promise<OutboxRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".event_outbox
     WHERE event_id = $1`,
    [input.eventId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function publishEvent(
  client: DbClient,
  input: PublishEventInput,
): Promise<OutboxRow> {
  assertSchema(input.tenantSchema);
  if (!input.eventType || !input.aggregateType || !input.aggregateId) {
    throw Object.assign(
      new Error('eventType, aggregateType, aggregateId required'),
      { code: 'bad_input' },
    );
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".event_outbox
       (event_type, aggregate_type, aggregate_id, payload, status, attempts, created_by)
     VALUES ($1, $2, $3, $4::jsonb, 'pending', 0, $5)
     RETURNING ${COLS}`,
    [
      input.eventType, input.aggregateType, input.aggregateId,
      JSON.stringify(input.payload ?? {}), input.actorId,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function markDispatched(
  client: DbClient,
  input: { tenantSchema: string; eventId: string },
): Promise<OutboxRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".event_outbox
        SET status = 'dispatched', dispatched_at = NOW(),
            attempts = attempts + 1, error_message = NULL
      WHERE event_id = $1
      RETURNING ${COLS}`,
    [input.eventId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function markFailed(
  client: DbClient,
  input: { tenantSchema: string; eventId: string; errorMessage: string },
): Promise<OutboxRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".event_outbox
        SET status = 'failed', attempts = attempts + 1, error_message = $2
      WHERE event_id = $1
      RETURNING ${COLS}`,
    [input.eventId, input.errorMessage],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

/**
 * Dispatcher — pulls up to `batch` pending rows in created_at order, runs
 * the handler, and stamps each row dispatched|failed. Tenant-safe and
 * deterministic (no SKIP LOCKED — single-worker assumption per tenant).
 */
export async function dispatchPendingEvents(
  client: DbClient,
  input: DispatchInput,
): Promise<{ dispatched: number; failed: number; rows: OutboxRow[] }> {
  assertSchema(input.tenantSchema);
  const batch = Math.min(Math.max(input.batch ?? 50, 1), 500);
  const pendings = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".event_outbox
      WHERE status = 'pending'
      ORDER BY created_at ASC LIMIT ${batch}`,
    [],
  );
  let dispatched = 0; let failed = 0;
  const out: OutboxRow[] = [];
  for (const raw of pendings.rows) {
    const row = mapRow(raw as never);
    try {
      if (input.handler) await input.handler(row);
      const updated = await markDispatched(client, {
        tenantSchema: input.tenantSchema, eventId: row.eventId,
      });
      if (updated) { out.push(updated); dispatched++; }
    } catch (e) {
      const updated = await markFailed(client, {
        tenantSchema: input.tenantSchema, eventId: row.eventId,
        errorMessage: String((e as Error).message ?? e),
      });
      if (updated) { out.push(updated); failed++; }
    }
  }
  return { dispatched, failed, rows: out };
}
