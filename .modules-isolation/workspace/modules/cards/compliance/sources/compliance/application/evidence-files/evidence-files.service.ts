/**
 * Evidence-Files service — binary evidence metadata over
 * `<tenant_schema>.evidence_files`. Stores filename, MIME, size, content hash,
 * storage URI, retention policy, and link to control / requirement / finding.
 *
 * Binary bytes themselves live in object storage; this service is the
 * authoritative metadata + dedup-by-hash + retention ledger.
 */
import type { DbClient } from '../../db/runner';

export type EvidenceFileStatus = 'active' | 'quarantined' | 'expired' | 'deleted';
const STATUSES: ReadonlyArray<EvidenceFileStatus> = ['active', 'quarantined', 'expired', 'deleted'];

export interface EvidenceFileRow {
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  contentHash: string;
  storageUri: string;
  status: EvidenceFileStatus;
  controlId: string | null;
  requirementId: string | null;
  findingId: string | null;
  uploadedBy: string | null;
  retentionUntil: string | null;
  createdAt: string;
}

export interface ListEvidenceFilesInput {
  tenantSchema: string;
  status?: EvidenceFileStatus;
  controlId?: string;
  requirementId?: string;
  findingId?: string;
  contentHash?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateEvidenceFileInput {
  tenantSchema: string;
  actorId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  contentHash: string;
  storageUri: string;
  controlId?: string;
  requirementId?: string;
  findingId?: string;
  retentionUntil?: string;
}

export interface UpdateEvidenceFileStatusInput {
  tenantSchema: string;
  actorId: string;
  fileId: string;
  status: EvidenceFileStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `file_id, filename, mime_type, size_bytes, content_hash,
              storage_uri, status, control_id, requirement_id, finding_id,
              uploaded_by, retention_until, created_at`;

const mapRow = (x: {
  file_id: string; filename: string; mime_type: string;
  size_bytes: string | number; content_hash: string; storage_uri: string;
  status: string; control_id: string | null; requirement_id: string | null;
  finding_id: string | null; uploaded_by: string | null;
  retention_until: string | null; created_at: string;
}): EvidenceFileRow => ({
  fileId: x.file_id, filename: x.filename, mimeType: x.mime_type,
  sizeBytes: Number(x.size_bytes), contentHash: x.content_hash,
  storageUri: x.storage_uri, status: x.status as EvidenceFileStatus,
  controlId: x.control_id, requirementId: x.requirement_id,
  findingId: x.finding_id, uploadedBy: x.uploaded_by,
  retentionUntil: x.retention_until, createdAt: x.created_at,
});

export async function listEvidenceFiles(
  client: DbClient,
  input: ListEvidenceFilesInput,
): Promise<{ rows: EvidenceFileRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.controlId) { params.push(input.controlId); where += ` AND control_id = $${params.length}`; }
  if (input.requirementId) { params.push(input.requirementId); where += ` AND requirement_id = $${params.length}`; }
  if (input.findingId) { params.push(input.findingId); where += ` AND finding_id = $${params.length}`; }
  if (input.contentHash) { params.push(input.contentHash); where += ` AND content_hash = $${params.length}`; }
  if (input.search) {
    params.push(`%${input.search}%`);
    where += ` AND filename ILIKE $${params.length}`;
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".evidence_files
     WHERE ${where} ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".evidence_files WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getEvidenceFile(
  client: DbClient,
  input: { tenantSchema: string; fileId: string },
): Promise<EvidenceFileRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".evidence_files
     WHERE file_id = $1`,
    [input.fileId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createEvidenceFile(
  client: DbClient,
  input: CreateEvidenceFileInput,
): Promise<EvidenceFileRow> {
  assertSchema(input.tenantSchema);
  if (!input.filename || !input.mimeType || !input.contentHash || !input.storageUri) {
    throw Object.assign(
      new Error('filename, mimeType, contentHash, storageUri required'),
      { code: 'bad_input' },
    );
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes < 0) {
    throw Object.assign(new Error('sizeBytes must be a non-negative number'), { code: 'bad_size' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".evidence_files
       (filename, mime_type, size_bytes, content_hash, storage_uri,
        status, control_id, requirement_id, finding_id,
        uploaded_by, retention_until)
     VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9, $10)
     RETURNING ${COLS}`,
    [
      input.filename, input.mimeType, input.sizeBytes,
      input.contentHash, input.storageUri,
      input.controlId ?? null, input.requirementId ?? null,
      input.findingId ?? null, input.actorId,
      input.retentionUntil ?? null,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateEvidenceFileStatus(
  client: DbClient,
  input: UpdateEvidenceFileStatusInput,
): Promise<EvidenceFileRow | null> {
  assertSchema(input.tenantSchema);
  if (!STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".evidence_files
        SET status = $2
      WHERE file_id = $1
      RETURNING ${COLS}`,
    [input.fileId, input.status],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function deleteEvidenceFile(
  client: DbClient,
  input: { tenantSchema: string; fileId: string },
): Promise<EvidenceFileRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".evidence_files
      WHERE file_id = $1
      RETURNING ${COLS}`,
    [input.fileId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
