/**
 * Comments service — tenant-scoped over `<tenant_schema>.compliance_comments`.
 *
 * Polymorphic association via (entity_type, entity_id). Threading via parent_id.
 * Internal/visibility flag (is_internal) and resolved flag (is_resolved).
 */
import type { DbClient } from '../../db/runner';

export interface CommentRow {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  parentId: string | null;
  content: string;
  authorId: string;
  isInternal: boolean;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListCommentsInput {
  tenantSchema: string;
  tenantId: string;
  entityType?: string;
  entityId?: string;
  authorId?: string;
  isResolved?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateCommentInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  content: string;
  parentId?: string | null;
  isInternal?: boolean;
}

export interface ResolveCommentInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
  isResolved: boolean;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `id, tenant_id, entity_type, entity_id, parent_id, content,
              author_id, is_internal, is_resolved,
              created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; entity_type: string; entity_id: string;
  parent_id: string | null; content: string; author_id: string;
  is_internal: boolean; is_resolved: boolean;
  created_at: string; updated_at: string;
}): CommentRow => ({
  id: x.id, tenantId: x.tenant_id, entityType: x.entity_type, entityId: x.entity_id,
  parentId: x.parent_id, content: x.content, authorId: x.author_id,
  isInternal: x.is_internal, isResolved: x.is_resolved,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listComments(
  client: DbClient,
  input: ListCommentsInput,
): Promise<{ rows: CommentRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.entityType) { params.push(input.entityType); where += ` AND entity_type = $${params.length}`; }
  if (input.entityId) { params.push(input.entityId); where += ` AND entity_id = $${params.length}`; }
  if (input.authorId) { params.push(input.authorId); where += ` AND author_id = $${params.length}`; }
  if (typeof input.isResolved === 'boolean') {
    params.push(input.isResolved); where += ` AND is_resolved = $${params.length}`;
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_comments
     WHERE ${where} ORDER BY created_at ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_comments WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getComment(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<CommentRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_comments
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createComment(
  client: DbClient,
  input: CreateCommentInput,
): Promise<CommentRow> {
  assertSchema(input.tenantSchema);
  if (!input.entityType || !input.entityId || !input.content) {
    throw Object.assign(
      new Error('entityType, entityId, content required'),
      { code: 'bad_input' },
    );
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_comments
       (tenant_id, entity_type, entity_id, parent_id,
        content, author_id, is_internal)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.entityType, input.entityId,
      input.parentId ?? null,
      input.content, input.actorId,
      input.isInternal ?? false,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function resolveComment(
  client: DbClient,
  input: ResolveCommentInput,
): Promise<CommentRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_comments
        SET is_resolved = $3, updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id, input.isResolved],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
