/**
 * Audit-Log-Stream (W73) — paginated, cursor-based read-only stream over
 * `<tenant_schema>.audit_events`. Supports time-window + module + action +
 * actor + resource filters and returns an opaque cursor for the next page.
 *
 * The cursor is a base64url-encoded JSON `{ ts, id }` tuple representing the
 * trailing edge of the previous page. Order is `(occurred_at DESC, event_id DESC)`.
 *
 * Tenant-safe (regex-guarded schema). Read-only — no writes.
 */
import type { DbClient } from '../../db/runner';

export interface AuditEventRow {
  eventId: string;
  occurredAt: string;
  actorId: string | null;
  module: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
}

export interface StreamCursor {
  ts: string;
  id: string;
}

export interface ListAuditEventsInput {
  tenantSchema: string;
  module?: string;
  action?: string;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  occurredFrom?: string;
  occurredTo?: string;
  cursor?: string;
  limit?: number;
}

export interface ListAuditEventsResult {
  rows: AuditEventRow[];
  nextCursor: string | null;
  total?: number;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `event_id, occurred_at, actor_id, module, action,
              resource_type, resource_id, before, after, context`;

const mapRow = (x: {
  event_id: string; occurred_at: string; actor_id: string | null;
  module: string; action: string;
  resource_type: string | null; resource_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
}): AuditEventRow => ({
  eventId: x.event_id, occurredAt: x.occurred_at, actorId: x.actor_id,
  module: x.module, action: x.action,
  resourceType: x.resource_type, resourceId: x.resource_id,
  before: x.before, after: x.after, context: x.context,
});

export function encodeCursor(c: StreamCursor): string {
  const json = JSON.stringify({ ts: c.ts, id: c.id });
  return Buffer.from(json, 'utf8').toString('base64url');
}

export function decodeCursor(s: string): StreamCursor {
  try {
    const json = Buffer.from(s, 'base64url').toString('utf8');
    const obj = JSON.parse(json);
    if (typeof obj?.ts !== 'string' || typeof obj?.id !== 'string') {
      throw new Error('cursor must have ts+id');
    }
    return { ts: obj.ts, id: obj.id };
  } catch (e) {
    throw Object.assign(
      new Error(`bad cursor: ${(e as Error).message}`),
      { code: 'bad_cursor' },
    );
  }
}

export async function listAuditEvents(
  client: DbClient, input: ListAuditEventsInput,
): Promise<ListAuditEventsResult> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.module) { params.push(input.module); where += ` AND module = $${params.length}`; }
  if (input.action) { params.push(input.action); where += ` AND action = $${params.length}`; }
  if (input.actorId) { params.push(input.actorId); where += ` AND actor_id = $${params.length}`; }
  if (input.resourceType) {
    params.push(input.resourceType); where += ` AND resource_type = $${params.length}`;
  }
  if (input.resourceId) {
    params.push(input.resourceId); where += ` AND resource_id = $${params.length}`;
  }
  if (input.occurredFrom) {
    params.push(input.occurredFrom); where += ` AND occurred_at >= $${params.length}`;
  }
  if (input.occurredTo) {
    params.push(input.occurredTo); where += ` AND occurred_at < $${params.length}`;
  }
  if (input.cursor) {
    const c = decodeCursor(input.cursor);
    params.push(c.ts); const tsIdx = params.length;
    params.push(c.id); const idIdx = params.length;
    where += ` AND (occurred_at < $${tsIdx} OR (occurred_at = $${tsIdx} AND event_id < $${idIdx}))`;
  }
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".audit_events
      WHERE ${where} ORDER BY occurred_at DESC, event_id DESC
      LIMIT ${limit + 1}`,
    params,
  );
  const all = r.rows.map(mapRow as never) as AuditEventRow[];
  const hasMore = all.length > limit;
  const page = hasMore ? all.slice(0, limit) : all;
  let nextCursor: string | null = null;
  if (hasMore && page.length > 0) {
    const last = page[page.length - 1];
    nextCursor = encodeCursor({ ts: last.occurredAt, id: last.eventId });
  }
  return { rows: page, nextCursor };
}

export async function countAuditEvents(
  client: DbClient, input: Omit<ListAuditEventsInput, 'cursor' | 'limit'>,
): Promise<number> {
  assertSchema(input.tenantSchema);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.module) { params.push(input.module); where += ` AND module = $${params.length}`; }
  if (input.action) { params.push(input.action); where += ` AND action = $${params.length}`; }
  if (input.actorId) { params.push(input.actorId); where += ` AND actor_id = $${params.length}`; }
  if (input.resourceType) {
    params.push(input.resourceType); where += ` AND resource_type = $${params.length}`;
  }
  if (input.resourceId) {
    params.push(input.resourceId); where += ` AND resource_id = $${params.length}`;
  }
  if (input.occurredFrom) {
    params.push(input.occurredFrom); where += ` AND occurred_at >= $${params.length}`;
  }
  if (input.occurredTo) {
    params.push(input.occurredTo); where += ` AND occurred_at < $${params.length}`;
  }
  const r = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".audit_events WHERE ${where}`,
    params,
  );
  return Number(r.rows[0]?.n ?? 0);
}
