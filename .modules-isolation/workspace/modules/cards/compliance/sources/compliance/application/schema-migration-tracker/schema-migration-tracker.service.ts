/**
 * Schema-Migration-Tracker (W72) — per-tenant journal of DDL migrations
 * applied to `<tenant_schema>.schema_migrations`.
 *
 * Each row carries a migration_id (caller-supplied stable code), version
 * (monotonic int), checksum (SHA-256 of script body), status enum, and
 * timestamps. Re-applying the same migration_id with the same checksum
 * is idempotent. Re-applying with a different checksum is rejected
 * (`bad_checksum`).
 *
 * Status enum: applied | failed | rolled_back
 *
 * Tenant-safe (regex-guarded schema). Pure deterministic logic.
 */
import type { DbClient } from '../../db/runner';

export type MigrationStatus = 'applied' | 'failed' | 'rolled_back';
const STATUSES: ReadonlyArray<MigrationStatus> = ['applied', 'failed', 'rolled_back'];

export interface MigrationRow {
  migrationId: string;
  version: number;
  checksum: string;
  status: MigrationStatus;
  appliedAt: string;
  appliedBy: string;
  durationMs: number;
  error: string | null;
}

export interface RecordMigrationInput {
  tenantSchema: string;
  actorId: string;
  migrationId: string;
  version: number;
  checksum: string;
  status?: MigrationStatus;
  durationMs?: number;
  error?: string;
}

export interface ListMigrationsInput {
  tenantSchema: string;
  status?: MigrationStatus;
  sinceVersion?: number;
  limit?: number;
  offset?: number;
}

export interface RollbackInput {
  tenantSchema: string;
  actorId: string;
  migrationId: string;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `migration_id, version, checksum, status, applied_at,
              applied_by, duration_ms, error`;

const mapRow = (x: {
  migration_id: string; version: string | number; checksum: string;
  status: string; applied_at: string; applied_by: string;
  duration_ms: string | number; error: string | null;
}): MigrationRow => ({
  migrationId: x.migration_id, version: Number(x.version),
  checksum: x.checksum, status: x.status as MigrationStatus,
  appliedAt: x.applied_at, appliedBy: x.applied_by,
  durationMs: Number(x.duration_ms), error: x.error,
});

export async function getMigration(
  client: DbClient,
  input: { tenantSchema: string; migrationId: string },
): Promise<MigrationRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".schema_migrations
      WHERE migration_id = $1`,
    [input.migrationId],
  );
  return r.rowCount === 0 ? null : mapRow(r.rows[0] as never);
}

export async function recordMigration(
  client: DbClient, input: RecordMigrationInput,
): Promise<MigrationRow> {
  assertSchema(input.tenantSchema);
  if (!input.migrationId || !input.checksum) {
    throw Object.assign(
      new Error('migrationId and checksum required'),
      { code: 'bad_input' },
    );
  }
  if (!Number.isFinite(input.version) || input.version <= 0) {
    throw Object.assign(
      new Error(`version ${input.version} must be > 0`),
      { code: 'bad_input' },
    );
  }
  const status = input.status ?? 'applied';
  if (!STATUSES.includes(status)) {
    throw Object.assign(new Error(`bad status ${status}`), { code: 'bad_status' });
  }
  const existing = await getMigration(client, {
    tenantSchema: input.tenantSchema, migrationId: input.migrationId,
  });
  if (existing) {
    if (existing.checksum !== input.checksum && existing.status === 'applied') {
      throw Object.assign(
        new Error(
          `migration ${input.migrationId} checksum mismatch ` +
          `(existing=${existing.checksum} new=${input.checksum})`,
        ),
        { code: 'bad_checksum' },
      );
    }
    return existing;
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".schema_migrations
       (migration_id, version, checksum, status, applied_at, applied_by,
        duration_ms, error)
     VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)
     RETURNING ${COLS}`,
    [
      input.migrationId, input.version, input.checksum, status,
      input.actorId, input.durationMs ?? 0, input.error ?? null,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function rollbackMigration(
  client: DbClient, input: RollbackInput,
): Promise<MigrationRow> {
  assertSchema(input.tenantSchema);
  const cur = await getMigration(client, {
    tenantSchema: input.tenantSchema, migrationId: input.migrationId,
  });
  if (!cur) {
    throw Object.assign(
      new Error(`migration ${input.migrationId} not found`),
      { code: 'not_found' },
    );
  }
  if (cur.status === 'rolled_back') return cur;
  if (cur.status === 'failed') {
    throw Object.assign(
      new Error(`migration ${input.migrationId} is failed, cannot rollback`),
      { code: 'bad_state' },
    );
  }
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".schema_migrations
        SET status = 'rolled_back'
      WHERE migration_id = $1
      RETURNING ${COLS}`,
    [input.migrationId],
  );
  return mapRow(r.rows[0] as never);
}

export async function listMigrations(
  client: DbClient, input: ListMigrationsInput,
): Promise<{ rows: MigrationRow[]; total: number; latestVersion: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.sinceVersion !== undefined) {
    params.push(input.sinceVersion);
    where += ` AND version > $${params.length}`;
  }
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".schema_migrations
      WHERE ${where} ORDER BY version DESC LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".schema_migrations WHERE ${where}`,
    params,
  );
  const latestR = await client.query<{ v: string | number | null }>(
    `SELECT MAX(version) AS v FROM "${input.tenantSchema}".schema_migrations
      WHERE status = 'applied'`,
    [],
  );
  const latest = latestR.rows[0]?.v;
  return {
    rows: r.rows.map(mapRow as never),
    total: Number(totalR.rows[0]?.n ?? 0),
    latestVersion: latest === null || latest === undefined ? 0 : Number(latest),
  };
}

export const MIGRATION_STATUSES = STATUSES;
