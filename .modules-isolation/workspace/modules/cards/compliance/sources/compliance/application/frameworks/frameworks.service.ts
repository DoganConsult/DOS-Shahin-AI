/**
 * Frameworks service — tenant-scoped CRUD over `<tenant_schema>.compliance_frameworks`.
 *
 * Same discipline as W9 controls: strict `tenant_<id>` schema regex, never
 * embeds the schema as user data. UNIQUE(tenant_id, code) is enforced at DB
 * level; the service maps the duplicate-key error to a `duplicate_code`
 * application code so callers can return 409.
 */
import type { DbClient } from '../../db/runner';

export interface FrameworkRow {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  version: string | null;
  authority: string | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ListFrameworksInput {
  tenantSchema: string;
  tenantId: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateFrameworkInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  code: string;
  name: string;
  version?: string;
  authority?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

const assertSchema = (s: string): void => {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
};

const mapRow = (x: {
  id: string; tenant_id: string; code: string; name: string;
  version: string | null; authority: string | null;
  is_active: boolean; metadata: Record<string, unknown>; created_at: string;
}): FrameworkRow => ({
  id: x.id, tenantId: x.tenant_id, code: x.code, name: x.name,
  version: x.version, authority: x.authority,
  isActive: x.is_active, metadata: x.metadata ?? {}, createdAt: x.created_at,
});

export async function listFrameworks(
  client: DbClient,
  input: ListFrameworksInput,
): Promise<{ rows: FrameworkRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (typeof input.isActive === 'boolean') {
    params.push(input.isActive); where += ` AND is_active = $${params.length}`;
  }
  if (input.search) {
    params.push(`%${input.search}%`); where += ` AND (code ILIKE $${params.length} OR name ILIKE $${params.length})`;
  }
  const rows = await client.query<{
    id: string; tenant_id: string; code: string; name: string;
    version: string | null; authority: string | null;
    is_active: boolean; metadata: Record<string, unknown>; created_at: string;
  }>(
    `SELECT id, tenant_id, code, name, version, authority, is_active, metadata, created_at
     FROM "${input.tenantSchema}".compliance_frameworks
     WHERE ${where}
     ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_frameworks WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getFramework(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<FrameworkRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query<{
    id: string; tenant_id: string; code: string; name: string;
    version: string | null; authority: string | null;
    is_active: boolean; metadata: Record<string, unknown>; created_at: string;
  }>(
    `SELECT id, tenant_id, code, name, version, authority, is_active, metadata, created_at
     FROM "${input.tenantSchema}".compliance_frameworks
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0]);
}

export async function createFramework(
  client: DbClient,
  input: CreateFrameworkInput,
): Promise<FrameworkRow> {
  assertSchema(input.tenantSchema);
  if (!input.code || !input.name) {
    throw Object.assign(new Error('code and name required'), { code: 'bad_input' });
  }
  try {
    const r = await client.query<{
      id: string; tenant_id: string; code: string; name: string;
      version: string | null; authority: string | null;
      is_active: boolean; metadata: Record<string, unknown>; created_at: string;
    }>(
      `INSERT INTO "${input.tenantSchema}".compliance_frameworks
         (tenant_id, code, name, version, authority, is_active, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING id, tenant_id, code, name, version, authority, is_active, metadata, created_at`,
      [
        input.tenantId, input.code, input.name,
        input.version ?? null, input.authority ?? null,
        input.isActive ?? true, JSON.stringify(input.metadata ?? {}),
      ],
    );
    return mapRow(r.rows[0]);
  } catch (err) {
    const e = err as Error & { code?: string };
    // Postgres unique_violation
    if (e.code === '23505' || /duplicate key|UNIQUE constraint/i.test(String(e.message))) {
      throw Object.assign(new Error(`duplicate_code:${input.code}`), { code: 'duplicate_code' });
    }
    throw err;
  }
}

export const __testing__ = { SCHEMA_RE, assertSchema };
