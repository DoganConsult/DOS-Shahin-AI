/**
 * Exceptions service — tenant-scoped CRUD over `<tenant_schema>.compliance_exceptions`.
 *
 * Status enum: 'pending' | 'approved' | 'rejected' | 'expired' | 'revoked'
 * Default status 'pending' (matches schema default).
 */
import type { DbClient } from '../../db/runner';

export type ExceptionStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'revoked';

export interface ExceptionRow {
  id: string;
  tenantId: string;
  requirementId: string;
  exceptionType: string;
  justification: string | null;
  riskAssessment: string | null;
  compensatingControls: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  validFrom: string | null;
  validTo: string | null;
  status: ExceptionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListExceptionsInput {
  tenantSchema: string;
  tenantId: string;
  requirementId?: string;
  exceptionType?: string;
  status?: ExceptionStatus;
  limit?: number;
  offset?: number;
}

export interface CreateExceptionInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  requirementId: string;
  exceptionType: string;
  justification?: string | null;
  riskAssessment?: string | null;
  compensatingControls?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  status?: ExceptionStatus;
}

export interface UpdateExceptionStatusInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
  status: ExceptionStatus;
  /** When transitioning to 'approved', the approver id (defaults to actorId). */
  approvedBy?: string;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;
const STATUSES: ReadonlySet<ExceptionStatus> = new Set([
  'pending', 'approved', 'rejected', 'expired', 'revoked',
]);

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}
function assertStatus(s: string): asserts s is ExceptionStatus {
  if (!STATUSES.has(s as ExceptionStatus)) throw Object.assign(new Error(`bad_status:${s}`), { code: 'bad_status' });
}

const COLS = `id, tenant_id, requirement_id, exception_type, justification,
              risk_assessment, compensating_controls, approved_by, approved_at,
              valid_from, valid_to, status, created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; requirement_id: string;
  exception_type: string; justification: string | null;
  risk_assessment: string | null; compensating_controls: string | null;
  approved_by: string | null; approved_at: string | null;
  valid_from: string | null; valid_to: string | null;
  status: ExceptionStatus; created_at: string; updated_at: string;
}): ExceptionRow => ({
  id: x.id, tenantId: x.tenant_id, requirementId: x.requirement_id,
  exceptionType: x.exception_type, justification: x.justification,
  riskAssessment: x.risk_assessment, compensatingControls: x.compensating_controls,
  approvedBy: x.approved_by, approvedAt: x.approved_at,
  validFrom: x.valid_from, validTo: x.valid_to,
  status: x.status, createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listExceptions(
  client: DbClient,
  input: ListExceptionsInput,
): Promise<{ rows: ExceptionRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.requirementId) { params.push(input.requirementId); where += ` AND requirement_id = $${params.length}`; }
  if (input.exceptionType) { params.push(input.exceptionType); where += ` AND exception_type = $${params.length}`; }
  if (input.status) { assertStatus(input.status); params.push(input.status); where += ` AND status = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_exceptions
     WHERE ${where} ORDER BY updated_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_exceptions WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getException(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<ExceptionRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_exceptions
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createException(
  client: DbClient,
  input: CreateExceptionInput,
): Promise<ExceptionRow> {
  assertSchema(input.tenantSchema);
  if (!input.requirementId || !input.exceptionType) {
    throw Object.assign(new Error('requirementId and exceptionType required'), { code: 'bad_input' });
  }
  if (input.status) assertStatus(input.status);
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_exceptions
       (tenant_id, requirement_id, exception_type, justification,
        risk_assessment, compensating_controls, valid_from, valid_to, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.requirementId, input.exceptionType,
      input.justification ?? null, input.riskAssessment ?? null,
      input.compensatingControls ?? null,
      input.validFrom ?? null, input.validTo ?? null,
      input.status ?? 'pending',
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateExceptionStatus(
  client: DbClient,
  input: UpdateExceptionStatusInput,
): Promise<ExceptionRow | null> {
  assertSchema(input.tenantSchema);
  assertStatus(input.status);
  // approved_by + approved_at populated only on transition to 'approved'.
  const setApproval = input.status === 'approved';
  const approvedBy = setApproval ? (input.approvedBy ?? input.actorId) : null;
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_exceptions
        SET status = $3,
            approved_by = CASE WHEN $3 = 'approved' THEN $4 ELSE approved_by END,
            approved_at = CASE WHEN $3 = 'approved' THEN NOW() ELSE approved_at END,
            updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id, input.status, approvedBy],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export const __testing__ = { SCHEMA_RE, STATUSES, assertSchema, assertStatus };
