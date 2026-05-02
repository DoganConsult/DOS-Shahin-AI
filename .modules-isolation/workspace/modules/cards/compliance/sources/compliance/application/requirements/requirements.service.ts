/**
 * Requirements service — tenant-scoped CRUD over `<tenant_schema>.compliance_requirements`.
 *
 * Same discipline as W9–W12: strict `tenant_<id>` schema regex, never embeds
 * the schema as user data. Criticality enum: low|medium|high|critical.
 */
import type { DbClient } from '../../db/runner';

export type RequirementCriticality = 'low' | 'medium' | 'high' | 'critical';

export interface RequirementRow {
  id: string;
  tenantId: string;
  frameworkId: string;
  refCode: string;
  title: string;
  description: string | null;
  category: string | null;
  criticality: RequirementCriticality;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ListRequirementsInput {
  tenantSchema: string;
  tenantId: string;
  frameworkId?: string;
  criticality?: RequirementCriticality;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateRequirementInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  frameworkId: string;
  refCode: string;
  title: string;
  description?: string | null;
  category?: string | null;
  criticality?: RequirementCriticality;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;
const CRITS: ReadonlySet<RequirementCriticality> = new Set(['low', 'medium', 'high', 'critical']);

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}
function assertCriticality(s: string): asserts s is RequirementCriticality {
  if (!CRITS.has(s as RequirementCriticality)) throw Object.assign(new Error(`bad_criticality:${s}`), { code: 'bad_criticality' });
}

const COLS = `id, tenant_id, framework_id, ref_code, title, description,
              category, criticality, is_active, metadata, created_at`;

const mapRow = (x: {
  id: string; tenant_id: string; framework_id: string; ref_code: string;
  title: string; description: string | null; category: string | null;
  criticality: RequirementCriticality; is_active: boolean;
  metadata: Record<string, unknown>; created_at: string;
}): RequirementRow => ({
  id: x.id, tenantId: x.tenant_id, frameworkId: x.framework_id, refCode: x.ref_code,
  title: x.title, description: x.description, category: x.category,
  criticality: x.criticality, isActive: x.is_active,
  metadata: x.metadata ?? {}, createdAt: x.created_at,
});

export async function listRequirements(
  client: DbClient,
  input: ListRequirementsInput,
): Promise<{ rows: RequirementRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.frameworkId) { params.push(input.frameworkId); where += ` AND framework_id = $${params.length}`; }
  if (input.criticality) { assertCriticality(input.criticality); params.push(input.criticality); where += ` AND criticality = $${params.length}`; }
  if (typeof input.isActive === 'boolean') { params.push(input.isActive); where += ` AND is_active = $${params.length}`; }
  if (input.search) {
    params.push(`%${input.search}%`);
    where += ` AND (ref_code ILIKE $${params.length} OR title ILIKE $${params.length})`;
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_requirements
     WHERE ${where} ORDER BY ref_code ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_requirements WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getRequirement(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<RequirementRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_requirements
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createRequirement(
  client: DbClient,
  input: CreateRequirementInput,
): Promise<RequirementRow> {
  assertSchema(input.tenantSchema);
  if (!input.frameworkId || !input.refCode || !input.title) {
    throw Object.assign(new Error('frameworkId, refCode and title required'), { code: 'bad_input' });
  }
  if (input.criticality) assertCriticality(input.criticality);
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_requirements
       (tenant_id, framework_id, ref_code, title, description, category,
        criticality, is_active, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.frameworkId, input.refCode, input.title,
      input.description ?? null, input.category ?? null,
      input.criticality ?? 'medium', input.isActive ?? true,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  return mapRow(r.rows[0] as never);
}

export const __testing__ = { SCHEMA_RE, CRITS, assertSchema, assertCriticality };
