/**
 * Evidence Links service — tenant-scoped CRUD over `<tenant_schema>.compliance_evidence_links`.
 *
 * link_type enum: 'supporting' | 'primary' | 'compensating' | 'referenced' (default 'supporting').
 * Verification toggles `verified_at`/`verified_by` via a dedicated transition.
 */
import type { DbClient } from '../../db/runner';

export type EvidenceLinkType = 'supporting' | 'primary' | 'compensating' | 'referenced';

export interface EvidenceLinkRow {
  id: string;
  tenantId: string;
  requirementId: string;
  evidenceId: string;
  linkType: EvidenceLinkType;
  verifiedAt: string | null;
  verifiedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListEvidenceLinksInput {
  tenantSchema: string;
  tenantId: string;
  requirementId?: string;
  evidenceId?: string;
  linkType?: EvidenceLinkType;
  verifiedOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateEvidenceLinkInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  requirementId: string;
  evidenceId: string;
  linkType?: EvidenceLinkType;
  notes?: string | null;
}

export interface VerifyEvidenceLinkInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
  /** Pass false to clear verification. */
  verified: boolean;
  verifiedBy?: string;
  notes?: string | null;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;
const TYPES: ReadonlySet<EvidenceLinkType> = new Set([
  'supporting', 'primary', 'compensating', 'referenced',
]);

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}
function assertLinkType(s: string): asserts s is EvidenceLinkType {
  if (!TYPES.has(s as EvidenceLinkType)) throw Object.assign(new Error(`bad_link_type:${s}`), { code: 'bad_link_type' });
}

const COLS = `id, tenant_id, requirement_id, evidence_id, link_type,
              verified_at, verified_by, notes, created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; requirement_id: string;
  evidence_id: string; link_type: EvidenceLinkType;
  verified_at: string | null; verified_by: string | null;
  notes: string | null; created_at: string; updated_at: string;
}): EvidenceLinkRow => ({
  id: x.id, tenantId: x.tenant_id, requirementId: x.requirement_id,
  evidenceId: x.evidence_id, linkType: x.link_type,
  verifiedAt: x.verified_at, verifiedBy: x.verified_by,
  notes: x.notes, createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listEvidenceLinks(
  client: DbClient,
  input: ListEvidenceLinksInput,
): Promise<{ rows: EvidenceLinkRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.requirementId) { params.push(input.requirementId); where += ` AND requirement_id = $${params.length}`; }
  if (input.evidenceId) { params.push(input.evidenceId); where += ` AND evidence_id = $${params.length}`; }
  if (input.linkType) { assertLinkType(input.linkType); params.push(input.linkType); where += ` AND link_type = $${params.length}`; }
  if (input.verifiedOnly === true) { where += ` AND verified_at IS NOT NULL`; }
  if (input.verifiedOnly === false) { where += ` AND verified_at IS NULL`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_evidence_links
     WHERE ${where} ORDER BY updated_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_evidence_links WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getEvidenceLink(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<EvidenceLinkRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_evidence_links
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createEvidenceLink(
  client: DbClient,
  input: CreateEvidenceLinkInput,
): Promise<EvidenceLinkRow> {
  assertSchema(input.tenantSchema);
  if (!input.requirementId || !input.evidenceId) {
    throw Object.assign(new Error('requirementId and evidenceId required'), { code: 'bad_input' });
  }
  if (input.linkType) assertLinkType(input.linkType);
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_evidence_links
       (tenant_id, requirement_id, evidence_id, link_type, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.requirementId, input.evidenceId,
      input.linkType ?? 'supporting', input.notes ?? null,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function verifyEvidenceLink(
  client: DbClient,
  input: VerifyEvidenceLinkInput,
): Promise<EvidenceLinkRow | null> {
  assertSchema(input.tenantSchema);
  const verifier = input.verified ? (input.verifiedBy ?? input.actorId) : null;
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_evidence_links
        SET verified_at = CASE WHEN $3 THEN NOW() ELSE NULL END,
            verified_by = $4,
            notes = COALESCE($5, notes),
            updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id, input.verified, verifier, input.notes ?? null],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export const __testing__ = { SCHEMA_RE, TYPES, assertSchema, assertLinkType };
