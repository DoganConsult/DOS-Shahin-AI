/**
 * Bilingual-Content service — per-tenant Arabic/English translations of
 * compliance entities (instruments, controls, frameworks, obligations,
 * findings…) over `<tenant_schema>.bilingual_content`. Each row is a
 * versionable translation of a single (entity_type, entity_id, field_key,
 * language) tuple with translator + approver provenance.
 */
import type { DbClient } from '../../db/runner';

export type ContentLanguage = 'en' | 'ar';
const LANGUAGES: ReadonlyArray<ContentLanguage> = ['en', 'ar'];

export type ContentStatus = 'draft' | 'approved' | 'deprecated';
const STATUSES: ReadonlyArray<ContentStatus> = ['draft', 'approved', 'deprecated'];

export interface BilingualContentRow {
  contentId: string;
  entityType: string;
  entityId: string;
  fieldKey: string;
  language: ContentLanguage;
  content: string;
  status: ContentStatus;
  translatorId: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListBilingualContentInput {
  tenantSchema: string;
  entityType?: string;
  entityId?: string;
  fieldKey?: string;
  language?: ContentLanguage;
  status?: ContentStatus;
  limit?: number;
  offset?: number;
}

export interface CreateBilingualContentInput {
  tenantSchema: string;
  actorId: string;
  entityType: string;
  entityId: string;
  fieldKey: string;
  language: ContentLanguage;
  content: string;
  status?: ContentStatus;
}

export interface UpdateBilingualContentStatusInput {
  tenantSchema: string;
  actorId: string;
  contentId: string;
  status: ContentStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `content_id, entity_type, entity_id, field_key, language, content,
              status, translator_id, approved_by, approved_at,
              created_at, updated_at`;

const mapRow = (x: {
  content_id: string; entity_type: string; entity_id: string; field_key: string;
  language: string; content: string; status: string;
  translator_id: string | null; approved_by: string | null; approved_at: string | null;
  created_at: string; updated_at: string;
}): BilingualContentRow => ({
  contentId: x.content_id, entityType: x.entity_type, entityId: x.entity_id,
  fieldKey: x.field_key, language: x.language as ContentLanguage,
  content: x.content, status: x.status as ContentStatus,
  translatorId: x.translator_id, approvedBy: x.approved_by, approvedAt: x.approved_at,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listBilingualContent(
  client: DbClient,
  input: ListBilingualContentInput,
): Promise<{ rows: BilingualContentRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.entityType) { params.push(input.entityType); where += ` AND entity_type = $${params.length}`; }
  if (input.entityId) { params.push(input.entityId); where += ` AND entity_id = $${params.length}`; }
  if (input.fieldKey) { params.push(input.fieldKey); where += ` AND field_key = $${params.length}`; }
  if (input.language) { params.push(input.language); where += ` AND language = $${params.length}`; }
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".bilingual_content
     WHERE ${where} ORDER BY entity_type ASC, entity_id ASC, field_key ASC, language ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".bilingual_content WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getBilingualContent(
  client: DbClient,
  input: { tenantSchema: string; contentId: string },
): Promise<BilingualContentRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".bilingual_content
     WHERE content_id = $1`,
    [input.contentId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createBilingualContent(
  client: DbClient,
  input: CreateBilingualContentInput,
): Promise<BilingualContentRow> {
  assertSchema(input.tenantSchema);
  if (!input.entityType || !input.entityId || !input.fieldKey || !input.content) {
    throw Object.assign(
      new Error('entityType, entityId, fieldKey, content required'), { code: 'bad_input' },
    );
  }
  if (!LANGUAGES.includes(input.language)) {
    throw Object.assign(new Error(`bad language: ${input.language}`), { code: 'bad_language' });
  }
  if (input.status && !STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".bilingual_content
       (entity_type, entity_id, field_key, language, content, status, translator_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLS}`,
    [
      input.entityType, input.entityId, input.fieldKey,
      input.language, input.content,
      input.status ?? 'draft',
      input.actorId,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateBilingualContentStatus(
  client: DbClient,
  input: UpdateBilingualContentStatusInput,
): Promise<BilingualContentRow | null> {
  assertSchema(input.tenantSchema);
  if (!STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const stamp = input.status === 'approved';
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".bilingual_content
        SET status      = $2,
            approved_by = CASE WHEN $3::boolean THEN $4 ELSE approved_by END,
            approved_at = CASE WHEN $3::boolean THEN NOW() ELSE approved_at END,
            updated_at  = NOW()
      WHERE content_id = $1
      RETURNING ${COLS}`,
    [input.contentId, input.status, stamp, input.actorId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function deleteBilingualContent(
  client: DbClient,
  input: { tenantSchema: string; contentId: string },
): Promise<BilingualContentRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".bilingual_content
      WHERE content_id = $1
      RETURNING ${COLS}`,
    [input.contentId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
