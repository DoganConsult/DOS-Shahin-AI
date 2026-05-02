/**
 * Roadmap service — tenant-scoped CRUD over `<tenant_schema>.compliance_roadmap`.
 *
 * status enum: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'at_risk'
 * Default 'planned' (matches schema default).
 */
import type { DbClient } from '../../db/runner';

export type RoadmapStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'at_risk';

export interface RoadmapRow {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  milestoneType: string;
  targetDate: string | null;
  actualDate: string | null;
  status: RoadmapStatus;
  dependencies: unknown[];
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListRoadmapInput {
  tenantSchema: string;
  tenantId: string;
  milestoneType?: string;
  status?: RoadmapStatus;
  ownerId?: string;
  limit?: number;
  offset?: number;
}

export interface CreateRoadmapInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  title: string;
  milestoneType: string;
  description?: string | null;
  targetDate?: string | null;
  status?: RoadmapStatus;
  dependencies?: unknown[];
  ownerId?: string | null;
}

export interface UpdateRoadmapStatusInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
  status: RoadmapStatus;
  /** When status=completed and actualDate is omitted, server stamps NOW(). */
  actualDate?: string | null;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;
const STATUSES: ReadonlySet<RoadmapStatus> = new Set([
  'planned', 'in_progress', 'completed', 'cancelled', 'at_risk',
]);

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}
function assertStatus(s: string): asserts s is RoadmapStatus {
  if (!STATUSES.has(s as RoadmapStatus)) throw Object.assign(new Error(`bad_status:${s}`), { code: 'bad_status' });
}

const COLS = `id, tenant_id, title, description, milestone_type,
              target_date, actual_date, status, dependencies, owner_id,
              created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; title: string;
  description: string | null; milestone_type: string;
  target_date: string | null; actual_date: string | null;
  status: RoadmapStatus; dependencies: unknown[]; owner_id: string | null;
  created_at: string; updated_at: string;
}): RoadmapRow => ({
  id: x.id, tenantId: x.tenant_id, title: x.title,
  description: x.description, milestoneType: x.milestone_type,
  targetDate: x.target_date, actualDate: x.actual_date,
  status: x.status, dependencies: x.dependencies ?? [],
  ownerId: x.owner_id,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listRoadmap(
  client: DbClient,
  input: ListRoadmapInput,
): Promise<{ rows: RoadmapRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.milestoneType) { params.push(input.milestoneType); where += ` AND milestone_type = $${params.length}`; }
  if (input.status) { assertStatus(input.status); params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.ownerId) { params.push(input.ownerId); where += ` AND owner_id = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_roadmap
     WHERE ${where} ORDER BY COALESCE(target_date, '9999-12-31') ASC, created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_roadmap WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getRoadmap(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<RoadmapRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_roadmap
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createRoadmap(
  client: DbClient,
  input: CreateRoadmapInput,
): Promise<RoadmapRow> {
  assertSchema(input.tenantSchema);
  if (!input.title || !input.milestoneType) {
    throw Object.assign(new Error('title and milestoneType required'), { code: 'bad_input' });
  }
  if (input.status) assertStatus(input.status);
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_roadmap
       (tenant_id, title, description, milestone_type,
        target_date, status, dependencies, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.title, input.description ?? null,
      input.milestoneType, input.targetDate ?? null,
      input.status ?? 'planned',
      JSON.stringify(input.dependencies ?? []),
      input.ownerId ?? null,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateRoadmapStatus(
  client: DbClient,
  input: UpdateRoadmapStatusInput,
): Promise<RoadmapRow | null> {
  assertSchema(input.tenantSchema);
  assertStatus(input.status);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_roadmap
        SET status = $3,
            actual_date = CASE
              WHEN $3 = 'completed' THEN COALESCE($4::date, CURRENT_DATE)
              ELSE COALESCE($4::date, actual_date)
            END,
            updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id, input.status, input.actualDate ?? null],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
