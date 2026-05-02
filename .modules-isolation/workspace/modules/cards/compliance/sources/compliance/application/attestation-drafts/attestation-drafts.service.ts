/**
 * Attestation-Drafts service — generated readiness drafts over
 * `<tenant_schema>.attestation_drafts`.
 */
import type { DbClient } from '../../db/runner';

export type DraftEntityType = 'framework' | 'control';
const ENTITY_TYPES: ReadonlyArray<DraftEntityType> = ['framework', 'control'];

export type DraftStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';
const STATUSES: ReadonlyArray<DraftStatus> = ['draft', 'pending_review', 'approved', 'rejected'];

export interface AttestationDraftRow {
  draftId: string;
  entityType: DraftEntityType;
  entityId: string;
  entityName: string;
  readinessScore: Record<string, unknown>;
  status: DraftStatus;
  content: Record<string, unknown>;
  generatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  expiresAt: string | null;
}

export interface ListDraftsInput {
  tenantSchema: string;
  entityType?: DraftEntityType;
  entityId?: string;
  status?: DraftStatus;
  limit?: number;
  offset?: number;
}

export interface CreateDraftInput {
  tenantSchema: string;
  actorId: string;
  entityType: DraftEntityType;
  entityId: string;
  entityName?: string;
  readinessScore?: Record<string, unknown>;
  content?: Record<string, unknown>;
  expiresAt?: string | null;
}

export interface ReviewDraftInput {
  tenantSchema: string;
  actorId: string;
  draftId: string;
  status: DraftStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `draft_id, entity_type, entity_id, entity_name, readiness_score, status,
              content, generated_at, approved_by, approved_at, expires_at`;

const j = (v: unknown): Record<string, unknown> =>
  typeof v === 'string' ? JSON.parse(v) : ((v as Record<string, unknown>) ?? {});

const mapRow = (x: {
  draft_id: string; entity_type: string; entity_id: string; entity_name: string;
  readiness_score: unknown; status: string; content: unknown;
  generated_at: string; approved_by: string | null;
  approved_at: string | null; expires_at: string | null;
}): AttestationDraftRow => ({
  draftId: x.draft_id, entityType: x.entity_type as DraftEntityType,
  entityId: x.entity_id, entityName: x.entity_name,
  readinessScore: j(x.readiness_score), status: x.status as DraftStatus,
  content: j(x.content), generatedAt: x.generated_at,
  approvedBy: x.approved_by, approvedAt: x.approved_at, expiresAt: x.expires_at,
});

export async function listDrafts(
  client: DbClient,
  input: ListDraftsInput,
): Promise<{ rows: AttestationDraftRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.entityType) { params.push(input.entityType); where += ` AND entity_type = $${params.length}`; }
  if (input.entityId) { params.push(input.entityId); where += ` AND entity_id = $${params.length}`; }
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".attestation_drafts
     WHERE ${where} ORDER BY generated_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".attestation_drafts WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getDraft(
  client: DbClient,
  input: { tenantSchema: string; draftId: string },
): Promise<AttestationDraftRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".attestation_drafts
     WHERE draft_id = $1`,
    [input.draftId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createDraft(
  client: DbClient,
  input: CreateDraftInput,
): Promise<AttestationDraftRow> {
  assertSchema(input.tenantSchema);
  if (!input.entityType || !input.entityId) {
    throw Object.assign(new Error('entityType, entityId required'), { code: 'bad_input' });
  }
  if (!ENTITY_TYPES.includes(input.entityType)) {
    throw Object.assign(new Error(`bad entity_type: ${input.entityType}`), { code: 'bad_entity_type' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".attestation_drafts
       (entity_type, entity_id, entity_name, readiness_score, content, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLS}`,
    [
      input.entityType, input.entityId,
      input.entityName ?? '',
      JSON.stringify(input.readinessScore ?? {}),
      JSON.stringify(input.content ?? {}),
      input.expiresAt ?? null,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function reviewDraft(
  client: DbClient,
  input: ReviewDraftInput,
): Promise<AttestationDraftRow | null> {
  assertSchema(input.tenantSchema);
  if (!STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const stamp = input.status === 'approved' || input.status === 'rejected';
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".attestation_drafts
        SET status = $2,
            approved_by = CASE WHEN $4::boolean THEN $3 ELSE approved_by END,
            approved_at = CASE WHEN $4::boolean THEN NOW() ELSE approved_at END
      WHERE draft_id = $1
      RETURNING ${COLS}`,
    [input.draftId, input.status, input.actorId, stamp],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function deleteDraft(
  client: DbClient,
  input: { tenantSchema: string; draftId: string },
): Promise<AttestationDraftRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".attestation_drafts
      WHERE draft_id = $1
      RETURNING ${COLS}`,
    [input.draftId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
