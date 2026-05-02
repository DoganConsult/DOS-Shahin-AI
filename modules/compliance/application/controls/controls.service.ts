/**
 * Controls service — tenant-scoped CRUD over `<tenant_schema>.compliance_controls`.
 *
 * Schema is rendered via the W3 lifecycle's `tenant_<id>` convention. The
 * service never embeds the schema name as user data — it's derived from the
 * tenantId by the host's resolver and validated to a strict identifier shape.
 */
import type { DbClient } from '../../db/runner';

export interface ControlRow {
  id: string;
  tenantId: string;
  status: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface ListControlsInput {
  tenantSchema: string;
  tenantId: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface CreateControlInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

const assertSchema = (s: string): void => {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
};

const mapRow = (x: {
  id: string; tenant_id: string; status: string | null; metadata: Record<string, unknown>;
  created_at: string; updated_at: string; created_by: string | null; updated_by: string | null;
}): ControlRow => ({
  id: x.id, tenantId: x.tenant_id, status: x.status, metadata: x.metadata ?? {},
  createdAt: x.created_at, updatedAt: x.updated_at, createdBy: x.created_by, updatedBy: x.updated_by,
});

export async function listControls(client: DbClient, input: ListControlsInput): Promise<{ rows: ControlRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  const rows = await client.query<{
    id: string; tenant_id: string; status: string | null; metadata: Record<string, unknown>;
    created_at: string; updated_at: string; created_by: string | null; updated_by: string | null;
  }>(
    `SELECT id, tenant_id, status, metadata, created_at, updated_at, created_by, updated_by
     FROM "${input.tenantSchema}".compliance_controls
     WHERE ${where}
     ORDER BY updated_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_controls WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getControl(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<ControlRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query<{
    id: string; tenant_id: string; status: string | null; metadata: Record<string, unknown>;
    created_at: string; updated_at: string; created_by: string | null; updated_by: string | null;
  }>(
    `SELECT id, tenant_id, status, metadata, created_at, updated_at, created_by, updated_by
     FROM "${input.tenantSchema}".compliance_controls
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0]);
}

export async function createControl(client: DbClient, input: CreateControlInput): Promise<ControlRow> {
  assertSchema(input.tenantSchema);
  const r = await client.query<{
    id: string; tenant_id: string; status: string | null; metadata: Record<string, unknown>;
    created_at: string; updated_at: string; created_by: string | null; updated_by: string | null;
  }>(
    `INSERT INTO "${input.tenantSchema}".compliance_controls
       (tenant_id, status, metadata, created_by, updated_by)
     VALUES ($1, $2, $3::jsonb, $4, $4)
     RETURNING id, tenant_id, status, metadata, created_at, updated_at, created_by, updated_by`,
    [input.tenantId, input.status ?? null, JSON.stringify(input.metadata ?? {}), input.actorId],
  );
  return mapRow(r.rows[0]);
}

export const __testing__ = { SCHEMA_RE, assertSchema };
