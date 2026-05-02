/**
 * Controls Mapping service — tenant-scoped CRUD over `<tenant_schema>.compliance_controls_mapping`.
 *
 * mapping_status enum: 'active' | 'deprecated' | 'pending_review' | 'broken'
 * effectiveness enum: 'effective' | 'partially_effective' | 'ineffective' | 'not_tested'
 */
import type { DbClient } from '../../db/runner';

export type MappingStatus = 'active' | 'deprecated' | 'pending_review' | 'broken';
export type Effectiveness = 'effective' | 'partially_effective' | 'ineffective' | 'not_tested';

export interface ControlMappingRow {
  id: string;
  tenantId: string;
  requirementId: string;
  controlId: string;
  mappingStatus: MappingStatus;
  effectiveness: Effectiveness | null;
  lastTested: string | null;
  nextTestDate: string | null;
  testerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListControlsMappingInput {
  tenantSchema: string;
  tenantId: string;
  requirementId?: string;
  controlId?: string;
  mappingStatus?: MappingStatus;
  effectiveness?: Effectiveness;
  limit?: number;
  offset?: number;
}

export interface CreateControlMappingInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  requirementId: string;
  controlId: string;
  mappingStatus?: MappingStatus;
  effectiveness?: Effectiveness | null;
  lastTested?: string | null;
  nextTestDate?: string | null;
  testerId?: string | null;
}

export interface RecordTestInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
  effectiveness: Effectiveness;
  lastTested?: string | null;
  nextTestDate?: string | null;
  testerId?: string | null;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;
const STATUSES: ReadonlySet<MappingStatus> = new Set([
  'active', 'deprecated', 'pending_review', 'broken',
]);
const EFFECTIVENESS: ReadonlySet<Effectiveness> = new Set([
  'effective', 'partially_effective', 'ineffective', 'not_tested',
]);

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}
function assertStatus(s: string): asserts s is MappingStatus {
  if (!STATUSES.has(s as MappingStatus)) throw Object.assign(new Error(`bad_status:${s}`), { code: 'bad_status' });
}
function assertEffectiveness(s: string): asserts s is Effectiveness {
  if (!EFFECTIVENESS.has(s as Effectiveness)) throw Object.assign(new Error(`bad_effectiveness:${s}`), { code: 'bad_effectiveness' });
}

const COLS = `id, tenant_id, requirement_id, control_id, mapping_status,
              effectiveness, last_tested, next_test_date, tester_id,
              created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; requirement_id: string;
  control_id: string; mapping_status: MappingStatus;
  effectiveness: Effectiveness | null;
  last_tested: string | null; next_test_date: string | null;
  tester_id: string | null;
  created_at: string; updated_at: string;
}): ControlMappingRow => ({
  id: x.id, tenantId: x.tenant_id, requirementId: x.requirement_id,
  controlId: x.control_id, mappingStatus: x.mapping_status,
  effectiveness: x.effectiveness,
  lastTested: x.last_tested, nextTestDate: x.next_test_date,
  testerId: x.tester_id,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listControlsMapping(
  client: DbClient,
  input: ListControlsMappingInput,
): Promise<{ rows: ControlMappingRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.requirementId) { params.push(input.requirementId); where += ` AND requirement_id = $${params.length}`; }
  if (input.controlId) { params.push(input.controlId); where += ` AND control_id = $${params.length}`; }
  if (input.mappingStatus) { assertStatus(input.mappingStatus); params.push(input.mappingStatus); where += ` AND mapping_status = $${params.length}`; }
  if (input.effectiveness) { assertEffectiveness(input.effectiveness); params.push(input.effectiveness); where += ` AND effectiveness = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_controls_mapping
     WHERE ${where} ORDER BY updated_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_controls_mapping WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getControlMapping(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<ControlMappingRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_controls_mapping
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createControlMapping(
  client: DbClient,
  input: CreateControlMappingInput,
): Promise<ControlMappingRow> {
  assertSchema(input.tenantSchema);
  if (!input.requirementId || !input.controlId) {
    throw Object.assign(new Error('requirementId and controlId required'), { code: 'bad_input' });
  }
  if (input.mappingStatus) assertStatus(input.mappingStatus);
  if (input.effectiveness) assertEffectiveness(input.effectiveness);
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_controls_mapping
       (tenant_id, requirement_id, control_id, mapping_status,
        effectiveness, last_tested, next_test_date, tester_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.requirementId, input.controlId,
      input.mappingStatus ?? 'active',
      input.effectiveness ?? null,
      input.lastTested ?? null, input.nextTestDate ?? null,
      input.testerId ?? null,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function recordControlTest(
  client: DbClient,
  input: RecordTestInput,
): Promise<ControlMappingRow | null> {
  assertSchema(input.tenantSchema);
  assertEffectiveness(input.effectiveness);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_controls_mapping
        SET effectiveness = $3,
            last_tested = COALESCE($4::date, CURRENT_DATE),
            next_test_date = COALESCE($5::date, next_test_date),
            tester_id = COALESCE($6, tester_id),
            updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [
      input.tenantId, input.id, input.effectiveness,
      input.lastTested ?? null, input.nextTestDate ?? null,
      input.testerId ?? null,
    ],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
