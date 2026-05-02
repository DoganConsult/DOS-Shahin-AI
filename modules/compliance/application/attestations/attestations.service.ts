/**
 * Attestations service — tenant-scoped CRUD over `<tenant_schema>.compliance_attestations`.
 *
 * status enum: 'active' | 'expired' | 'revoked' | 'pending'
 * Status defaults to 'active' (per existing schema default).
 */
import type { DbClient } from '../../db/runner';

export type AttestationStatus = 'active' | 'expired' | 'revoked' | 'pending';

export interface AttestationRow {
  id: string;
  tenantId: string;
  frameworkId: string;
  attestationType: string;
  attestedBy: string;
  attestedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  status: AttestationStatus;
  declaration: string | null;
  evidenceRefs: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface ListAttestationsInput {
  tenantSchema: string;
  tenantId: string;
  frameworkId?: string;
  attestationType?: string;
  status?: AttestationStatus;
  attestedBy?: string;
  limit?: number;
  offset?: number;
}

export interface CreateAttestationInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  frameworkId: string;
  attestationType: string;
  attestedBy?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  status?: AttestationStatus;
  declaration?: string | null;
  evidenceRefs?: unknown[];
}

export interface UpdateAttestationStatusInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
  status: AttestationStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;
const STATUSES: ReadonlySet<AttestationStatus> = new Set(['active', 'expired', 'revoked', 'pending']);

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}
function assertStatus(s: string): asserts s is AttestationStatus {
  if (!STATUSES.has(s as AttestationStatus)) throw Object.assign(new Error(`bad_status:${s}`), { code: 'bad_status' });
}

const COLS = `id, tenant_id, framework_id, attestation_type, attested_by, attested_at,
              period_start, period_end, status, declaration, evidence_refs,
              created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; framework_id: string; attestation_type: string;
  attested_by: string; attested_at: string;
  period_start: string | null; period_end: string | null;
  status: AttestationStatus; declaration: string | null;
  evidence_refs: unknown[]; created_at: string; updated_at: string;
}): AttestationRow => ({
  id: x.id, tenantId: x.tenant_id, frameworkId: x.framework_id,
  attestationType: x.attestation_type, attestedBy: x.attested_by, attestedAt: x.attested_at,
  periodStart: x.period_start, periodEnd: x.period_end,
  status: x.status, declaration: x.declaration,
  evidenceRefs: x.evidence_refs ?? [],
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listAttestations(
  client: DbClient,
  input: ListAttestationsInput,
): Promise<{ rows: AttestationRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.frameworkId) { params.push(input.frameworkId); where += ` AND framework_id = $${params.length}`; }
  if (input.attestationType) { params.push(input.attestationType); where += ` AND attestation_type = $${params.length}`; }
  if (input.status) { assertStatus(input.status); params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.attestedBy) { params.push(input.attestedBy); where += ` AND attested_by = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_attestations
     WHERE ${where} ORDER BY attested_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_attestations WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getAttestation(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<AttestationRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_attestations
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createAttestation(
  client: DbClient,
  input: CreateAttestationInput,
): Promise<AttestationRow> {
  assertSchema(input.tenantSchema);
  if (!input.frameworkId || !input.attestationType) {
    throw Object.assign(new Error('frameworkId and attestationType required'), { code: 'bad_input' });
  }
  if (input.status) assertStatus(input.status);
  const attestedBy = input.attestedBy ?? input.actorId;
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_attestations
       (tenant_id, framework_id, attestation_type, attested_by,
        period_start, period_end, status, declaration, evidence_refs)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.frameworkId, input.attestationType, attestedBy,
      input.periodStart ?? null, input.periodEnd ?? null,
      input.status ?? 'active', input.declaration ?? null,
      JSON.stringify(input.evidenceRefs ?? []),
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateAttestationStatus(
  client: DbClient,
  input: UpdateAttestationStatusInput,
): Promise<AttestationRow | null> {
  assertSchema(input.tenantSchema);
  assertStatus(input.status);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_attestations
        SET status = $3, updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id, input.status],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export const __testing__ = { SCHEMA_RE, STATUSES, assertSchema, assertStatus };
