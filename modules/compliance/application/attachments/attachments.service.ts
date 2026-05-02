/**
 * Attachments service — tenant-scoped over `<tenant_schema>.compliance_attachments`.
 *
 * Polymorphic association via (entity_type, entity_id). No file body upload here:
 * this layer records metadata + storage_path produced by the host's blob backend.
 */
import type { DbClient } from '../../db/runner';

export interface AttachmentRow {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListAttachmentsInput {
  tenantSchema: string;
  tenantId: string;
  entityType?: string;
  entityId?: string;
  uploadedBy?: string;
  limit?: number;
  offset?: number;
}

export interface CreateAttachmentInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  fileName: string;
  storagePath: string;
  fileType?: string | null;
  fileSize?: number | null;
}

export interface DeleteAttachmentInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `id, tenant_id, entity_type, entity_id, file_name, file_type,
              file_size, storage_path, uploaded_by, uploaded_at,
              created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; entity_type: string; entity_id: string;
  file_name: string; file_type: string | null;
  file_size: string | number | null; storage_path: string;
  uploaded_by: string; uploaded_at: string;
  created_at: string; updated_at: string;
}): AttachmentRow => ({
  id: x.id, tenantId: x.tenant_id, entityType: x.entity_type, entityId: x.entity_id,
  fileName: x.file_name, fileType: x.file_type,
  fileSize: x.file_size === null ? null : Number(x.file_size),
  storagePath: x.storage_path, uploadedBy: x.uploaded_by, uploadedAt: x.uploaded_at,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listAttachments(
  client: DbClient,
  input: ListAttachmentsInput,
): Promise<{ rows: AttachmentRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.entityType) { params.push(input.entityType); where += ` AND entity_type = $${params.length}`; }
  if (input.entityId) { params.push(input.entityId); where += ` AND entity_id = $${params.length}`; }
  if (input.uploadedBy) { params.push(input.uploadedBy); where += ` AND uploaded_by = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_attachments
     WHERE ${where} ORDER BY uploaded_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_attachments WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getAttachment(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<AttachmentRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_attachments
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createAttachment(
  client: DbClient,
  input: CreateAttachmentInput,
): Promise<AttachmentRow> {
  assertSchema(input.tenantSchema);
  if (!input.entityType || !input.entityId || !input.fileName || !input.storagePath) {
    throw Object.assign(
      new Error('entityType, entityId, fileName, storagePath required'),
      { code: 'bad_input' },
    );
  }
  if (input.fileSize !== undefined && input.fileSize !== null
      && (typeof input.fileSize !== 'number' || Number.isNaN(input.fileSize) || input.fileSize < 0)) {
    throw Object.assign(new Error('fileSize must be a non-negative number'), { code: 'bad_input' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_attachments
       (tenant_id, entity_type, entity_id, file_name, file_type,
        file_size, storage_path, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.entityType, input.entityId,
      input.fileName, input.fileType ?? null,
      input.fileSize ?? null, input.storagePath,
      input.actorId,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function deleteAttachment(
  client: DbClient,
  input: DeleteAttachmentInput,
): Promise<AttachmentRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".compliance_attachments
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
