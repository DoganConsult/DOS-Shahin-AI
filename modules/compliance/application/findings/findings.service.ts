/**
 * Findings service — internal/external compliance findings over
 * `<tenant_schema>.findings`. Severity, source, lifecycle status with
 * optional links to control / requirement / gap.
 */
import type { DbClient } from '../../db/runner';

export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';
const SEVERITIES: ReadonlyArray<FindingSeverity> = ['low', 'medium', 'high', 'critical'];

export type FindingSource = 'internal' | 'regulator' | 'audit' | 'self_assessment' | 'monitoring';
const SOURCES: ReadonlyArray<FindingSource> = [
  'internal', 'regulator', 'audit', 'self_assessment', 'monitoring',
];

export type FindingStatus = 'open' | 'in_remediation' | 'remediated' | 'closed' | 'rejected';
const STATUSES: ReadonlyArray<FindingStatus> = [
  'open', 'in_remediation', 'remediated', 'closed', 'rejected',
];

export interface FindingRow {
  findingId: string;
  title: string;
  description: string | null;
  severity: FindingSeverity;
  source: FindingSource;
  status: FindingStatus;
  controlId: string | null;
  requirementId: string | null;
  gapId: string | null;
  ownerUserId: string | null;
  identifiedBy: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListFindingsInput {
  tenantSchema: string;
  severity?: FindingSeverity;
  source?: FindingSource;
  status?: FindingStatus;
  controlId?: string;
  requirementId?: string;
  ownerUserId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateFindingInput {
  tenantSchema: string;
  actorId: string;
  title: string;
  description?: string;
  severity?: FindingSeverity;
  source?: FindingSource;
  status?: FindingStatus;
  controlId?: string;
  requirementId?: string;
  gapId?: string;
  ownerUserId?: string;
  identifiedBy?: string;
}

export interface UpdateFindingStatusInput {
  tenantSchema: string;
  actorId: string;
  findingId: string;
  status: FindingStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `finding_id, title, description, severity, source, status,
              control_id, requirement_id, gap_id, owner_user_id,
              identified_by, closed_at, created_at, updated_at`;

const mapRow = (x: {
  finding_id: string; title: string; description: string | null;
  severity: string; source: string; status: string;
  control_id: string | null; requirement_id: string | null; gap_id: string | null;
  owner_user_id: string | null; identified_by: string | null;
  closed_at: string | null; created_at: string; updated_at: string;
}): FindingRow => ({
  findingId: x.finding_id, title: x.title, description: x.description,
  severity: x.severity as FindingSeverity, source: x.source as FindingSource,
  status: x.status as FindingStatus,
  controlId: x.control_id, requirementId: x.requirement_id, gapId: x.gap_id,
  ownerUserId: x.owner_user_id, identifiedBy: x.identified_by,
  closedAt: x.closed_at, createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listFindings(
  client: DbClient,
  input: ListFindingsInput,
): Promise<{ rows: FindingRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.severity) { params.push(input.severity); where += ` AND severity = $${params.length}`; }
  if (input.source) { params.push(input.source); where += ` AND source = $${params.length}`; }
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.controlId) { params.push(input.controlId); where += ` AND control_id = $${params.length}`; }
  if (input.requirementId) { params.push(input.requirementId); where += ` AND requirement_id = $${params.length}`; }
  if (input.ownerUserId) { params.push(input.ownerUserId); where += ` AND owner_user_id = $${params.length}`; }
  if (input.search) {
    params.push(`%${input.search}%`);
    where += ` AND title ILIKE $${params.length}`;
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".findings
     WHERE ${where} ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".findings WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getFinding(
  client: DbClient,
  input: { tenantSchema: string; findingId: string },
): Promise<FindingRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".findings
     WHERE finding_id = $1`,
    [input.findingId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createFinding(
  client: DbClient,
  input: CreateFindingInput,
): Promise<FindingRow> {
  assertSchema(input.tenantSchema);
  if (!input.title) {
    throw Object.assign(new Error('title required'), { code: 'bad_input' });
  }
  if (input.severity && !SEVERITIES.includes(input.severity)) {
    throw Object.assign(new Error(`bad severity: ${input.severity}`), { code: 'bad_severity' });
  }
  if (input.source && !SOURCES.includes(input.source)) {
    throw Object.assign(new Error(`bad source: ${input.source}`), { code: 'bad_source' });
  }
  if (input.status && !STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".findings
       (title, description, severity, source, status,
        control_id, requirement_id, gap_id, owner_user_id, identified_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING ${COLS}`,
    [
      input.title, input.description ?? null,
      input.severity ?? 'medium',
      input.source ?? 'internal',
      input.status ?? 'open',
      input.controlId ?? null, input.requirementId ?? null, input.gapId ?? null,
      input.ownerUserId ?? null, input.identifiedBy ?? input.actorId,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateFindingStatus(
  client: DbClient,
  input: UpdateFindingStatusInput,
): Promise<FindingRow | null> {
  assertSchema(input.tenantSchema);
  if (!STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const closed = input.status === 'closed' || input.status === 'remediated' || input.status === 'rejected';
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".findings
        SET status     = $2,
            closed_at  = CASE WHEN $3::boolean THEN NOW() ELSE NULL END,
            updated_at = NOW()
      WHERE finding_id = $1
      RETURNING ${COLS}`,
    [input.findingId, input.status, closed],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function deleteFinding(
  client: DbClient,
  input: { tenantSchema: string; findingId: string },
): Promise<FindingRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".findings
      WHERE finding_id = $1
      RETURNING ${COLS}`,
    [input.findingId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
