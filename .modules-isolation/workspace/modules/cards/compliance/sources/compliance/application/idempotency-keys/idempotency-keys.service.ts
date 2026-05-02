/**
 * Idempotency-Keys (W76) — per-tenant idempotent-request store.
 *
 * Backed by `<tenant_schema>.idempotency_keys`:
 *   key TEXT, scope TEXT, request_hash TEXT, response_status INT,
 *   response_body JSONB, created_at TIMESTAMPTZ, ttl_seconds INT,
 *   PRIMARY KEY (scope, key)
 *
 * `recordResult` upserts on first call (returns `{stored:true,...}`); on a
 * second call with the SAME (scope,key) it short-circuits — if requestHash
 * matches, returns the cached result; if requestHash differs, throws
 * `bad_conflict` so the caller can reject the replay safely.
 *
 * `lookup` returns the cached row when present and unexpired.
 * `purgeExpired` deletes rows whose `created_at + ttl_seconds < now()`.
 *
 * Tenant-safe (regex-guarded schema).
 */
import type { DbClient } from '../../db/runner';

export interface IdempotencyRow {
  scope: string;
  key: string;
  requestHash: string;
  responseStatus: number;
  responseBody: Record<string, unknown> | null;
  createdAt: string;
  ttlSeconds: number;
}

export interface RecordResultInput {
  tenantSchema: string;
  actorId: string;
  scope: string;
  key: string;
  requestHash: string;
  responseStatus: number;
  responseBody?: Record<string, unknown> | null;
  ttlSeconds?: number;
}

export interface RecordResultResult {
  stored: boolean;
  conflict: boolean;
  row: IdempotencyRow;
}

export interface LookupInput {
  tenantSchema: string;
  scope: string;
  key: string;
  now?: () => Date;
}

export interface PurgeExpiredInput {
  tenantSchema: string;
  actorId: string;
  now?: () => Date;
}

export interface PurgeExpiredResult {
  scanned: number;
  deleted: number;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `scope, key, request_hash, response_status, response_body,
              created_at, ttl_seconds`;

const mapRow = (x: {
  scope: string; key: string; request_hash: string;
  response_status: string | number;
  response_body: Record<string, unknown> | null;
  created_at: string; ttl_seconds: string | number;
}): IdempotencyRow => ({
  scope: x.scope, key: x.key, requestHash: x.request_hash,
  responseStatus: Number(x.response_status),
  responseBody: x.response_body,
  createdAt: x.created_at, ttlSeconds: Number(x.ttl_seconds),
});

export function isExpired(row: IdempotencyRow, now: Date): boolean {
  const created = Date.parse(row.createdAt);
  if (!Number.isFinite(created)) return false;
  return now.getTime() - created >= row.ttlSeconds * 1_000;
}

export async function lookup(
  client: DbClient, input: LookupInput,
): Promise<IdempotencyRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".idempotency_keys
      WHERE scope = $1 AND key = $2`,
    [input.scope, input.key],
  );
  if (r.rowCount === 0) return null;
  const row = mapRow(r.rows[0] as never);
  const now = input.now ? input.now() : new Date();
  if (isExpired(row, now)) return null;
  return row;
}

export async function recordResult(
  client: DbClient, input: RecordResultInput,
): Promise<RecordResultResult> {
  assertSchema(input.tenantSchema);
  if (!input.scope) {
    throw Object.assign(new Error('scope required'), { code: 'bad_input' });
  }
  if (!input.key) {
    throw Object.assign(new Error('key required'), { code: 'bad_input' });
  }
  if (!input.requestHash) {
    throw Object.assign(new Error('requestHash required'), { code: 'bad_input' });
  }
  if (!Number.isFinite(input.responseStatus)) {
    throw Object.assign(new Error('responseStatus required'), { code: 'bad_input' });
  }
  const ttl = input.ttlSeconds ?? 86_400;
  if (!Number.isFinite(ttl) || ttl <= 0) {
    throw Object.assign(
      new Error(`ttlSeconds ${ttl} must be > 0`),
      { code: 'bad_input' },
    );
  }
  const existing = await lookup(client, {
    tenantSchema: input.tenantSchema, scope: input.scope, key: input.key,
  });
  if (existing) {
    if (existing.requestHash !== input.requestHash) {
      throw Object.assign(
        new Error(
          `idempotency conflict: scope=${input.scope} key=${input.key}`,
        ),
        { code: 'bad_conflict' },
      );
    }
    return { stored: false, conflict: false, row: existing };
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".idempotency_keys
       (scope, key, request_hash, response_status, response_body,
        created_at, ttl_seconds)
     VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), $6)
     RETURNING ${COLS}`,
    [input.scope, input.key, input.requestHash, input.responseStatus,
     JSON.stringify(input.responseBody ?? null), ttl],
  );
  return { stored: true, conflict: false, row: mapRow(r.rows[0] as never) };
}

export async function purgeExpired(
  client: DbClient, input: PurgeExpiredInput,
): Promise<PurgeExpiredResult> {
  assertSchema(input.tenantSchema);
  const now = input.now ? input.now() : new Date();
  const cutoffIso = now.toISOString();
  const scanR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".idempotency_keys`,
    [],
  );
  const scanned = Number(scanR.rows[0]?.n ?? 0);
  const delR = await client.query(
    `DELETE FROM "${input.tenantSchema}".idempotency_keys
      WHERE created_at + (ttl_seconds * INTERVAL '1 second') < $1`,
    [cutoffIso],
  );
  const deleted = (delR as { rowCount?: number }).rowCount ?? 0;
  return { scanned, deleted };
}

export async function listKeys(
  client: DbClient,
  input: { tenantSchema: string; scope?: string; limit?: number; offset?: number },
): Promise<{ rows: IdempotencyRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.scope) { params.push(input.scope); where += ` AND scope = $${params.length}`; }
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".idempotency_keys
      WHERE ${where} ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".idempotency_keys WHERE ${where}`,
    params,
  );
  return { rows: r.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}
