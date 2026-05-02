/**
 * UCF-Controls service — Unified Control Framework catalog over
 * `<tenant_schema>.ucf_controls`.
 */
import type { DbClient } from '../../db/runner';

export type UcfLifecycleState = 'draft' | 'active' | 'deprecated' | 'retired';
const STATES: ReadonlyArray<UcfLifecycleState> = ['draft', 'active', 'deprecated', 'retired'];

export interface UcfControlRow {
  controlId: string;
  code: string;
  objectiveEn: string | null;
  objectiveAr: string | null;
  activityEn: string | null;
  activityAr: string | null;
  owner: string | null;
  frequency: string | null;
  evidenceRequirements: unknown[];
  testSteps: unknown[];
  exceptionRules: unknown[];
  lifecycleState: UcfLifecycleState;
  createdAt: string;
  updatedAt: string;
}

export interface ListUcfControlsInput {
  tenantSchema: string;
  lifecycleState?: UcfLifecycleState;
  owner?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateUcfControlInput {
  tenantSchema: string;
  actorId: string;
  code: string;
  objectiveEn?: string | null;
  objectiveAr?: string | null;
  activityEn?: string | null;
  activityAr?: string | null;
  owner?: string | null;
  frequency?: string | null;
  evidenceRequirements?: unknown[];
  testSteps?: unknown[];
  exceptionRules?: unknown[];
}

export interface UpdateUcfControlInput {
  tenantSchema: string;
  actorId: string;
  controlId: string;
  objectiveEn?: string | null;
  objectiveAr?: string | null;
  activityEn?: string | null;
  activityAr?: string | null;
  owner?: string | null;
  frequency?: string | null;
  evidenceRequirements?: unknown[];
  testSteps?: unknown[];
  exceptionRules?: unknown[];
}

export interface UpdateUcfLifecycleInput {
  tenantSchema: string;
  actorId: string;
  controlId: string;
  lifecycleState: UcfLifecycleState;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `control_id, code, objective_en, objective_ar, activity_en, activity_ar,
              owner, frequency, evidence_requirements, test_steps, exception_rules,
              lifecycle_state, created_at, updated_at`;

const j = <T>(v: unknown, fb: T): T =>
  typeof v === 'string' ? JSON.parse(v) as T : ((v as T) ?? fb);

const mapRow = (x: {
  control_id: string; code: string;
  objective_en: string | null; objective_ar: string | null;
  activity_en: string | null; activity_ar: string | null;
  owner: string | null; frequency: string | null;
  evidence_requirements: unknown; test_steps: unknown; exception_rules: unknown;
  lifecycle_state: string; created_at: string; updated_at: string;
}): UcfControlRow => ({
  controlId: x.control_id, code: x.code,
  objectiveEn: x.objective_en, objectiveAr: x.objective_ar,
  activityEn: x.activity_en, activityAr: x.activity_ar,
  owner: x.owner, frequency: x.frequency,
  evidenceRequirements: j<unknown[]>(x.evidence_requirements, []),
  testSteps: j<unknown[]>(x.test_steps, []),
  exceptionRules: j<unknown[]>(x.exception_rules, []),
  lifecycleState: x.lifecycle_state as UcfLifecycleState,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listUcfControls(
  client: DbClient,
  input: ListUcfControlsInput,
): Promise<{ rows: UcfControlRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.lifecycleState) { params.push(input.lifecycleState); where += ` AND lifecycle_state = $${params.length}`; }
  if (input.owner) { params.push(input.owner); where += ` AND owner = $${params.length}`; }
  if (input.search) {
    params.push(`%${input.search}%`);
    where += ` AND (code ILIKE $${params.length} OR objective_en ILIKE $${params.length} OR activity_en ILIKE $${params.length})`;
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".ucf_controls
     WHERE ${where} ORDER BY code ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".ucf_controls WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getUcfControl(
  client: DbClient,
  input: { tenantSchema: string; controlId: string },
): Promise<UcfControlRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".ucf_controls
     WHERE control_id = $1`,
    [input.controlId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createUcfControl(
  client: DbClient,
  input: CreateUcfControlInput,
): Promise<UcfControlRow> {
  assertSchema(input.tenantSchema);
  if (!input.code) {
    throw Object.assign(new Error('code required'), { code: 'bad_input' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".ucf_controls
       (code, objective_en, objective_ar, activity_en, activity_ar,
        owner, frequency, evidence_requirements, test_steps, exception_rules)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING ${COLS}`,
    [
      input.code,
      input.objectiveEn ?? null, input.objectiveAr ?? null,
      input.activityEn ?? null, input.activityAr ?? null,
      input.owner ?? null, input.frequency ?? null,
      JSON.stringify(input.evidenceRequirements ?? []),
      JSON.stringify(input.testSteps ?? []),
      JSON.stringify(input.exceptionRules ?? []),
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateUcfControl(
  client: DbClient,
  input: UpdateUcfControlInput,
): Promise<UcfControlRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".ucf_controls
        SET objective_en = COALESCE($2, objective_en),
            objective_ar = COALESCE($3, objective_ar),
            activity_en = COALESCE($4, activity_en),
            activity_ar = COALESCE($5, activity_ar),
            owner = COALESCE($6, owner),
            frequency = COALESCE($7, frequency),
            evidence_requirements = COALESCE($8::jsonb, evidence_requirements),
            test_steps = COALESCE($9::jsonb, test_steps),
            exception_rules = COALESCE($10::jsonb, exception_rules),
            updated_at = NOW()
      WHERE control_id = $1
      RETURNING ${COLS}`,
    [
      input.controlId,
      input.objectiveEn ?? null, input.objectiveAr ?? null,
      input.activityEn ?? null, input.activityAr ?? null,
      input.owner ?? null, input.frequency ?? null,
      input.evidenceRequirements !== undefined ? JSON.stringify(input.evidenceRequirements) : null,
      input.testSteps !== undefined ? JSON.stringify(input.testSteps) : null,
      input.exceptionRules !== undefined ? JSON.stringify(input.exceptionRules) : null,
    ],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function updateUcfLifecycle(
  client: DbClient,
  input: UpdateUcfLifecycleInput,
): Promise<UcfControlRow | null> {
  assertSchema(input.tenantSchema);
  if (!STATES.includes(input.lifecycleState)) {
    throw Object.assign(new Error(`bad lifecycle_state: ${input.lifecycleState}`), { code: 'bad_state' });
  }
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".ucf_controls
        SET lifecycle_state = $2, updated_at = NOW()
      WHERE control_id = $1
      RETURNING ${COLS}`,
    [input.controlId, input.lifecycleState],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function deleteUcfControl(
  client: DbClient,
  input: { tenantSchema: string; controlId: string },
): Promise<UcfControlRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".ucf_controls
      WHERE control_id = $1
      RETURNING ${COLS}`,
    [input.controlId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
